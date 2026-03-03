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
                return normalizeKey(decoded); // Recurse to handle any \n inside the decoded string
            }
        } catch (e) {
            console.warn('[GoogleAuth] Failed to decode private key as Base64');
        }
    }

    // 3. Standard PEM normalization
    return normalized
        .replace(/\\n/g, '\n')        // Fix escaped newlines (\n)
        .replace(/\\r/g, '\r')        // Fix escaped carriage returns (\r)
        .replace(/"/g, '')            // Strip double quotes
        .replace(/^'|'$/g, '')        // Strip single quotes
        .trim();
}

export function getAuth() {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

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
