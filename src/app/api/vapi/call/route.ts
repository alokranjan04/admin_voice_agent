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

        let phoneNumberId = process.env.VITE_VAPI_PHONE_NUMBER_ID || process.env.NEXT_PUBLIC_VAPI_PHONE_NUMBER_ID;

        // Smart Resolution: If user provided a phone number string instead of a UUID
        if (phoneNumberId && !phoneNumberId.includes('-') && phoneNumberId.startsWith('+')) {
            console.log(`[VAPI] Attempting to resolve number ${phoneNumberId} to UUID...`);
            try {
                const listRes = await axios.get('https://api.vapi.ai/phone-number', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                const numbers = listRes.data;
                const match = numbers.find((n: any) => n.number === phoneNumberId);
                if (match) {
                    console.log(`[VAPI] Resolved ${phoneNumberId} to UUID: ${match.id}`);
                    phoneNumberId = match.id;
                } else {
                    console.warn(`[VAPI] Phone number ${phoneNumberId} not found in account.`);
                }
            } catch (err) {
                console.error("[VAPI] Failed to list phone numbers for resolution", err);
            }
        }

        const payload: any = {
            assistantId: assistantId,
            customer: {
                number: phoneNumber
            }
        };

        // Only include if it looks like a real UUID
        if (phoneNumberId && phoneNumberId.includes('-')) {
            payload.phoneNumberId = phoneNumberId;
        }

        const response = await axios.post('https://api.vapi.ai/call/phone', payload, {
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
