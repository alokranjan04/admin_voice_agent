import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
    try {
        const config = await req.json();

        if (!config) {
            return NextResponse.json({ error: 'Missing configuration' }, { status: 400 });
        }

        const apiKey = process.env.VITE_VAPI_PRIVATE_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'VAPI Private Key is not configured on the server' }, { status: 500 });
        }

        const companyName = config.metadata.businessName || "the company";
        const roleDesc = config.metadata.primaryUseCase || "Voice AI Support Assistant";

        let systemPrompt = config.vapi.systemPrompt
            .replace(/{{COMPANY_NAME}}/g, companyName)
            .replace(/{{Company name}}/gi, companyName)
            .replace(/{{ROLE_DESCRIPTION}}/g, roleDesc);

        let firstMessage = (config.vapi.firstMessage || `Hello, thank you for calling ${companyName}!`)
            .replace(/{{COMPANY_NAME}}/g, companyName)
            .replace(/{{Company name}}/gi, companyName)
            .replace(/{{USER_NAME}}/gi, config.vapi.userName || 'there')
            .replace(/{{Name}}/gi, config.vapi.userName || 'there')
            .replace(/{{User Name}}/gi, config.vapi.userName || 'there')
            .replace(/{{First Name}}/gi, (config.vapi.userName || 'there').split(' ')[0]);

        const modelObj: any = {
            provider: String(config.vapi.provider || 'openai').toLowerCase(),
            model: String(config.vapi.model || 'gpt-4o-mini').toLowerCase(),
            messages: [
                {
                    role: 'system',
                    content: `${systemPrompt}\n\n# DATE CHECK REQUIRED\nYou do not know the current date. To schedule ANY appointment, you MUST first call the "getCurrentDateTime" tool to get the current date and time. Do not guess or assume the date.\n\n# USER CONTEXT\n${(config.vapi.userName || config.vapi.userEmail || config.vapi.userPhone)
                        ? `Information about the user is already known:\n` +
                        (config.vapi.userName ? `- Name: ${config.vapi.userName}\n` : '') +
                        (config.vapi.userEmail ? `- Email: ${config.vapi.userEmail}\n` : '') +
                        (config.vapi.userPhone ? `- Phone: ${config.vapi.userPhone}\n` : '') +
                        `CONTACT RULE: If Name, Phone, or Email are missing from this context, politely ask the user for them before booking. If they are already provided, DO NOT ask for them again, but pass them directly to the createEvent tool.\nTITLE RULE: Always ask the user 'What is this booking for?' to use as the 'service' (event title).`
                        : "No specific user information provided yet. You MUST ask the user for their Name, Email, and Phone before booking the appointment.\nTITLE RULE: Always ask the user 'What is this booking for?' to use as the 'service' (event title)."
                        }`
                }
            ],
            temperature: Number(config.vapi.temperature || 0.3),
        };

        const voiceObj: any = {
            provider: String(config.vapi.voiceProvider || 'vapi').toLowerCase(),
            voiceId: String(config.vapi.voiceId || 'Mia'),
        };

        let transcriberObj: any = null;
        const tProvider = String(config.vapi.transcriber.provider || 'deepgram').toLowerCase();

        if (tProvider === 'openai') {
            transcriberObj = { provider: 'openai' };
        } else {
            transcriberObj = {
                provider: tProvider,
                model: String(config.vapi.transcriber.model || 'nova-2').toLowerCase(),
                language: String(config.vapi.transcriber.language || 'en').toLowerCase(),
                smartFormat: true, // camelCase for Vapi
                keywords: [],      // Optional keywords
            };
        }

        const payload: any = {
            name: String(companyName),
            model: modelObj,
            voice: voiceObj,
            transcriber: transcriberObj,
            backgroundSound: (config.vapi.backgroundSound === 'default' || !config.vapi.backgroundSound) ? 'off' : config.vapi.backgroundSound,
            firstMessage: String(firstMessage),
        };

        if (config.vapi.knowledgeBase) {
            const kb = config.vapi.knowledgeBase
                .replace(/{{COMPANY_NAME}}/g, companyName)
                .replace(/{{Company name}}/gi, companyName);
            payload.model.messages[0].content += `\n\n# KNOWLEDGE BASE / FAQs\n${kb}`;
        }

        // Add calendar tools if enabled
        if (config.integrations?.googleCalendar) {
            // CRITICAL: Vapi needs a public URL. Localhost will likely fail unless tunneled.
            let baseUrl = process.env.NEXT_PUBLIC_APP_URL;

            if (baseUrl) {
                // Remove trailing slash if present to avoid double slashes
                baseUrl = baseUrl.replace(/\/$/, "");
                payload.serverUrl = `${baseUrl}/api/vapi/webhook`;
                console.log("[Vapi Config] Setting Server URL to:", payload.serverUrl);
            } else {
                console.warn("[Vapi Config] NEXT_PUBLIC_APP_URL is missing. Server URL (Webhook) will NOT be set for this assistant.");
            }
            payload.model.tools = [
                {
                    type: "function",
                    function: {
                        name: "checkAvailability",
                        description: "Check if a specific date and time is available for an appointment",
                        parameters: {
                            type: "object",
                            properties: {
                                date: { type: "string", description: "Date in YYYY-MM-DD format" },
                                time: { type: "string", description: "Time in HH:MM format (24-hour) to check" }
                            },
                            required: ["date"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "findAvailableSlots",
                        description: "Find all available appointment slots for a given date. Returns actual times that can be presented to the user. ALWAYS use this to show available times to the user.",
                        parameters: {
                            type: "object",
                            properties: {
                                date: { type: "string", description: "Date in YYYY-MM-DD format" },
                                duration: { type: "number", description: "Appointment duration in minutes (default: 60)" }
                            },
                            required: ["date"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "createEvent",
                        description: "Create a calendar appointment after confirming all details with the user",
                        parameters: {
                            type: "object",
                            properties: {
                                date: { type: "string", description: "Date in YYYY-MM-DD format" },
                                time: { type: "string", description: "Time in HH:MM format (24-hour)" },
                                service: { type: "string", description: "Type of service" },
                                customerName: { type: "string", description: "Customer name" },
                                customerEmail: { type: "string", description: "Customer email" },
                                customerPhone: { type: "string", description: "Customer phone" }
                            },
                            required: ["date", "time", "customerName", "customerEmail", "customerPhone", "service"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "getCurrentDateTime",
                        description: "Get the current date, time, and day of the week. Call this tool immediately if you need to know 'today' or 'now' to schedule appointments accurately.",
                        parameters: {
                            type: "object",
                            properties: {},
                            required: []
                        }
                    }
                }
            ];
        }

        let method = 'POST';
        let url = 'https://api.vapi.ai/assistant';
        let logMsg = "[Vapi Assistant] Creating NEW assistant...";

        // If assistantID exists, use PATCH to update
        if (config.vapi.assistantId) {
            method = 'PATCH';
            url = `https://api.vapi.ai/assistant/${config.vapi.assistantId}`;
            logMsg = `[Vapi Assistant] Updating EXISTING assistant (${config.vapi.assistantId})...`;
        }

        console.log(logMsg);

        const response = await axios({
            method: method,
            url: url,
            data: payload,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("[Vapi Assistant] Operation successful:", response.data?.id);
        return NextResponse.json(response.data);
    } catch (error: any) {
        console.error('[VAPI Assistant API Error]', error.response?.data || error.message);
        return NextResponse.json({
            error: error.response?.data?.message || error.message
        }, { status: error.response?.status || 500 });
    }
}
