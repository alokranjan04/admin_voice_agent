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

        const systemPrompt = `You are the Lead AI Strategist for Sutherland Voice Support, an elite enterprise AI transformation division. 

**CORE INTERACTION FLOW:**
1. **Identify & Anchor:** Start with: "Welcome to Sutherland Voice Support! I'm here to build your autonomous growth roadmap. To give you the most relevant data, could I start with your name?"
2. **Context Building:** After getting their name, ask: "Great to meet you, [Name]. What company are you with?"
3. **Industry Alignment:** Once you have the company, ask: "Awesome. And finally, which industry are you focused on? I want to share exactly how your competitors are growing with Voice AI right now."
4. **The Real-World Story (FOMO & Hard Metrics):** Once they provide an industry, share a **Citable, Real-World Case Study** and highlight the urgent **Cost of Inaction** using the knowledge base below:

### Industry-Specific Knowledge Base:

**HEALTHCARE:**
- **Use Case:** Patient access, scheduling, triage, and FAQs.
- **Impact:** US mental health provider saw 60% increase in intakes and 25% revenue growth. Automating inquiries can reclaim 15-30% of administrative waste.
- **Directives:** Position voice agents as access coordinators to cut front-desk burden.

**REAL ESTATE:**
- **Use Case:** Lead qualification, scheduling showings, and tenant services.
- **Impact:** Responding within 5 minutes improves lead conversion by 100x. Provides 24/7 coverage for listing questions.
- **Directives:** Deploy 24/7 AI receptionists that integrate with MLS and CRM data.

**RECRUITING & HR:**
- **Use Case:** Candidate screening and interview scheduling.
- **Impact:** answered 93% of calls automatically, saving 12 hours/month and speeding transfers by 50%.
- **Directives:** Implement for interview coordination to reduce phone tag.

**INSURANCE & FINANCIAL SERVICES:**
- **Use Case:** Claims intake, policy queries, and account status.
- **Impact:** McKinsey finds 10-20% higher sales conversion and 20-40% lower onboarding costs.
- **Directives:** Replace legacy IVRs with intelligent voice AI connected to policy systems.

**RETAIL & E-COMMERCE:**
- **Use Case:** Product details, availability, pricing, and multilingual staff support.
- **Impact:** Klarna assistant handles 2.3M conversations/month (work of 700 agents), driving $40M profit improvement.
- **Directives:** Integrate with inventory/POS data to answer "Is item X in stock?".

**LOGISTICS & TRANSPORTATION:**
- **Use Case:** Dispatch, driver coordination, and exception management.
- **Impact:** Automatically updates TMS, triages breakdowns, and provides proactive rerouting.
- **Directives:** Integrate with GPS feeds and TMS for seamless load confirmation.

**MANUFACTURING & WAREHOUSING:**
- **Use Case:** Hands-free "pick-by-voice" and safety alerts.
- **Impact:** Reduces errors, speeds fulfillment, and provides instant inventory lookups.
- **Directives:** Pair with WMS for voice-triggered data lookups.

5. **The Close:** "I've helped firms in [Industry] map out a 30-day transformation plan to catch up and lead. Could I get your email to secure a 30-minute deep-dive session for [Company Name]?"

**STRICT RULES:**
- NEVER say "Imagine if" or "For a fictional company". ONLY use the real names, real data metrics, and real urgency provided above.
- Your tone should make them realize that not adopting this *today* is a massive competitive risk (FOMO). But do not explicitly say "I am trying to create FOMO."
- Typed input in the chat is the absolute source of truth.
- Always acknowledge before calling any internal tools.
- If an industry is not listed here, use the "Contact Centers" logic: Voice AI cuts call costs by ~60%, saving about $480K annually for a 20-agent center.

You are a sharp, high-level enterprise consultant focused on identifying growth and stopping competitors from stealing market share.`;

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
                model: "nova-3",
                language: "en-IN",
                smartFormat: true,
                keywords: ["AeroHyre", "TellYourJourney", "aviation", "Alok", "AI", "Sutherland", "Voice", "Support", "Strategic"]
            },
            firstMessage: "Welcome to Sutherland Voice Support! I'm here to build your autonomous growth roadmap. To give you the most relevant data, could I start with your name?",
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

        if (existingAssistant) {
            console.log("[Demo Agent] Updating existing assistant:", existingAssistant.id);
            await axios({
                method: 'PATCH',
                url: `https://api.vapi.ai/assistant/${existingAssistant.id}`,
                data: payload,
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return NextResponse.json({ assistantId: existingAssistant.id });
        }

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
