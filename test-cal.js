const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function testCal() {
    try {
        const credentialsText = process.env.GOOGLE_CREDENTIALS;
        const credentials = JSON.parse(credentialsText);

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/calendar.events'],
        });
        const calendar = google.calendar({ version: 'v3', auth });

        const event = {
            summary: "Test Event",
            start: { dateTime: new Date(Date.now() + 3600000).toISOString() },
            end: { dateTime: new Date(Date.now() + 7200000).toISOString() },
            attendees: [{ email: "ranjanalok2032@gmail.com" }]
        };

        const calendarId = process.env.GOOGLE_CALENDAR_ID;

        console.log("Attempt 1: sendUpdates='all'");
        try {
            await calendar.events.insert({
                calendarId,
                requestBody: event,
                sendUpdates: 'all'
            });
            console.log("Success with sendUpdates=all");
        } catch (e) {
            console.error("Failed Attempt 1:", e.message);
            console.log("\nAttempt 2: sendUpdates='none'");
            try {
                await calendar.events.insert({
                    calendarId,
                    requestBody: event,
                    sendUpdates: 'none'
                });
                console.log("Success with sendUpdates=none");
            } catch (e2) {
                console.error("Failed Attempt 2:", e2.message);
            }
        }
    } catch (err) {
        console.error("Init error", err);
    }
}
testCal();
