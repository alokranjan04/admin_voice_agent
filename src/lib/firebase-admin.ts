import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        let credential;

        if (clientEmail && privateKey) {
            // OPTION 1: Standard Vercel Env Vars (Preferred)
            credential = admin.credential.cert({
                projectId,
                clientEmail,
                // Replace literal \n with actual newlines for Vercel
                privateKey: privateKey.replace(/\\n/g, '\n'),
            });
        } else if (serviceAccountKey) {
            // OPTION 2: Full JSON Blob
            try {
                // Handle potential double-stringification or single quotes
                let keyString = serviceAccountKey;
                if (keyString.startsWith("'") && keyString.endsWith("'")) {
                    keyString = keyString.slice(1, -1);
                }
                const serviceAccount = JSON.parse(keyString);

                // CRITICAL FIX: Sanitize private key in JSON
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }

                credential = admin.credential.cert(serviceAccount);
            } catch (e) {
                console.error("[Firebase Admin] Failed to parse service account key", e);
            }
        }

        if (credential) {
            admin.initializeApp({
                projectId: projectId,
                credential: credential
            });
            console.log('[Firebase Admin] Initialized with Project ID:', projectId);
        } else {
            console.warn("[Firebase Admin] No credentials found. Admin features will fail.");
        }
    } catch (error: any) {
        console.error('[Firebase Admin] Initialization failed:', error);
    }
}


export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export { admin };

// Helper function to fetch agent configuration
export async function getAgentConfig(orgId: string, agentId: string) {
    try {
        const docRef = adminDb.collection('organizations').doc(orgId).collection('agents').doc(agentId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return null;
        }

        return doc.data() as any;
    } catch (error) {
        console.error('[Firebase Admin] Error fetching agent config:', error);
        throw error;
    }
}
