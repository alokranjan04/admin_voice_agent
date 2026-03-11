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

        // Robust Webhook URL: Priority to ENV_URL, fallback to host with WWW handling for tellyourjourney.com
        let baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
        if (baseUrl.includes('tellyourjourney.com') && !baseUrl.includes('www.')) {
            baseUrl = baseUrl.replace('tellyourjourney.com', 'www.tellyourjourney.com');
        }
        const serverUrl = `${baseUrl.replace(/\/$/, '')}/api/vapi/webhook`;

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

        // 0.5 Smart Research Step: Skip if services are already provided (Edit Mode)
        let researchSummary = '';
        let extractedServices: Array<{ name: string, description: string }> = body.services || [];
        const needsResearch = extractedServices.length === 0 && (!website || websiteContent.length < 1000);

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
            'Arabic': 'ar',
        };
        const langCode = languageCodeMap[language] || 'en';

        // Language-aware first message - DISCOVERY ORIENTED
        const firstMessageMap: Record<string, string> = {
            'English': `Hello ${name}! Welcome to your custom ${company} AI demo. I'm curious—which part of your business are you most interested in exploring for AI: is it Customer Support, Sales and Lead Gen, or internal Operations?`,
            'Hindi': `Arre ${name} ji! ${company} ke liye aapka custom AI demo ready hai. Main thoda curious hoon—aap business ke kis area mein AI explore karna chahte hain: Customer Support, Sales and Lead Gen, ya internal Operations?`,
            'French': `Bonjour ${name} ! Bienvenue dans votre démo IA personnalisée pour ${company}. Je suis curieux : quelle partie de votre entreprise souhaitez-vous explorer pour l'IA : le service client, la vente et la génération de prospects, ou les opérations internes ?`,
            'German': `Hallo ${name}! Willkommen zu Ihrer maßgeschneiderten ${company} KI-Demo. Ich bin gespannt: Welchen Teil Ihres Unternehmens möchten Sie besonders mit KI erkunden – den Kundensupport, Vertrieb und Lead-Generierung oder interne Abläufe?`,
            'Spanish': `¡Hola ${name}! Bienvenido a tu demostración de IA personalizada de ${company}. Tengo curiosidad: ¿qué área de tu negocio te interesa más explorar con IA: atención al cliente, ventas y generación de leads, o procesos internos?`,
            'Arabic': `مرحباً ${name}! مرحباً بك في العرض التجريبي المخصص للذكاء الاصطناعي لـ ${company}. أنا فضولي - أي جزء من عملك أنت مهتم أكثر باستكشافه للذكاء الاصطناعي: دعم العملاء، المبيعات وتوليد العملاء المحتملين، أم العمليات الداخلية؟`,
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

        // Real-time date context (prevents AI from using training cutoff date)
        const nowIST = new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Kolkata'
        });

        const systemPrompt = `You are a highly persuasive, intelligent, and friendly AI Voice Agent representing ${company}. Your primary goal is to demonstrate your capabilities to the prospect, ${name}, who just requested this demo.

== CURRENT DATE & TIME ==
Today is ${nowIST} (IST). ALWAYS use this as the real current date when referring to today, tomorrow, or any relative dates. DO NOT rely on your training data for the current date.

== YOUR IDENTITY & LEAD CONTEXT ==
- Prospect Name: ${name}
- Prospect Email: ${email}
- Prospect Phone: ${phone}
- Prospect Company: ${company}
- Prospect Industry: ${industry || 'their industry'}

${businessContext}

== CONVERSATIONAL STRATEGY (CRITICAL) ==
1. **PHASE 1: INTEREST DISCOVERY**: Your very first goal (already started in the First Message) is to find out WHICH area ${name} cares about: Customer Support, Sales/Lead Gen, or internal Operations.
2. **PHASE 2: TAILORED VALUE**: Once they pick an area, provide EXACTLY ONE high-impact, specific example of how you (the AI) can solve a major pain point in that area for ${company}.
   - If Customer Support: Focus on 24/7 instant resolution, handling complex queries with human-level nuance, and seamless CRM integration.
   - If Sales/Lead Gen: Focus on qualifying leads instantly, handling objections, and booking high-quality meetings while interest is peak.
   - If internal Operations: Focus on automating repetitive tasks, real-time data entry, and providing instant status updates for complex workflows.
3. **PHASE 3: ENGAGEMENT CHECK**: Ask: "Does that sound like something that would make a big impact for your team?"
4. **PHASE 4: DEMO TRANSITION**: ONLY after they show interest, ask a question, or confirm value, suggest: "I'd love to show you how this works in a live environment. Should we find a quick 15 minutes for a demo?"

== CRITICAL INSTRUCTIONS (MANDATORY) ==
1. **NO QUICK BOOKING**: Do NOT suggest a demo or use scheduling tools until you have built rapport and explained at least one specific capability tailored to their choice.
2. **DATE AWARENESS:** Today is ${nowIST}.
3. **NO REPETITIVE QUESTIONS:** You strictly already have the user's details. ${name}'s email is ${email} and phone is ${phone}. Use them IMMEDIATELY without asking.
4. **SCHEDULING RULES:** Initial suggestions must be "tomorrow" or "day after tomorrow" from 10:00 AM onwards.
5. **DRIVE TO VALUE**: Your main focus is build rapport and PROVE value before booking.
6. **POST-BOOKING MESSAGE:** After a successful booking, NEVER provide a URL. ONLY say: "Your meeting is scheduled, and the details have been mailed to you."
7. **Language:** Respond EXCLUSIVELY in ${language === 'Hindi' ? 'Hinglish' : language}.

Be enthusiastic. Greet ${name} by name. Let's show ${name} what an AI-powered ${company} looks like!`;

        const vapiRes = await fetch('https://api.vapi.ai/assistant', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${vapiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `${company} AI Rep (${language})`,
                serverUrl,

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
                                description: 'Book an appointment. You MUST use the pre-filled Name, Email, and Phone from the System Prompt. Do NOT ask the customer for these. After booking, do NOT read out any URLs, just say the meeting is scheduled and mailed.',
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
                transcriber: {
                    provider: "deepgram",
                    model: "nova-2",
                    language: langCode
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
                    leadName: name,
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
                // Support both standard and VITE_ prefixed env vars for maximum compatibility
                const twilioSid = process.env.TWILIO_ACCOUNT_SID || process.env.VITE_TWILIO_ACCOUNT_SID;
                const twilioToken = process.env.TWILIO_AUTH_TOKEN || process.env.VITE_TWILIO_AUTH_TOKEN;
                const twilioFrom = (process.env.TWILIO_PHONE_NUMBER || process.env.VITE_TWILIO_PHONE_NUMBER)?.replace(/\s/g, '');
                let vapiPhoneNumberId = process.env.VAPI_PHONE_NUMBER_ID || process.env.VITE_VAPI_PHONE_NUMBER_ID;

                console.log(`[Generate Agent API] Outbound Config Detection: VAPI_ID=${!!vapiPhoneNumberId}, TWILIO_SID=${!!twilioSid}`);

                // Smart Resolution: If it's a raw number, try to find the Vapi UUID first
                if (vapiPhoneNumberId && vapiPhoneNumberId.startsWith('+') && vapiApiKey) {
                    try {
                        console.log(`[Generate Agent API] Attempting to resolve number ${vapiPhoneNumberId} to Vapi UUID...`);
                        const listRes = await fetch('https://api.vapi.ai/phone-number', {
                            headers: { 'Authorization': `Bearer ${vapiApiKey}` }
                        });
                        if (listRes.ok) {
                            const numbers = await listRes.json() as any[];
                            const match = numbers?.find((n: any) => n.number === vapiPhoneNumberId);
                            if (match) {
                                console.log(`[Generate Agent API] Resolved to UUID: ${match.id}`);
                                vapiPhoneNumberId = match.id;
                            }
                        }
                    } catch (resErr) {
                        console.warn(`[Generate Agent API] UUID Resolution failed:`, resErr);
                    }
                }

                console.log(`[Generate Agent API] Starting Outbound Dispatch: phone=${phone}`);
                console.log(`[Generate Agent API] Phone Config: VAPI_PHONE_ID=${vapiPhoneNumberId}, TWILIO_SID=${!!twilioSid}, TWILIO_NUM=${twilioFrom}`);

                const callPayload: any = {
                    assistantId,
                    customer: { number: phone.replace(/\s/g, '') }, // Ensure customer number is clean
                };

                // Smart Resolution & Auto-Import: If it's a raw number, ensure it's registered with Vapi
                if (vapiPhoneNumberId && (vapiPhoneNumberId.startsWith('+') || /^\d+$/.test(vapiPhoneNumberId)) && vapiApiKey) {
                    try {
                        const rawNum = vapiPhoneNumberId.startsWith('+') ? vapiPhoneNumberId : `+${vapiPhoneNumberId}`;
                        console.log(`[Generate Agent API] Checking Vapi registration for ${rawNum}...`);

                        const listRes = await fetch('https://api.vapi.ai/phone-number', {
                            headers: { 'Authorization': `Bearer ${vapiApiKey}` }
                        });

                        if (listRes.ok) {
                            const numbers = await listRes.json() as any[];
                            const match = numbers?.find((n: any) => n.number === rawNum);

                            if (match) {
                                console.log(`[Generate Agent API] Found existing Vapi ID: ${match.id}`);
                                vapiPhoneNumberId = match.id;
                            }
                            else if (twilioSid && twilioToken) {
                                // AUTO-IMPORT: If not found, try to import it using Twilio creds
                                console.log(`[Generate Agent API] Number not found in Vapi. Attempting AUTO-IMPORT...`);
                                const importRes = await fetch('https://api.vapi.ai/phone-number/import', {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${vapiApiKey}`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        provider: 'twilio',
                                        number: rawNum,
                                        twilioAccountSid: twilioSid,
                                        twilioAuthToken: twilioToken
                                    })
                                });
                                if (importRes.ok) {
                                    const imported = await importRes.json();
                                    console.log(`[Generate Agent API] ✅ Auto-Import Successful: ${imported.id}`);
                                    vapiPhoneNumberId = imported.id;
                                } else {
                                    const errText = await importRes.text();
                                    console.error(`[Generate Agent API] Auto-Import Failed:`, errText);
                                }
                            }
                        }
                    } catch (resErr) {
                        console.warn(`[Generate Agent API] UUID Resolution/Import failed:`, resErr);
                    }
                }

                // ID vs BYOD detection logic
                const isUuid = vapiPhoneNumberId && vapiPhoneNumberId.includes('-') && vapiPhoneNumberId.length > 20;

                if (isUuid) {
                    // Scenario 1: We have a proper Vapi UUID ID
                    callPayload.phoneNumberId = vapiPhoneNumberId;
                    console.log(`[Generate Agent API] Using Vapi phoneNumberId (UUID).`);
                }
                else if (twilioSid && twilioToken && (twilioFrom || vapiPhoneNumberId)) {
                    // Scenario 2: Inline BYOD (Twilio)
                    // Use twilioFrom if set, or vapiPhoneNumberId if it looks like a number
                    const rawNumber = (twilioFrom || vapiPhoneNumberId || "").replace(/\s/g, '');

                    if (!rawNumber.startsWith('+')) {
                        throw new Error(`Invalid Twilio number format: ${rawNumber}. Must start with +`);
                    }

                    callPayload.phoneNumber = {
                        provider: 'twilio',
                        number: rawNumber,
                        twilioAccountSid: twilioSid,
                        twilioAuthToken: twilioToken,
                    };
                    console.log(`[Generate Agent API] Using Twilio BYOD configuration with number: ${rawNumber}`);
                }
                else {
                    // Scenario 3: Failure — no UUID and no Twilio creds to handle the raw number
                    const diag = [];
                    if (!vapiPhoneNumberId) diag.push("VAPI_PHONE_NUMBER_ID missing");
                    if (!twilioSid) diag.push("TWILIO_ACCOUNT_SID missing");
                    if (!twilioToken) diag.push("TWILIO_AUTH_TOKEN missing");

                    throw new Error(`Outbound Call Failed: ${vapiPhoneNumberId && !isUuid ? 'BYOD credentials (SID/Token) are required for raw phone numbers.' : 'Missing configuration.'} Diagnostics: ${diag.join(', ')}`);
                }

                const callRes = await fetch('https://api.vapi.ai/call', {
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
            from: `"${company} AI Voice Agent" <${gmailUser}>`,
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
