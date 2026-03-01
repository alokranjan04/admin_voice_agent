const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function getCalendarClient() {
    console.log("[GoogleAuth] Initializing Token Client...");
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
        },
        scopes: SCOPES,
    });
    console.log("[GoogleAuth] Token Client initialized successfully.");
    return google.calendar({ version: 'v3', auth });
}

async function testBooking() {
    try {
        const calendar = getCalendarClient();
        const startString = "2026-03-03T11:00:00";
        const endString = "2026-03-03T12:00:00";
        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

        const event = {
            summary: "Logistics requirement - Alok",
            description: "Service: Logistics requirement\nCustomer: Alok\nEmail: neha.high07@gmail.com",
            start: {
                dateTime: startString,
                timeZone: 'Asia/Kolkata',
            },
            end: {
                dateTime: endString,
                timeZone: 'Asia/Kolkata',
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 60 },
                ],
            },
        };

        console.log("Pushing object to Calendar:", JSON.stringify(event, null, 2));

        const response = await calendar.events.insert({
            calendarId,
            requestBody: event,
        });

        console.log("SUCCESS! Event ID:", response.data.id);
    } catch (err) {
        console.error("GOOGLE CALENDAR REJECTED PAYLOAD:", err.response?.data || err);
    }
}

testBooking();
