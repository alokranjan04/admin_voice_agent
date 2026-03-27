import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { AgentConfiguration, IndustryTemplate } from "../types";
import { 
  GEMINI_CONFIG_GEN_SYSTEM_PROMPT, 
  EXTRACT_SERVICES_PROMPT, 
  SUMMARIZE_RESEARCH_PROMPT, 
  GENERATE_FAQ_PROMPT, 
  GENERATE_QUEST_PROMPT 
} from "../config/prompts";

// Helper to reliably get env vars in different environments (Vite, Webpack, Node)
const getEnv = (key: string) => {
  const nextKey = key.startsWith('VITE_') ? key.replace('VITE_', 'NEXT_PUBLIC_') : `NEXT_PUBLIC_${key}`;

  // Check process.env (Next.js/Node)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[nextKey]) return process.env[nextKey];
    if (process.env[key]) return process.env[key];
  }

  // Check import.meta.env (Vite)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    if (import.meta.env[nextKey]) return import.meta.env[nextKey];
    // @ts-ignore
    if (import.meta.env[key]) return import.meta.env[key];
  }
  return null;
};

const getGeminiApiKey = (): string => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  return apiKey.trim().replace(/^["']|["']$/g, "");
};

export async function generateConfigFromDescription(description: string, researchData?: any, template?: IndustryTemplate): Promise<Partial<AgentConfiguration>> {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    console.log(`[Gemini Service] Initializing with key starting with: ${apiKey.substring(0, 4)}... (Length: ${apiKey.length})`);
  } else {
    console.warn("[Gemini Service] No API Key found in environment variables.");
  }

  if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
    throw new Error("System configuration error: API Key is missing or undefined.");
  }

  // Explicitly use v1 API for broader model support and stability
  const genAI = new GoogleGenerativeAI(apiKey);
  // Current 2026 models: Gemini 2.0 is the stable standard
  const modelNames = ["gemini-2.0-flash", "gemini-2.5-flash"];

  const systemInstruction = `
    ${GEMINI_CONFIG_GEN_SYSTEM_PROMPT}
    
    ${template ? `
    INDUSTRY TEMPLATE CONTEXT:
    The user has selected the "${template.name}" industry.
    - Base System Prompt Concept: ${template.systemPrompt}
    - Recommended First Message Style: ${template.firstMessage}
    - Mandatory Fields to include: ${template.mandatoryFields.join(', ')}
    - Suggested Services: ${template.suggestedServices.join(', ')}
    - Tone: ${template.defaultTone}
    
    Please refine and expand upon these template items to fit the specific business description provided.
    ` : ''}
  `;

  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      metadata: {
        type: SchemaType.OBJECT,
        properties: {
          businessName: { type: SchemaType.STRING },
          industry: { type: SchemaType.STRING },
          primaryUseCase: { type: SchemaType.STRING },
          targetUsers: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
        },
        required: ["businessName", "industry", "primaryUseCase", "description"]
      },
      services: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING },
            name: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
            durationMinutes: { type: SchemaType.INTEGER },
            bookingRules: { type: SchemaType.STRING },
          },
          required: ["name", "durationMinutes"]
        }
      },
      locations: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING },
            name: { type: SchemaType.STRING },
            mode: { type: SchemaType.STRING, enum: ["Physical", "Virtual", "Hybrid"] },
            operatingDays: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            operatingHours: { type: SchemaType.STRING },
            timeZone: { type: SchemaType.STRING },
            address: { type: SchemaType.STRING },
          },
          required: ["name", "address", "mode"]
        }
      },
      resources: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING },
            name: { type: SchemaType.STRING },
            role: { type: SchemaType.STRING },
            availabilityRules: { type: SchemaType.STRING },
            selectionRequired: { type: SchemaType.BOOLEAN },
          }
        }
      },
      conversation: {
        type: SchemaType.OBJECT,
        properties: {
          tone: { type: SchemaType.STRING },
          formality: { type: SchemaType.STRING, enum: ["Casual", "Professional", "Formal"] },
          speakingStyle: { type: SchemaType.STRING },
          speechPace: { type: SchemaType.STRING, enum: ["Slow", "Normal", "Fast"] },
          smallTalkAllowed: { type: SchemaType.BOOLEAN },
          identityDisclosure: { type: SchemaType.STRING, enum: ["Always", "On Demand", "Never"] },
        }
      },
      safety: {
        type: SchemaType.OBJECT,
        properties: {
          allowedTopics: { type: SchemaType.STRING },
          disallowedTopics: { type: SchemaType.STRING },
          complianceConstraints: { type: SchemaType.STRING },
        }
      },
      integrations: {
        type: SchemaType.OBJECT,
        properties: {
          firebase: { type: SchemaType.BOOLEAN },
          googleCalendar: { type: SchemaType.BOOLEAN }
        }
      },
      vapi: {
        type: SchemaType.OBJECT,
        properties: {
          systemPrompt: { type: SchemaType.STRING },
          provider: { type: SchemaType.STRING },
          model: { type: SchemaType.STRING },
          firstMessage: { type: SchemaType.STRING },
          temperature: { type: SchemaType.NUMBER },
          voiceProvider: { type: SchemaType.STRING },
          voiceId: { type: SchemaType.STRING },
          transcriber: {
            type: SchemaType.OBJECT,
            properties: {
              provider: { type: SchemaType.STRING },
              language: { type: SchemaType.STRING },
              model: { type: SchemaType.STRING }
            }
          },
          knowledgeBase: { type: SchemaType.STRING }
        },
        required: ["systemPrompt", "knowledgeBase", "firstMessage"]
      }
    },
    required: ["metadata", "locations", "vapi"]
  };

  const userContent = researchData
    ? `Business Description: ${description}\n\nREAL WORLD RESEARCH DATA (Priority):\n${JSON.stringify(researchData, null, 2)}\n\nPlease use the research data above to populate the JSON.`
    : `Business Description: ${description}`;

  let lastError = null;

  for (const modelName of modelNames) {
    try {
      console.log(`[Gemini Service] Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: { role: "system", parts: [{ text: systemInstruction }] }
      }, { apiVersion: 'v1beta' });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema as any
        }
      });

      return processResult(result);
    } catch (e: any) {
      lastError = e;
      const msgStr = String(e.message || '');
      const statusCode = e.status ?? Number((msgStr.match(/\[(\d+)\s*\]/) || [])[1]);
      if (statusCode === 404 || msgStr.includes('not found') || msgStr.includes('not supported')) {
        console.warn(`[Gemini Service] Model ${modelName} deprecated/not found, skipping...`);
        continue;
      }
      if (statusCode === 429) {
        console.warn(`[Gemini Service] Quota exceeded for ${modelName}, trying next...`);
        continue;
      }
      if (statusCode === 503 || statusCode === 502 || statusCode === 500 || msgStr.includes('unavailable') || msgStr.includes('overloaded')) {
        console.warn(`[Gemini Service] ${modelName} temporarily unavailable (${statusCode}), trying next...`);
        continue;
      }
      // For auth/schema/bad-request errors, throw immediately with the real message
      throw new Error(`Gemini (${modelName}) error [${statusCode || 'unknown'}]: ${msgStr}`);
    }
  }

  const lastMsg = String(lastError?.message || '');
  if (lastMsg.includes('429') || lastMsg.includes('quota')) {
    const isFreeTierErr = lastMsg.includes('free_tier');
    throw new Error(`Gemini API Quota Exceeded. ${isFreeTierErr ? "Verify your API Key is linked to a Pay-as-you-go project in Google AI Studio." : "Rate limit reached."} Visit ai.google.dev to check your plan.`);
  }
  if (lastMsg.includes('503') || lastMsg.includes('unavailable') || lastMsg.includes('overloaded')) {
    throw new Error('Gemini API is temporarily unavailable. Please wait a moment and try again.');
  }
  throw lastError || new Error("All Gemini models failed.");
}

/**
 * Translates agent content (system prompt, first message, knowledge base) to a target language.
 */
export async function translateAgentContent(
  content: { systemPrompt: string; firstMessage: string; knowledgeBase: string },
  targetLanguage: string
): Promise<{ systemPrompt: string; firstMessage: string; knowledgeBase: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("Gemini API key missing.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }, { apiVersion: 'v1beta' });

  const isHinglish = targetLanguage === 'Hinglish';

  // Build only the non-empty fields to avoid sending empty strings to the model
  const contentToTranslate: Record<string, string> = {};
  if (content.systemPrompt) contentToTranslate.systemPrompt = content.systemPrompt;
  if (content.firstMessage) contentToTranslate.firstMessage = content.firstMessage;
  if (content.knowledgeBase) contentToTranslate.knowledgeBase = content.knowledgeBase;

  const promptWithContent = (isHinglish
    ? `You are a professional translator. Translate the following voice AI agent content into Hindi, but write ONLY in Roman/English script (Hinglish). Do NOT use any Devanagari script at all. Every Hindi word must be spelled phonetically using English letters. Example: write "Aapka swagat hai" not "आपका स्वागत है".
Keep all placeholder variables like {{COMPANY_NAME}}, {{USER_NAME}} exactly as-is (do not translate them).
Keep brand names, business names, and proper nouns in their original English form.
Return ONLY a JSON object with exactly these keys (include a key only if it was provided): systemPrompt, firstMessage, knowledgeBase.

Content to translate:
${JSON.stringify(contentToTranslate, null, 2)}`
    : `You are a professional translator. Translate the following voice AI agent content into ${targetLanguage}.
Keep all placeholder variables like {{COMPANY_NAME}}, {{USER_NAME}} exactly as-is (do not translate them).
Keep technical terms, brand names, and proper nouns in their original form.
Return ONLY a JSON object with exactly these keys (include a key only if it was provided): systemPrompt, firstMessage, knowledgeBase.

Content to translate:
${JSON.stringify(contentToTranslate, null, 2)}`);

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: promptWithContent }] }],
    generationConfig: { responseMimeType: "application/json" }
  });

  const text = result.response.text().trim();
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleaned);
  // Return original values for any fields that were skipped (empty input)
  return {
    systemPrompt: parsed.systemPrompt ?? content.systemPrompt,
    firstMessage: parsed.firstMessage ?? content.firstMessage,
    knowledgeBase: parsed.knowledgeBase ?? content.knowledgeBase,
  };
}

/**
 * Extracts a structured array of key services from raw business research.
 * Used to display "What this AI can do" on the lead-gen success screen.
 */
export async function extractServicesFromResearch(companyName: string, researchData: any): Promise<Array<{ name: string, description: string }>> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return [];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          services: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING }
              },
              required: ["name", "description"]
            }
          }
        },
        required: ["services"]
      }
    }
  }, { apiVersion: 'v1' });

  const prompt = EXTRACT_SERVICES_PROMPT(companyName, researchData);

  try {
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    return parsed.services || [];
  } catch (err) {
    console.error("[Gemini Service] Service extraction failed:", err);
    return [];
  }
}

/**
 * Summarizes raw research data into a clean business knowledge base.
 * Perfect for lead-gen agents where we need accurate services/menu details from Google.
 */
export async function summarizeBusinessResearch(companyName: string, description: string, researchData: any): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return "";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }, { apiVersion: 'v1' });

  const prompt = SUMMARIZE_RESEARCH_PROMPT(companyName, description, researchData);

  console.log(`[Gemini Research] Summarizing for ${companyName}. Raw data length: ${JSON.stringify(researchData).length}`);

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    if (text.length > 50) return text;
    throw new Error("Summary too short");
  } catch (err: any) {
    console.warn("[Gemini Service] Research summary failed or empty. Using default industry profile.");
    return `### Business Intelligence Profile: ${companyName}\n\n**Overview:** A professional service provider in the industry, focused on delivering high-quality client experiences. \n\n**Key Strengths:** Reliable service delivery, professional communication, and specialized industry expertise. \n\n**Operational Focus:** Streamlining customer interactions and providing efficient, automated support for common inquiries.`;
  }
}

function processResult(result: any) {
  const jsonText = result.response.text();
  const parsed = JSON.parse(jsonText);
  return {
    ...parsed,
    metadata: { ...(parsed.metadata || {}), createdAt: new Date().toISOString() },
    services: parsed.services?.map((s: any) => ({ ...s, id: s.id || Math.random().toString(36).substring(2, 9) })) || [],
    locations: parsed.locations?.map((l: any) => ({ ...l, id: l.id || Math.random().toString(36).substring(2, 9) })) || [],
    resources: parsed.resources?.map((r: any) => ({ ...r, id: r.id || Math.random().toString(36).substring(2, 9) })) || [],
    integrations: { firebase: true, googleCalendar: true, ...(parsed.integrations || {}) },
    vapi: {
      provider: 'OpenAI',
      model: 'gpt-4o-mini',
      temperature: 0.3,
      voiceProvider: 'vapi',
      voiceId: 'Mia',
      transcriber: { provider: 'deepgram', language: 'en-IN', model: 'nova-3' },
      ...(parsed.vapi || {})
    }
  } as Partial<AgentConfiguration>;
}

/**
 * Generates 4-5 industry-specific common questions and answers for a given company and industry.
 */
export async function generateIndustryFAQs(companyName: string, industry: string, focalArea: string, context?: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return "";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }, { apiVersion: 'v1' });

  const faqContext = context && context.length > 5 ? context : `A professional business in the ${industry} industry focusing on ${focalArea}. They provide high-quality services and value customer satisfaction.`;

  const prompt = GENERATE_FAQ_PROMPT(companyName, industry, focalArea, faqContext);

  console.log(`[Gemini FAQ] Starting FAQ generation for ${companyName}. Context length: ${faqContext.length}`);
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    if (text.length > 50) return text;
    throw new Error("FAQ too short");
  } catch (err: any) {
    console.warn("[Gemini Service] FAQ generation failed or empty. Using industry defaults.");
    return `### Common Questions\n\n**Q: How do I get more information about your services?**\n**A: You can speak with our AI assistant right now or leave your contact details for a follow-up.**\n\n**Q: What are your standard operating hours?**\n**A: We are available during standard business hours, and our AI assistant is here to help 24/7.**\n\n**Q: How can I book a consultation?**\n**A: Our AI assistant can guide you through the process of scheduling a time that works for you.**`;
  }
}

