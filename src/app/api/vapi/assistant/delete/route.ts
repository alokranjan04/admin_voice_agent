import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { assistantId } = await req.json();
        if (!assistantId) {
            return NextResponse.json({ error: 'assistantId is required' }, { status: 400 });
        }

        const apiKey = process.env.VITE_VAPI_PRIVATE_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'VAPI Private Key not configured' }, { status: 500 });
        }

        const res = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!res.ok && res.status !== 404) {
            const body = await res.text();
            return NextResponse.json({ error: `VAPI delete failed: ${body}` }, { status: res.status });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[VAPI Delete]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
