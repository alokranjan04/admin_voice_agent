import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
    try {
        const apiKey = process.env.VITE_VAPI_PRIVATE_KEY || process.env.VAPI_PRIVATE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'VAPI Private Key is missing on the server' }, { status: 500 });
        }

        const systemPrompt = `Welcome to TellYourJourney and Thanks for being interested for the demo. I am the AI assistant for TellYourJourney. 
My job is to collect information, help you understand how our Voice AI can grow your business, and book a demo. 

You must ask the user for the following 4 pieces of information naturally during the conversation:
1. Their Name
2. The name of their Company
3. Their Email ID
4. Their exact Use Case (how they want to use an AI Voice Agent)

IMPORTANT SALES & PITCHING GUIDELINES:
- When the user tells you their Use Case, you must briefly highlight how our AI features can solve their specific problem and help their business grow BEFORE asking to book a demo.
- For example, if they want customer service, mention our 24/7 availability and zero hiring costs. If they want outbound calls, mention our scalable lead generation capabilities. If they want booking, mention our direct CRM calendar integrations.
- Always be enthusiastic and professional. 

NOTE: The user has a chat box on their screen. They can either SPEAK to you or TYPE their details. If they type a message, you will receive it as a normal user message. You can respond to typed messages by speaking.

Once you have gathered all 4 pieces of information (Name, Company, Email, Use Case) and pitched relevant features, check the calendar and offer to book a demo. You MUST use the checkAvailability or findAvailableSlots tools before calling createEvent to secure a booking. Do not call createEvent until you have their Name, Company, Email, and Use Case.`;

        let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tellyourjourney.com';
        baseUrl = baseUrl.replace(/\/$/, "");

        const payload: any = {
            name: "TellYourJourney Demo Booker",
            model: {
                provider: "openai",
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    }
                ],
                temperature: 0.4,
                tools: [
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
                                    service: { type: "string", description: "Type of service (Usually 'Demo Booking')" },
                                    customerName: { type: "string", description: "Customer name" },
                                    customerEmail: { type: "string", description: "Customer email." },
                                    company: { type: "string", description: "Company name" },
                                    problem: { type: "string", description: "Use case / Problem to solve" }
                                },
                                required: ["date", "time", "customerName", "service", "customerEmail", "company", "problem"]
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
                ]
            },
            voice: {
                provider: "vapi",
                voiceId: "Mia"
            },
            transcriber: {
                provider: "deepgram",
                model: "nova-2",
                language: "en",
                smartFormat: true
            },
            firstMessage: "Welcome to Tell Your Journey and thank you for being interested in a demo! I'd love to help you get scheduled. Before we look at times, could I get the name of your company?",
            serverUrl: `${baseUrl}/api/vapi/webhook`
        };

        const response = await axios({
            method: 'POST',
            url: 'https://api.vapi.ai/assistant',
            data: payload,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("[Demo Agent] Generated successfully:", response.data?.id);

        return NextResponse.json({
            assistantId: response.data.id
        });

    } catch (error: any) {
        console.error('[Demo Agent API Error]', error.response?.data || error.message);
        return NextResponse.json({
            error: error.response?.data?.message || error.message
        }, { status: error.response?.status || 500 });
    }
}
