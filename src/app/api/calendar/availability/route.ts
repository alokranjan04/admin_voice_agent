import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(req: Request) {
    try {
        const privateKeyStr = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const calendarId = process.env.GOOGLE_CALENDAR_ID;

        if (!privateKeyStr || !clientEmail || !calendarId) {
            console.error('Missing Google Calendar Credentials or Calendar ID');
            return NextResponse.json({ error: 'Calendar integration credentials missing.' }, { status: 500 });
        }

        // Fix escaped newlines if user pastes double backslashes
        // And remove surrounding quotes that dotenv might stringify
        const privateKey = privateKeyStr.replace(/\\n/g, '\n').replace(/"/g, '');

        const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

        // Initialize Google Auth client
        const auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: SCOPES,
        });

        const calendar = google.calendar({ version: 'v3', auth });

        // Calculate time range (from now to 7 days from now)
        const timeMin = new Date();
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 7);

        // Fetch events for the next 7 days
        const response = await calendar.events.list({
            calendarId: calendarId,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            maxResults: 100,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items || [];

        // Simple mock calculations for availability based on returned events.
        // A robust system would intersect free/busy times with business hours.
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const eventsToday = events.filter(e => {
            if (!e.start?.dateTime) return false;
            const eventDate = new Date(e.start.dateTime);
            return eventDate.toDateString() === today.toDateString();
        });

        // Assuming a standard 9-5 schedule and 1-hour meetings for a simple metric
        const maxSlotsToday = 8;
        const availableSlotsToday = Math.max(0, maxSlotsToday - eventsToday.length);

        return NextResponse.json({
            success: true,
            metrics: {
                totalEventsNext7Days: events.length,
                eventsToday: eventsToday.length,
                availableSlotsToday: availableSlotsToday,
                isHighlyAvailable: availableSlotsToday > 4,
            },
            events: events.map(e => ({
                id: e.id,
                summary: e.summary || 'Busy',
                startTime: e.start?.dateTime || e.start?.date,
                endTime: e.end?.dateTime || e.end?.date,
                htmlLink: e.htmlLink
            })).slice(0, 5) // Send top 5 contextually
        });

    } catch (error: any) {
        console.error('Calendar API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch calendar data' },
            { status: 500 }
        );
    }
}
