import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { checkAvailability, findAvailableSlots, createEvent, cancelEvent } from '@/services/calendarService';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('[Vapi Webhook] Received event type:', body.message?.type);

        // --- End of Call Report Handling ---
        if (body.message?.type === 'end-of-call-report') {
            const report = body.message;

            // Log the call object to help debugging if needed
            // console.log('[Vapi Webhook] Call Object:', JSON.stringify(report.call, null, 2));

            const assistantId = report.call?.assistantId || report.call?.assistant?.id || report.assistantId;
            const assistantMetadata = report.call?.assistant?.metadata || report.assistant?.metadata;

            const extractedData = report.analysis?.structuredData || {};

            let customerEmail = assistantMetadata?.leadEmail || extractedData.customerEmail;
            let customerName = assistantMetadata?.leadName || extractedData.customerName || 'Valued Customer';
            let companyName = assistantMetadata?.leadCompany || extractedData.companyName || 'your company';

            const summary = report.summary || 'Summary not available.';
            const transcript = report.transcript || 'Transcript not available.';

            console.log(`[Vapi Webhook] Processing end-of-call. Assistant: ${assistantId}, Metadata Email: ${customerEmail}`);

            // 1. Persist to Database (Firebase Admin) and Fetch Missing Metadata
            const { adminDb } = await import('@/lib/firebase-admin');
            if (adminDb) {
                try {
                    // Update the Lead/Assistant record if it exists
                    if (assistantId) {
                        const leadRef = adminDb.collection('temporary_assistants').doc(assistantId);

                        if (!customerEmail) {
                            const leadDoc = await leadRef.get();
                            if (leadDoc.exists) {
                                const data = leadDoc.data();
                                if (data?.leadEmail) customerEmail = data.leadEmail;
                                if (data?.leadName) customerName = data.leadName;
                                if (data?.company) companyName = data.company;
                                console.log(`[Vapi Webhook] Retrieved missing email from DB: ${customerEmail}`);
                            }
                        }

                        await leadRef.set({
                            summary,
                            transcript,
                            status: 'completed',
                            lastUpdatedAt: new Date().toISOString()
                        }, { merge: true });
                        console.log(`[Vapi Webhook] Updated temporary_assistants/${assistantId} with summary.`);
                    }

                    // Save to main summaries collection for Dashboard visibility
                    // Check if it's a multi-tenant agent
                    const orgId = assistantMetadata?.orgId;
                    const agentId = assistantMetadata?.agentId;

                    let summaryCollection;
                    if (orgId && agentId) {
                        summaryCollection = adminDb.collection('organizations').doc(orgId).collection('agents').doc(agentId).collection('summaries');
                    } else {
                        summaryCollection = adminDb.collection('summaries');
                    }

                    await summaryCollection.add({
                        summary,
                        transcript,
                        metadata: assistantMetadata || {},
                        createdAt: new Date().toISOString(),
                        type: 'outbound_lead'
                    });
                    console.log(`[Vapi Webhook] Saved summary to Firestore.`);
                } catch (dbErr) {
                    console.error('[Vapi Webhook] Database Save failed:', dbErr);
                }
            }

            // 2. Send Summary Email
            const gmailUser = process.env.GMAIL_USER;
            const gmailPass = process.env.GMAIL_APP_PASSWORD;

            if (customerEmail && gmailUser && gmailPass) {
                console.log(`[Vapi Webhook] Attempting to send summary email to ${customerEmail}...`);
                try {
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: { user: gmailUser, pass: gmailPass }
                    });

                    const info = await transporter.sendMail({
                        from: `"${companyName} AI Voice Agent" <${gmailUser}>`,
                        to: customerEmail,
                        bcc: gmailUser,
                        subject: `Your AI Call Summary — ${companyName} Voice Agent 🎙️`,
                        html: `
                            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 40px 20px; background: #ffffff; color: #1a1a1a;">
                                <h1 style="color: #4f46e5; font-size: 26px; margin-bottom: 4px;">Your Call Summary</h1>
                                <p style="color: #6b7280; margin-top: 0;">Hi ${customerName} — here's a full recap of your conversation with the ${companyName} AI Voice Agent.</p>

                                <div style="background: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 0 8px 8px 0; padding: 20px; margin: 28px 0;">
                                    <h2 style="margin: 0 0 12px; color: #1e293b; font-size: 17px;">📋 AI Summary</h2>
                                    <p style="white-space: pre-wrap; line-height: 1.7; margin: 0; color: #374151;">${summary}</p>
                                </div>

                                <div style="margin: 28px 0;">
                                    <h2 style="color: #1e293b; font-size: 17px; margin-bottom: 12px;">📝 Full Transcript</h2>
                                    <div style="background: #111827; color: #e5e7eb; padding: 20px; border-radius: 8px; font-family: monospace; font-size: 13px; line-height: 1.8;">
                                        <pre style="white-space: pre-wrap; margin: 0;">${transcript}</pre>
                                    </div>
                                </div>

                                <p style="font-size: 13px; color: #9ca3af; text-align: center; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                    This summary was automatically generated by the Voice AI system.<br>— The Voice AI Team
                                </p>
                            </div>
                        `
                    });
                    console.log(`[Vapi Webhook] ✅ Email sent! ID: ${info.messageId}`);
                } catch (emailErr) {
                    console.error('[Vapi Webhook] ERROR sending post-call email:', emailErr);
                }
            } else {
                console.warn(`[Vapi Webhook] ⚠️ Skipping email. Details missing: custEmail=${!!customerEmail}, gmailUser=${!!gmailUser}, gmailPass=${!!gmailPass}`);
            }

            return NextResponse.json({ success: true });
        }
        // -----------------------------------

        // Vapi sends tool calls in this format
        const toolCalls = body.message?.toolCalls || [];

        if (toolCalls.length === 0) {
            console.log('[Vapi Webhook] No tool calls found. Returning 200 OK for lifecycle/system event.');
            return NextResponse.json({ success: true, message: 'Lifecycle event received' });
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
                                duration: args.duration,
                                company: args.company,
                                industry: args.industry,
                                problem: args.problem
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
