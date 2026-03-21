import Vapi from '@vapi-ai/web';
import { BusinessConfig } from '@/types/agent-ui/types';
import { calendarService } from './calendarService';

export interface LogEntry {
    type: 'user' | 'model' | 'system' | 'tool';
    text: string;
    text_processed?: string;
    timestamp: Date;
}

export class VapiService {
    private vapi: any; // Vapi instance
    private currentConfig: BusinessConfig | null = null;
    public onStatusChange: (status: 'disconnected' | 'connecting' | 'connected') => void = () => { };
    public onVolumeChange: (volume: number) => void = () => { };
    public onLog: (entry: LogEntry) => void = () => { };

    // Post-Call Automation State
    private conversationTranscript: { role: string, text: string }[] = [];
    private sessionMetadata: any = {};

    constructor() {
        const apiKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.VITE_VAPI_PUBLIC_KEY;
        if (apiKey) {
            this.vapi = new Vapi(apiKey);
            this.setupEventListeners();
        } else {
            console.error("VAPI_PUBLIC_KEY is missing. Vapi service will not work.");
        }
    }

    private getEnvVar(key: string): string {
        // Next.js requires static string references for process.env.NEXT_PUBLIC_* replacements
        if (key === 'NEXT_PUBLIC_GEMINI_API_KEY') return process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
        if (key === 'NEXT_PUBLIC_NOTIFICATION_EMAIL') return process.env.NEXT_PUBLIC_NOTIFICATION_EMAIL || '';
        if (key === 'NEXT_PUBLIC_APP_URL') return process.env.NEXT_PUBLIC_APP_URL || '';

        // Fallback for non-standard environments
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key] as string;
        }
        return '';
    }

    private setupEventListeners() {
        if (!this.vapi) return;

        this.vapi.on('call-start', () => {
            this.onStatusChange('connected');
            this.onLog({ type: 'system', text: 'Vapi Call Started', timestamp: new Date() });

            // Reset session state and pre-fill with config user info if available
            this.conversationTranscript = [];

            // Priority: Existing Metadata (from form) > URL Params > Config Params
            const urlParams = new URLSearchParams(window.location.search);
            this.sessionMetadata = {
                userName: this.sessionMetadata.userName || urlParams.get('uName') || this.currentConfig?.vapi?.transcriber?.userName || '',
                userEmail: this.sessionMetadata.userEmail || urlParams.get('uEmail') || this.currentConfig?.vapi?.transcriber?.userEmail || '',
                userPhone: this.sessionMetadata.userPhone || urlParams.get('uPhone') || this.currentConfig?.vapi?.transcriber?.userPhone || '',
                // Support both key styles
                name: this.sessionMetadata.name || this.sessionMetadata.userName,
                email: this.sessionMetadata.email || this.sessionMetadata.userEmail,
                phone: this.sessionMetadata.phone || this.sessionMetadata.userPhone
            };
            console.log("[Metadata] Initialized with config/URL:", this.sessionMetadata);
        });

        this.vapi.on('call-end', async () => {
            this.onStatusChange('disconnected');
            this.onLog({ type: 'system', text: 'Vapi Call Ended. Generating summary...', timestamp: new Date() });

            await this.handlePostCallAutomation();
        });

        this.vapi.on('speech-start', () => {
            // AI started speaking (optional log or state)
        });

        this.vapi.on('speech-end', () => {
            // AI stopped speaking
        });

        this.vapi.on('volume-level', (level: number) => {
            // Level is usually 0-1
            this.onVolumeChange(level);
        });

        this.vapi.on('message', (message: any) => {
            if (message.type === 'transcript') {
                if (message.transcriptType === 'partial') {
                    // Optionally handle partials
                } else if (message.transcriptType === 'final') {
                    const role = message.role === 'assistant' ? 'model' : 'user';
                    this.onLog({
                        type: role,
                        text: message.transcript,
                        timestamp: new Date()
                    });

                    // Capture for summary
                    this.conversationTranscript.push({ role, text: message.transcript });
                }
            }
            if (message.type === 'function-call') {
                const call = message.functionCall;
                let params = call.parameters;
                if (typeof params === 'string') {
                    try { params = JSON.parse(params); } catch (e) { }
                }
                this.onLog({
                    type: 'tool',
                    text: `Calling tool: ${call.name} (via backend)`,
                    timestamp: new Date()
                });
            }
            if (message.type === 'tool-calls') {
                const calls = message.toolCalls;
                console.log("[Vapi Message] Raw tool-calls:", JSON.stringify(message, null, 2));

                calls.forEach(async (call: any) => {
                    let params = call.function.arguments;
                    if (typeof params === 'string') {
                        try { params = JSON.parse(params); } catch (e) {
                            console.error("[Tool] Failed to parse arguments:", params);
                        }
                    }

                    const rawToolName = call.function.name;
                    // Support both local names and Vapi Dashboard tool aliases (Case Insensitive)
                    let normalizedName = rawToolName.toLowerCase();
                    if (normalizedName.includes('checkavailability')) normalizedName = 'checkAvailability';
                    else if (normalizedName.includes('findavailableslots')) normalizedName = 'findAvailableSlots';
                    else if (normalizedName.includes('createevent') || normalizedName.includes('google_calendar_tool')) normalizedName = 'createEvent';
                    else if (normalizedName.includes('confirmdetails')) normalizedName = 'confirmDetails';
                    else if (normalizedName.includes('cancelevent')) normalizedName = 'cancelEvent';

                    console.log(`[Tool] Executing: ${rawToolName} (Mapped to: ${normalizedName}) with params:`, params);

                    // Capture metadata for summary/email from tool calls
                    if (normalizedName === 'createEvent' || normalizedName === 'confirmDetails') {
                        this.sessionMetadata = { ...this.sessionMetadata, ...params };
                        console.log(`[Metadata] Capture from ${normalizedName}:`, this.sessionMetadata);
                    }

                    this.onLog({
                        type: 'tool',
                        text: `Executing tool: ${rawToolName}`,
                        timestamp: new Date()
                    });

                    // Handle Tool Execution Client-Side
                    // CRITICAL: Calendar tools are now handled by the Backend Webhook (via serverUrl).
                    // We ONLY execute 'confirmDetails' locally as it's a simple utility.
                    try {
                        let result: any = null;

                        if (normalizedName === 'confirmDetails') {
                            result = { status: 'confirmed', message: 'Details verified.' };

                            // Send response for local tool
                            this.vapi.send({
                                type: 'tool-call-result',
                                toolCallId: call.id,
                                result: JSON.stringify(result)
                            });

                            this.onLog({
                                type: 'system',
                                text: `[RESULT] Details confirmed locally`,
                                timestamp: new Date()
                            });
                        } else {
                            // For all other tools (Calendar), we let the Server (Webhook) handle it.
                            console.log(`[Tool] Delegating ${rawToolName} to Backend Webhook. Client will NOT execute.`);
                            this.onLog({
                                type: 'system',
                                text: `[INFO] Requesting ${rawToolName} from Server...`,
                                timestamp: new Date()
                            });
                        }
                    } catch (error: any) {
                        console.error(`[Tool] execution failed for ${call.function.name}:`, error);
                        // We do NOT send error here to avoid interfering with Server response
                    }
                });
            }
        });

        this.vapi.on('error', (error: any) => {
            console.error('Vapi Error:', error);
            let msg = JSON.stringify(error);
            if (error.message?.msg) msg = error.message.msg;
            else if (error.error?.msg) msg = error.error.msg;
            else if (typeof error === 'string') msg = error;

            this.onLog({ type: 'system', text: `Error: ${msg}`, timestamp: new Date() });
            this.onStatusChange('disconnected');
        });
    }

    /**
     * Set session metadata (e.g., user details from welcome form)
     */
    public setSessionMetadata(metadata: any) {
        this.sessionMetadata = { ...this.sessionMetadata, ...metadata };
        console.log('[Metadata] Updated from external source:', this.sessionMetadata);
    }

    /**
     * Mute/Unmute the local microphone
     */
    public setMuted(muted: boolean) {
        if (this.vapi) {
            this.vapi.setMuted(muted);
        }
    }

    public async connect(config: BusinessConfig, options: { muteAssistant?: boolean, assistantId?: string } = {}) {
        if (!this.vapi) {
            this.onLog({ type: 'system', text: 'Vapi not initialized (missing key)', timestamp: new Date() });
            return;
        }

        this.currentConfig = config;
        this.onStatusChange('connecting');
        this.onLog({ type: 'system', text: 'Connecting to Vapi...', timestamp: new Date() });

        // If assistantId is provided, use it directly (Demo Mode / Lead Agent Mode)
        if (options.assistantId) {
            try {
                this.onLog({ type: 'system', text: `Starting session with Assistant ID: ${options.assistantId}`, timestamp: new Date() });
                await this.vapi.start(options.assistantId, {
                    metadata: {
                        leadName: this.sessionMetadata.name || '',
                        leadEmail: this.sessionMetadata.email || '',
                        leadPhone: this.sessionMetadata.phone || ''
                    }
                });
                return;
            } catch (e: any) {
                console.error("Failed to start Vapi call by ID", e);
                this.onLog({ type: 'system', text: `Failed to connect by ID: ${e.message}`, timestamp: new Date() });
                this.onStatusChange('disconnected');
                return;
            }
        }

        const vapiConf = config.vapi;
        this.onLog({ type: 'system', text: `Config Loaded: ${config.id || 'unidentified'}. Vapi data present: ${!!vapiConf}`, timestamp: new Date() });

        let faqs = "";
        if (vapiConf?.knowledgeBase) {
            faqs = vapiConf.knowledgeBase;
            this.onLog({ type: 'system', text: 'Using pre-configured Knowledge Base.', timestamp: new Date() });
        } else {
            this.onLog({ type: 'system', text: 'Generating Knowledge Base (FAQs) dynamically...', timestamp: new Date() });
            faqs = await this.generateKnowledgeBase(config);
        }

        // AGGRESSIVE RELIABILITY INJECTION (Priority 1: Placed at the absolute TOP of the prompt)
        const now = new Date();
        const currentDateTimeStr = now.toLocaleString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
        });

        const mandatoryDirectives = `[MANDATORY RELIABILITY DIRECTIVES - READ THIS FIRST]
1. TODAY'S DATE: The current date and time is ${currentDateTimeStr}.
2. TRUST TOOLS: You MUST trust the result of your tools. If a tool returns 'isAvailable: true' or 'hasSlots: true', the slot is 100% AVAILABLE.
3. NEVER APOLOGIZE: Never tell the user you are "having trouble" or "unable to retrieve" availability if a tool result is present.
4. AUTHENTICATION EXPIRED: If a tool returns 'needsReauth: true', politely tell the user: "It looks like the calendar connection has expired. Could you please click 'Disconnect' and then 'Connect Calendar' again in the admin settings?"
5. OFFER SLOTS: If findAvailableSlots returns slots, you MUST list them to the user immediately.
6. CALENDAR ID: Use 'alokranjan04@gmail.com' for all operations.
7. PRE-VERIFIED USER CONTEXT (IDENTIFICATION):
   - Name: ${this.sessionMetadata.name || this.sessionMetadata.userName || "Unknown"}
   - Phone: ${this.sessionMetadata.phone || this.sessionMetadata.userPhone || "Unknown"}
   - Email: ${this.sessionMetadata.email || this.sessionMetadata.userEmail || "Unknown"}
   
   RULE: The user has ALREADY provided and verified their Name, Phone, and Email via our secure pre-call form.
   RULE: If Name, Phone, or Email are provided (not 'Unknown'), you MUST NOT ask for them.
   RULE: Use these values automatically for any bookings or tool calls. DO NOT re-confirm them with the user.
   RULE: Only ask for a field if its value is 'Unknown'.
8. PHONETIC HINT: If the user's name is "Amrita", ensure you pronounce it clearly as "Am-ree-ta".
9. BOOKING RULE: Once the user selects or confirms a time, perform 'createEvent' immediately using the pre-verified context.
10. LANGUAGE: Proficient in English and Hindi. Use the user's language.\n\n`;

        let systemPrompt = "";
        if (vapiConf?.systemPrompt) {
            systemPrompt = mandatoryDirectives + vapiConf.systemPrompt;
            if (faqs && !systemPrompt.includes("Knowledge Base")) {
                systemPrompt += `\n\nKnowledge Base:\n${faqs}`;
            }
            this.onLog({ type: 'system', text: 'Using pre-configured System Prompt (Hardened with directives).', timestamp: new Date() });
        } else {
            systemPrompt = mandatoryDirectives + this.generateSystemPrompt(config, faqs, this.sessionMetadata);
        }

        try {
            const companyName = config.metadata?.businessName || "AI Assistant";
            this.onLog({ type: 'system', text: 'Starting session with ephemeral configuration...', timestamp: new Date() });

            let modelProvider = (vapiConf?.provider?.toLowerCase() || "openai");
            if (modelProvider === "azure") modelProvider = "azure-openai";
            if (modelProvider === "elevenlabs" || modelProvider === "11labs") modelProvider = "11labs";
            if (modelProvider === "google" || modelProvider === "gemini") modelProvider = "google";
            if (modelProvider === "anthropic") modelProvider = "anthropic";
            if (modelProvider === "together" || modelProvider === "togetherai") modelProvider = "together-ai";

            let voiceProvider = vapiConf?.voiceProvider?.toLowerCase() || "11labs";
            if (voiceProvider === "elevenlabs" || voiceProvider === "eleven labs") voiceProvider = "11labs";
            if (voiceProvider === "openai") voiceProvider = "openai";
            if (voiceProvider === "playht") voiceProvider = "playht";
            if (voiceProvider === "cartesia") voiceProvider = "cartesia";
            if (voiceProvider === "deepgram") voiceProvider = "deepgram";
            if (voiceProvider === "azure") voiceProvider = "azure";

            let voiceId = vapiConf?.voiceId;
            if (!voiceId) {
                if (voiceProvider === 'azure') voiceId = "andrew";
                else if (voiceProvider === '11labs') voiceId = "cjVigAj5ms15Di0SA2K6";
                else if (voiceProvider === 'openai') voiceId = "alloy";
                else voiceId = "cjVigAj5ms15Di0SA2K6";
            }
            voiceId = String(voiceId);

            const vapiVoices = ["Elliot", "Kylie", "Rohan", "Lily", "Savannah", "Hana", "Neha", "Cole", "Harry", "Paige", "Spencer", "Leah", "Tara", "Jess", "Leo", "Dan", "Mia", "Zac", "Zoe"];
            const azureVoices = ["Andrew", "Brian", "Emma"];

            if (voiceProvider === 'vapi') {
                const match = vapiVoices.find(v => v.toLowerCase() === voiceId.toLowerCase());
                if (match) voiceId = match;
            } else if (voiceProvider === 'azure') {
                if (azureVoices.some(v => v.toLowerCase() === voiceId.toLowerCase())) voiceId = voiceId.toLowerCase();
            } else if (voiceProvider === 'openai') {
                const validOpenAIVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
                voiceId = validOpenAIVoices.includes(voiceId.toLowerCase()) ? voiceId.toLowerCase() : "alloy";
            }

            const temperature = vapiConf?.temperature !== undefined ? parseFloat(String(vapiConf.temperature)) : 0.7;

            // Personalize first message
            const urlParams = new URLSearchParams(window.location.search);
            // Priority: sessionMetadata (from welcome form) > URL Params > Config
            const userName = this.sessionMetadata?.userName
                || urlParams.get('uName')
                || vapiConf?.transcriber?.userName
                || (vapiConf as any)?.userName
                || "";

            let firstMessage = vapiConf?.firstMessage || (userName 
                ? `Hello ${userName}! This is the AI Assistant for ${companyName}. I'm here to help accelerate your business growth. How can I assist you today?` 
                : `Hello, I'm the AI Assistant for ${companyName}. I'm here to help accelerate your business growth. How can I assist you today?`);

            console.log("[Personalization] Sources:", {
                sessionMetadata: this.sessionMetadata?.userName,
                urlParam: urlParams.get('uName'),
                transcriberUserName: vapiConf?.transcriber?.userName,
                rootUserName: (vapiConf as any)?.userName,
                finalUserName: userName
            });
            console.log("[Personalization] First message before replacement:", firstMessage);

            firstMessage = firstMessage
                .replace(/{{[Cc]ompany name}}/g, companyName)
                .replace(/{{COMPANY_NAME}}/g, companyName)
                .replace(/{{USER_NAME}}/g, userName)
                .replace(/{{[Uu]ser name}}/g, userName);

            console.log("[Personalization] First message after replacement:", firstMessage);

            let modelName = vapiConf?.model;
            if (!modelName) {
                if (modelProvider === 'openai') modelName = 'gpt-4o';
                else if (modelProvider === 'azure-openai') modelName = 'gpt-4o';
                else if (modelProvider === 'google') modelName = 'gemini-1.5-flash';
                else if (modelProvider === 'anthropic') modelName = 'claude-3-5-sonnet-20240620';
                else modelName = 'gpt-4o';
            }

            const startParams: any = {
                firstMessage: firstMessage,
                model: {
                    provider: modelProvider as any,
                    model: modelName,
                    messages: [{ role: "system", content: systemPrompt }],
                    temperature: temperature,
                    tools: [
                        {
                            type: "function",
                            function: {
                                name: "checkAvailability",
                                description: "Check if a specific date and time is available for an appointment.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        date: { type: "string", description: "The date to check (YYYY-MM-DD)." },
                                        time: { type: "string", description: "The specific time to check (e.g. 11:00 AM)." }
                                    },
                                    required: ["date"]
                                }
                            }
                        },
                        {
                            type: "function",
                            function: {
                                name: "findAvailableSlots",
                                description: "Find available appointment slots for a given date.",
                                parameters: {
                                    type: "object",
                                    properties: { date: { type: "string", description: "The date to check (YYYY-MM-DD)." } },
                                    required: ["date"]
                                }
                            }
                        },
                        {
                            type: "function",
                            function: {
                                name: "createEvent",
                                description: "Book an appointment. Call this ONLY after confirming details.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        phone: { type: "string", description: "Customer phone number. MUST use the value from PRE-VERIFIED USER CONTEXT. DO NOT ask the user for this again." },
                                        email: { type: "string", description: "Customer email address. MUST use the value from PRE-VERIFIED USER CONTEXT. DO NOT ask the user for this again." },
                                        service: { type: "string" },
                                        date: { type: "string" },
                                        time: { type: "string" }
                                    },
                                    required: ["name", "date", "time", "service"]
                                }
                            }
                        },
                        {
                            type: "function",
                            function: {
                                name: "confirmDetails",
                                description: "Verify user's spelling.",
                                parameters: {
                                    type: "object",
                                    properties: { name: { type: "string" }, email: { type: "string" } },
                                    required: ["name", "email"]
                                }
                            }
                        },
                        {
                            type: "function",
                            function: {
                                name: "cancelEvent",
                                description: "Cancel an existing appointment. Use this ONLY if the user explicitly asks to cancel their booking.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        date: { type: "string", description: "The date of the appointment to cancel (YYYY-MM-DD)." },
                                        time: { type: "string", description: "The exact time of the appointment to cancel (e.g. 10:30 AM). You must ask the user for the time before cancelling." },
                                        name: { type: "string", description: "Customer name. If available in context, use it." },
                                        email: { type: "string", description: "Customer email. If available in context, use it." }
                                    },
                                    required: ["date", "time"]
                                }
                            }
                        }
                    ]
                },
                voice: { provider: voiceProvider as any, voiceId: voiceId },
                transcriber: {
                    provider: (vapiConf?.transcriber?.provider || "deepgram") as any,
                    model: vapiConf?.transcriber?.model || "nova-3",
                    language: (() => {
                        const lang = vapiConf?.transcriber?.language || "en-IN";
                        if (lang.toLowerCase() === 'en-in') return 'en-IN';
                        if (lang.toLowerCase() === 'en-us') return 'en-US';
                        if (lang.toLowerCase() === 'en-gb') return 'en-GB';
                        if (lang.toLowerCase() === 'en-au') return 'en-AU';
                        if (lang.toLowerCase() === 'en-nz') return 'en-NZ';
                        return lang;
                    })(),
                    smartFormat: true,
                    keywords: [
                        ...companyName.split(/\s+/),
                        "Youhe",
                        "Amrita",
                        "Book",
                        "Demo",
                        "Booking",
                        ...(this.sessionMetadata.name || "").split(/\s+/),
                        ...(this.sessionMetadata.userName || "").split(/\s+/),
                    ]
                        .map(k => k.replace(/[^a-zA-Z0-9]/g, '').trim())
                        .filter(k => k && k.length > 2)
                        .filter((v, i, a) => a.indexOf(v) === i)
                },
                clientMessages: ["transcript", "hang", "function-call", "tool-calls", "speech-update", "metadata", "conversation-update"],
                // Enable Server URL for Backend Tool Handling (if configured)
                serverUrl: process.env.NEXT_PUBLIC_APP_URL
                    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/vapi/webhook`
                    : undefined,
                firstMessageMode: 'assistant-speaks-first'
            };

            this.onLog({
                type: 'system',
                text: `Assistant Config Ready.`,
                timestamp: new Date()
            });

            console.log("[Vapi] Starting session with params:", JSON.stringify(startParams, null, 2));
            await this.vapi.start(startParams);

            if (options.muteAssistant) {
                // Silencing the user's mic is standard for text chat
                this.vapi.setMuted(true);
                // To "silence" the assistant, we'd ideally use a volume control if the SDK exposed it.
                // Since it's text chat, we will let the SDK handle the connection, 
                // but ChatWidget will handle not rendering visualizers.
                console.log("[Vapi] text-only session initialized (Muted).");
            }
        } catch (e: any) {
            console.error("Failed to start Vapi call", e);
            this.onLog({ type: 'system', text: `Failed to connect: ${e.message}`, timestamp: new Date() });
            this.onStatusChange('disconnected');
        }
    }

    public sendTextMessage(text: string) {
        if (!this.vapi) return;
        this.onLog({ type: 'user', text: text, timestamp: new Date() });
        this.vapi.send({ type: 'add-message', message: { role: 'user', content: text } });
    }

    public disconnect() {
        if (this.vapi) this.vapi.stop();
    }

    private generateSystemPrompt(config: BusinessConfig, faqs: string, userMetadata?: any): string {
        const companyName = config.metadata?.businessName || "AI Assistant";
        const departmentName = "Customer Support";

        // Inject current date for temporal awareness
        const now = new Date();
        const currentDateTimeStr = now.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });
        const dateNote = `\nIMPORTANT: The current date and time is ${currentDateTimeStr}. Use this to understand relative terms like 'tomorrow' or 'next Monday'.`;

        let userContext = `\n\nCURRENT USER CONTEXT:
