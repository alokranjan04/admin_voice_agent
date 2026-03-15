import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'];

/**
 * Robustly normalizes a private key from various formats:
 * - JSON string (extracts private_key field)
 * - Base64 encoded (decodes and recurses)
 * - PEM with escaped newlines (\n) or quotes
 */
function normalizeKey(key: string): string {
    if (!key) return '';

    let normalized = key.trim();

    // 1. Check if it's a JSON string
    if (normalized.startsWith('{')) {
        try {
            const json = JSON.parse(normalized);
            if (json.private_key) return normalizeKey(json.private_key);
        } catch (e) { }
    }

    // 2. Base64 fallback (if no PEM headers and looks like Base64)
    if (!normalized.includes('-----BEGIN') && /^[A-Za-z0-9+/=\s]+$/.test(normalized)) {
        try {
            const decoded = Buffer.from(normalized.replace(/\s/g, ''), 'base64').toString('utf8');
            if (decoded.includes('-----BEGIN')) {
                console.log('[GoogleAuth] Successfully decoded private key from Base64');
                return normalizeKey(decoded);
            }
        } catch (e) {
            console.warn('[GoogleAuth] Failed to decode private key as Base64');
        }
    }

    // 3. Clean string bounds
    let clean = normalized
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/"/g, '')
        .replace(/^'|'$/g, '')
        .trim();

    // 4. Force strict PEM reconstruction if it contains the headers
    // OpenSSL throws "DECODER routines::unsupported" if the line width is wrong or newlines are missing
    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';

    if (clean.includes(header) && clean.includes(footer)) {
        const bodyStart = clean.indexOf(header) + header.length;
        const bodyEnd = clean.indexOf(footer);

        // Extract base64 payload and strip ALL whitespace (spaces pasted from .env files)
        const base64Body = clean.substring(bodyStart, bodyEnd).replace(/\s/g, '');

        // Chunk into 64 characters (PEM standard)
        const chunks = base64Body.match(/.{1,64}/g) || [];

        return `${header}\n${chunks.join('\n')}\n${footer}\n`;
    }

    return clean;
}

export function getAuth() {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    // Base64 decoding fallback for production CLI environments
    if (!serviceAccountKey && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64) {
        console.log('[GoogleAuth] Decoding service account key from Base64...');
        serviceAccountKey = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
    }

    if (serviceAccountEmail && serviceAccountKey) {
        const privateKey = normalizeKey(serviceAccountKey);

        if (!privateKey.includes('-----BEGIN')) {
            console.warn('[GoogleAuth] Private key is missing PEM headers. Connection will likely fail.');
        } else {
            console.log('[GoogleAuth] Private key established (PEM detected). Length:', privateKey.length);
        }

        return new google.auth.JWT({
            email: serviceAccountEmail,
            key: privateKey,
            scopes: SCOPES,
            subject: process.env.GOOGLE_SERVICE_ACCOUNT_SUBJECT || undefined,
        });
    }

    // Local/User OAuth fallback
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (clientId && clientSecret && refreshToken) {
        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
        );
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        return oauth2Client;
    }

    throw new Error('Google Calendar Authentication not configured. Please provide Service Account or OAuth credentials.');
}

export function getCalendarClient() {
    const auth = getAuth();
    return google.calendar({ version: 'v3', auth });
}

export function getCalendarId() {
    return process.env.GOOGLE_CALENDAR_ID || 'primary';
}

export function getBusinessHours() {
    const businessDaysStr = process.env.BUSINESS_DAYS || '1,2,3,4,5';
    const businessDays = businessDaysStr.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));

    return {
        start: parseInt(process.env.BUSINESS_HOURS_START || '9'),
        end: parseInt(process.env.BUSINESS_HOURS_END || '17'),
        days: businessDays,
        timezone: process.env.TIMEZONE || 'Asia/Kolkata',
    };
}

export function getAppointmentDuration() {
    return parseInt(process.env.APPOINTMENT_DURATION || '30');
}
