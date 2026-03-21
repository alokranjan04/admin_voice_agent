import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const room = searchParams.get('room') || 'default-room';
        const identity = searchParams.get('identity') || `user-${Math.floor(Math.random() * 10000)}`;

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;

        if (!apiKey || !apiSecret) {
            return NextResponse.json({ error: 'LiveKit credentials not configured' }, { status: 500 });
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: identity,
        });

        at.addGrant({ 
            roomJoin: true, 
            room: room,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true
        });

        return NextResponse.json({ token: await at.toJwt() });
    } catch (error: any) {
        console.error('LiveKit Token Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
