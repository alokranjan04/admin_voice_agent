import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/services/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string; agentId: string }> }
) {
    try {
        const { orgId, agentId } = await params;

        if (!db) {
            return NextResponse.json(
                { error: 'Firebase not initialized' },
                { status: 500 }
            );
        }

        const docRef = doc(db, 'organizations', orgId, 'agents', agentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return NextResponse.json(
                { error: 'Agent not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(docSnap.data());
    } catch (error) {
        console.error('Error fetching agent config:', error);
        return NextResponse.json(
            { error: 'Failed to fetch agent configuration' },
            { status: 500 }
        );
    }
}
