import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { code } = body;

        if (!code) {
            return NextResponse.json({ error: 'Missing auth code' }, { status: 400 });
        }

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            console.error("[Auth API] Missing credentials in .env");
            return NextResponse.json({ error: 'Server misconfiguration: Missing Credentials' }, { status: 500 });
        }

        const tokenUrl = 'https://oauth2.googleapis.com/token';
        const params = new URLSearchParams();
        params.append('code', code);
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('redirect_uri', 'postmessage'); // Critical for popup ux_mode
        params.append('grant_type', 'authorization_code');

        console.log(`[Auth API] Exchanging code for tokens... (Client ID: ${clientId.substring(0, 10)}...)`);

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("[Auth API] Token Exchange Failed:", data);
            return NextResponse.json({ error: data.error_description || data.error || 'Token exchange failed' }, { status: response.status });
        }

        console.log("[Auth API] Exchange Successful. Access Token obtained.");
        if (data.refresh_token) {
            console.log("[Auth API] Refresh Token obtained!");
        } else {
            console.warn("[Auth API] No Refresh Token returned. User might need to revoke access to force a new one.");
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("[Auth API] Error:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
