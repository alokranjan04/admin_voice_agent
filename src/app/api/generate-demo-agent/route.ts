import { NextResponse } from 'next/server';
import axios from 'axios';
import { createRateLimiter } from '@/lib/rate-limit';

// Rate limit: 3 requests per IP per 10 minutes — prevents credit abuse
const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, maxRequests: 3 });

export async function POST(req: Request) {
    try {
        // Rate limit check
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || req.headers.get('x-real-ip')
            || 'unknown';
        if (limiter.check(ip)) {
            console.warn(`[Demo Agent API] Rate limited IP: ${ip}`);
            return NextResponse.json(
                { error: 'Too many requests. Please wait a few minutes and try again.' },
                { status: 429 }
            );
        }

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
1. **Identify & Anchor:** Start with: "Welcome to Sutherland Voice Support! I'm here to build your autonomous growth roadmap for your business. To start creating your strategy, could I get your name?"
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

You are a sharp, high-level enterprise consultant focused on identifying growth and stopping competitors from stealing market share.

**BOOKING TRIGGER:**
- If the user says "Book a Demo", "I want a demo", "Schedule a call", or mentions clicking the "Book a Demo" button, you MUST immediately transition to the booking flow: ask for their name (if unknown) and then their company.

**EMAIL CAPTURE BEST PRACTICE:**
- When the user provides their email, **immediately repeat it back to them character-by-character** (e.g., "n-e-h-a dot h-i-zero-seven at gmail dot com") to verify you captured it perfectly before preceding to scheduling. If they correct you, apologize and update it immediately.`;

        // Derive base URL from the request host for webhook connectivity
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = (host.includes('localhost') || host.includes('127.0.0.1')) ? 'http' : 'https';
        let baseUrl = `${protocol}://${host}`;
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
                            description: "Find available appointment slots for a given date. Suggests 10 AM and 1 PM first as preferred times, but returns any available slots. If the user requests a different specific time, use checkAvailability for that exact time instead.",

                            parameters: {
                                type: "object",
                                properties: {
                                    date: { type: "string", description: "Date in YYYY-MM-DD format" },
                                    duration: { type: "number", description: "Appointment duration in minutes (default: 30)" }
                                },
                                required: ["date"]
                            }
                        }
                    },
                    {
                        type: "function",
                        function: {
                            name: "cancelEvent",
                            description: "Cancel or reschedule an existing appointment. Use the information you already have (Name, Email, Phone).",
                            parameters: {
                                type: "object",
                                properties: {
                                    date: { type: "string", description: "Date of the appointment to cancel" },
                                    time: { type: "string", description: "Time of the appointment" },
                                    name: { type: "string", description: "Customer name" },
                                    email: { type: "string", description: "Customer email" }
                                },
                                required: ["date", "time"]
                            }
                        }
                    },
                    {
                        type: "function",
                        function: {
                            name: "createEvent",
                            description: "Create a 30-minute calendar appointment after confirming all details with the user. Duration MUST be 30 minutes.",
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
            },
            firstMessage: "Welcome to Sutherland Voice Support! I'm here to build your autonomous growth roadmap for your business. To start creating your strategy, could I get your name?",
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

        const assistantId = response.data.id;
        console.log("[Demo Agent] Generated successfully:", assistantId);

        // Link the phone number to this new assistant for INBOUND calls
        const vapiPhoneNumberId = process.env.VAPI_PHONE_NUMBER_ID || process.env.VITE_VAPI_PHONE_NUMBER_ID;
        if (vapiPhoneNumberId && apiKey) {
            try {
                let uuid = vapiPhoneNumberId;
                if (uuid.startsWith('+')) {
                    const listRes = await fetch('https://api.vapi.ai/phone-number', {
                        headers: { 'Authorization': `Bearer ${apiKey}` }
                    });
                    if (listRes.ok) {
                        const numbers = await listRes.json() as any[];
                        uuid = numbers?.find((n: any) => n.number === uuid)?.id || uuid;
                    }
                }

                if (uuid && uuid.includes('-')) {
                    await fetch(`https://api.vapi.ai/phone-number/${uuid}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ assistantId })
                    });
                    console.log(`[Demo Agent] Inbound number ${uuid} linked to ${assistantId}`);
                }
            } catch (err) {
                console.warn("[Demo Agent] Failed to link inbound phone:", err);
            }
        }

        return NextResponse.json({
            assistantId: assistantId
        });

    } catch (error: any) {
        console.error('[Demo Agent API Error]', error.response?.data || error.message);
        return NextResponse.json({
            error: error.response?.data?.message || error.message
        }, { status: error.response?.status || 500 });
    }
}
