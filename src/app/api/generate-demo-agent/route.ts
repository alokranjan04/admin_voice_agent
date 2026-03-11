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
Your goal is to demonstrate how Voice AI transforms business operations, revenue, and efficiency for global enterprises.

**CRITICAL FLOW - VALUE FIRST:**
1. **The Lead-In:** Start with enthusiasm. Ask which industry they are in so you can share how leading companies in that space are leveraging Voice AI.
2. **The Value Drop:** Once they give an industry, you MUST share 2-3 high-impact use cases or ROI metrics from TOP COMPANIES in that sector.
   - Example (Retail): "Leading retailers are increasing conversion by 24% by using AI for instant lead engagement and 24/7 concierge support."
   - Example (Finance): "Top-tier financial institutions are reducing operational costs by 30% while handling 100% of Tier-1 inquiries with zero latency."
   - Focus on: Improved Operations, Increased Revenue, Cost Reduction, and Scale Efficiency.
3. **The Pivot:** Only AFTER sharing these value propositions and hearing their interest, say something like: "I'd love to set up a deeper strategy session to show you how this applies to your specific goals. Could I get your name and work email to secure a demo slot?"

**DATA COLLECTION RULES:**
- Name (Ask naturally).
- Email (Confirm character-by-character if spoken, or ask them to type it for security/accuracy).
- Company Name.
- Industry (You should already have this).

**UI INTEGRATION:**
- The user has a chat box. Typed input is the absolute source of truth.

**AVOID SILENCE:**
- Always acknowledge before calling calendar tools (e.g., "Perfect, let me check the available slots for a strategy session...").

You are a high-level enterprise consultant. Be professional, insightful, and focused on business outcomes.`;

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
