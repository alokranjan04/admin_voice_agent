import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // Basic security check: Require a secret header to prevent public access
    const authHeader = req.headers.get('x-diag-auth');
    if (authHeader !== 'alok-diag-2026') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const envs = {
        PROJECT_ID: { 
            exists: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !!process.env.VITE_FIREBASE_PROJECT_ID,
            val: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'MISSING'
        },
        SERVICE_ACCOUNT_KEY: {
            exists: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
            length: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0,
            startsWith: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim().substring(0, 5),
            endsWith: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim().slice(-5)
        },
        CLIENT_EMAIL: {
            exists: !!process.env.FIREBASE_CLIENT_EMAIL,
            val: process.env.FIREBASE_CLIENT_EMAIL || 'MISSING'
        },
        PRIVATE_KEY: {
            exists: !!process.env.FIREBASE_PRIVATE_KEY,
            length: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
            hasNewlines: process.env.FIREBASE_PRIVATE_KEY?.includes('\\n')
        }
    };

    return NextResponse.json(envs);
}
