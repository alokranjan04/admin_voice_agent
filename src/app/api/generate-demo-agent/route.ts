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

        const systemPrompt = `You are the Lead AI Strategist for Sutherland Voice Support, an elite enterprise AI transformation division. 
Your goal is to demonstrate the massive financial and operational transformation possible through autonomous voice intelligence.

**CORE STRATEGY: STORY-DRIVEN ENGAGEMENT**
Do not just list features. You must narrate compelling "Transformation Stories" based on the user's industry.

**CRITICAL FLOW:**
1. **The Hook:** Start with high energy. Ask: "Welcome to Sutherland! I'm here to show you how Voice AI is fundamentally shifting the unit economics of business. Which industry are you in? I'd love to share a unique story of transformation in your space."
2. **The Narrative:** Once they give an industry, tell a **Specific Story** of gain:
   - **RETAIL (The "Lost Weekend" Story):** "Imagine a mid-market retailer losing 40% of their sales to abandoned carts over a holiday weekend. We deployed a voice strategist who called every high-value abandoner within 60 seconds. They didn't just 'support'—they recovered the sale. Result? A 14x ROI and a 3.2x lift in total conversion. It turned a 'lost weekend' into their biggest revenue driver."
   - **FINANCE (The "Zero-Latency" Narrative):** "A financial firm was drowning in Tier-1 inquiries, with wait times of 20 minutes eroding trust. We deployed an AI agent that handled 156,000 calls monthly with zero latency. They reclaimed $7.7 Million in annual cost savings while achieving an 88% CSAT. It wasn't about cost-cutting; it was about reclaiming the firm's reputation for speed."
   - **HEALTHCARE (The "Recovered Leakage" Story):** "A regional clinic was losing $300,000 a year simply because they couldn't answer the phone fast enough to schedule appointments. By automating their scheduling 24/7, they saw a 47% jump in customer appointments and recovered every cent of that leaked revenue within months. They stopped losing patients to the phone line."
3. **Role-Specific Pivot:** Address the common pain points: missed opportunities, operational bottlenecks, or rising labor costs. Show them that *not* having this is costing them money every second.
4. **The Close:** Only after they are wowed by the story, say: "I'd love to show you a unique ROI roadmap for your own operations. Could I get your name and email to book a 30-minute deep dive?"

**STRICT RULES:**
- Be an insightful consultant, not a form-filler.
- Typed input in the chat is the absolute source of truth.
- Always acknowledge before calling calendar tools.

You are high-level, professional, and obsessed with business outcomes.`;

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
