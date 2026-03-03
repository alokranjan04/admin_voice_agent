import { NextResponse } from 'next/server';
import { getCalendarId } from '@/lib/googleAuth';

export async function GET() {
    try {
        const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'MISSING';
        const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || 'MISSING';
        const calId = getCalendarId() || 'MISSING';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'MISSING';

        // Safe diagnostics (No leaking whole key)
        const keyInfo = rawKey === 'MISSING' ? 'MISSING' : {
            length: rawKey.length,
            start: rawKey.substring(0, 20),
            end: rawKey.substring(rawKey.length - 20),
            hasNewlines: rawKey.includes('\n'),
            hasEscapedNewlines: rawKey.includes('\\n'),
            isBase64: /^[A-Za-z0-9+/=]+$/.test(rawKey.replace(/\s/g, '')),
            containsBegin: rawKey.includes('-----BEGIN')
        };

        return NextResponse.json({
            status: 'Diagnostic Report',
            timestamp: new Date().toISOString(),
            env: {
                email,
                calId,
                appUrl
            },
            keyDiagnostics: keyInfo
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
