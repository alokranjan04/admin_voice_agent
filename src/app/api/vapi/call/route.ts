import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
    try {
        const { phoneNumber, assistantId } = await req.json();

        if (!phoneNumber || !assistantId) {
            return NextResponse.json({ error: 'Missing phoneNumber or assistantId' }, { status: 400 });
        }

        const apiKey = process.env.VITE_VAPI_PRIVATE_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'VAPI Private Key is not configured on the server' }, { status: 500 });
        }

        const response = await axios.post('https://api.vapi.ai/call/phone', {
            assistantId: assistantId,
            customer: {
                number: phoneNumber
            }
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return NextResponse.json(response.data);
    } catch (error: any) {
        console.error('[VAPI Call API Error]', error.response?.data || error.message);
        return NextResponse.json({
            error: error.response?.data?.message || error.message
        }, { status: error.response?.status || 500 });
    }
}
