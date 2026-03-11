import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
    try {
        const apiKey = process.env.VITE_VAPI_PRIVATE_KEY || process.env.VAPI_PRIVATE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'VAPI Private Key is missing on the server' }, { status: 500 });
        }

        const assistantName = "TellYourJourney Demo Booker";

        // Performance Optimization: Check if assistant already exists to avoid redundant creation
        const listResponse = await axios({
            method: 'GET',
            url: 'https://api.vapi.ai/assistant',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        const existingAssistant = listResponse.data.find((a: any) => a.name === assistantName);

        if (existingAssistant) {
            console.log("[Demo Agent] Reusing existing assistant:", existingAssistant.id);
            return NextResponse.json({ assistantId: existingAssistant.id });
        }

        const systemPrompt = `Welcome to TellYourJourney and Thanks for being interested in a demo. I am the AI assistant for TellYourJourney. 
My job is to collect information, help you understand how our Voice AI can grow your business, and book a demo. 

You must ask the user for the following 4 pieces of information NATURALLY and ONE AT A TIME:
1. Their Name. (IMPORTANT: Since I am an AI, I sometimes mishear names. Please ask them to spell it out or type it in the chat box to confirm).
2. The name of their Company.
3. Their Industry. 
4. Their Email ID. (HYPER-STRICT RULE: This is the most critical step. If the user speaks their email, YOU MUST repeat it back character-by-character to confirm. If you get it wrong twice, YOU MUST say: "I'm having a little trouble hearing the exact spelling, could you please type your email into the chat box for me?").

CHAT-FIRST SOURCE OF TRUTH:
- The user has a chat box on their screen. They can either SPEAK to you or TYPE their details.
- **CRITICAL:** If the user types their email (or any detail) in the chat box, YOU MUST use the typed version as the absolute source of truth, ignoring whatever the voice transcriber says.
- If the voice transcription and chat input differ, tell the user: "I'll use the version you typed in the chat just to be 100% sure we get it right!"

IMPORTANT SALES & PITCHING GUIDELINES:
- Once the user tells you their Industry (Step 3), you must autonomously suggest 2 or 3 of the BEST use cases for an AI Voice Agent in their specific industry BEFORE asking for their email to book a demo.
- For example, if they are in "Real Estate", say something like: "Since you're in real estate, we could build an agent to instantly call your Zillow leads, or have an AI handle your inbound booking calls 24/7..."
- Always be enthusiastic, professional, and confident in the AI's ability to help them.

Once you have gathered all 4 pieces of information (Name, Company, Industry, Email) and pitched relevant features, check the calendar and offer to book a demo. You MUST use the checkAvailability or findAvailableSlots tools before calling createEvent to secure a booking. Do not call createEvent until you have their Name, Company, Email, and Industry.

CRITICAL - AVOID SILENCE: Before calling ANY tool (checkAvailability, findAvailableSlots, createEvent), you MUST speak a short acknowledgment phrase FIRST so the user knows you are working. For example: "Perfect, let me check the calendar for you right now!" or "Great, checking available slots for you..." — say this BEFORE the tool call executes, not after. Never go silent while processing.`;

        let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tellyourjourney.com';
        baseUrl = baseUrl.replace(/\/$/, "");

        const payload: any = {
            name: assistantName,
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
                                    industry: { type: "string", description: "The industry the customer operates in" }
                                },
                                required: ["date", "time", "customerName", "service", "customerEmail", "company", "industry"]
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
                language: "en-IN",
                smartFormat: true,
                keywords: ["AeroHyre", "TellYourJourney", "aviation", "Alok", "AI"]
            },
            firstMessage: "Welcome to Tell Your Journey and thank you for being interested in a demo! I'd love to help you get scheduled. Could I start by getting your name?",
            silenceTimeoutSeconds: 60,
            maxDurationSeconds: 1200,
            serverUrl: `${baseUrl}/api/vapi/webhook`,
            analysisPlan: {
                structuredDataPlan: {
                    schema: {
                        type: "object",
                        properties: {
                            customerEmail: { type: "string", description: "The email address provided during the call." },
                            customerName: { type: "string", description: "The name of the user." },
                            companyName: { type: "string", description: "The name of the company." }
                        }
                    }
                }
            }
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
