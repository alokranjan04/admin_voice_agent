import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability, findAvailableSlots, createEvent } from '@/services/calendarService';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('[Vapi Tools] Received request:', JSON.stringify(body, null, 2));

        // Vapi sends tool calls in this format
        const toolCalls = body.message?.toolCalls || [];

        if (toolCalls.length === 0) {
            return NextResponse.json({
                error: 'No tool calls found in request'
            }, { status: 400 });
        }

        // Process each tool call
        const results = await Promise.all(
            toolCalls.map(async (toolCall: any) => {
                const { id, function: func } = toolCall;
                const { name, arguments: args } = func;

                console.log(`[Vapi Tools] Processing tool: ${name}`, args);

                try {
                    let result;

                    switch (name) {
                        case 'checkAvailability':
                            result = await checkAvailability(
                                args.date,
                                args.time,
                                args.service
                            );
                            break;

                        case 'findAvailableSlots':
                            result = await findAvailableSlots(
                                args.date,
                                args.service,
                                args.duration
                            );
                            break;

                        case 'confirmDetails':
                            // Simple confirmation - just echo back the details
                            result = {
                                success: true,
                                message: `Let me confirm: ${args.service || 'appointment'} on ${args.date} at ${args.time} for ${args.customerName}. Is this correct?`
                            };
                            break;


                        case 'createEvent':
                            result = await createEvent({
                                date: args.date,
                                time: args.time,
                                service: args.service,
                                customerName: args.name || args.customerName || "Customer",
                                customerEmail: args.email || args.customerEmail,
                                customerPhone: args.phone || args.customerPhone,
                                duration: args.duration
                            });
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

                    console.log(`[Vapi Tools] Result for ${name}:`, result);

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
        console.log('[Vapi Tools] Sending response:', JSON.stringify(response, null, 2));

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('[Vapi Tools] Request error:', error);
        return NextResponse.json({
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}
