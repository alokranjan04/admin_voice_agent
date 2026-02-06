
import axios from 'axios';
import { AgentConfiguration } from '../types';

const VAPI_API_URL = 'https://api.vapi.ai/assistant';

// Security Note: In a real production app, this call should be proxied through your backend 
// to avoid exposing the VAPI Private Key in the frontend.
// For this local admin tool, we will assume the key is in .env
const getVapiKey = () => {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_VAPI_PRIVATE_KEY) {
        // @ts-ignore
        return import.meta.env.VITE_VAPI_PRIVATE_KEY;
    }
    // Fallback for demo/dev if needed, but preferably crash if missing
    return null;
};

export const createVapiAssistant = async (config: AgentConfiguration) => {
    const apiKey = getVapiKey();

    if (!apiKey) {
        console.error("VAPI API Key missing. Please set VITE_VAPI_PRIVATE_KEY in .env");
        throw new Error("Missing VAPI Private Key. Cannot deploy assistant.");
    }

    // Final Placeholder Replacement Logic (Safety Net)
    const companyName = config.metadata.businessName || "the company";
    const deptName = config.metadata.industry || "customer support";

    let systemPrompt = config.vapi.systemPrompt
        .replace(/{{COMPANY_NAME}}/g, companyName)
        .replace(/{{Company name}}/gi, companyName)
        .replace(/{{DEPARTMENT_NAME}}/g, deptName);

    let firstMessage = (config.vapi.firstMessage || `Hello, thank you for calling ${companyName}!`)
        .replace(/{{COMPANY_NAME}}/g, companyName)
        .replace(/{{Company name}}/gi, companyName);

    // Construct VAPI Payload - Explicitly defining fields to avoid accidental pollution
    const payload = {
        name: companyName,
        model: {
            provider: (config.vapi.provider || 'openai').toLowerCase(),
            model: (config.vapi.model || 'gpt-4o-mini').toLowerCase(),
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                }
            ],
            temperature: config.vapi.temperature || 0.3,
        },
        voice: {
            provider: (config.vapi.voiceProvider || 'vapi').toLowerCase(),
            voiceId: config.vapi.voiceId || 'Mia',
        },
        transcriber: (config.vapi.transcriber.provider || 'openai').toLowerCase() === 'openai'
            ? { provider: 'openai' }
            : {
                provider: config.vapi.transcriber.provider.toLowerCase(),
                model: (config.vapi.transcriber.model || 'whisper-1').toLowerCase(),
                language: config.vapi.transcriber.language || 'en'
            },
        backgroundSound: (config.vapi.backgroundSound === 'default' || !config.vapi.backgroundSound) ? 'off' : config.vapi.backgroundSound,
        firstMessage: firstMessage,
    };

    // Final scrub: Ensure 'punctuation' is not in the transcriber object
    // @ts-ignore
    if (payload.transcriber && typeof payload.transcriber === 'object') {
        // @ts-ignore
        delete payload.transcriber.punctuation;
    }

    console.log("VAPI Payload being sent:", JSON.stringify(payload, null, 2));

    // Append Knowledge Base to System Prompt if present
    if (config.vapi.knowledgeBase) {
        const kb = config.vapi.knowledgeBase
            .replace(/{{COMPANY_NAME}}/g, companyName)
            .replace(/{{Company name}}/gi, companyName);
        // @ts-ignore
        payload.model.messages[0].content += `\n\n# KNOWLEDGE BASE / FAQs\n${kb}`;
    }

    try {
        const response = await axios.post(VAPI_API_URL, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("VAPI Assistant Created:", response.data);
        return response.data; // Returns the created assistant object (with ID, etc.)
    } catch (error: any) {
        console.error("Failed to create VAPI Assistant:", error.response?.data || error.message);
        throw new Error(`VAPI Creation Failed: ${error.response?.data?.message || error.message}`);
    }
};
