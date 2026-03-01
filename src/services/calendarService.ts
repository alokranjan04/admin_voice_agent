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
        if (isNaN(requestedDate.getTime())) {
            return {
                available: false,
                reason: 'Invalid date',
                message: 'I could not understand the date. Could you please provide a specific date, like March 3rd or Tomorrow?'
            };
        }

        if (time) {
            const timeStr = time.toUpperCase();
            const isPM = timeStr.includes('PM');
            const isAM = timeStr.includes('AM');
            const parts = timeStr.replace(/[^\d:]/g, '').split(':');

            let hours = parseInt(parts[0], 10);
            let minutes = parts.length > 1 ? parseInt(parts[1], 10) : 0;

            if (!isNaN(hours)) {
                if (isPM && hours < 12) hours += 12;
                if (isAM && hours === 12) hours = 0;
                requestedDate.setHours(hours, minutes, 0, 0);
            }
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
        if (isNaN(requestedDate.getTime())) {
            return {
                success: false,
                availableSlots: [],
                message: 'I could not understand the date. Could you please provide a specific date, like March 3rd or Tomorrow?'
            };
        }
        const dayOfWeek = requestedDate.getDay();

        // Check if it's a business day
        if (!businessHours.days.includes(dayOfWeek)) {
            return {
                success: false,
                availableSlots: [],
                message: 'We are not open on this day. Our business days are Monday through Friday. Would you like me to check another day?'
            };
        }

        // Get all events for the day (Manually construct the ISO strings in the given timezone)
        const tzOffset = '+05:30'; // Hardcoded fallback or use process.env.TIMEZONE logic
        const yyyy = requestedDate.getFullYear();
        const mm = String(requestedDate.getMonth() + 1).padStart(2, '0');
        const dd = String(requestedDate.getDate()).padStart(2, '0');

        const startOfDayStr = `${yyyy}-${mm}-${dd}T00:00:00${tzOffset}`;
        const endOfDayStr = `${yyyy}-${mm}-${dd}T23:59:59${tzOffset}`;

        const response = await calendar.events.list({
            calendarId,
            timeMin: startOfDayStr,
            timeMax: endOfDayStr,
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

                return (slotStart.getTime() < eventEnd.getTime() && slotEnd.getTime() > eventStart.getTime());
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
        if (!details.time) {
            return {
                success: false,
                message: "I need a specific time like 11:00 AM to book the appointment. What time works best?"
            };
        }

        const timeStr = details.time.toUpperCase();
        const isPM = timeStr.includes('PM');
        const isAM = timeStr.includes('AM');
        const parts = timeStr.replace(/[^\d:]/g, '').split(':');

        let hours = parseInt(parts[0], 10);
        let minutes = parts.length > 1 ? parseInt(parts[1], 10) : 0;

        if (isNaN(hours)) {
            return {
                success: false,
                message: "I need a specific numerical time like 11:00 AM to book the appointment. What time works best?"
            };
        }

        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;

        const startDateTime = new Date(details.date);

        if (isNaN(startDateTime.getTime())) {
            return {
                success: false,
                message: "I couldn't understand the specific date. Please provide a full date, like March 3rd 2026."
            };
        }

        startDateTime.setHours(hours, minutes, 0, 0);

        const endDateTime = new Date(startDateTime.getTime() + slotDuration * 60000);

        // Format times locally without 'Z' suffix so Google uses the given timeZone
        const startString = `${details.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

        const endHours = endDateTime.getHours();
        const endMinutes = endDateTime.getMinutes();
        // Handle overflow to next day natively
        const endString = `${endDateTime.toISOString().split('T')[0]}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`;

        const finalName = details.customerName && details.customerName !== 'undefined' ? details.customerName : 'Client';

        // Check for duplicate/existing event at the exact same time
        const checkStartOffset = new Date(startString);
        checkStartOffset.setMinutes(checkStartOffset.getMinutes() - 1);
        const checkEndOffset = new Date(startString);
        checkEndOffset.setMinutes(checkEndOffset.getMinutes() + 1);

        const tzOffsetCreate = '+05:30'; // Hardcoded fallback or use TIMEZONE

        const existingEvents = await calendar.events.list({
            calendarId,
            timeMin: `${checkStartOffset.toISOString().split('.')[0]}${tzOffsetCreate}`,
            timeMax: `${checkEndOffset.toISOString().split('.')[0]}${tzOffsetCreate}`,
            singleEvents: true
        });

        if (existingEvents.data.items && existingEvents.data.items.length > 0) {
            const existingEvent = existingEvents.data.items[0];

            // Delete the old duplicate event since we are updating the title
            await calendar.events.delete({
                calendarId,
                eventId: existingEvent.id!
            });
        }

        // Create event
        const event = {
            summary: `${details.service || 'Appointment'} - ${finalName}`,
            description: `
Service: ${details.service || 'General Appointment'}
Customer: ${finalName}
${details.customerEmail ? `Email: ${details.customerEmail}` : ''}
${details.customerPhone ? `Phone: ${details.customerPhone}` : ''}
      `.trim(),
            start: {
                dateTime: startString,
                timeZone: getBusinessHours().timezone,
            },
            end: {
                dateTime: endString,
                timeZone: getBusinessHours().timezone,
            },
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
        });

        return {
            success: true,
            eventId: response.data.id,
            eventLink: response.data.htmlLink,
            message: `Perfect! I've booked your ${details.service || 'appointment'} for ${formatDateTime(startDateTime)}. ${details.customerEmail ? 'You will receive a confirmation email shortly.' : 'Your appointment is confirmed!'}`
        };
    } catch (error: any) {
        console.error('Error creating event:', error.response?.data || error);
        throw new Error(`Failed to create appointment: ${JSON.stringify(error.response?.data || error.message)}`);
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
