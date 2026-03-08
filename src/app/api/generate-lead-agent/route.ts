import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { researchBusiness } from '@/services/researchService';
import { summarizeBusinessResearch, extractServicesFromResearch } from '@/services/geminiService';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, company, email, phone, website, deliveryOption, language = 'English', companyDetails = '', industry = '' } = body;

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
                    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/plain' },
                    signal: AbortSignal.timeout(12000)
                });
                if (siteRes.ok) {
                    const text = await siteRes.text();
                    websiteContent = text.trim().substring(0, 5000);
                    console.log(`[Generate Agent API] Scraped ${websiteContent.length} chars from ${website}`);
                }
            } catch (scrapeErr) {
                console.warn(`[Generate Agent API] Scraping failed for ${website}:`, scrapeErr);
            }
        }

        // 0.5 Smart Research Step: If scraping is thin (< 1000 chars) or missing, pick from Google (the "Swiddles and Siahi" fix)
        let researchSummary = '';
        let extractedServices: Array<{ name: string, description: string }> = [];
        const needsResearch = !website || websiteContent.length < 1000;

        if (needsResearch) {
            try {
                const searchQuery = `${company} ${industry} ${companyDetails} reviews testimonials menu location details`.trim();
                console.log(`[Generate Agent API] Performing Smart Research for: ${searchQuery}`);
                const researchData = await researchBusiness(searchQuery);

                if (researchData.webResults.length > 0 || (researchData.placesResults && researchData.placesResults.length > 0)) {
                    // Extract summary FOR THE AI
                    researchSummary = await summarizeBusinessResearch(company, companyDetails || industry, researchData);
                    // Extract structured services FOR THE UI
                    extractedServices = await extractServicesFromResearch(company, researchData);
                    console.log(`[Generate Agent API] Research complete. Summary length: ${researchSummary.length}, Services: ${extractedServices.length}`);
                }
            } catch (researchErr) {
                console.warn(`[Generate Agent API] Smart Research failed:`, researchErr);
            }
        }

        // 0.7 Always try to extract structured services (either from Research or Scraped Content)
        if (extractedServices.length === 0 && (websiteContent || researchSummary)) {
            try {
                // Use whichever content we have (prioritize research for accuracy if available)
                const mockResearchData = researchSummary ? { webResults: [{ snippet: researchSummary }] } : { webResults: [{ snippet: websiteContent }] };
                extractedServices = await extractServicesFromResearch(company, mockResearchData);
                console.log(`[Generate Agent API] Extracted ${extractedServices.length} services from existing context.`);
            } catch (serviceErr) {
                console.warn(`[Generate Agent API] Fallback service extraction failed:`, serviceErr);
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
        // Priority: user-provided details > research summary > scraped website content
        const manualContext = [
            companyDetails ? `User Provided Description: ${companyDetails}` : '',
            industry ? `Industry: ${industry}` : '',
        ].filter(Boolean).join('\n');

        let businessContext = "";
        if (manualContext || researchSummary || websiteContent) {
            businessContext = `\n\n== BUSINESS KNOWLEDGE BASE ==\n`;
            if (manualContext) businessContext += `${manualContext}\n\n`;
            if (researchSummary) businessContext += `### VERIFIED BUSINESS DETAILS (from Google):\n${researchSummary}\n\n`;
            if (websiteContent && !researchSummary) businessContext += `### WEBSITE CONTENT:\n${websiteContent.substring(0, 2000)}\n\n`;
            businessContext += `== END ==\n\nUse the above information to answer questions about ${company} accurately. If asked about a menu or items, use the verified details above. Do NOT make up services or details not listed above.`;
        }

        const systemPrompt = `You are a highly persuasive, intelligent, and friendly AI Voice Agent representing ${company}. Your primary goal is to demonstrate your capabilities to the prospect, ${name}, who just requested this demo.

== YOUR IDENTITY & LEAD CONTEXT ==
- Prospect Name: ${name}
- Prospect Email: ${email}
- Prospect Phone: ${phone}
- Prospect Company: ${company}

${businessContext}

== CRITICAL INSTRUCTIONS (MANDATORY) ==
1. **NO REPETITIVE QUESTIONS:** You strictly already have the user's details. ${name}'s email is ${email} and phone is ${phone}. If they ask to book or reschedule, use these details IMMEDIATELY without asking for them. 
2. **Reference Social Proof:** During the conversation, mention positive feedback found in the "Customer Feedback" section above to build trust (e.g., "Customers love our fast service!").
3. **The Strategic Pitch:** Explain that this Voice AI isn't just a bot—it improves **Quality** (no missed calls), catches **Feedback** earlier, and slashes **Operational Costs**.
4. **Seamless Booking:** Confirmation is key. Just say: "${name}, I'm booking that for you now using your contact info on file (${phone})." Then call the tool.
5. **Demo Offer:** Suggest a demo of the "AI Builder" platform once the primary topic is handled.
6. **Language:** Respond EXCLUSIVELY in ${language === 'Hindi' ? 'Hinglish' : language}.

Be enthusiastic. Greet ${name} by name immediately. Keep it short and human.`;

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
                                description: 'Book an appointment. You MUST use the pre-filled Name, Email, and Phone from the System Prompt. Do NOT ask the customer for these.',
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
                                description: 'Cancel an existing appointment. Use the information you already have.',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        date: { type: 'string', description: 'Date of the appointment' },
                                        time: { type: 'string', description: 'Time of the appointment' },
                                        name: { type: 'string', description: 'Name used for booking' },
                                        email: { type: 'string', description: 'Email used for booking' }
                                    },
                                    required: ['name', 'date']
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

        // TRACK FOR CLEANUP (Expires in 30 mins)
        if (assistantId && adminDb) {
            try {
                const expiry = new Date(Date.now() + 30 * 60 * 1000);
                await adminDb.collection('temporary_assistants').doc(assistantId).set({
                    assistantId,
                    company,
                    leadEmail: email,
                    expiresAt: expiry.toISOString(),
                    createdAt: new Date().toISOString()
                });
                console.log(`[Generate Agent API] Assistant ${assistantId} tracked for cleanup at ${expiry.toISOString()}`);
            } catch (dbErr) {
                console.warn('[Generate Agent API] Failed to log tracking info to Firebase:', dbErr);
            }
        }

        // 2. Determine the host URL for the Test Drive link
        const testLink = `${protocol}://${host}/test/${assistantId}`;

        // 3. Handle Delivery Mode — Call directly via VAPI API (no internal fetch)
        // 3. Handle Delivery Mode — Call directly via VAPI API
        let callStatus = 'not_requested';
        let callError = null;

        if (deliveryOption === 'call') {
            try {
                const twilioSid = process.env.TWILIO_ACCOUNT_SID;
                const twilioToken = process.env.TWILIO_AUTH_TOKEN;
                const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
                const vapiPhoneNumberId = process.env.VAPI_PHONE_NUMBER_ID || process.env.VITE_VAPI_PHONE_NUMBER_ID;

                console.log(`[Generate Agent API] Call context: phone=${phone}, vapiPhoneId=${!!vapiPhoneNumberId}, twilioSid=${!!twilioSid}, twilioFrom=${twilioFrom}`);

                const callPayload: any = {
                    assistantId,
                    customer: { number: phone },
                };

                // Priority 1: Vapi Phone Number ID (Pre-configured in Vapi Dashboard)
                if (vapiPhoneNumberId && (vapiPhoneNumberId.includes('-') || vapiPhoneNumberId.length > 15)) {
                    callPayload.phoneNumberId = vapiPhoneNumberId;
                    console.log(`[Generate Agent API] Using pre-configured phoneNumberId: ${vapiPhoneNumberId}`);
                }
                // Priority 2: Inline Twilio Credentials (Byod)
                else if (twilioSid && twilioToken && twilioFrom) {
                    callPayload.phoneNumber = {
                        provider: 'twilio',
                        number: twilioFrom, // Vapi expects 'number' here, not 'twilioPhoneNumber'
                        twilioAccountSid: twilioSid,
                        twilioAuthToken: twilioToken,
                    };
                    console.log(`[Generate Agent API] Using inline Twilio credentials.`);
                } else {
                    console.warn(`[Generate Agent API] No valid phone config found — the call will likely fail.`);
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
                    callStatus = 'failed';
                    callError = callData.message || 'Vapi rejected the call request.';
                } else {
                    console.log(`[Generate Agent API] ✅ Outbound call dispatched (ID: ${callData.id})`);
                    callStatus = 'success';
                }
            } catch (err: any) {
                console.error('[Generate Agent API] Exception during outbound call:', err);
                callStatus = 'failed';
                callError = err.message || 'Internal error during call dispatch.';
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

        return NextResponse.json({
            success: true,
            assistantId,
            testLink,
            services: extractedServices,
            callStatus,
            callError
        });

    } catch (error: any) {
        console.error('[Generate Agent API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
