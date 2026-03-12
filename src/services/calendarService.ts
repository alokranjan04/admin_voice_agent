import { getCalendarClient, getCalendarId, getBusinessHours, getAppointmentDuration } from '../lib/googleAuth';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

/**
 * Safe date parser that treats YYYY-MM-DD strings as LOCAL time, not UTC.
 * JavaScript's `new Date("YYYY-MM-DD")` parses as UTC midnight (which
 * rolls back a day in IST +05:30). This helper avoids that shift.
 */
function parseDateSafe(dateStr: string): Date {
    // Match YYYY-MM-DD pattern
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const [, y, m, d] = isoMatch;
        // Create in local time (no UTC shift)
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    // For natural language strings like "March 8 2026", `new Date` is fine
    return new Date(dateStr);
}

/**
 * Helper to ensure local Date objects from UTC servers securely format into absolute ISO strings with exact timezone offsets.
 */
function buildTargetTzString(date: Date, tzOffset: string): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}${tzOffset}`;
}

/**
 * Normalizes a phone number by removing all non-numeric characters except the leading + (if any)
 */
function normalizePhone(phone: string): string {
    if (!phone) return "";
    return phone.replace(/[^\d+]/g, '');
}

/**
 * Check if a specific date/time is available
 */
export async function checkAvailability(date: string, time?: string, service?: string) {
    try {
        const calendar = getCalendarClient();
        const calendarId = getCalendarId();
        const businessHours = getBusinessHours();

        // Parse the date and time
        const requestedDate = parseDateSafe(date);
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
        const tzOffset = '+05:30'; // Hardcoded for IST, can be dynamic later

        const startTime = buildTargetTzString(requestedDate, tzOffset);
        const endTimeDate = new Date(requestedDate.getTime() + duration * 60000);
        const endTime = buildTargetTzString(endTimeDate, tzOffset);

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

        // Parse the date (safe: avoid UTC shift for YYYY-MM-DD strings)
        const requestedDate = parseDateSafe(date);
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

            const absoluteSlotStartTime = new Date(buildTargetTzString(slotStart, tzOffset)).getTime();
            const absoluteSlotEndTime = new Date(buildTargetTzString(slotEnd, tzOffset)).getTime();

            // Check if this slot conflicts with any booked event
            const hasConflict = bookedEvents.some(event => {
                const eventStart = new Date(event.start?.dateTime || event.start?.date || '').getTime();
                const eventEnd = new Date(event.end?.dateTime || event.end?.date || '').getTime();

                return (absoluteSlotStartTime < eventEnd && absoluteSlotEndTime > eventStart);
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
    company?: string;
    industry?: string;
    problem?: string;
    pickupAddress?: string;
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

        const startDateTime = parseDateSafe(details.date);

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

        // 🚨 CRITICAL FIX: Explicitly double-check availability to prevent double-booking 
        // even if the LLM forgot to call the findAvailableSlots or checkAvailability tools first.
        try {
            const availability = await checkAvailability(details.date, details.time);
            if (!availability.available && availability.reason === 'Time slot already booked') {
                return {
                    success: false,
                    message: "I'm so sorry, but it looks like that exact time slot just became unavailable. Could we try a different time or date?"
                };
            }
        } catch (e: any) {
            console.warn('[Calendar] Pre-booking availability check failed, proceeding with caution...', e.message);
        }

        const finalName = details.customerName && details.customerName !== 'undefined' ? details.customerName : 'Client';

        // Use the dynamically inferred service if available, otherwise default to "TellYourJourney Demo"
        const serviceNameRaw = details.service && details.service !== 'undefined' ? details.service : 'TellYourJourney Demo';
        // Capitalize the first letter for cleaner aesthetic
        const serviceName = serviceNameRaw.charAt(0).toUpperCase() + serviceNameRaw.slice(1);

        const eventTitle = `${serviceName}: ${finalName}${details.company && details.company !== 'undefined' ? ` (${details.company})` : ''}`;

        // --- Start of Manual ICS Helper ---
        const sendManualIcsInvite = async () => {
            if (!details.customerEmail) return;
            try {
                const gmailUser = process.env.GMAIL_USER;
                const gmailPass = process.env.GMAIL_APP_PASSWORD;
                if (!gmailUser || !gmailPass) {
                    console.warn('[Calendar ICS] Missing GMAIL credentials, cannot send manual invite.');
                    return;
                }

                // Format dates for ICS (YYYYMMDDTHHMMSSZ, must be UTC)
                const formatIcsTime = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

                const icsContent = [
                    'BEGIN:VCALENDAR',
                    'VERSION:2.0',
                    'PRODID:-//TellYourJourney/VoiceAI//EN',
                    'CALSCALE:GREGORIAN',
                    'METHOD:REQUEST',
                    'BEGIN:VEVENT',
                    `UID:event-${Date.now()}@tellyourjourney.com`,
                    `DTSTAMP:${formatIcsTime(new Date())}`,
                    `DTSTART:${formatIcsTime(startDateTime)}`,
                    `DTEND:${formatIcsTime(endDateTime)}`,
                    `SUMMARY:${eventTitle}`,
                    `DESCRIPTION:${details.problem ? 'Problem to solve: ' + details.problem : 'Voice AI Demo Call'}`,
                    `ORGANIZER;CN="TellYourJourney":mailto:${gmailUser}`,
                    `ATTENDEE;RSVP=TRUE;CN="${finalName}":mailto:${details.customerEmail}`,
                    'STATUS:CONFIRMED',
                    'END:VEVENT',
                    'END:VCALENDAR'
                ].join('\r\n');

                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: gmailUser, pass: gmailPass }
                });

                await transporter.sendMail({
                    from: `"TellYourJourney AI" <${gmailUser}>`,
                    to: details.customerEmail,
                    subject: `Invitation: ${eventTitle}`,
                    text: `Hi ${finalName},\n\nYour ${details.service || 'appointment'} has been successfully booked for ${formatDateTime(startDateTime)}.\n\nPlease find the calendar invite attached.\n\nBest,\nTellYourJourney Team`,
                    attachments: [
                        {
                            filename: 'invite.ics',
                            content: icsContent,
                            contentType: 'text/calendar; method=REQUEST'
                        }
                    ]
                });
                console.log(`[Calendar ICS] Manual calendar invite successfully sent to ${details.customerEmail}`);
            } catch (err: any) {
                console.error(`[Calendar ICS] Failed to send manual invite:`, err.message);
            }
        };

        const sendSmsConfirmation = async (phone: string, text: string) => {
            if (!phone) return;
            try {
                const from = process.env.TWILIO_PHONE_NUMBER;
                if (!from) {
                    console.warn('[Twilio SMS] Missing TWILIO_PHONE_NUMBER, cannot send SMS.');
                    return;
                }
                const cleanPhone = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;
                
                await twilioClient.messages.create({
                    body: text,
                    from: from,
                    to: cleanPhone
                });
                console.log(`[Twilio SMS] Confirmation sent to ${cleanPhone}`);
            } catch (err: any) {
                console.error(`[Twilio SMS] Failed to send SMS:`, err.message);
            }
        };
        // --- End of Manual ICS Helper ---



        // Create event
        const event = {
            summary: eventTitle,
            description: `