/**
 * Generates a comprehensive Markdown questionnaire focused on customer intents and business needs.
 * This is used to deeply train the AI and provide a clear roadmap for the business.
 */
export async function generateCustomerIntentQuestionnaire(companyName: string, industry: string, focalArea: string, context?: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return "";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }, { apiVersion: 'v1' });

  const questContext = context && context.length > 5 ? context : `Standard business operations for ${companyName} in the ${industry} industry. Focus on high-value customer interactions and efficient troubleshooting.`;

  const prompt = GENERATE_QUEST_PROMPT(companyName, industry, focalArea, questContext);

  console.log(`[Gemini Quest] Starting Questionnaire generation for ${companyName}. Context length: ${questContext.length}`);
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    if (text.length > 100) return text;
    throw new Error("Questionnaire too short");
  } catch (err: any) {
    console.warn("[Gemini Service] Questionnaire generation failed or empty. Using strategic defaults.");
    return `### 📋 Strategic Intent Questionnaire\n\n**Intent 1: General Inquiry & Information**\n*   **Common Question:** "What do you guys do?"\n*   **Strategic Response:** Provide a concise overview of ${companyName}'s core value proposition and invite them to explore specific services.\n\n**Intent 2: Booking & Scheduling**\n*   **Common Question:** "I'd like to set up a meeting."\n*   **Strategic Response:** Efficiently gather their preferences and move them directly into the scheduling flow to maximize conversion.\n\n**Intent 3: Service Details**\n*   **Common Question:** "Can you help me with X?"\n*   **Strategic Response:** Identify the specific need and explain ${companyName}'s approach to solving it professionally.`;
  }
}