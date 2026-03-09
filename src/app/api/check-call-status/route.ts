import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const assistantId = searchParams.get('assistantId');

    if (!assistantId) {
        return NextResponse.json({ error: 'Missing assistantId' }, { status: 400 });
    }

    try {
        if (!adminDb) {
            return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
        }

        const docSnap = await adminDb.collection('temporary_assistants').doc(assistantId).get();
        if (!docSnap.exists) {
            return NextResponse.json({ status: 'not_found' });
        }

        const data = docSnap.data();
        return NextResponse.json({ status: data?.status || 'active' });
    } catch (error: any) {
        console.error('Error fetching call status:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