Service: ${details.service || 'General Appointment'}
Customer: ${finalName}
${details.customerPhone ? `Phone: ${details.customerPhone}` : ''}
${details.pickupAddress ? `Pickup Address: ${details.pickupAddress}` : ''}
${details.company ? `Company: ${details.company}` : ''}
${details.industry ? `Industry: ${details.industry}` : ''}
${details.problem ? `Problem to solve: ${details.problem}` : ''}
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

        let FinalEvent: any = event;
        const shouldInvite = details.customerEmail && details.customerEmail.includes('@');

        if (shouldInvite) {
            FinalEvent.attendees = [{ email: details.customerEmail }];
        }

        try {
            const response = await calendar.events.insert({
                calendarId,
                requestBody: FinalEvent,
                sendUpdates: shouldInvite ? 'all' : 'none'
            });

            // Trigger SMS Confirmation
            if (details.customerPhone) {
                const dateStr = formatDateTime(startDateTime);
                const smsText = `Confirmed: Your ${details.service || 'booking'} is scheduled for ${dateStr}. Pickup Address: ${details.pickupAddress || 'To be confirmed'}. Thank you!`;
                await sendSmsConfirmation(details.customerPhone, smsText);
            }

            return {
                success: true,
                eventId: response.data.id,
                eventLink: response.data.htmlLink,
                message: `Perfect! I've booked your ${details.service || 'appointment'} for ${formatDateTime(startDateTime)}. ${details.customerEmail ? 'You will receive a confirmation email shortly.' : 'Your appointment is confirmed!'}`
            };
        } catch (insertError: any) {
            // Unverified OAuth Apps / GSuite Restrictions often fail with 400/403 when dispatching `sendUpdates: all` to external guests.
            // If it fails, fallback immediately to safely booking the event on the Admin calendar without the restricted guests.
            if (shouldInvite) {
                console.warn('[Calendar] Failed to sendUpdates: "all". Attempting to retain attendees with sendUpdates: "none"...', insertError.message);

                try {
                    // TIER 1: Keep attendees but don't email them.
                    const tier1Response = await calendar.events.insert({
                        calendarId,
                        requestBody: FinalEvent,
                        sendUpdates: 'none'
                    });

                    // Google API blocked native emails, so we manually send the ICS via standard SMTP
                    await sendManualIcsInvite();

                    return {
                        success: true,
                        eventId: tier1Response.data.id,
                        eventLink: tier1Response.data.htmlLink,
                        message: `Perfect! I've booked your ${details.service || 'appointment'} for ${formatDateTime(startDateTime)}. Your appointment is confirmed and an invite has been sent to your email!`
                    };
                } catch (tier1Error: any) {
                    // TIER 2: If the email itself is completely invalid, strip the guest list to save the booking.
                    console.warn('[Calendar] Guests completely rejected. Stripping attendees block entirely.', tier1Error.message);
                    delete FinalEvent.attendees;

                    const tier2Response = await calendar.events.insert({
                        calendarId,
                        requestBody: FinalEvent,
                        sendUpdates: 'none'
                    });

                    // Even if Google absolutely hated the email string, we still try our own SMTP delivery
                    await sendManualIcsInvite();

                    return {
                        success: true,
                        eventId: tier2Response.data.id,
                        eventLink: tier2Response.data.htmlLink,
                        message: `Perfect! I've booked your ${details.service || 'appointment'} for ${formatDateTime(startDateTime)}. Your appointment is confirmed on our calendar!`
                    };
                }
            }
            throw insertError;
        }
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

