
import axios from 'axios';
import { AgentConfiguration } from '../types';

const VAPI_API_URL = 'https://api.vapi.ai/assistant';

const getVapiKey = () => {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_VAPI_PRIVATE_KEY) {
        // @ts-ignore
        return import.meta.env.VITE_VAPI_PRIVATE_KEY;
    }
    return null;
};

export const createVapiAssistant = async (config: AgentConfiguration) => {
    const apiKey = getVapiKey();

    if (!apiKey) {
        throw new Error("Missing VAPI Private Key. Cannot deploy assistant.");
    }

    const companyName = config.metadata.businessName || "the company";
    const deptName = config.metadata.industry || "customer support";

    let systemPrompt = config.vapi.systemPrompt
        .replace(/{{COMPANY_NAME}}/g, companyName)
        .replace(/{{Company name}}/gi, companyName)
        .replace(/{{DEPARTMENT_NAME}}/g, deptName);

    let firstMessage = (config.vapi.firstMessage || `Hello, thank you for calling ${companyName}!`)
        .replace(/{{COMPANY_NAME}}/g, companyName)
        .replace(/{{Company name}}/gi, companyName);

    // Build the payload from scratch with literal values to avoid ANY proto/hidden properties
    const modelObj: any = {
        provider: String(config.vapi.provider || 'openai').toLowerCase(),
        model: String(config.vapi.model || 'gpt-4o-mini').toLowerCase(),
        messages: [
            {
                role: 'system',
                content: `${systemPrompt}\n\n# CUSTOMER CONTEXT\n${(config.vapi.customerName || config.vapi.customerEmail || config.vapi.customerPhone)
                        ? `Information about the customer is already known:\n` +
                        (config.vapi.customerName ? `- Name: ${config.vapi.customerName}\n` : '') +
                        (config.vapi.customerEmail ? `- Email: ${config.vapi.customerEmail}\n` : '') +
                        (config.vapi.customerPhone ? `- Phone: ${config.vapi.customerPhone}\n` : '') +
                        `DO NOT ask the customer for these details as they have already been provided.`
                        : "No specific customer information provided yet. Collect Name, Email, and Phone if required by the workflow."
                    }`
            }
        ],
        temperature: Number(config.vapi.temperature || 0.3),
    };

    const voiceObj: any = {
        provider: String(config.vapi.voiceProvider || 'vapi').toLowerCase(),
        voiceId: String(config.vapi.voiceId || 'Mia'),
    };

    // VERY DEFENSIVE TRANSCRIBER BLOCK
    let transcriberObj: any = null;
    const tProvider = String(config.vapi.transcriber.provider || 'deepgram').toLowerCase();

    if (tProvider === 'openai') {
        // Vapi strictly requires ONLY provider for OpenAI
        transcriberObj = { provider: 'openai' };
    } else {
        transcriberObj = {
            provider: tProvider,
            model: String(config.vapi.transcriber.model || 'nova-2').toLowerCase(),
            language: String(config.vapi.transcriber.language || 'en').toLowerCase()
        };
    }

    const payload: any = {
        name: String(companyName),
        model: modelObj,
        voice: voiceObj,
        transcriber: transcriberObj,
        backgroundSound: (config.vapi.backgroundSound === 'default' || !config.vapi.backgroundSound) ? 'off' : config.vapi.backgroundSound,
        firstMessage: String(firstMessage),
    };

    // Final Knowledge Base Append
    if (config.vapi.knowledgeBase) {
        const kb = config.vapi.knowledgeBase
            .replace(/{{COMPANY_NAME}}/g, companyName)
            .replace(/{{Company name}}/gi, companyName);
        payload.model.messages[0].content += `\n\n# KNOWLEDGE BASE / FAQs\n${kb}`;
    }

    console.log("[VAPI] Final Payload Check:", JSON.stringify(payload));

    // One last manual delete just to be absolutely certain
    if (payload.transcriber) delete (payload.transcriber as any).punctuation;

    try {
        const response = await axios.post(VAPI_API_URL, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("VAPI Assistant Created Successfully");
        return response.data;
    } catch (error: any) {
        console.error("VAPI API Error Details:", error.response?.data);
        throw new Error(`VAPI Creation Failed: ${error.response?.data?.message || error.message}`);
    }
};
