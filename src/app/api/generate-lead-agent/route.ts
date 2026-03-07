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
            'Hindi': `नमस्ते ${name}! ${company} के आपके कस्टम AI डेमो में आपका स्वागत है। मैं आपकी कैसे मदद कर सकता हूँ?`,
            'French': `Bonjour ${name} ! Bienvenue dans votre démo IA personnalisée pour ${company}. Comment puis-je vous aider ?`,
            'German': `Hallo ${name}! Willkommen zu Ihrer maßgeschneiderten ${company} KI-Demo. Wie kann ich Ihnen helfen?`,
            'Spanish': `¡Hola ${name}! Bienvenido a tu demostración de IA personalizada de ${company}. ¿Cómo puedo ayudarte?`,
        };
        const firstMessage = firstMessageMap[language] || firstMessageMap['English'];

        // 1. Create the Vapi Assistant
        const systemPrompt = `You are a highly persuasive, intelligent, and friendly AI Voice Agent representing ${company}. Your primary goal is to demonstrate your capabilities to the prospect, ${name}, who just requested this demo${website ? ` after visiting ${website}` : ''}.

CRITICAL LANGUAGE RULE: You MUST respond EXCLUSIVELY in ${language}. Do NOT switch to any other language under any circumstances, even if the user speaks to you in a different language.

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
                if (phoneNumberId && !phoneNumberId.includes('-') && phoneNumberId.startsWith('+')) {
                    console.log(`[Generate Agent API] Resolving phone number ${phoneNumberId} to UUID...`);
                    const listRes = await fetch('https://api.vapi.ai/phone-number', {
                        headers: { 'Authorization': `Bearer ${vapiApiKey}` }
                    });
                    if (listRes.ok) {
                        const numbers = await listRes.json();
                        const match = numbers.find((n: any) => n.number === phoneNumberId);
                        if (match) {
                            phoneNumberId = match.id;
                            console.log(`[Generate Agent API] Resolved to UUID: ${phoneNumberId}`);
                        } else {
                            console.warn(`[Generate Agent API] Phone number not found in VAPI account. Attempting call without phoneNumberId.`);
                            phoneNumberId = '';
                        }
                    }
                }

                const callPayload: any = {
                    assistantId,
                    customer: { number: phone }
                };
                if (phoneNumberId && phoneNumberId.includes('-')) {
                    callPayload.phoneNumberId = phoneNumberId;
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
                    console.error(`[Generate Agent API] VAPI Call Failed:`, callData);
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
                    ${deliveryOption !== 'call'
                    ? `<div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                        <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">Start Your Test Drive:</h3>
                        <a href="${testLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px; margin-top: 10px;">
                            Talk to My Agent Now
                        </a></div>`
                    : ''}
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
