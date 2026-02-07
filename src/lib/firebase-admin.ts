import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        });
        console.log('[Firebase Admin] Initialized with Project ID:', process.env.VITE_FIREBASE_PROJECT_ID);
    } catch (error: any) {
        console.error('[Firebase Admin] Initialization failed:', error);
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export { admin };
