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
        // Fallback for non-standard environments, but direct access is preferred in Next.js
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

    public async connect(config: BusinessConfig) {
        if (!this.vapi) {
            this.onLog({ type: 'system', text: 'Vapi not initialized (missing key)', timestamp: new Date() });
            return;
        }

        this.currentConfig = config;
        this.onStatusChange('connecting');
        this.onLog({ type: 'system', text: 'Connecting to Vapi...', timestamp: new Date() });

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
7. USER CONTEXT:
   - Name: ${this.sessionMetadata.name || this.sessionMetadata.userName || "Unknown"}
   - Phone: ${this.sessionMetadata.phone || this.sessionMetadata.userPhone || "Unknown"}
   - Email: ${this.sessionMetadata.email || this.sessionMetadata.userEmail || "Unknown"}
   CRITICAL: If the User Context above contains a valid name, phone, or email, DO NOT ask the user for them again. Use these exact values when calling the createEvent tool.\n\n`;

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
            let firstMessage = vapiConf?.firstMessage || `Hello, I am the AI Assistant for ${companyName}. How can I help you today?`;

            // Personalize first message
            const urlParams = new URLSearchParams(window.location.search);
            // Priority: sessionMetadata (from welcome form) > URL Params > Config
            const userName = this.sessionMetadata?.userName
                || urlParams.get('uName')
                || vapiConf?.transcriber?.userName
                || (vapiConf as any)?.userName
                || "";

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
                                        phone: { type: "string" },
                                        email: { type: "string" },
                                        service: { type: "string" },
                                        date: { type: "string" },
                                        time: { type: "string" }
                                    },
                                    required: ["name", "phone", "email", "date", "time"]
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
                        }
                    ]
                },
                voice: { provider: voiceProvider as any, voiceId: voiceId },
                transcriber: {
                    provider: (vapiConf?.transcriber?.provider || "deepgram") as any,
                    model: vapiConf?.transcriber?.model || "nova-2",
                    language: "en-US",
                    smartFormat: true
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

        let userContext = "";
        if (userMetadata) {
            userContext = `\n\nCURRENT USER CONTEXT (Already Provided):
- Name: ${userMetadata.userName || userMetadata.name || 'Not provided'}
- Phone: ${userMetadata.userPhone || userMetadata.phone || 'Not provided'}
- Email: ${userMetadata.userEmail || userMetadata.email || 'Not provided'}
- NOTE: If name, phone, or email are listed above, do NOT ask the user for them again. Use them for booking directly.`;
        }

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
                    const model = genAI.getGenerativeModel({ model: name });
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
        const serviceId = this.getEnvVar('NEXT_PUBLIC_EMAILJS_SERVICE_ID') || this.getEnvVar('VITE_EMAILJS_SERVICE_ID');
        const templateId = this.getEnvVar('NEXT_PUBLIC_EMAILJS_TEMPLATE_ID') || this.getEnvVar('VITE_EMAILJS_TEMPLATE_ID');
        const publicKey = this.getEnvVar('NEXT_PUBLIC_EMAILJS_PUBLIC_KEY') || this.getEnvVar('VITE_EMAILJS_PUBLIC_KEY');
        const targetEmail = this.getEnvVar('NEXT_PUBLIC_NOTIFICATION_EMAIL') || this.getEnvVar('VITE_NOTIFICATION_EMAIL');

        console.log("[Email] Checking credentials...", { serviceId: !!serviceId, templateId: !!templateId, publicKey: !!publicKey });

        if (!serviceId || !templateId || !publicKey) {
            console.warn("[PostCall] Email credentials missing.");
            return { success: false, error: 'Missing credentials' };
        }

        try {
            const emailjsModule = await import('@emailjs/browser');
            // Handle both ESM and CJS patterns
            const emailjs = (emailjsModule as any).default || emailjsModule;

            this.onLog({ type: 'system', text: 'Sending summary email...', timestamp: new Date() });

            // Multi-layer fallback for customer details (support both old and new schema)
            const urlParams = new URLSearchParams(window.location.search);

            // Debug: Log all potential sources
            console.log("[Email] Customer detail sources:");
            console.log("  - sessionMetadata:", this.sessionMetadata);
            console.log("  - config.vapi.transcriber:", this.currentConfig?.vapi?.transcriber);
            console.log("  - config.vapi (root):", {
                userName: (this.currentConfig?.vapi as any)?.userName,
                userEmail: (this.currentConfig?.vapi as any)?.userEmail,
                userPhone: (this.currentConfig?.vapi as any)?.userPhone
            });
            console.log("  - URL params:", {
                uName: urlParams.get('uName'),
                uEmail: urlParams.get('uEmail'),
                uPhone: urlParams.get('uPhone')
            });

            const customerName = this.sessionMetadata?.userName
                || this.currentConfig?.vapi?.transcriber?.userName
                || (this.currentConfig?.vapi as any)?.userName
                || urlParams.get('uName')
                || 'N/A';
            const customerEmail = this.sessionMetadata?.userEmail
                || this.currentConfig?.vapi?.transcriber?.userEmail
                || (this.currentConfig?.vapi as any)?.userEmail
                || urlParams.get('uEmail')
                || 'N/A';
            const customerPhone = this.sessionMetadata?.userPhone
                || this.currentConfig?.vapi?.transcriber?.userPhone
                || (this.currentConfig?.vapi as any)?.userPhone
                || urlParams.get('uPhone')
                || 'N/A';

            console.log("[Email] Final customer details:", { customerName, customerEmail, customerPhone });

            const templateParams = {
                to_email: targetEmail || 'admin@example.com',
                cc_email: customerEmail !== 'N/A' ? customerEmail : '', // Send copy to customer
                business_name: this.currentConfig?.metadata?.businessName || 'AI Agent',
                summary,
                transcript,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                booking_details: this.sessionMetadata?.dateTime || 'N/A'
            };

            console.log("[Email] Sending with params:", { to: templateParams.to_email, name: templateParams.customer_name });
            const result = await emailjs.send(serviceId, templateId, templateParams, publicKey);

            if (result.status === 200) {
                this.onLog({ type: 'system', text: 'Email sent.', timestamp: new Date() });
                console.log("[Email] Success!");
                return { success: true };
            } else {
                console.error("[Email] Non-200 response:", result);
                throw new Error(result.text || `Status: ${result.status}`);
            }
        } catch (error: any) {
            console.error("[PostCall] Email Error details:", error);
            this.onLog({ type: 'system', text: 'Email failed.', timestamp: new Date() });
            return { success: false, error: error.text || error.message || 'Unknown error' };
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
                    const model = genAI.getGenerativeModel({ model: modelName });
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
