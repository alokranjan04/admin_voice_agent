const { google } = require('googleapis');
require('dotenv').config({ path: '.env' });

async function testAuth() {
    try {
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

        // Pass the string Exactly as dotenv parses it, without any mutations
        const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

        console.log("Email:", clientEmail);
        console.log("Key Starts:", privateKey.substring(0, 30));

        const auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        });

        console.log("1. Attempting to get access token...");
        const token = await auth.getAccessToken();
        console.log("Token SUCCESS!");

        console.log("2. Attempting to fetch calendar events...");
        const calendar = google.calendar({ version: 'v3', auth });
        const res = await calendar.events.list({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            timeMin: new Date().toISOString(),
            maxResults: 1
        });
        console.log("Calendar SUCCESS!");
    } catch (err) {
        console.error("Auth Error:", err.message);
    }
}

testAuth();
