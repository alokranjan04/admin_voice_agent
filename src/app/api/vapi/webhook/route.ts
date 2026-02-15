import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { serverCalendarService } from '@/lib/server-calendar';

async function refreshAccessToken(refreshToken: string) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) throw new Error("Missing Google Credentials on Server");

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || "Token Refresh Failed");
    return data.access_token;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const message = body.message;

        if (message.type === 'tool-calls') {
            console.log("[Vapi Webhook] Received Tool Calls");
            const call = message.call;
            const assistantId = call.assistantId;

            // 1. Fetch Agent Config
            // We search for the agent config that matches this assistantId
            // This is a Collection Group Query (needs index potentially, but usually works for small datasets)
            // If it fails, check if you need to create an index in Firebase Console
            const agentsSnapshot = await adminDb.collectionGroup('agents')
                .where('vapi.assistantId', '==', assistantId)
                .limit(1)
                .get();

            if (agentsSnapshot.empty) {
                console.error(`[Vapi Webhook] No agent found for assistantId: ${assistantId}`);
                // Fallback: If using a single generic admin config, try to fetch it directly if known?
                // For now, return error.
                return NextResponse.json({ results: [{ error: "Agent configuration not found" }] });
            }

            const agentDoc = agentsSnapshot.docs[0];
            const config = agentDoc.data();
            const refreshToken = config.integrations?.googleCalendar?.refreshToken;

            if (!refreshToken) {
                console.error("[Vapi Webhook] No Refresh Token in agent config");
                return NextResponse.json({
                    results: [{
                        toolCallId: message.toolCalls[0].id,
                        result: "Authentication Error: Calendar not connected (No Refresh Token). Please reconnect in Admin Settings."
                    }]
                });
            }

            // 2. Get Fresh Access Token
            let accessToken;
            try {
                accessToken = await refreshAccessToken(refreshToken);
            } catch (authErr: any) {
                console.error("[Vapi Webhook] Auth Refresh Failed:", authErr);
                return NextResponse.json({
                    results: [{
                        toolCallId: message.toolCalls[0].id,
                        result: "Authentication Error: Failed to refresh token. Please reconnect Google Calendar."
                    }]
                });
            }

            // 3. Execute Tools
            const results = await Promise.all(message.toolCalls.map(async (toolCall: any) => {
                const name = toolCall.function.name;
                const args = typeof toolCall.function.arguments === 'string'
                    ? JSON.parse(toolCall.function.arguments)
                    : toolCall.function.arguments;

                console.log(`[Vapi Webhook] Executing ${name} with args:`, args);

                let result;
                let normalizedName = name.toLowerCase();

                if (normalizedName.includes('checkavailability')) {
                    const r = await serverCalendarService.checkAvailability(
                        accessToken,
                        args.dateTime || args.dateTimeStr,
                        config as any
                    );

                    // Format for Vapi
                    result = {
                        isAvailable: r.available,
                        message: r.available ? "The slot is available." : (r.message || "Slot busy"),
                        plainEnglishStatus: r.available ? "SLOT AVAILABLE." : "SLOT BUSY."
                    };

                } else if (normalizedName.includes('findavailableslots')) {
                    const r = await serverCalendarService.findAvailableSlots(
                        accessToken,
                        args.startDate || args.startDateStr || args.startFrom,
                        config as any
                    );

                    result = {
                        slots: r.slots,
                        count: r.slots.length,
                        message: r.slots.length > 0 ? "Slots found." : "No slots found.",
                        plainEnglishStatus: r.slots.length > 0 ? `FOUND ${r.slots.length} SLOTS.` : "NO SLOTS."
                    };

                } else if (normalizedName.includes('createevent')) {
                    const r = await serverCalendarService.createEvent(accessToken, args);
                    result = {
                        success: r.success,
                        eventLink: r.eventLink,
                        message: r.success ? "Booking confirmed." : ("Booking failed: " + r.error)
                    };
                } else {
                    result = { message: "Tool not implemented on server" };
                }

                return {
                    toolCallId: toolCall.id,
                    result: JSON.stringify(result)
                };
            }));

            return NextResponse.json({ results });
        }

        return NextResponse.json({ message: "Handled" });

    } catch (error: any) {
        console.error("[Vapi Webhook] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
