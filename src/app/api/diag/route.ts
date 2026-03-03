import { NextResponse } from 'next/server';
import { getCalendarId } from '@/lib/googleAuth';

// Mimic the normalization logic for testing
function testNormalize(key: string): string {
    if (!key) return '';
    let normalized = key.trim();
    if (normalized.startsWith('{')) {
        try {
            const json = JSON.parse(normalized);
            if (json.private_key) return testNormalize(json.private_key);
        } catch (e) { }
    }
    if (!normalized.includes('-----BEGIN') && /^[A-Za-z0-9+/=\s]+$/.test(normalized)) {
        try {
            const decoded = Buffer.from(normalized.replace(/\s/g, ''), 'base64').toString('utf8');
            if (decoded.includes('-----BEGIN')) return testNormalize(decoded);
        } catch (e) { }
    }
    return normalized
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/"/g, '')
        .replace(/^'|'$/g, '')
        .trim();
}

export async function GET() {
    try {
        const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'MISSING';
        const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || 'MISSING';
        const calId = getCalendarId() || 'MISSING';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'MISSING';

        const normalizedKey = testNormalize(rawKey);

        const rawDiagnostics = rawKey === 'MISSING' ? 'MISSING' : {
            length: rawKey.length,
            isBase64: /^[A-Za-z0-9+/=\s]+$/.test(rawKey),
            containsBegin: rawKey.includes('-----BEGIN')
        };

        const normalizedDiagnostics = normalizedKey === 'MISSING' ? 'MISSING' : {
            length: normalizedKey.length,
            containsBegin: normalizedKey.includes('-----BEGIN'),
            hasActualNewlines: normalizedKey.includes('\n'),
            startsCorrectly: normalizedKey.startsWith('-----BEGIN PRIVATE KEY-----'),
            endsCorrectly: normalizedKey.endsWith('-----END PRIVATE KEY-----')
        };

        return NextResponse.json({
            status: 'Detailed Diagnostic Report',
            timestamp: new Date().toISOString(),
            env: { email, calId, appUrl },
            rawKey: rawDiagnostics,
            normalizedKey: normalizedDiagnostics
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
