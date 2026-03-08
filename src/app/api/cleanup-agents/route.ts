import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * API Route to cleanup temporary "Test Drive" agents from Vapi and Firebase.
 * Should be triggered by a cron job (e.g., every 30 mins).
 */
export async function GET(req: Request) {
    try {
        if (!adminDb) {
            return NextResponse.json({ error: 'Firestore Admin not initialized' }, { status: 500 });
        }

        const vapiApiKey = process.env.VITE_VAPI_PRIVATE_KEY || process.env.VAPI_PRIVATE_API_KEY;
        if (!vapiApiKey) {
            return NextResponse.json({ error: 'Vapi API key missing' }, { status: 500 });
        }

        // 1. Fetch expired agents
        const now = new Date().toISOString();
        const expiredSnapshot = await adminDb.collection('temporary_assistants')
            .where('expiresAt', '<=', now)
            .limit(50) // Batch of 50 per run
            .get();

        if (expiredSnapshot.empty) {
            return NextResponse.json({ message: 'No expired agents to cleanup' });
        }

        const results = {
            found: expiredSnapshot.size,
            deletedVapi: 0,
            deletedFirebase: 0,
            errors: [] as string[]
        };

        // 2. Process deletions
        for (const doc of expiredSnapshot.docs) {
            const data = doc.data();
            const assistantId = data.assistantId;

            try {
                // Delete from Vapi
                console.log(`[Cleanup] Deleting Vapi Assistant: ${assistantId}`);
                const vapiResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${vapiApiKey}`
                    }
                });

                if (vapiResponse.ok) {
                    results.deletedVapi++;
                } else {
                    const err = await vapiResponse.json();
                    console.warn(`[Cleanup] Vapi Delete failed for ${assistantId}:`, err);
                    // We continue even if Vapi fails (agent might already be gone)
                }

                // Delete from Firebase tracking
                await doc.ref.delete();
                results.deletedFirebase++;

            } catch (err: any) {
                console.error(`[Cleanup] Error cleaning up ${assistantId}:`, err);
                results.errors.push(`${assistantId}: ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            ...results
        });

    } catch (error: any) {
        console.error('[Cleanup API] Global Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
