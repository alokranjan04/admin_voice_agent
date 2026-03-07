import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, company, email, phone, website, deliveryOption, language = 'English' } = body;

        if (!name || !company || !email || !phone) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const vapiApiKey = process.env.VITE_VAPI_PRIVATE_KEY || process.env.VAPI_PRIVATE_API_KEY;
        const gmailUser = process.env.GMAIL_USER;
        const gmailPass = process.env.GMAIL_APP_PASSWORD;

        if (!vapiApiKey || !gmailUser || !gmailPass) {
            console.error('[Generate Agent API] Missing critical environment variables:', {
                vapiApiKey: !!vapiApiKey,
                gmailUser: !!gmailUser,
                gmailPass: !!gmailPass
            });
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // resolved host for Webhook & Test Link URLs
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';

        // 0. Scrape website content using Jina AI Reader (handles JS-rendered sites)
        let websiteContent = '';
        if (website) {
            try {
                console.log(`[Generate Agent API] Scraping via Jina AI: ${website}`);
                const jinaUrl = `https://r.jina.ai/${website}`;
                const siteRes = await fetch(jinaUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': 'text/plain',
                    },
                    signal: AbortSignal.timeout(12000)
                });
                if (siteRes.ok) {
                    const text = await siteRes.text();
                    // Jina returns clean markdown — just trim and cap length
                    websiteContent = text.trim().substring(0, 5000);
                    console.log(`[Generate Agent API] Scraped ${websiteContent.length} chars via Jina from ${website}`);
                } else {
                    console.warn(`[Generate Agent API] Jina returned ${siteRes.status} for ${website}`);
                }
            } catch (scrapeErr) {
                console.warn(`[Generate Agent API] Could not scrape ${website}:`, scrapeErr);
            }
        }

        // Language → locale code map (used for VAPI's language hint)
        const languageCodeMap: Record<string, string> = {
            'English': 'en',
            'Hindi': 'hi',
            'French': 'fr',
            'German': 'de',
            'Spanish': 'es',
        };
        const langCode = languageCodeMap[language] || 'en';

        // Language-aware first message
        const firstMessageMap: Record<string, string> = {
            'English': `Hello ${name}! Welcome to your custom ${company} AI demo. How can I help you today?`,
            'Hindi': `Arre ${name} ji! ${company} ke liye aapka custom AI demo ready hai — let's go! Main aapki kaise help kar sakta hoon aaj?`,
            'French': `Bonjour ${name} ! Bienvenue dans votre démo IA personnalisée pour ${company}. Comment puis-je vous aider ?`,
            'German': `Hallo ${name}! Willkommen zu Ihrer maßgeschneiderten ${company} KI-Demo. Wie kann ich Ihnen helfen?`,
            'Spanish': `¡Hola ${name}! Bienvenido a tu demostración de IA personalizada de ${company}. ¿Cómo puedo ayudarte?`,
        };
        const firstMessage = firstMessageMap[language] || firstMessageMap['English'];

        // 1. Create the Vapi Assistant
        const businessContext = websiteContent
            ? `\n\n== COMPANY KNOWLEDGE BASE (scraped from ${website}) ==\n${websiteContent}\n== END OF KNOWLEDGE BASE ==\n\nUse the above knowledge to answer any questions about ${company}'s services, pricing, team, or offerings accurately. Do NOT make up information not found in the knowledge base.`
            : '';

        const systemPrompt = `You are a highly persuasive, intelligent, and friendly AI Voice Agent representing ${company}. Your primary goal is to demonstrate your capabilities to the prospect, ${name}, who just requested this demo.${businessContext}

CRITICAL LANGUAGE RULE: You MUST respond EXCLUSIVELY in ${language === 'Hindi' ? 'Hinglish (a natural, conversational mix of Hindi and English the way young urban Indians speak — use English words freely mixed with Hindi, do NOT use formal pure Hindi or Devanagari script)' : language}. Do NOT switch to any other language style under any circumstances.

Be enthusiastic and professional. Start by warmly greeting ${name} by name and asking if they are ready to see how voice automation can transform their customer experience 24/7. Keep responses concise and naturally conversational.`;

        const vapiRes = await fetch('https://api.vapi.ai/assistant', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${vapiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `${company} AI Rep (${language})`,
                serverUrl: `${protocol}://${host}/api/vapi/webhook`,
                language: langCode,
                metadata: {
                    leadEmail: email,
                    leadName: name,
                    leadCompany: company,
                    leadWebsite: website || '',
                    leadLanguage: language
                },
                model: {
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt }
                    ],
                    tools: [
                        {
                            type: 'function',
                            function: {
                                name: 'getCurrentDateTime',
                                description: 'Get the current date and time',
                                parameters: { type: 'object', properties: {}, required: [] }
                            }
                        },
                        {
                            type: 'function',
                            function: {
                                name: 'checkAvailability',
                                description: 'Check if a specific date and time slot is available for booking',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
                                        time: { type: 'string', description: 'Time in HH:MM format (24h)' },
                                        service: { type: 'string', description: 'Type of service requested' }
                                    },
                                    required: ['date', 'time']
                                }
                            }
                        },
                        {
                            type: 'function',
                            function: {
                                name: 'findAvailableSlots',
                                description: 'Find available time slots on a given date',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
                                        service: { type: 'string', description: 'Type of service' },
                                        duration: { type: 'number', description: 'Duration in minutes' }
                                    },
                                    required: ['date']
                                }
                            }
                        },
                        {
                            type: 'function',
                            function: {
                                name: 'createEvent',
                                description: 'Book an appointment and add it to the calendar',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
                                        time: { type: 'string', description: 'Time in HH:MM format' },
                                        service: { type: 'string', description: 'Service type' },
                                        name: { type: 'string', description: 'Customer name' },
                                        email: { type: 'string', description: 'Customer email' },
                                        phone: { type: 'string', description: 'Customer phone' },
                                        duration: { type: 'number', description: 'Duration in minutes' }
                                    },
                                    required: ['date', 'time', 'name']
                                }
                            }
                        },
                        {
                            type: 'function',
                            function: {
                                name: 'cancelEvent',
                                description: 'Cancel an existing appointment',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        date: { type: 'string' },
                                        time: { type: 'string' },
                                        name: { type: 'string' },
                                        email: { type: 'string' }
                                    },
                                    required: ['name']
                                }
                            }
                        }
                    ]
                },
                voice: {
                    provider: '11labs',
                    voiceId: 'bIHbv24MWmeRgasZH58o', // Willa — supports eleven_multilingual_v2
                    model: 'eleven_multilingual_v2',
                    language: langCode,
                },
                firstMessage,
            })
        });

        const vapiData = await vapiRes.json();

        if (!vapiRes.ok) {
            console.error('[Generate Agent API] Vapi Error:', vapiData);
            throw new Error(`Failed to create Vapi Assistant: ${vapiData.message || 'Unknown error'}`);
        }

        const assistantId = vapiData.id;
        console.log(`[Generate Agent API] Created Assistant ID: ${assistantId}`);

        // 2. Determine the host URL for the Test Drive link
        const testLink = `${protocol}://${host}/test/${assistantId}`;

        // 3. Handle Delivery Mode — Call directly via VAPI API (no internal fetch)
        if (deliveryOption === 'call') {
            try {
                let phoneNumberId = process.env.VITE_VAPI_PHONE_NUMBER_ID || process.env.NEXT_PUBLIC_VAPI_PHONE_NUMBER_ID || '';

                // Smart Resolution: If it's a phone number string (not a UUID), resolve it to a UUID
                const twilioSid = process.env.TWILIO_ACCOUNT_SID;
                const twilioToken = process.env.TWILIO_AUTH_TOKEN;
                const twilioFrom = process.env.TWILIO_PHONE_NUMBER || process.env.VITE_VAPI_PHONE_NUMBER_ID;

                const callPayload: any = {
                    assistantId,
                    customer: { number: phone },
                };

                if (twilioSid && twilioToken && twilioFrom) {
                    // Inline Twilio credentials — bypasses VAPI phone number registration
                    callPayload.phoneNumber = {
                        twilioPhoneNumber: twilioFrom,
                        twilioAccountSid: twilioSid,
                        twilioAuthToken: twilioToken,
                    };
                    console.log(`[Generate Agent API] Using inline Twilio creds from ${twilioFrom}`);
                } else {
                    console.warn(`[Generate Agent API] No Twilio credentials found — call may fail.`);
                }

                const callRes = await fetch('https://api.vapi.ai/call/phone', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${vapiApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(callPayload)
                });

                const callData = await callRes.json();
                if (!callRes.ok) {
                    console.error(`[Generate Agent API] VAPI Call Failed:`, JSON.stringify(callData));
                } else {
                    console.log(`[Generate Agent API] ✅ Outbound call dispatched to ${phone}. Call ID: ${callData.id}`);
                }
            } catch (callErr) {
                console.error('[Generate Agent API] Exception during outbound call:', callErr);
            }
        }

        // 4. Send the Email Confirmation / Link
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: gmailUser, pass: gmailPass }
        });

        const deliveryMessage = deliveryOption === 'call'
            ? `Your phone (${phone}) should be ringing in a few seconds with a live call from your new AI agent!`
            : `Click the secure link below to interact with your new digital employee!`;

        const mailOptions = {
            from: `"Voice AI Agency" <${gmailUser}>`,
            to: email, // Bcc ourselves to track leads
            bcc: gmailUser,
            subject: `Your Custom Voice AI Agent for ${company} is Ready! 🚀`,
            html: `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; color: #1a1a1a;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #4f46e5; margin: 0; font-size: 28px;">Your AI is Alive, ${name}!</h1>
                    </div>
                    <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                        Hi ${name},<br><br>
                        We have built a custom Voice AI Agent trained to represent <strong>${company}</strong>.
                        <br><br>
                        <strong>${deliveryMessage}</strong>
                    </p>
                    <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                        <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">Or talk to your Agent online anytime:</h3>
                        <a href="${testLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px; margin-top: 10px;">
                            Open My Voice Agent →
                        </a>
                    </div>
                    <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 40px;">
                        If you have any questions, simply reply to this email.<br>— The Voice AI Team
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[Generate Agent API] Email sent:', info.messageId);

        return NextResponse.json({ success: true, assistantId, testLink });

    } catch (error: any) {
        console.error('[Generate Agent API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
