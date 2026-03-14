import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { researchBusiness } from '@/services/researchService';
import { summarizeBusinessResearch, extractServicesFromResearch, generateIndustryFAQs } from '@/services/geminiService';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, company, email, phone, website, deliveryOption, language = 'English', companyDetails = '', industry = '', interest = '', isSutherland = false } = body;

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
                const searchQuery = `${company} ${industry} ${interest} reviews testimonials services location details`.trim();
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
        // 0.8 Industry FAQ Step: Generate common questions for training
        let industryFAQs = '';
        try {
            console.log(`[Generate Agent API] Generating Industry FAQs for ${company} (${industry}) - Focus: ${interest}`);
            industryFAQs = await generateIndustryFAQs(company, industry || "General Business", interest || "Customer Support", companyDetails || researchSummary);
        } catch (faqErr) {
            console.warn(`[Generate Agent API] FAQ generation failed:`, faqErr);
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

        // Language-aware first message - FUNCTIONAL & PERSONALIZED
        const firstMessageMap: Record<string, string> = {
            'English': interest 
                ? `Hello ${name}! I'm the AI assistant for ${company}. How can I assist you with our ${interest} services today?`
                : `Hello ${name}! I'm the AI assistant for ${company}. How can I help you today? I can assist with Customer Support, Sales, or Operations.`,
            
            'Hindi': interest
                ? `Namaste ${name} ji! Main ${company} ka AI assistant bol raha hoon. Main aaj aapki ${interest} services mein kaise madad kar sakta hoon?`
                : `Namaste ${name} ji! Main ${company} ka AI assistant bol raha hoon. Main aaj aapki kaise madad kar sakta hoon? Aap mujhse Customer Support, Sales, ya Operations ke baare mein pooch sakte hain.`,
            
            'French': interest
                ? `Bonjour ${name} ! Je suis l'assistant IA de ${company}. Comment puis-je vous aider avec nos services de ${interest} aujourd'hui ?`
                : `Bonjour ${name} ! Je suis l'assistant IA de ${company}. Comment puis-je vous aider aujourd'hui ? Je peux vous renseigner sur le support client, les ventes ou les opérations.`,
            
            'German': interest
                ? `Hallo ${name}! Ich bin der KI-Assistent von ${company}. Wie kann ich Ihnen heute bei unseren ${interest}-Dienstleistungen behilflich sein?`
                : `Hallo ${name}! Ich bin der KI-Assistent von ${company}. Wie kann ich Ihnen heute helfen? Ich kann Sie zu Kundensupport, Vertrieb oder Betrieb beraten.`,
            
            'Spanish': interest
                ? `¡Hola ${name}! Soy el asistente de IA para ${company}. ¿En qué puedo ayudarte con nuestros servicios de ${interest} hoy?`
                : `¡Hola ${name}! Soy el asistente de IA para ${company}. ¿En qué puedo ayudarte hoy? Puedo asistirte con soporte, ventas u operaciones.`,
            
            'Arabic': interest
                ? `مرحباً ${name}! أنا المساعد الذكي لشركة ${company}. كيف يمكنني مساعدتك في خدمات ${interest} اليوم؟`
                : `مرحباً ${name}! أنا المساعد الذكي لشركة ${company}. كيف يمكنني مساعدتك اليوم؟ يمكنني مساعدتك في دعم العملاء، المبيعات، أو العمليات.`,
        };
        const firstMessage = firstMessageMap[language] || firstMessageMap['English'];

        // 1. Create the Vapi Assistant
        // Priority: user-provided details (highest) > website content (real-world) > research summary > industry FAQs
        let businessContext = "";
        const manualContext = [
            companyDetails ? `User Provided Description: ${companyDetails}` : '',
            industry ? `Industry: ${industry}` : '',
        ].filter(Boolean).join('\n');

        if (manualContext || researchSummary || websiteContent || industryFAQs) {
            businessContext = `\n\n== BUSINESS KNOWLEDGE BASE ==\n`;
            if (manualContext) businessContext += `${manualContext}\n\n`;
            if (websiteContent) businessContext += `### LIVE WEBSITE CONTENT (Direct from Source):\n${websiteContent.substring(0, 3000)}\n\n`;
            if (researchSummary) businessContext += `### VERIFIED BUSINESS DETAILS (External Research):\n${researchSummary}\n\n`;
            if (industryFAQs) businessContext += `### INDUSTRY SPECIFIC FAQS & GUIDELINES:\n${industryFAQs}\n\n`;
            businessContext += `== END ==\n\nUse the above information to provide specific, high-fidelity answers about ${company}. Prioritize live website content for service details. If asked about something not in the knowledge base, state you'll find out, but prioritize using the verified details provided. Do NOT hallucinate.`;
        }

        // Real-time date context (prevents AI from using training cutoff date)
        const nowIST = new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Kolkata'
        });

        const systemPrompt = `You are a professional and highly capable AI Assistant for ${company}. Your goal is to provide immediate, functional assistance to ${name}, who is exploring your expertise in ${industry}.

**STRICT RULE:** You ARE the functional embodiment of ${company}'s intelligence for the ${industry} industry. You must act as if you are a long-term, highly knowledgeable employee of ${company}. Do NOT use phrases like "booking a demo" or "sales discovery" unless explicitly prompted. Your purpose is to speak with authority about ${company}'s services as discovered in the knowledge base below.

== MISSION ==
Gather intelligence about ${name}'s needs and provide exact solutions based on ${company}'s real-world capabilities. You are NOT a generic bot; you are the ${interest || 'Expert'} representative of ${company}.

== YOUR IDENTITY & CONTEXT ==
- Primary Persona: Official AI Assistant for ${company}
- User Name: ${name}
- Industry Specialization: ${industry || 'General Business'}
- Focal Area: ${interest || 'Full Suite'}

${businessContext}

== OPERATIONAL STRATEGY ==
1. **GREETING**: Greet ${name} warmly by name as the official representative of ${company}.
2. **FUNCTIONAL ASSISTANCE**: Immediately address their interest in **${interest || 'our solutions'}**. 
   - If Customer Support: Detail how you provide 24/7 instant resolution and handle complex customer needs with nuance.
   - If Sales/Lead Gen: Explain how you qualify leads and drive growth through intelligent conversation.
   - If Operations: Focus on automation and process efficiency.
3. **VALUE DELIVERY**: Instead of "selling," describe your features as current active capabilities of ${company}. Provide specific examples based on the knowledge base.
4. **ENGAGEMENT**: Ask: "How can I specifically help you optimize this area for your team today?"

== CONVERSATIONAL RULES ==
1. **IDENTITY:** You represent ${company}. You are here to assist, not to pitch a demo.
2. **NO REPETITION:** You have the user's details (${email}, ${phone}). Use them only if necessary for assistance.
3. **SCHEDULING:** If ${name} asks to coordinate a meet, use your tools to find a slot, but do not initiate this yourself unless prompted by ${name}.
4. **LANGUAGE:** Respond EXCLUSIVELY in ${language === 'Hindi' ? 'Hinglish' : language}.

Be helpful, concise, and professional. Greet ${name} by name and start serving ${company}!`;

        const vapiRes = await fetch('https://api.vapi.ai/assistant', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${vapiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `${company} ${interest || 'AI'} Assistant`,
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
                    model: "nova-3",
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
        console.log(`[Generate Agent API] Resolved Assistant ID: ${assistantId} (isSutherland: ${isSutherland})`);

        // TRACK FOR CLEANUP (Expires in 30 mins)
        if (assistantId && adminDb) {
            try {
                const expiry = new Date(Date.now() + 30 * 60 * 1000);
                await adminDb.collection('temporary_assistants').doc(assistantId).set({
                    assistantId,
                    company: company,
                    leadEmail: email,
                    leadName: name,
                    industry: industry || '',
                    companyDetails: companyDetails || '',
                    services: extractedServices || [],
                    expiresAt: expiry.toISOString(),
                    createdAt: new Date().toISOString()
                });
                console.log(`[Generate Agent API] Assistant ${assistantId} tracked for cleanup at ${expiry.toISOString()}`);
            } catch (dbErr) {
                console.warn('[Generate Agent API] Failed to log tracking info to Firebase:', dbErr);
            }
        }

        // 2. Determine the host URL for the Test Drive link (Standardized to premium theme)
        const emailAssistantId = assistantId;
        const orgSlug = isSutherland ? 'sutherland' : company.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const testLink = `${protocol}://${host}/business/${orgSlug || 'agent'}/${emailAssistantId}`;

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
                        <h1 style="color: #4f46e5; margin: 0; font-size: 28px;">Your Real AI is Alive, ${name}!</h1>
                    </div>
                    <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                        Hi ${name},<br><br>
                        We have prepared your personalized AI strategy for <strong>${company}</strong>.
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