- Name: ${userMetadata.userName || userMetadata.name || 'Unknown'}
- Phone: ${userMetadata.userPhone || userMetadata.phone || 'Unknown'}
- Email: ${userMetadata.userEmail || userMetadata.email || 'Unknown'}
- IDENTITY RULE: These details are PRE-VERIFIED. DO NOT ask for them again if they are known.`;

        const prompt = `AI Assistant is a sophisticated training platform at ${companyName}...
Additional Instruction:
- LANGUAGE: English ONLY.
- TOOLS: Use 'checkAvailability' or 'findAvailableSlots' to verify the calendar BEFORE confirming. 
- RELIABILITY: You must TRUST the results returned by tools. If a tool says 'isAvailable: true' or 'hasSlots: true', do NOT tell the user it is busy or unavailable.
- MANDATORY DIRECTIVES:
    1. If checkAvailability returns isAvailable: true, you MUST acknowledge it is available and proceed to book.
    2. Never claim "technical difficulty" or "unable to retrieve" if the tool returns a result.
    3. Trust the 'slots' array in findAvailableSlots. If it has items, offer them to the user.
- FEEDBACK: Inform booking confirmation. ${userContext}
- BOOKING INTENT: If the user mentions "Book a Demo" or "Schedule a Demo", immediately initiate the booking process.
${dateNote}