/**
 * Cancel a calendar event/appointment
 */
export async function cancelEvent(details: { date: string; time?: string; name?: string; email?: string; callerPhone?: string }) {
    try {
        const calendar = getCalendarClient();
        const calendarId = getCalendarId();

        const requestedDate = parseDateSafe(details.date);
        if (isNaN(requestedDate.getTime())) {
            return {
                success: false,
                message: "I couldn't understand the specific date. Please provide a full date, like March 3rd."
            };
        }

        const fullDayStart = new Date(requestedDate);
        fullDayStart.setHours(0, 0, 0, 0);
        const fullDayEnd = new Date(requestedDate);
        fullDayEnd.setHours(23, 59, 59, 999);

        // Ideally we would pull tzOffset dynamically but reusing the fallback pattern from the file
        const tzOffset = '+05:30';

        const existingEvents = await calendar.events.list({
            calendarId,
            timeMin: buildTargetTzString(fullDayStart, tzOffset),
            timeMax: buildTargetTzString(fullDayEnd, tzOffset),
            singleEvents: true
        });

        const events = existingEvents.data.items || [];

        let eventToDelete = null;

        for (const evt of events) {
            const summary = (evt.summary || '').toLowerCase();
            const description = (evt.description || '').toLowerCase();

            // Authentication: The caller must explicitly provide the booking email, or their verified caller ID must match the booking phone.
            const matchEmail = details.email && details.email !== 'Unknown' && (
                summary.includes(details.email.toLowerCase()) ||
                description.includes(details.email.toLowerCase()) ||
                evt.attendees?.some(a => a.email?.toLowerCase() === details.email?.toLowerCase())
            );

            // Note: details.callerPhone usually starts with '+'
            const searchPhone = normalizePhone(details.callerPhone || '');
            const matchPhone = searchPhone && searchPhone !== 'Unknown' && normalizePhone(description).includes(searchPhone);

            let isTimeMatch = true;
            if (details.time && evt.start?.dateTime) {
                const timeStr = details.time.toUpperCase();
                const isPM = timeStr.includes('PM');
                const isAM = timeStr.includes('AM');
                const parts = timeStr.replace(/[^\d:]/g, '').split(':');

                let hours = parseInt(parts[0], 10);
                const minutes = parts.length > 1 ? parseInt(parts[1], 10) : 0;

                if (!isNaN(hours)) {
                    if (isPM && hours < 12) hours += 12;
                    if (isAM && hours === 12) hours = 0;

                    const timeTarget = `T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                    if (!evt.start.dateTime.includes(timeTarget)) {
                        isTimeMatch = false;
                    }
                }
            }

            // We no longer rely purely on `matchName` for cancellation to prevent unauthorized manipulation. 
            // The request must mathematically authenticate via Email OR Phone.
            if ((matchEmail || matchPhone) && isTimeMatch) {
                eventToDelete = evt;
                break;
            }
        }

        if (!eventToDelete) {
            return {
                success: false,
                message: `I couldn't find a matching appointment on ${formatDate(requestedDate)} at ${details.time || 'that time'}. Please note: for security reasons, you must call from the same phone number used to book the appointment, or provide the exact email address on file.`
            };
        }

        await calendar.events.delete({
            calendarId,
            eventId: eventToDelete.id!
        });

        return {
            success: true,
            message: `I have successfully canceled your appointment on ${formatDate(requestedDate)}.`
        };

    } catch (error: any) {
        console.error('Error canceling event:', error);
        throw new Error(`Failed to cancel appointment: ${error.message}`);
    }
}
