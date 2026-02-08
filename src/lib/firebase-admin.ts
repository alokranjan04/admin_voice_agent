import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        admin.initializeApp({
            projectId: projectId,
        });
        console.log('[Firebase Admin] Initialized with Project ID:', projectId);
    } catch (error: any) {
        console.error('[Firebase Admin] Initialization failed:', error);
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export { admin };
