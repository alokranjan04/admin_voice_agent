import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, company, email, phone } = body;

        if (!name || !company || !email) {
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

        console.log(`[Generate Agent API] Creating assistant for ${company}...`);

        // 1. Create the Vapi Assistant
        const systemPrompt = `You are a highly persuasive, intelligent, and friendly AI Voice Agent representing ${company}. Your primary goal right now is to demonstrate your capabilities to the prospect, ${name}, who just requested this demo. Be enthusiastic and professional. Start the conversation by warmly greeting ${name} by name, welcoming them to their custom ${company} AI demo, and asking if they are ready to see how voice automation can transform their customer experience 24/7. Keep your responses concise and naturally conversational.`;

        const vapiRes = await fetch('https://api.vapi.ai/assistant', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${vapiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `${company} AI Rep`,
                model: {
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt }
                    ]
                },
                voice: {
                    provider: '11labs',
                    voiceId: 'bIHbv24MWmeRgasZH58o' // Willa voice
                },
                firstMessage: `Hello ${name}! Welcome to your custom ${company} Voice AI demo. Thanks for building me. How can I help you today?`
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
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const testLink = `${protocol}://${host}/test/${assistantId}`;

        // 3. Send the Email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: gmailUser, pass: gmailPass }
        });

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
                        We're thrilled to present your custom-built Voice AI Agent. It has been specifically trained to represent <strong>${company}</strong> and is ready to demonstrate how flawless 24/7 automated customer interaction sounds.
                    </p>

                    <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                        <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">Click below to start your Test Drive:</h3>
                        <a href="${testLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px; margin-top: 10px;">
                            Talk to My Agent Now
                        </a>
                    </div>

                    <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
                        Imagine having thousands of these agents making outbound sales calls or answering support tickets for ${company} simultaneously. 
                        If you're impressed by the demo, reply directly to this email to schedule a technical consultation.
                    </p>

                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 40px 0;">

                    <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                        This is an automated delivery from our Voice AI Agency Platform.<br>
                        ${company} Automated Agent ID: <code>${assistantId}</code>
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
