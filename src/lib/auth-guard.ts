import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Returns the decoded token if valid, or a NextResponse error if not.
 *
 * Usage in any API route:
 *   const auth = await verifyAuth(req);
 *   if (auth instanceof NextResponse) return auth; // 401/403
 *   // auth is now the decoded Firebase token (uid, email, etc.)
 */
export async function verifyAuth(
    req: Request
): Promise<NextResponse | { uid: string; email?: string; [key: string]: any }> {
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
            { error: 'Missing or invalid Authorization header' },
            { status: 401 }
        );
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
        return NextResponse.json(
            { error: 'Missing token' },
            { status: 401 }
        );
    }

    const adminAuth = getAdminAuth();
    if (!adminAuth) {
        console.error('[Auth Guard] Firebase Admin Auth not initialized');
        return NextResponse.json(
            { error: 'Authentication service unavailable' },
            { status: 503 }
        );
    }

    try {
        const decoded = await adminAuth.verifyIdToken(token);
        return decoded as any;
    } catch (error: any) {
        console.warn('[Auth Guard] Token verification failed:', error.message);
        return NextResponse.json(
            { error: 'Invalid or expired token' },
            { status: 401 }
        );
    }
}
