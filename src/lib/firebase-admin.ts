import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        let credential;

        if (projectId && clientEmail && privateKey) {
            console.log('[Firebase Admin] Using individual environment variables...');
            credential = admin.credential.cert({
                projectId,
                clientEmail,
                privateKey: privateKey.replace(/\\n/g, '\n'),
            });
        } else if (serviceAccountKey) {
            console.log(`[Firebase Admin] Attempting JSON parse. String length: ${serviceAccountKey.length}`);
            try {
                let keyString = serviceAccountKey.trim();
                
                // Remove outer quotes if present (standard .env vs Vercel mismatch)
                if ((keyString.startsWith("'") && keyString.endsWith("'")) || 
                    (keyString.startsWith('"') && keyString.endsWith('"'))) {
                    console.log('[Firebase Admin] Removing outer quotes from key string');
                    keyString = keyString.slice(1, -1);
                }

                // Log boundaries for truncation check (safely)
                console.log(`[Firebase Admin] Key Start: ${keyString.substring(0, 20)}...`);
                console.log(`[Firebase Admin] Key End: ...${keyString.substring(keyString.length - 20)}`);

                const serviceAccount = JSON.parse(keyString);
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }
                credential = admin.credential.cert(serviceAccount);
            } catch (e: any) {
                console.error("[Firebase Admin] Failed to parse service account key.", {
                    error: e.message,
                    length: serviceAccountKey?.length,
                    isJson: serviceAccountKey?.trim().startsWith('{')
                });
            }
        }

        if (credential) {
            admin.initializeApp({
                projectId: projectId,
                credential: credential
            });
            console.log('[Firebase Admin] Initialized successfully with Project ID:', projectId);
        } else {
            console.error("[Firebase Admin] CRITICAL: No credentials found.", {
                hasProjectId: !!projectId,
                hasClientEmail: !!clientEmail,
                hasPrivateKey: !!privateKey,
                hasServiceAccountKey: !!serviceAccountKey
            });
        }
    } catch (error: any) {
        console.error('[Firebase Admin] Initialization failed:', error);
    }
}


// Lazy-loaded getters to prevent build-time crashes
export const adminDb = admin.apps.length ? admin.firestore() : null as unknown as ReturnType<typeof admin.firestore>;
export const adminAuth = admin.apps.length ? admin.auth() : null as unknown as ReturnType<typeof admin.auth>;
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
