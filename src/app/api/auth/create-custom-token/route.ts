import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/services/firebase';

// Initialize Firebase Admin (server-side only)
let adminAuth: any = null;

async function getAdminAuth() {
    if (adminAuth) return adminAuth;

    try {
        const admin = await import('firebase-admin');

        if (!admin.apps.length) {
            // Initialize with service account or default credentials
            const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
                ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
                : undefined;

            if (serviceAccount) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            } else {
                // Use application default credentials (works on Cloud Run, etc.)
                admin.initializeApp();
            }
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
        // Get the current user's ID token from the request
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
