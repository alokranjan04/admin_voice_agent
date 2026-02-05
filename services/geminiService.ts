import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { AgentConfiguration } from "../types";

// Helper to reliably get env vars in different environments (Vite, Webpack, Node)
const getEnv = (key: string) => {
  // Check import.meta.env (Vite)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  // Check process.env (Node/Webpack replacement)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return null;
};

const getGeminiApiKey = (): string => {
  // Check for keys in specific order of likelihood for a Vite/React app
  // We prioritize VITE_GEMINI_API_KEY as it is the most specific to this use case
  let apiKey =
    getEnv('VITE_GEMINI_API_KEY') ||
    getEnv('VITE_API_KEY') ||
    getEnv('REACT_APP_GEMINI_API_KEY') ||
    getEnv('REACT_APP_API_KEY') ||
    getEnv('GEMINI_API_KEY') ||
    getEnv('API_KEY') ||
    process.env.API_KEY ||
    '';

  // Sanitize: Trim whitespace
  apiKey = apiKey ? apiKey.trim() : '';

  // Sanitize: Remove wrapping quotes which can happen in some .env parsers
  if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
    apiKey = apiKey.slice(1, -1);
  }

  return apiKey;
};

export async function generateConfigFromDescription(description: string, researchData?: any): Promise<Partial<AgentConfiguration>> {
  const apiKey = getGeminiApiKey();

  // Debug Log (Masked) to help user troubleshoot without exposing full key in logs
  if (apiKey) {
    console.log(`[Gemini Service] Initializing with key starting with: ${apiKey.substring(0, 4)}... (Length: ${apiKey.length})`);
  } else {
    console.warn("[Gemini Service] No API Key found in environment variables.");
  }

  // Validation
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
    console.error("Gemini Service: API Key is missing or invalid string.");
    throw new Error(
      "System configuration error: API Key is missing or undefined. " +
      "If you are using Vite, ensure your .env variable starts with 'VITE_' (e.g. VITE_GEMINI_API_KEY) and you have RESTARTED the dev server."
    );
  }

  // Initialize client here to ensure we use the latest env var and catch initialization errors
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    systemInstruction: {
      role: "system",
      parts: [{
        text: `
    You are an expert Voice AI Configuration Admin.
    Your job is to generate a structured JSON configuration for a Voice AI agent based on a short business description provided by the user.
    
    If "REAL WORLD RESEARCH DATA" is provided, prioritize that information. If the research data is missing specific fields (like specific staff names or detailed hours), use your knowledge to invent plausible ones that fit the context.
    
    Populate the following sections:
    - Business Metadata
        - Services (Invent plausible services with durations)
    - Locations (Invent a plausible location)
        - Resources (Invent staff or rooms if applicable)
        - Data Fields (Recommend mandatory fields)
        - Conversation Rules (Match the tone to the business type)
            - Safety Boundaries (Relevant to the industry)
            - VAPI Configuration (Crucial: Generate a specialized System Prompt and Knowledge Base)
    
    FOR VAPI SYSTEM PROMPT:
    Use this EXACT template, replacing {{COMPANY_NAME}} and {{DEPARTMENT_NAME}} with generated values appropriate for the business:
    "AI Assistant is a sophisticated AI training assistant, crafted by experts in customer support and AI development at {{COMPANY_NAME}} within the {{DEPARTMENT_NAME}} team. Designed with the persona of a seasoned customer support professional, AI Assistant combines deep technical knowledge with a strong sense of emotional intelligence. AI Assistant’s primary role is to serve as a dynamic training platform for customer support agents, simulating a broad range of service scenarios, from basic inquiries to complex problem-solving challenges.
    
    AI Assistant’s advanced capabilities allow it to replicate diverse customer service situations, making it an invaluable tool for training purposes. It guides new agents through simulated interactions, offering real-time feedback and guidance to refine skills in handling customer needs with patience, empathy, and professionalism. AI Assistant ensures every trainee learns to listen actively, respond thoughtfully, and uphold the highest standards of customer care.
    
    Primary Mode of Interaction
    
    AI Assistant interacts primarily through voice, accurately interpreting spoken queries and responding naturally through audio. This design prepares trainees for real customer conversations and live call environments. AI Assistant is engineered to recognize and adapt to emotional cues in speech, allowing trainees to practice managing emotional nuances with confidence and care.
    
    Training Guidance
    
    AI Assistant encourages trainees to practice active listening by acknowledging customer queries with clear confirmation of engagement, such as expressing presence and readiness to help.
    
    AI Assistant emphasizes clear and empathetic communication, always tailored to the specific context of each interaction.
    
    AI Assistant demonstrates how to handle unclear or complex customer concerns by asking thoughtful, open-ended clarifying questions in a natural and human manner.
    
    AI Assistant teaches trainees to express empathy and understanding, particularly when customers are frustrated or dissatisfied, ensuring concerns are addressed with care and a strong focus on resolution.
    
    AI Assistant prepares agents to transition interactions smoothly to human colleagues when appropriate, reinforcing the importance of human connection in sensitive or complex situations.
    
    AI Assistant’s overarching mission is to strengthen the human side of customer support through immersive, scenario-based training. It is not merely an answer engine, but a refined training platform designed to develop knowledgeable, empathetic, and adaptable customer support professionals.
    
    Additional Instruction
    
    AI Assistant must not use numeric characters in any response."
    
    FOR VAPI KNOWLEDGE BASE:
    Generate 10 FAQs specific to this business in Markdown format.
    
    FOR VAPI VOICE SETTINGS:
    Always use "vapi" for voiceProvider and "Mia" for voiceId.
    
    FOR VAPI MODEL SETTINGS:
    Always use "openai" for provider and "gpt-4o-mini" for model.
    Set temperature to 0.3.
    
    FOR VAPI TRANSCRIBER SETTINGS:
    Always use "openai" for provider and "gpt-4o-mini-transcribe" for model.
    Set language to "en".

    FOR VAPI MESSAGE SETTINGS:
    Generate a "firstMessage" that is personalized to the business (e.g., "Hello, thanks for calling GreenThumb Atlanta, how can I help you?"). Ensure NO placeholders like {{COMPANY_NAME}} remain in the firstMessage.

    Ensure strict adherence to the schema provided.
          `}]
    }
  });



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
          }
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
    }
  };

  try {
    const maxRetries = 3;
    let result;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const userContent = researchData
          ? `Business Description: ${description}\n\nREAL WORLD RESEARCH DATA (Priority):\n${JSON.stringify(researchData, null, 2)}\n\nPlease use the research data above to populate the JSON. If research data is missing specific fields (like specific staff names or detailed hours), use your knowledge to invent plausible ones that fit the context.`
          : `Business Description: ${description}`;

        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: userContent }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema as any
          }
        });
        break;
      } catch (callError: any) {
        console.warn(`Attempt ${attempt + 1} failed: ${callError.message}`);
        if (attempt === maxRetries - 1) throw callError;

        if (callError.message?.includes('503') || callError.message?.includes('429')) {
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw callError;
        }
      }
    }

    if (!result) {
      throw new Error("Failed to get response.");
    }

    const jsonText = result.response.text();
    // No manual JSON extraction needed usually with schema mode, but good to have fallback parsing
    // SDK 1.5-flash with schema returns valid JSON string directly.

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      throw new Error("AI returned invalid JSON format.");
    }


    // Post-processing to ensure IDs exist and enums match exactly if schema missed subtle things
    const processed: Partial<AgentConfiguration> = {
      ...parsed,
      metadata: {
        ...(parsed.metadata || {}),
        createdAt: new Date().toISOString() // Inject creation timestamp
      },
      services: parsed.services?.map((s: any) => ({ ...s, id: s.id || Math.random().toString(36).substring(2, 9) })) || [],
      locations: parsed.locations?.map((l: any) => ({ ...l, id: l.id || Math.random().toString(36).substring(2, 9) })) || [],
      resources: parsed.resources?.map((r: any) => ({ ...r, id: r.id || Math.random().toString(36).substring(2, 9) })) || [],
      integrations: {
        firebase: true,
        googleCalendar: true, // Default to true if AI recommends it, or fallback
        ...(parsed.integrations || {})
      },
      vapi: {
        provider: 'OpenAI',
        model: 'gpt-4o-mini',
        temperature: 0.3,
        voiceProvider: 'vapi',
        voiceId: 'Mia',
        transcriber: { provider: 'openai', language: 'en', model: 'gpt-4o-mini-transcribe' },
        ...(parsed.vapi || {}) // Overwrite with AI generated prompt/KB if present
      }
    };

    return processed;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}