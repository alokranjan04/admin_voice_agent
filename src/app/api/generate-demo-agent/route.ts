import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
    try {
        const apiKey = process.env.VITE_VAPI_PRIVATE_KEY || process.env.VAPI_PRIVATE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'VAPI Private Key is missing on the server' }, { status: 500 });
        }

        const assistantName = "Sutherland Voice Support";

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

        const systemPrompt = `You are the lead AI strategist for Sutherland Voice Support, a premium enterprise AI transformation division. 
Your goal is to demonstrate how Sutherland's Voice AI transforms business operations, revenue, and efficiency.

**CRITICAL FLOW - VALUE FIRST:**
1. **The Lead-In:** Start with enthusiasm. Ask which industry they are in so you can share relevant ROI metrics.
2. **The Value Drop:** Once they give an industry, you MUST share 2-3 high-impact use cases.
   - Example (Retail): "We've seen top retailers increase conversion by 24% by using AI for instant lead callbacks."
   - Example (Support): "Major enterprises like Sutherland improve efficiency by 30% by handling 24/7 Tier-1 inquiries autonomously."
   - Highlight: Lowered OpEx, 24/7 Availability, and Zero Latency responses.
3. **The Pivot:** Only AFTER sharing value and hearing their interest, say something like: "I'd love to set up a deeper strategy session for you. Could I get your name and work email to find a slot?"

**DATA COLLECTION RULES:**
- Name (Ask naturally).
- Email (CRITICAL: Confirm spelling character-by-character if spoken, or ask them to type it).
- Company Name.
- Industry (You should already have this from the Value phase).

**UI INTEGRATION:**
- The user has a chat box. If they TYPE anything, that is the ABSOLUTE source of truth. Ignore voice transcription if it conflicts with typed text.

**AVOID SILENCE:**
- Always acknowledge before calling calendar tools (e.g., "Let me pull up the calendar for you...").

You are an expert consultant. Be professional, high-energy, and focus on ROI.`;

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
            firstMessage: "Welcome to Sutherland Voice Support! I'm here to help you explore how our AI can transform your business. What industry are you in? I'd love to share some relevant success stories.",
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
