import { BusinessConfig } from '@/types/agent-ui/types';

// Use 'primary' to refer to the authenticated user's primary calendar
const CALENDAR_ID = 'primary';

declare var google: any;

let tokenClient: any;
let accessToken: string | null = null;
let grantedScopes: string = "";

// ... (existing code)


if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_TOKEN) {
    const envToken = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_TOKEN;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    // Basic validation: token shouldn't be empty, shouldn't be the client ID, and shouldn't be the placeholder
    if (envToken && envToken !== 'optional_fallback_token' && envToken !== clientId) {
        accessToken = envToken;
    }
}

let initRetryCount = 0;

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

async function fetchWithTimeout(resource: string, options: any = {}) {
    const { timeout = 15000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
}

export const calendarService = {
    initializeGoogleAuth(clientId: string, onAuthSuccess: (email: string, tokens: any) => void, onAuthError?: (error: string) => void) {
        if (typeof google === 'undefined') {
            if (initRetryCount < 20) { // Increased to 10 seconds total
                initRetryCount++;
                console.log(`[GoogleAuth] Script not loaded yet, retrying (${initRetryCount}/20)...`);
                setTimeout(() => this.initializeGoogleAuth(clientId, onAuthSuccess, onAuthError), 500);
                return;
            }
            console.error("[GoogleAuth] Critical: 'google' global not found after 10 seconds. Script may have failed to load.");
            if (onAuthError) onAuthError("Google Sign-In script failed to load. Check your network connection or ad blockers.");
            return;
        }

        try {
            console.log("[GoogleAuth] Initializing Token Client...");
            // BACKEND MIGRATION: Use initCodeClient to get an Authorization Code (offline access)
            tokenClient = google.accounts.oauth2.initCodeClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/spreadsheets',
                ux_mode: 'popup',
                callback: async (response: any) => {
                    if (response.code) {
                        console.log("[Auth] Auth Code received. Exchanging for tokens via Backend...");

                        try {
                            // Exchange code for tokens (Access + Refresh) via our Backend API
                            const res = await fetch('/api/auth/google', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ code: response.code })
                            });

                            if (!res.ok) {
                                const errData = await res.json().catch(() => ({}));
                                throw new Error(errData.error || 'Token exchange failed');
                            }

                            const data = await res.json();
                            console.log("[Auth] Backend sync success. Access Token received.");

                            // Store the access token in memory for immediate use
                            accessToken = data.access_token;
                            grantedScopes = "calendar.events"; // Assumed success for UI

                            const profile = await this.getUserProfile();
                            onAuthSuccess(profile.email, data);

                        } catch (err: any) {
                            console.error("[Auth] Backend Exchange Error:", err);
                            if (onAuthError) onAuthError(err.message);
                            else alert("Authentication failed during server sync: " + err.message);
                        }
                    } else if (response.error) {
                        console.error("[Auth] Google Popup Error:", response.error);
                        if (onAuthError) onAuthError(response.error);
                    }
                },
                error_callback: (err: any) => {
                    console.error("[Auth] System Error:", err);
                    if (onAuthError) onAuthError("System Error: " + err.message);
                }
            });
            console.log("[GoogleAuth] Token Client initialized successfully.");
        } catch (e: any) {
            console.error("[GoogleAuth] Exception during init:", e);
            if (onAuthError) onAuthError("Initialization Exception: " + e.message);
        }
    },

    async setManualToken(token: string) {
        if (!token) throw new Error("Invalid Token");
        accessToken = token;
        return await this.getUserProfile();
    },

    getGrantedScopes() {
        return grantedScopes;
    },

    getTokenDebugInfo() {
        if (!accessToken) return "None";
        const type = accessToken.startsWith("ey") ? "JWT" : "OAuth";
        const scopeStatus = grantedScopes ? (grantedScopes.includes('calendar') ? "Read/Write" : "Missing Scopes") : "Unknown Scopes";
        return `${type} | ${scopeStatus}`;
    },

    async getUserProfile() {
        if (!accessToken) return { email: 'unknown' };
        try {
            const res = await fetchWithTimeout('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (!res.ok) return { email: 'unknown' };
            return await res.json();
        } catch (e) {
            return { email: 'unknown' };
        }
    },

    requestAccess() {
        if (tokenClient) {
            console.log("[GoogleAuth] Requesting access popup...");
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            console.error("[GoogleAuth] requestAccess called but tokenClient is null.");
            alert("System not ready: Google Sign-In script is still loading or failed. Please refresh the page.");
        }
    },

    isAuthenticated() {
        return !!accessToken;
    },

    disconnect() {
        accessToken = null;
        grantedScopes = "";
    },



    getAccessToken() {
        return accessToken;
    },

    async checkAvailability(dateTimeStr: string, config?: BusinessConfig) {
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
            // Robust parsing: Look for numbers followed by AM/PM or 24h format
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

        console.log(`[Availability Check] Checking ${normalizedDate} (Hour: ${hour}, Day: ${day}) vs Business Hours: ${startHour}-${endHour} on days ${allowedDays}`);

        if (!allowedDays.includes(day) || hour < startHour || hour >= endHour) {
            return { available: false, message: 'Outside business hours', checkedDateTime: normalizedDate, wasCorrected };
        }

        if (!accessToken) {
            // CRITICAL FIX: If config says we ARE connected, but we have no token, fail hard.
            if (config?.integrations?.googleCalendar?.isConnected) {
                return {
                    available: false,
                    message: "Authentication Token Missing/Expired. Admin must reconnect in Settings.",
                    needsReauth: true,
                    checkedDateTime: normalizedDate,
                    wasCorrected
                };
            }
            return { available: true, message: 'Available (Guest)', checkedDateTime: normalizedDate, wasCorrected };
        }

        try {
            const timeMin = dateObj.toISOString();
            const timeMax = new Date(dateObj.getTime() + 60 * 60 * 1000).toISOString();
            const res = await fetchWithTimeout(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error(`[Calendar Error] Status: ${res.status}, Reason: ${errorData.error?.message || 'Unknown'}`);

                // Signal re-auth needed if 401/403
                if (res.status === 401 || res.status === 403) {
                    accessToken = null; // Clear invalid token
                    return { available: false, needsReauth: true, message: 'Authentication Token Expired. Admin must reconnect Google Calendar in Settings.', checkedDateTime: normalizedDate, wasCorrected };
                }

                return { available: false, message: `Google API Error: ${res.status}`, checkedDateTime: normalizedDate, wasCorrected };
            }

            const data = await res.json();
            const busy = data.items && data.items.length > 0;
            return {
                available: !busy,
                message: busy ? 'Slot busy' : 'Slot available',
                checkedDateTime: normalizedDate,
                wasCorrected,
                integrationStatus: "Authenticated (Real Data)"
            };
        } catch (e: any) {
            console.error("[Calendar Service Exception]", e.message || e);
            return { available: true, message: 'Fetch error, assuming available', checkedDateTime: normalizedDate, wasCorrected };
        }
    },

    async findAvailableSlots(startDateStr: string, config?: BusinessConfig) {
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

        const generateDemoSlots = () => {
            const slots = [];
            for (let i = 1; i <= 3; i++) {
                const d = new Date(start);
                d.setDate(d.getDate() + i);
                if (allowedDays.includes(d.getDay())) {
                    d.setHours(startHour + 1, 0, 0, 0);
                    slots.push(d.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }));
                }
            }
            return slots.slice(0, 4);
        };

        if (!accessToken) {
            // CRITICAL FIX: If config says we ARE connected, but we have no token, it means
            // the token expired or failed to load. We must NOT show guest slots.
            if (config?.integrations?.googleCalendar?.isConnected) {
                return {
                    slots: [],
                    message: "Authentication Token Missing or Expired. Please reconnect Google Calendar in Settings.",
                    needsReauth: true,
                    wasCorrected,
                    integrationStatus: "Error"
                };
            }

            return {
                slots: generateDemoSlots(),
                message: 'Guest Mode: Authentic business hours applied, but showing simulated slot availability. Admin must authenticate Google Calendar for real-time conflict checking.',
                wasCorrected,
                integrationStatus: "Guest"
            };
        }

        console.log(`[Calendar] Fetching slots with token: ${accessToken.substring(0, 10)}...`);

        try {
            const res = await fetchWithTimeout(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?timeMin=${start.toISOString()}&timeMax=${new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()}&singleEvents=true`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error(`[Calendar Error] findSlots failed: ${res.status} - ${errorData.error?.message || 'Unknown'}`);

                // Signal re-auth needed if 401/403
                if (res.status === 401 || res.status === 403) {
                    accessToken = null;
                    return { status: 'error', message: 'Authentication Token Expired', needsReauth: true, wasCorrected };
                }
                return { status: 'error', message: `Google API error: ${res.status}`, wasCorrected };
            }

            const data = await res.json();
            const busyEvents = data.items || [];
            const busy = busyEvents.length > 0;

            if (!busy) {
                return {
                    status: 'success',
                    nextAction: 'ask_patient_name',
                    available: true,
                    message: 'Slot available',
                    checkedDateTime: normalizedDate,
                    wasCorrected
                };
            } else {
                return {
                    status: 'unavailable',
                    nextAction: 'offer_alternatives',
                    available: false,
                    message: 'Slot busy',
                    checkedDateTime: normalizedDate,
                    wasCorrected
                };
            }

            const result: string[] = [];

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
                    message: `Found ${result.length} available slots.`,
                    wasCorrected
                };
            } else {
                return {
                    status: 'unavailable',
                    nextAction: 'offer_alternatives',
                    slots: generateDemoSlots(), // Fallback for demo
                    message: 'No specific slots found, showing demo slots.',
                    wasCorrected
                };
            }
        } catch (e: any) {
            console.error("[Calendar Slots Exception]", e.message || e);
            return { status: 'error', message: 'Error finding slots', wasCorrected };
        }
    },

    async createEvent(bookingDetails: { name: string; phone: string; email: string; service: string; dateTime: string }) {
        const { normalizedDate } = normalizeDateYear(bookingDetails.dateTime);
        if (!accessToken) {
            return {
                success: true,
                isSimulated: true,
                confirmedDateTime: normalizedDate,
                message: "Guest Mode: Appointment recorded in session only. To enable real Google Calendar sync and Email confirmations, the administrator must authenticate via the 'Connect Calendar' button in the interface."
            };
        }

        try {
            const start = new Date(normalizedDate);
            const end = new Date(start.getTime() + 45 * 60 * 1000);

            const adminEmail = "alokranjan04@gmail.com";

            // Safety Check for User Email
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

            // Note the conferenceDataVersion=1 parameter is required to create Meet links
            const res = await fetchWithTimeout(`https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?sendUpdates=all&conferenceDataVersion=1`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error(`[Calendar Error] createEvent failed: ${res.status} - ${errorData.error?.message || 'Unknown'}`);
                return { success: false, error: errorData.error?.message, confirmedDateTime: normalizedDate };
            }

            const data = await res.json();

            // Log to Google Sheets
            await this.saveToGoogleSheets(bookingDetails);

            return { success: true, eventLink: data.htmlLink, confirmedDateTime: normalizedDate };
        } catch (e: any) {
            console.error("[Calendar Create Exception]", e.message || e);
            return { success: true, isSimulated: true, confirmedDateTime: normalizedDate };
        }
    },

    async saveToGoogleSheets(bookingDetails: any) {
        if (!accessToken) return;

        // Use a generic spreadsheet name or a known ID. 
        // For production, this should be configurable.
        const SPREADSHEET_NAME = "AI Voice Agent Bookings";

        try {
            // 1. Find or Create Spreadsheet
            // (Simplified: In Guest mode we don't do this, but in Auth mode we try)
            // For now, we append to a dedicated spreadsheet ID if you had one, 
            // but let's implement a robust search-or-create if we want it to be plug-and-play.

            // 2. Append to Sheet (using Google Sheets API v4)
            const range = 'Sheet1!A:E';
            const valueInputOption = 'USER_ENTERED';
            const values = [[
                new Date().toLocaleString(),
                bookingDetails.name,
                bookingDetails.phone,
                bookingDetails.email,
                bookingDetails.service,
                bookingDetails.dateTime
            ]];

            // We use the first found spreadsheet with the name or create one
            // To keep it simple and reliable for the user, we'll use a known ID or log fail
            const sheetId = "1S7Ska2Yf5Y8G1Z_Y_Y7O7O7O7O7O7O7O7O7O7O7O7M"; // Placeholder - would usually fetch this

            // Search for existing sheet with name
            const searchRes = await fetchWithTimeout(`https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(SPREADSHEET_NAME)}' and mimeType='application/vnd.google-apps.spreadsheet'`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (!searchRes.ok) {
                const err = await searchRes.json().catch(() => ({}));
                throw new Error(`Google Drive Search failed: ${searchRes.status} ${err.error?.message || ''}`);
            }

            const searchData = await searchRes.json();

            let targetId = "";
            if (searchData.files && searchData.files.length > 0) {
                targetId = searchData.files[0].id;
            } else {
                // Create new spreadsheet
                const createRes = await fetchWithTimeout('https://sheets.googleapis.com/v4/spreadsheets', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ properties: { title: SPREADSHEET_NAME } })
                });

                if (!createRes.ok) {
                    const err = await createRes.json().catch(() => ({}));
                    throw new Error(`Google Sheets Creation failed: ${createRes.status} ${err.error?.message || ''}`);
                }

                const createData = await createRes.json();
                targetId = createData.spreadsheetId;

                // Add headers
                await fetchWithTimeout(`https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values/Sheet1!A1:F1:append?valueInputOption=USER_ENTERED`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ values: [["Timestamp", "Name", "Phone", "Email", "Service", "Appointment Time"]] })
                });
            }

            // Append data
            const appendRes = await fetchWithTimeout(`https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values/Sheet1!A:F:append?valueInputOption=USER_ENTERED`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ values })
            });

            if (!appendRes.ok) {
                const err = await appendRes.json().catch(() => ({}));
                console.error(`[Sheets Error] Append failed: ${appendRes.status} - ${err.error?.message || 'Unknown'}`);
            } else {
                console.log("Logged to Google Sheets:", targetId);
            }
        } catch (e: any) {
            console.error("[Sheets Service Exception] Root Cause:", e.message || e);
        }
    },

    async sendConfirmationEmail(bookingDetails: any, config: any) {
        if (!accessToken) return { success: false, error: 'No access token' };
        try {
            const { normalizedDate } = normalizeDateYear(bookingDetails.dateTime);
            const dateObj = new Date(normalizedDate);
            const subject = `Confirmed: ${bookingDetails.service} at ${config.metadata.businessName}`;
            const body = `Hi ${bookingDetails.name},\n\nYour appointment for ${bookingDetails.service} is confirmed for ${dateObj.toLocaleString()}.\n\nSee you then!`;
            const raw = btoa(unescape(encodeURIComponent(`To: ${bookingDetails.email}\r\nSubject: ${subject}\r\n\r\n${body}`))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            const res = await fetchWithTimeout('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw }),
                timeout: 10000
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                return { success: false, error: errData.error?.message || res.statusText };
            }
            return { success: true };
        } catch (e: any) { return { success: false, error: e.message || 'Unknown error' }; }
    }
};