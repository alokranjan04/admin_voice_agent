import { NextRequest, NextResponse } from 'next/server';

// Initialize Firebase Admin (server-side only)
let adminAuth: any = null;

async function getAdminAuth() {
    if (adminAuth) return adminAuth;

    try {
        const admin = await import('firebase-admin');

        if (!admin.apps.length) {
            const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

            if (!serviceAccountKey) {
                throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
            }

            // Parse the service account JSON
            let serviceAccount;
            try {
                serviceAccount = JSON.parse(serviceAccountKey);
            } catch (parseError) {
                console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError);
                throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format');
            }

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });

            console.log('Firebase Admin initialized successfully');
        }

        adminAuth = admin.auth();
        return adminAuth;
    } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
        throw error;
    }
}

export async function POST(request: NextRequest) {
    try {
        // Get the current user's ID from the request
        const { uid } = await request.json();

        if (!uid) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Get Firebase Admin Auth
        const adminAuthInstance = await getAdminAuth();

        // Create a custom token for the user
        const customToken = await adminAuthInstance.createCustomToken(uid);

        return NextResponse.json({ customToken });
    } catch (error: any) {
        console.error('Error creating custom token:', error);
        return NextResponse.json(
            { error: 'Failed to create custom token', details: error.message },
            { status: 500 }
        );
    }
}
