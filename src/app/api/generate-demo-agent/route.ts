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
2. **Context Building:** After getting their name, ask: "Great to meet you, [Name]. And which company are you representing today?"
3. **Industry Alignment:** Once you have the company, ask: "Awesome. And finally, which industry are you focused on? I want to share exactly how other leaders in your space are growing with Voice AI right now."
4. **The Real-World Story (Growth & Opportunity Cost):** Once they provide an industry, share a **Real success case** and highlight the **Lost Opportunity Cost**:
   - **RETAIL:** "In your space, industry leaders are using Voice AI to capture abandoned carts in real-time. For example, a major retail group saw a 14x ROI by calling back high-value abandoners within 60 seconds. Every hour you're without this, you're essentially watching revenue walk out the door. The lost opportunity cost is often 20-30% of your total potential revenue."
   - **FINANCE:** "Leaders in finance are deploying these agents to manage 156,000 monthly inquiries with zero latency, reclaiming $7.7 Million in annual costs while boosting trust. If you're still relying on hold times, the lost opportunity is the high-value clients who simply hang up and go to a competitor who responds in seconds."
   - **HEALTHCARE:** "We've seen clinics recover $300,000 in 'appointment leakage' simply by automating their 24/7 scheduling. The lost opportunity is massive: every missed call is a patient you'll likely never see. AI ensures your front desk never sleeps and never misses a cent of revenue."
5. **The Close:** "I've helped firms in [Industry] map out a 30-day transformation plan. Could I get your email to secure a 30-minute deep-dive session for [Company Name]?"

**STRICT RULES:**
- No fictional "Imagine a..." stories. Use "Real-world leaders are..." or "We've seen firms...".
- Focus on the PAIN of not having the AI (The Lost Opportunity).
- Typed input in the chat is the absolute source of truth.
- Always acknowledge before calling any internal tools.

You are a sharp, high-level enterprise consultant focused on identifying growth and stopping revenue leakage.`;

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
