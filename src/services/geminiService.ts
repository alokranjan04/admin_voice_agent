import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { AgentConfiguration, IndustryTemplate } from "../types";

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

  const genAI = new GoogleGenerativeAI(apiKey);
  // Comprehensive list of models to fallback through
  const modelNames = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-flash-latest",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
    "gemini-pro-latest"
  ];

  const systemInstruction = `
    You are an expert Voice AI Configuration Admin.
    Your job is to generate a structured JSON configuration for a Voice AI agent based on a short business description provided by the user.
    
    If "REAL WORLD RESEARCH DATA" is provided, prioritize that information. If the research data is missing specific fields (like specific staff names or detailed hours), use your knowledge to invent plausible ones that fit the context.
    
    Populate the following sections:
    - Business Metadata
        - Services (Invent plausible services with durations)
    - Locations (Invent a plausible location, including address)
        - Resources (Invent staff or rooms if applicable)
    - Data Fields (Recommend mandatory fields)
    - Conversation Rules (Match the tone to the business type)
        - Safety Boundaries (Relevant to the industry)
        - VAPI Configuration (Crucial: Generate a specialized System Prompt and Knowledge Base)
    
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

    FOR VAPI SYSTEM PROMPT:
    Use this EXACT template, replacing {{COMPANY_NAME}} and {{ROLE_DESCRIPTION}} with generated values appropriate for the business:
    "AI Assistant is a professional and empathetic voice interface for {{COMPANY_NAME}}. Your role is to act as a {{ROLE_DESCRIPTION}}, providing clear, helpful, and efficient support to users. You are engineered to accurately interpret spoken queries, adapt to emotional cues, and respond naturally through audio.
    
    Maintain a focus on active listening and clear communication. If a user's concern is complex, ask thoughtful, open-ended clarifying questions. Always strive to uphold the highest standards of service and resolve issues with patience and professionalism.
    
    CRITICAL TOOL USAGE:
    - When you call a tool to check availability or find slots, and the tool returns available times or data, you MUST present these specific options to the user clearly.
    - Ask the user to confirm a specific time before proceeding to book.
    - Do not simply say 'there are no slots' or 'I couldn't retrieve info' if the tool result indicates that slots were found. Read the slots from the tool response.
    - If a slot is unavailable, explain why (e.g., 'Outside business hours') based on the tool result.
    - NEVER hallucinate times. Only use times explicitly returned by tools.
    
    Primary Mode: Voice interaction. Ensure your responses are concise and optimized for spoken conversation."
    
    FOR VAPI KNOWLEDGE BASE:
    Generate 10 FAQs specific to this business in Markdown format.
    
    FOR VAPI VOICE SETTINGS:
    Always use "vapi" for voiceProvider and "Mia" for voiceId.
    
    FOR VAPI MODEL SETTINGS:
    Use "openai" for provider and "gpt-4o-mini" for model by default, but you can also use these providers if appropriate: "groq", "deepseek", "google", "anthropic", "mistral", "perplexity-ai", "xai".
    Set temperature to 0.3.
    
    FOR VAPI TRANSCRIBER SETTINGS:
    Always use "deepgram" for provider and "nova-3" for model by default for high accuracy. Set language to "en-IN".

    FOR VAPI MESSAGE SETTINGS:
    Generate a "firstMessage" that is personalized to the business and the user (e.g., "Hello {{USER_NAME}}, thanks for calling GreenThumb Atlanta, how can I help you today?"). Use the {{USER_NAME}} placeholder to indicate where the user's name should be inserted. Ensure NO placeholders like {{COMPANY_NAME}} remain in the firstMessage, BUT DO keep {{USER_NAME}}.

    Ensure strict adherence to the schema provided.
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
      });

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
      const status = e.status || (e.message?.match(/\[(\d+)\s*\]/) || [])[1];
      if (status === '404') {
        console.warn(`[Gemini Service] Model ${modelName} not found (404).`);
        continue;
      }
      if (status === '429') {
        const resetMsg = e.message?.includes('49s') ? " Wait ~50s." : " Daily/Minute cap reached.";
        console.warn(`[Gemini Service] Quota exceeded for ${modelName}.${resetMsg} Trying next model...`);
        continue;
      }
      console.error(`[Gemini Service] Unexpected error with ${modelName}:`, e.message);
      continue;
    }
  }

  if (lastError?.status === '429' || lastError?.message?.includes('429')) {
    const isFreeTierErr = lastError.message.includes('free_tier');
    throw new Error(`Gemini API Quota Exceeded. ${isFreeTierErr ? "Error reports 'Free Tier' usage even if you have a Pro plan. Please verify that your API Key in .env matches a project with 'Pay-as-you-go' enabled in Google AI Studio." : "Rate limit reached."} Visit ai.google.dev to check your plan and project settings.`);
  }
  throw lastError || new Error("All Gemini models failed.");
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
    model: "gemini-1.5-flash",
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
  });

  const prompt = `
    Based on the following research data for "${companyName}", identify exactly 3-4 key services or features that a Voice AI agent should handle.
    For each, provide a short professional name and a 1-sentence description of how the AI helps.
    
    RESEARCH DATA:
    ${JSON.stringify(researchData).substring(0, 10000)}
    
    Example for a Restaurant:
    - Name: Table Reservations
    - Description: AI handles dynamic booking requests and checks real-time availability.
  `;

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
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    You are a professional business analyst. I am providing you with raw search results (Google Search + Google Places) for a company called "${companyName}".
    
    USER'S INITIAL DESCRIPTION: "${description}"
    
    RAW RESEARCH DATA:
    ${JSON.stringify(researchData, null, 2)}
    
    YOUR TASK:
    Extract and summarize the most relevant information for a Voice AI Agent to use. 
    
    CRITICAL PRIORITY:
    1. EXACT Menu items, Services, and Products (with prices if available). If it's a restaurant, list specific dishes.
    2. Operational details (Exact Address, Opening Hours, Contact info).
    3. Customer Sentiment & Reviews: Summarize what customers love and what they complain about. Mention specific praise (e.g., "fast service", "great pizza").
    4. Core value proposition and unique selling points.
    
    OUTPUT FORMAT:
    Return a clean, structured Markdown summary. 
    Use headers like "### Menu & Services", "### Customer Feedback", and "### Operational Details".
    Be concise but thorough with facts. Avoid adjectives and marketing fluff.
    Limit the output to 1500 characters.
  `;

  console.log(`[Gemini Research] Summarizing for ${companyName}. Raw data length: ${JSON.stringify(researchData).length}`);

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("[Gemini Service] Research summary failed:", err);
    return "";
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
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    You are a professional business consultant. Generate 4-5 common questions and answers (FAQ) for a customer interacting with an AI assistant from a company called "${companyName}".
    
    Industry: ${industry}
    Focal Area (Support/Sales/Ops): ${focalArea}
    Additional Context: ${context || 'N/A'}
    
    The FAQs should be professional, helpful, and specific to the industry and focal area. 
    Format the output as a clean Markdown list with "Q:" and "A:".
    
    Example:
    ### Common Questions
    **Q: What is the typical turnaround time?**
    **A: We typically process all requests within 24 business hours.**
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("[Gemini Service] FAQ generation failed:", err);
    return "";
  }
}