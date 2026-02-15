import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

        let credential;
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            try {
                // Handle potential double-stringification or single quotes
                let keyString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
                if (keyString.startsWith("'") && keyString.endsWith("'")) {
                    keyString = keyString.slice(1, -1);
                }
                const serviceAccount = JSON.parse(keyString);
                credential = admin.credential.cert(serviceAccount);
            } catch (e) {
                console.error("[Firebase Admin] Failed to parse service account key", e);
            }
        }

        admin.initializeApp({
            projectId: projectId,
            credential: credential
        });
        console.log('[Firebase Admin] Initialized with Project ID:', projectId);
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
