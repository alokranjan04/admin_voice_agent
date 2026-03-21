const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testOAuth() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    console.log('Testing OAuth with:', {
        clientId: clientId ? clientId.substring(0, 10) + '...' : 'MISSING',
        clientSecret: clientSecret ? 'PRESENT' : 'MISSING',
        refreshToken: refreshToken ? refreshToken.substring(0, 10) + '...' : 'MISSING'
    });

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'http://localhost:3000/api/auth/callback/google'
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });

    try {
        const tokenResponse = await oauth2Client.getAccessToken();
        console.log('Successfully got access token!');
        
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const res = await calendar.events.list({
            calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
            timeMin: new Date().toISOString(),
            maxResults: 1
        });
        console.log('Successfully listed events! Count:', res.data.items.length);
    } catch (error) {
        console.error('OAuth Test Failed:', error.message);
        if (error.response) {
            console.error('Response details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testOAuth();
