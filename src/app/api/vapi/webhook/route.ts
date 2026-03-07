import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability, findAvailableSlots, createEvent, cancelEvent } from '@/services/calendarService';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('[Vapi Tools] Received request:', JSON.stringify(body, null, 2));

        // --- End of Call Report Handling ---
        if (body.message?.type === 'end-of-call-report') {
            const report = body.message;
            const assistantMetadata = report.call?.assistant?.metadata;
            const customerEmail = assistantMetadata?.leadEmail;

            if (customerEmail) {
                console.log(`[Vapi Webhook] Found End-Of-Call report for lead (${customerEmail}). Dispatching email...`);

                try {
                    const url = new URL(req.url);
                    const emailEndpoint = `${url.origin}/api/email`;

                    const sendRes = await fetch(emailEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            summary: report.summary || 'AI generated summary unavailable.',
                            transcript: report.transcript || 'Transcript unavailable.',
                            targetEmail: customerEmail,
                            customerName: assistantMetadata.leadName || 'Customer'
                        })
                    });

                    if (!sendRes.ok) {
                        console.error('[Vapi Webhook] Failed to relay call report to Email API:', await sendRes.text());
                    } else {
                        console.log('[Vapi Webhook] Successfully emailed Call Report to prospect.');
                    }
                } catch (emailErr) {
                    console.error('[Vapi Webhook] Internal exception while attempting to send email:', emailErr);
                }
            } else {
                console.log('[Vapi Webhook] Missing leadEmail metadata. Skipping email dispatch.');
            }

            // Acknowledge Vapi's webhook instantly to prevent retries
            return NextResponse.json({ success: true });
        }
        // -----------------------------------

        // Vapi sends tool calls in this format
        const toolCalls = body.message?.toolCalls || [];

        if (toolCalls.length === 0) {
            return NextResponse.json({
                error: 'No tool calls found in request'
            }, { status: 400 });
        }

        // Process each tool call
        const callerPhone = body.message?.call?.customer?.number || '';

        const results = await Promise.all(
            toolCalls.map(async (toolCall: any) => {
                const { id, function: func } = toolCall;
                const { name, arguments: args } = func;

                console.log(`[Vapi Tools] Processing tool: ${name}`, args);

                try {
                    console.log(`[Vapi Tools] Executing ${name} with args:`, JSON.stringify(args, null, 2));
                    let result;

                    switch (name) {
                        case 'checkAvailability':
                            result = await checkAvailability(
                                args.date,
                                args.time,
                                args.service
                            );
                            console.log(`[Vapi Tools] checkAvailability result:`, JSON.stringify(result, null, 2));
                            break;

                        case 'findAvailableSlots':
                            result = await findAvailableSlots(
                                args.date,
                                args.service,
                                args.duration
                            );
                            console.log(`[Vapi Tools] findAvailableSlots result:`, JSON.stringify(result, null, 2));
                            break;

                        case 'confirmDetails':
                            result = {
                                success: true,
                                message: `Let me confirm: ${args.service || 'appointment'} on ${args.date} at ${args.time} for ${args.name || args.customerName}. Is this correct?`
                            };
                            break;

                        case 'createEvent':
                            console.log(`[Vapi Tools] Creating event with:`, JSON.stringify(args, null, 2));
                            result = await createEvent({
                                date: args.date,
                                time: args.time,
                                service: args.service,
                                customerName: args.name || args.customerName || "Customer",
                                customerEmail: args.email || args.customerEmail,
                                customerPhone: args.phone || args.customerPhone || callerPhone,
                                duration: args.duration
                            });
                            console.log(`[Vapi Tools] createEvent result:`, JSON.stringify(result, null, 2));
                            break;

                        case 'cancelEvent':
                            console.log(`[Vapi Tools] Canceling event with:`, JSON.stringify(args, null, 2));
                            result = await cancelEvent({
                                date: args.date,
                                time: args.time,
                                name: args.name || args.customerName,
                                email: args.email || args.customerEmail,
                                callerPhone: callerPhone
                            });
                            console.log(`[Vapi Tools] cancelEvent result:`, JSON.stringify(result, null, 2));
                            break;

                        case 'getCurrentDateTime':
                            const now = new Date();
                            result = {
                                success: true,
                                dateTime: now.toISOString(),
                                humanReadable: now.toLocaleString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: 'numeric',
                                    timeZone: process.env.TIMEZONE || 'UTC'
                                }),
                                timeZone: process.env.TIMEZONE || 'UTC'
                            };
                            break;

                        default:
                            result = {
                                error: `Unknown tool: ${name}`
                            };
                    }

                    console.log(`[Vapi Tools] Final standardized result for ${name}:`, result);

                    return {
                        toolCallId: id,
                        result: JSON.stringify(result)
                    };
                } catch (error: any) {
                    console.error(`[Vapi Tools] Error in ${name}:`, error);
                    return {
                        toolCallId: id,
                        result: JSON.stringify({
                            error: error.message,
                            success: false
                        })
                    };
                }
            })
        );

        const response = { results };
        console.log('[Vapi Tools] Sending final response:', JSON.stringify(response, null, 2));

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('[Vapi Tools] Request error:', error);
        return NextResponse.json({
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}