Business Context:
Description: ${config.metadata?.description || ''}
Industry: ${config.metadata?.industry || ''}
Services:
${config.services?.map((s: any) => `- ${s.name}: ${s.description}`).join('\n') || 'None listed'}
Knowledge Base:
${faqs}
`.replace(/{{COMPANY_NAME}}/g, companyName).replace(/{{DEPARTMENT_NAME}}/g, departmentName);

        return prompt;
    }

    private async generateKnowledgeBase(config: BusinessConfig): Promise<string> {
        const apiKey = this.getEnvVar('NEXT_PUBLIC_GEMINI_API_KEY') || this.getEnvVar('VITE_GEMINI_API_KEY');
        if (!apiKey) return "";
        try {
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(apiKey);

            // Try 2.0-flash as primary (based on user diagnostic) then 1.5-flash
            const modelNames = ["gemini-2.0-flash", "gemini-1.5-flash"];
            let lastErr = null;

            for (const name of modelNames) {
                try {
                    const model = genAI.getGenerativeModel({ model: name }, { apiVersion: 'v1beta' });
                    const promptText = `Create 10 FAQs for ${config.metadata.businessName}. Markdown format.`;
                    const result = await model.generateContent(promptText);
                    const response = await result.response;
                    return response.text();
                } catch (e) {
                    lastErr = e;
                    continue;
                }
            }
            throw lastErr;
        } catch (e) {
            console.error("Failed to generate KB", e);
            return "";
        }
    }

    private async handlePostCallAutomation() {
        console.log("[PostCall] Starting automation. Transcript length:", this.conversationTranscript.length);
        if (this.conversationTranscript.length === 0) {
            console.warn("[PostCall] No transcript captured. Skipping automation.");
            return;
        }

        let summary = "Failed to generate summary.";
        let emailStatus = 'skipped';
        let emailError = null;

        try {
            this.onLog({ type: 'system', text: 'Processing AI Summary...', timestamp: new Date() });
            console.log("[PostCall] Transcript captured:", this.conversationTranscript);

            // 1. Merge fragmented transcripts (Group consecutive same-role messages)
            const mergedTranscript: { role: string, text: string }[] = [];
            this.conversationTranscript.forEach(t => {
                const last = mergedTranscript[mergedTranscript.length - 1];
                if (last && last.role === t.role) {
                    last.text += ` ${t.text}`;
                } else {
                    mergedTranscript.push({ ...t });
                }
            });

            const fullTranscript = mergedTranscript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n');
            console.log("[PostCall] Generating summary via Gemini...");
            summary = await this.summarizeConversation(mergedTranscript);
            console.log("[PostCall] Summary generated:", summary.substring(0, 50) + "...");

            // 2. Trigger Email
            console.log("[PostCall] Triggering email summary...");
            const emailResult = await this.sendEmailSummary(summary, fullTranscript);
            emailStatus = emailResult.success ? 'sent' : 'failed';
            emailError = emailResult.error || null;
            console.log("[PostCall] Email result:", emailStatus, emailError || "");

        } catch (error: any) {
            console.error("[PostCall] Automation logic failed:", error);
            this.onLog({ type: 'system', text: `Automation Error: ${error.message}`, timestamp: new Date() });
        } finally {
            // 3. Save to Firebase with all final statuses
            try {
                console.log("[PostCall] Saving to Firebase...");
                const rawFullTranscript = this.conversationTranscript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n');
                const { firebaseService } = await import('./firebaseService');
                await firebaseService.saveCallSummary(summary, rawFullTranscript, this.sessionMetadata, emailStatus, emailError);
                this.onLog({ type: 'system', text: 'Call record finalized in database.', timestamp: new Date() });
                console.log("[PostCall] Record saved successfully.");
            } catch (e) {
                console.error("[PostCall] Final save failed:", e);
            }
        }
    }

    private async sendEmailSummary(summary: string, transcript: string): Promise<{ success: boolean; error?: string }> {
        const targetEmail = this.getEnvVar('NEXT_PUBLIC_NOTIFICATION_EMAIL') || this.getEnvVar('VITE_NOTIFICATION_EMAIL') || this.getEnvVar('GMAIL_USER');

        try {
            this.onLog({ type: 'system', text: 'Sending summary email via Server API...', timestamp: new Date() });

            // Multi-layer fallback for customer details
            const urlParams = new URLSearchParams(window.location.search);

            const customerName = this.sessionMetadata?.userName
                || this.sessionMetadata?.name
                || this.currentConfig?.vapi?.transcriber?.userName
                || (this.currentConfig?.vapi as any)?.userName
                || urlParams.get('uName')
                || 'N/A';
            const customerEmail = this.sessionMetadata?.userEmail
                || this.sessionMetadata?.email
                || this.currentConfig?.vapi?.transcriber?.userEmail
                || (this.currentConfig?.vapi as any)?.userEmail
                || urlParams.get('uEmail')
                || 'N/A';
            const customerPhone = this.sessionMetadata?.userPhone
                || this.sessionMetadata?.phone
                || this.currentConfig?.vapi?.transcriber?.userPhone
                || (this.currentConfig?.vapi as any)?.userPhone
                || urlParams.get('uPhone')
                || 'N/A';

            console.log("[Email] Final customer details:", { customerName, customerEmail, customerPhone });

            // ALWAYS use absolute URL so embedded widgets hit the Cloud Run backend, not the WordPress host
            let baseUrl = this.getEnvVar('NEXT_PUBLIC_APP_URL')?.replace(/\/$/, "") || '';

            // CRITICAL FIX: Since Vercel redirects https://tellyourjourney.com to https://www.tellyourjourney.com, 
            // any cross-origin OPTIONS preflight request will get a 307 Redirect -> blocked by browser ("does not have HTTP ok status").
            // We forcefully map it to the active endpoint to prevent the redirect.
            if (baseUrl === 'https://tellyourjourney.com') {
                baseUrl = 'https://www.tellyourjourney.com';
            }

            // If NEXT_PUBLIC_APP_URL was forgotten in build secrets, forcefully bypass Firebase Hosting Traps.
            if (!baseUrl) {
                baseUrl = 'https://voice-ai-admin-536573436709.us-central1.run.app';
            }

            const apiUrl = `${baseUrl}/api/email`;

            const payload = {
                summary,
                transcript,
                targetEmail: targetEmail || '',
                ccEmail: customerEmail !== 'N/A' && customerEmail !== 'Unknown' && customerEmail !== 'undefined' ? customerEmail : '',
                customerName: customerName !== 'N/A' && customerName !== 'Unknown' && customerName !== 'undefined' ? customerName : 'Customer',
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // Must parse as text FIRST since proxies/firewalls return HTML for 403s
                const errorText = await response.text();
                let errorMsg = errorText;
                try {
                    // Try to extract JSON if it's a standard Next.js error
                    const errorJson = JSON.parse(errorText);
                    errorMsg = errorJson.error || errorText;
                } catch (e) { /* ignore parse error, it's HTML */ }

                console.error(`[PostCall] Server Email API Error (${response.status}):`, errorMsg);
                return { success: false, error: errorMsg };
            }

            const data = await response.json();

            console.log("[PostCall] Email successfully delivered via Nodemailer API");
            this.onLog({ type: 'system', text: 'Email summary delivered successfully.', timestamp: new Date() });

            return { success: true };

        } catch (error: any) {
            console.error("[PostCall] Network Error sending Email API request:", error);
            this.onLog({ type: 'system', text: `Failed to send email: ${error.message || 'Unknown error'}`, timestamp: new Date() });
            return { success: false, error: error.message || 'Unknown error' };
        }
    }

    private async summarizeConversation(transcript: { role: string, text: string }[]): Promise<string> {
        const apiKey = this.getEnvVar('NEXT_PUBLIC_GEMINI_API_KEY') || this.getEnvVar('VITE_GEMINI_API_KEY');
        if (!apiKey) return "API Key missing.";

        const historyText = transcript.map(t => `${t.role}: ${t.text}`).join('\n');
        const promptText = `
            Summarize this conversation concisely (max 200 words).
            Focus on the customer's intent and any booking details.

            Transcript:
            ${historyText}
        `;

        const attemptSummarize = async (version: 'v1' | 'v1beta', model: string) => {
            const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });
            if (response.ok) {
                const data = await response.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text;
            }
            const err = await response.json();
            throw new Error(`[${version}/${model}] ${response.status}: ${err.error?.message || 'Unknown'}`);
        };

        try {
            // 1. Try SDK (Multi-model fallback)
            const sdkModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
            for (const modelName of sdkModels) {
                try {
                    console.log(`[Summarize] Trying SDK with ${modelName}...`);
                    const { GoogleGenerativeAI } = await import('@google/generative-ai');
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
                    const result = await model.generateContent(promptText);
                    const response = await result.response;
                    const text = response.text();
                    if (text) return text;
                } catch (e: any) {
                    console.warn(`[Summarize] SDK ${modelName} failed:`, e.message);
                }
            }

            // 2. Try REST Fallbacks (Flash)
            const flashVariants: Array<['v1' | 'v1beta', string]> = [
                ['v1beta', 'gemini-2.0-flash'],
                ['v1beta', 'gemini-1.5-flash'],
                ['v1', 'gemini-1.5-flash'],
                ['v1beta', 'gemini-2.5-flash']
            ];

            let lastResortError = "";
            for (const [ver, model] of flashVariants) {
                try {
                    console.log(`[Summarize] Trying REST ${ver}/${model}...`);
                    const result = await attemptSummarize(ver, model);
                    if (result) return result;
                } catch (e: any) {
                    console.warn(`[Summarize] REST ${ver}/${model} failed:`, e.message);
                    lastResortError = e.message;
                }
            }

            // 3. Last Ditch: List Models to see what's actually available
            try {
                console.log("[Summarize] All standard attempts failed. Diagnostic: Listing models...");
                const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
                const listResp = await fetch(listUrl);
                if (listResp.ok) {
                    const data = await listResp.json();
                    const modelNames = data.models?.map((m: any) => m.name.replace('models/', '')) || [];
                    console.log("[Summarize] Available Models:", modelNames);
                    if (modelNames.length > 0) {
                        return `Diagnostic: Your key doesn't support 1.5-flash. Available models: ${modelNames.slice(0, 5).join(', ')}. Please enable 'Generative Language API' or update configuration. Last Error: ${lastResortError}`;
                    }
                }
            } catch (diagErr) {
                console.warn("[Summarize] Listing models failed.");
            }

            return `Failed to generate summary: ${lastResortError}. Ensure 'Generative Language API' is enabled in Google Cloud Console.`;
        } catch (e: any) {
            console.error("[Summarize] Final Gemini Error:", e);
            return `Fatal Error: ${e.message}`;
        }
    }
}

export const voiceService = new VapiService();
