import { BusinessConfig } from '@/types/agent-ui/types';

const CALENDAR_ID = 'primary';

async function fetchWithTimeout(resource: string, options: any = {}) {
    const { timeout = 15000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
}

/**
 * INTELLIGENT DATE CORRECTION
 * Forces any date to the target year 2026.
 */
function normalizeDateYear(dateTimeStr: string): { normalizedDate: string, wasCorrected: boolean } {
    if (!dateTimeStr) {
        return { normalizedDate: new Date().toISOString(), wasCorrected: false };
    }

    try {
        const cleanDateTimeStr = dateTimeStr.replace(/(Z|[+-]\d{2}:\d{2})$/, '');
        const inputDate = new Date(cleanDateTimeStr);
        if (isNaN(inputDate.getTime())) {
            return { normalizedDate: new Date().toISOString(), wasCorrected: false };
        }

        const currentYear = 2026;
        const inputYear = inputDate.getFullYear();

        if (inputYear !== currentYear) {
            const correctedDate = new Date(inputDate);
            correctedDate.setFullYear(currentYear);

            const month = String(correctedDate.getMonth() + 1).padStart(2, '0');
            const day = String(correctedDate.getDate()).padStart(2, '0');
            const hours = String(correctedDate.getHours()).padStart(2, '0');
            const minutes = String(correctedDate.getMinutes()).padStart(2, '0');
            const seconds = String(correctedDate.getSeconds()).padStart(2, '0');

            const result = `${currentYear}-${month}-${day}T${hours}:${minutes}:${seconds}`;
            return { normalizedDate: result, wasCorrected: true };
        }

        return { normalizedDate: cleanDateTimeStr, wasCorrected: false };
    } catch (e) {
        return { normalizedDate: new Date().toISOString(), wasCorrected: false };
    }
}

export const serverCalendarService = {
    async checkAvailability(accessToken: string, dateTimeStr: string, config?: BusinessConfig) {
        const { normalizedDate, wasCorrected } = normalizeDateYear(dateTimeStr);
        const dateObj = new Date(normalizedDate);
        if (isNaN(dateObj.getTime())) return { available: false, message: 'Invalid date' };

        const day = dateObj.getDay();
        const hour = dateObj.getHours();

        // Default: Mon-Sat, 9 AM - 6 PM
        let allowedDays = [1, 2, 3, 4, 5, 6];
        let startHour = 9;
        let endHour = 18;

        if (config?.locations?.[0]) {
            const loc = config.locations[0];
            if (loc.operatingDays) {
                const dayMap: any = { 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6 };
                allowedDays = loc.operatingDays.map(d => dayMap[d.toLowerCase()]).filter(d => d !== undefined);
            }

            const hs = loc.operatingHours || "";
            const times = hs.match(/(\d{1,2})(?::\d{2})?\s*(AM|PM|am|pm)?/g);
            if (times && times.length >= 2) {
                const parseH = (t: string) => {
                    const match = t.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/i);
                    if (!match) return null;
                    let h = parseInt(match[1]);
                    const m = parseInt(match[2] || "0");
                    const ampm = match[3]?.toLowerCase();
                    if (ampm === 'pm' && h < 12) h += 12;
                    if (ampm === 'am' && h === 12) h = 0;
                    return h + (m / 60);
                };
                const start = parseH(times[0]);
                const end = parseH(times[times.length - 1]);
                if (start !== null) startHour = start;
                if (end !== null) endHour = end;
            }
        }

        if (!allowedDays.includes(day) || hour < startHour || hour >= endHour) {
            return { available: false, message: 'Outside business hours', checkedDateTime: normalizedDate, wasCorrected };
        }

        try {
            const timeMin = dateObj.toISOString();
            const timeMax = new Date(dateObj.getTime() + 60 * 60 * 1000).toISOString();
            const res = await fetchWithTimeout(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (!res.ok) {
                return { available: false, message: `Google API Error: ${res.status}`, checkedDateTime: normalizedDate, wasCorrected, errorStatus: res.status };
            }

            const data = await res.json();
            const busy = data.items && data.items.length > 0;
            return {
                status: !busy ? 'success' : 'unavailable',
                nextAction: !busy ? 'ask_patient_name' : 'offer_alternatives',
                available: !busy,
                message: busy ? 'Slot busy' : 'Slot available',
                checkedDateTime: normalizedDate,
                wasCorrected
            };
        } catch (e: any) {
            console.error("[Server Calendar] Exception:", e);
            return { available: true, message: 'Fetch error, assuming available', checkedDateTime: normalizedDate, wasCorrected };
        }
    },

    async findAvailableSlots(accessToken: string, startDateStr: string, config?: BusinessConfig) {
        const { normalizedDate, wasCorrected } = normalizeDateYear(startDateStr || new Date().toISOString());
        const start = new Date(normalizedDate);

        // Extract business hours
        let allowedDays = [1, 2, 3, 4, 5, 6];
        let startHour = 9;
        let endHour = 18;

        if (config?.locations?.[0]) {
            const loc = config.locations[0];
            if (loc.operatingDays) {
                const dayMap: any = { 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6 };
                allowedDays = loc.operatingDays.map(d => dayMap[d.toLowerCase()]).filter(d => d !== undefined);
            }

            const hs = loc.operatingHours || "";
            const times = hs.match(/(\d{1,2})(?::\d{2})?\s*(AM|PM|am|pm)?/g);
            if (times && times.length >= 2) {
                const parseH = (t: string) => {
                    const match = t.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/i);
                    if (!match) return null;
                    let h = parseInt(match[1]);
                    const m = parseInt(match[2] || "0");
                    const ampm = match[3]?.toLowerCase();
                    if (ampm === 'pm' && h < 12) h += 12;
                    if (ampm === 'am' && h === 12) h = 0;
                    return h + (m / 60);
                };
                const startHourParsed = parseH(times[0]);
                const endHourParsed = parseH(times[times.length - 1]);
                if (startHourParsed !== null) startHour = startHourParsed;
                if (endHourParsed !== null) endHour = endHourParsed;
            }
        }

        try {
            const res = await fetchWithTimeout(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?timeMin=${start.toISOString()}&timeMax=${new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()}&singleEvents=true`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (!res.ok) {
                return { slots: [], message: `Google API error: ${res.status}`, wasCorrected, errorStatus: res.status };
            }

            const data = await res.json();
            const busyEvents = data.items || [];
            const result = [];

            for (let d = 0; d < 7; d++) {
                const dayDate = new Date(start);
                dayDate.setDate(dayDate.getDate() + d);
                if (!allowedDays.includes(dayDate.getDay())) continue;

                for (let h = startHour; h < endHour; h += 2) {
                    const s = new Date(dayDate);
                    s.setHours(h, 0, 0, 0);
                    if (s < new Date()) continue;
                    const e = new Date(s.getTime() + 45 * 60 * 1000);
                    const isBusy = busyEvents.some((ev: any) => {
                        const es = new Date(ev.start.dateTime || ev.start.date);
                        const ee = new Date(ev.end.dateTime || ev.end.date);
                        return (s < ee && e > es);
                    });
                    if (!isBusy) {
                        result.push(s.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }));
                    }
                    if (result.length >= 5) break;
                }
                if (result.length >= 5) break;
            }
            if (result.length > 0) {
                return {
                    status: 'success',
                    nextAction: 'ask_patient_name',
                    slots: result,
                    message: 'Success',
                    wasCorrected
                };
            } else {
                return {
                    status: 'unavailable',
                    nextAction: 'offer_alternatives',
                    slots: [],
                    message: 'No slots found',
                    wasCorrected
                };
            }
        } catch (e: any) {
            console.error("[Server Calendar] Slots Exception:", e);
            return { slots: [], message: 'Error', wasCorrected };
        }
    },

    async createEvent(accessToken: string, bookingDetails: { name: string; phone: string; email: string; service: string; dateTime: string }) {
        const { normalizedDate } = normalizeDateYear(bookingDetails.dateTime);
        try {
            const start = new Date(normalizedDate);
            const end = new Date(start.getTime() + 45 * 60 * 1000);

            // Fetch admin email from token info (optional, or hardcode/pass from config)
            const adminEmail = "alokranjan04@gmail.com";

            const rawEmail = bookingDetails.email || "";
            const userEmail = rawEmail.includes('@') ? rawEmail.replace(/\s/g, '') : "missing-email@example.com";

            const event = {
                summary: `${bookingDetails.service || 'Appointment'} - ${bookingDetails.name || 'Customer'}`,
                description: `Phone: ${bookingDetails.phone || 'N/A'}\nEmail: ${bookingDetails.email || 'N/A'}`,
                start: { dateTime: start.toISOString(), timeZone: 'UTC' },
                end: { dateTime: end.toISOString(), timeZone: 'UTC' },
                attendees: [
                    { email: userEmail },
                    { email: adminEmail }
                ],
                conferenceData: {
                    createRequest: {
                        requestId: `meet-${Date.now()}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                }
            };

            const res = await fetchWithTimeout(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?sendUpdates=all&conferenceDataVersion=1`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                return { success: false, error: errorData.error?.message, confirmedDateTime: normalizedDate };
            }

            const data = await res.json();
            return { success: true, eventLink: data.htmlLink, confirmedDateTime: normalizedDate };
        } catch (e: any) {
            console.error("[Server Calendar] Create Exception:", e);
            return { success: false, error: e.message, confirmedDateTime: normalizedDate };
        }
    }
};
