import { getCalendarClient, getCalendarId, getBusinessHours, getAppointmentDuration } from '../lib/googleAuth';

/**
 * Check if a specific date/time is available
 */
export async function checkAvailability(date: string, time?: string, service?: string) {
    try {
        const calendar = getCalendarClient();
        const calendarId = getCalendarId();
        const businessHours = getBusinessHours();

        // Parse the date and time
        const requestedDate = new Date(date);

        if (time) {
            const [hours, minutes] = time.split(':').map(Number);
            requestedDate.setHours(hours, minutes, 0, 0);
        }

        // Check if it's within business hours
        const dayOfWeek = requestedDate.getDay();
        const hour = requestedDate.getHours();

        if (!businessHours.days.includes(dayOfWeek)) {
            return {
                available: false,
                reason: 'Outside business days',
                message: 'We are not open on this day. Our business days are Monday through Friday.'
            };
        }

        if (hour < businessHours.start || hour >= businessHours.end) {
            return {
                available: false,
                reason: 'Outside business hours',
                message: `This time is outside our business hours (${businessHours.start}:00 AM - ${businessHours.end}:00 PM).`
            };
        }

        // Check Google Calendar for conflicts
        const duration = getAppointmentDuration();
        const startTime = requestedDate.toISOString();
        const endTime = new Date(requestedDate.getTime() + duration * 60000).toISOString();

        const response = await calendar.events.list({
            calendarId,
            timeMin: startTime,
            timeMax: endTime,
            singleEvents: true,
        });

        const events = response.data.items || [];

        if (events.length > 0) {
            return {
                available: false,
                reason: 'Time slot already booked',
                message: 'This time slot is already booked. Would you like me to find other available times?'
            };
        }

        return {
            available: true,
            message: `Yes, ${formatDateTime(requestedDate)} is available! Would you like to book this time?`
        };
    } catch (error: any) {
        console.error('Error checking availability:', error);
        throw new Error(`Failed to check availability: ${error.message}`);
    }
}

/**
 * Find all available slots for a given date
 */
export async function findAvailableSlots(date: string, service?: string, duration?: number) {
    try {
        const calendar = getCalendarClient();
        const calendarId = getCalendarId();
        const businessHours = getBusinessHours();
        const slotDuration = duration || getAppointmentDuration();

        // Parse the date
        const requestedDate = new Date(date);
        const dayOfWeek = requestedDate.getDay();

        // Check if it's a business day
        if (!businessHours.days.includes(dayOfWeek)) {
            return {
                success: false,
                availableSlots: [],
                message: 'We are not open on this day. Our business days are Monday through Friday. Would you like me to check another day?'
            };
        }

        // Get all events for the day
        const startOfDay = new Date(requestedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(requestedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const response = await calendar.events.list({
            calendarId,
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        const bookedEvents = response.data.items || [];

        // Generate all possible time slots
        const slots = [];
        const currentDate = new Date(requestedDate);
        currentDate.setHours(businessHours.start, 0, 0, 0);

        while (currentDate.getHours() < businessHours.end) {
            const slotStart = new Date(currentDate);
            const slotEnd = new Date(currentDate.getTime() + slotDuration * 60000);

            // Check if this slot conflicts with any booked event
            const hasConflict = bookedEvents.some(event => {
                const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
                const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');

                return (slotStart < eventEnd && slotEnd > eventStart);
            });

            if (!hasConflict && slotEnd.getHours() <= businessHours.end) {
                slots.push({
                    date: slotStart.toISOString().split('T')[0],
                    time: formatTime(slotStart),
                    datetime: slotStart.toISOString(),
                    duration: `${slotDuration} minutes`
                });
            }

            // Move to next slot (every 30 minutes or slot duration, whichever is smaller)
            currentDate.setMinutes(currentDate.getMinutes() + Math.min(30, slotDuration));
        }

        if (slots.length === 0) {
            return {
                success: false,
                availableSlots: [],
                message: `Unfortunately, there are no available slots on ${formatDate(requestedDate)}. Would you like me to check another day?`
            };
        }

        // Limit to first 5 slots to avoid overwhelming the user
        const limitedSlots = slots.slice(0, 5);
        const times = limitedSlots.map(s => s.time).join(', ');
        const dateStr = formatDate(requestedDate);

        return {
            success: true,
            availableSlots: limitedSlots,
            message: `I found ${limitedSlots.length} available time slot${limitedSlots.length > 1 ? 's' : ''} on ${dateStr}: ${times}. Which time works best for you?`
        };
    } catch (error: any) {
        console.error('Error finding available slots:', error);
        throw new Error(`Failed to find available slots: ${error.message}`);
    }
}

/**
 * Create a calendar event/appointment
 */
export async function createEvent(details: {
    date: string;
    time: string;
    service?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    duration?: number;
}) {
    try {
        const calendar = getCalendarClient();
        const calendarId = getCalendarId();
        const slotDuration = details.duration || getAppointmentDuration();

        // Parse date and time
        const [hours, minutes] = details.time.split(':').map(Number);
        const startDateTime = new Date(details.date);
        startDateTime.setHours(hours, minutes, 0, 0);

        const endDateTime = new Date(startDateTime.getTime() + slotDuration * 60000);

        // Create event
        const event = {
            summary: `${details.service || 'Appointment'} - ${details.customerName}`,
            description: `
Service: ${details.service || 'General Appointment'}
Customer: ${details.customerName}
${details.customerEmail ? `Email: ${details.customerEmail}` : ''}
${details.customerPhone ? `Phone: ${details.customerPhone}` : ''}
      `.trim(),
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: getBusinessHours().timezone,
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: getBusinessHours().timezone,
            },
            attendees: details.customerEmail ? [{ email: details.customerEmail }] : [],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, // 1 day before
                    { method: 'popup', minutes: 60 }, // 1 hour before
                ],
            },
        };

        const response = await calendar.events.insert({
            calendarId,
            requestBody: event,
            sendUpdates: details.customerEmail ? 'all' : 'none',
        });

        return {
            success: true,
            eventId: response.data.id,
            eventLink: response.data.htmlLink,
            message: `Perfect! I've booked your ${details.service || 'appointment'} for ${formatDateTime(startDateTime)}. ${details.customerEmail ? 'You will receive a confirmation email shortly.' : 'Your appointment is confirmed!'}`
        };
    } catch (error: any) {
        console.error('Error creating event:', error);
        throw new Error(`Failed to create appointment: ${error.message}`);
    }
}

/**
 * Helper: Format time to 12-hour format
 */
function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Helper: Format date to readable format
 */
function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Helper: Format date and time together
 */
function formatDateTime(date: Date): string {
    return `${formatDate(date)} at ${formatTime(date)}`;
}
