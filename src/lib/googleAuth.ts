import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

/**
 * Get Google Calendar API client with authentication
 * Supports both Service Account and OAuth 2.0
 */
export function getCalendarClient() {
    // Try Service Account first (recommended for production)
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (serviceAccountEmail && serviceAccountKey) {
        // Service Account authentication
        const auth = new JWT({
            email: serviceAccountEmail,
            key: serviceAccountKey.replace(/\\n/g, '\n'), // Handle escaped newlines
            scopes: ['https://www.googleapis.com/auth/calendar'],
        });

        return google.calendar({ version: 'v3', auth });
    }

    // Fallback to OAuth 2.0 (for development/testing)
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (clientId && clientSecret && refreshToken) {
        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            'urn:ietf:wg:oauth:2.0:oob' // For installed apps
        );

        oauth2Client.setCredentials({
            refresh_token: refreshToken,
        });

        return google.calendar({ version: 'v3', auth: oauth2Client });
    }

    throw new Error(
        'Google Calendar authentication not configured. Please set either:\n' +
        '1. GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (recommended), or\n' +
        '2. GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN'
    );
}

/**
 * Get the calendar ID to use
 */
export function getCalendarId(): string {
    return process.env.GOOGLE_CALENDAR_ID || 'primary';
}

/**
 * Get business hours configuration
 */
export function getBusinessHours() {
    return {
        start: parseInt(process.env.BUSINESS_HOURS_START || '9'), // 9 AM
        end: parseInt(process.env.BUSINESS_HOURS_END || '17'), // 5 PM
        days: (process.env.BUSINESS_DAYS || '1,2,3,4,5').split(',').map(d => parseInt(d)), // Mon-Fri
        timezone: process.env.TIMEZONE || 'America/New_York',
    };
}

/**
 * Get appointment duration in minutes
 */
export function getAppointmentDuration(): number {
    return parseInt(process.env.APPOINTMENT_DURATION || '60');
}
