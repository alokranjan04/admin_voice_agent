import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
    try {
        const config = await req.json();

        if (!config) {
            return NextResponse.json({ error: 'Missing configuration' }, { status: 400 });
        }

        const apiKey = process.env.VITE_VAPI_PRIVATE_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'VAPI Private Key is not configured on the server' }, { status: 500 });
        }

        const companyName = config.metadata.businessName || "the company";
        const roleDesc = config.metadata.primaryUseCase || "Voice AI Support Assistant";

        let systemPrompt = config.vapi.systemPrompt
            .replace(/{{COMPANY_NAME}}/g, companyName)
            .replace(/{{Company name}}/gi, companyName)
            .replace(/{{ROLE_DESCRIPTION}}/g, roleDesc);

        let firstMessage = (config.vapi.firstMessage || (config.vapi.userName
            ? `Hello ${config.vapi.userName}! Thank you for calling ${companyName}. How can I help you today?`
            : `Hello, thank you for calling ${companyName}!`))
            .replace(/{{COMPANY_NAME}}/g, companyName)
            .replace(/{{Company name}}/gi, companyName)
            .replace(/{{USER_NAME}}/gi, config.vapi.userName || 'there')
            .replace(/{{Name}}/gi, config.vapi.userName || 'there')
            .replace(/{{User Name}}/gi, config.vapi.userName || 'there')
            .replace(/{{First Name}}/gi, (config.vapi.userName || 'there').split(' ')[0]);

        // Safety net: VAPI PlayAI/Rime/PlayHT voices cannot speak Devanagari — they produce garbled audio.
        // If saved content contains Devanagari AND the voice is not Azure/ElevenLabs, auto-sanitize.
        const hasDevanagari = (text: string) => /[\u0900-\u097F]/.test(text);
        const voiceProviderEarly = String(config.vapi.voiceProvider || 'vapi').toLowerCase();
        const isNativeSpeakingVoice = voiceProviderEarly === 'azure' || voiceProviderEarly === 'elevenlabs';
        if (!isNativeSpeakingVoice && hasDevanagari(firstMessage)) {
            // Replace Devanagari first message with a safe Hinglish fallback
            firstMessage = `${companyName} mein aapka swagat hai! Main aaj aapki kaise madad kar sakta hoon?`;
        }
        if (!isNativeSpeakingVoice && hasDevanagari(systemPrompt)) {
            // Prepend a strong override so the AI ignores Devanagari instructions in the prompt body
            systemPrompt = `[CRITICAL OVERRIDE — READ FIRST]\nThis system prompt may contain Hindi (Devanagari) text. IGNORE any language in Devanagari. You MUST respond ONLY in Hinglish — Hindi words spelled in Roman/English script. NEVER output Devanagari characters. Example: write "Aapki reservation confirm ho gayi hai" not "आपकी रिजर्वेशन कन्फर्म हो गई है". All tool call results (dates, times, slot lists) must also be spoken in Hinglish Roman script.\n\n` + systemPrompt;
        }

        // Normalize model names to VAPI-accepted values; fixes stale/renamed model IDs
        const VALID_OPENAI_MODELS = new Set(['gpt-5.2','gpt-5.2-chat-latest','gpt-5.1','gpt-5.1-chat-latest','gpt-5','gpt-5-chat-latest','gpt-5-mini','gpt-5-nano','gpt-4.1','gpt-4.1-mini','gpt-4.1-nano','gpt-4.1-2025-04-14','gpt-4.1-mini-2025-04-14','gpt-4.1-nano-2025-04-14','chatgpt-4o-latest','o3','o3-mini','o4-mini','o1-mini','o1-mini-2024-09-12','gpt-4o','gpt-4o-mini','gpt-4o-mini-2024-07-18','gpt-4o-2024-05-13','gpt-4o-2024-08-06','gpt-4o-2024-11-20','gpt-4-turbo','gpt-4-turbo-2024-04-09','gpt-4-turbo-preview','gpt-4-0125-preview','gpt-4-1106-preview','gpt-4','gpt-4-0613','gpt-3.5-turbo','gpt-3.5-turbo-0125','gpt-3.5-turbo-1106','gpt-3.5-turbo-16k','gpt-3.5-turbo-0613']);
        const MODEL_ALIASES: Record<string, string> = {
            // gpt-5.x not available on standard VAPI plans — downgrade to gpt-4o
            'gpt-5.2': 'gpt-4o', 'gpt-5.2-instant': 'gpt-4o', 'gpt-5.2-chat-latest': 'gpt-4o',
            'gpt-5.1': 'gpt-4o', 'gpt-5.1-instant': 'gpt-4o', 'gpt-5.1-chat-latest': 'gpt-4o',
            'gpt-5': 'gpt-4o', 'gpt-5-chat-latest': 'gpt-4o',
            'gpt-5-mini': 'gpt-4o-mini', 'gpt-5-nano': 'gpt-4o-mini',
            // Other aliases
            'gpt-4.5': 'gpt-4o', 'gpt-4.5-turbo': 'gpt-4-turbo',
            // gpt-4 (no suffix) is deprecated on most VAPI plans — auto-upgrade to gpt-4o
            'gpt-4': 'gpt-4o', 'gpt-4-0613': 'gpt-4o',
        };
        const normalizeModelName = (model: string, provider: string): string => {
            const m = (model || '').toLowerCase().trim();
            if (provider === 'openai' || provider === 'azure-openai') {
                const alias = MODEL_ALIASES[m];
                if (alias) return alias;
                return VALID_OPENAI_MODELS.has(m) ? m : 'gpt-4o-mini';
            }
            return m || 'gpt-4o-mini';
        };

        const modelProvider = String(config.vapi.provider || 'openai').toLowerCase();
        const modelObj: any = {
            provider: modelProvider,
            model: normalizeModelName(String(config.vapi.model || 'gpt-4o-mini'), modelProvider),
            messages: [
                {
                    role: 'system',
                    content: (() => {
                        // Build strict language directive from configured transcriber language
                        const LANG_NAMES: Record<string, string> = {
                            'hi': 'Hindi', 'ar': 'Arabic', 'fr': 'French', 'de': 'German',
                            'es': 'Spanish', 'pt': 'Portuguese', 'zh': 'Chinese', 'ja': 'Japanese',
                            'ko': 'Korean', 'it': 'Italian', 'nl': 'Dutch', 'pl': 'Polish',
                            'ru': 'Russian', 'ta': 'Tamil', 'te': 'Telugu', 'bn': 'Bengali',
                            'gu': 'Gujarati', 'mr': 'Marathi', 'pa': 'Punjabi', 'ur': 'Urdu',
                        };
                        const langCode = String(config.vapi.transcriber?.language || 'en').split('-')[0].toLowerCase();
                        const langName = LANG_NAMES[langCode];
                        // VAPI PlayAI voices are English TTS — they cannot speak Devanagari/Hindi script.
                        // Use Hinglish (Hindi meaning, English/Roman script words) for PlayAI voices.
                        // Azure/ElevenLabs voices can speak native script properly.
                        // Note: vProvider is declared later; derive it here from config directly.
                        const earlyVProvider = (() => {
                            let vp = String(config.vapi.voiceProvider || 'vapi').toLowerCase().trim();
                            if (vp === 'elevenlabs') vp = '11labs';
                            return vp;
                        })();
                        const isNativeHindiVoice = earlyVProvider === 'azure' || earlyVProvider === '11labs';
                        // Detect female voice for grammatical gender in Hindi
                        const FEMALE_VOICE_IDS = new Set([
                            'Leah','Mia','Jess','Tara','Zoe','Paige','Emma','Kylie','Savannah','Hana','Lily','Clara','Nico','Kai',
                            'hi-IN-SwaraNeural','hi-IN-AnanyaNeural','hi-IN-NeerjaNeural','en-IN-NeerjaNeural',
                            'en-US-JennyNeural','en-GB-SoniaNeural','en-AU-NatashaNeural',
                        ]);
                        const isFemaleVoice = FEMALE_VOICE_IDS.has(String(config.vapi.voiceId || ''))
                            || String(config.vapi.voiceId || '').toLowerCase().includes('female');
                        const genderNote = (langCode === 'hi' && isFemaleVoice)
                            ? ' Use feminine Hindi grammar throughout: say "kar sakti hoon" not "kar sakta hoon", "bataungi" not "bataunga", "hoon" forms matching female speaker.'
                            : '';
                        const languageRule = langName
                            ? (langCode === 'hi' && !isNativeHindiVoice
                                ? `\n# LANGUAGE — HINGLISH\nRespond in Hinglish: Hindi words written in Roman/English script. NEVER use Devanagari. Understand user queries in both Hindi and English — always answer the actual question regardless of which language they use. Example: "Dinner mein Dal Makhani, Paneer Tikka aur Garlic Naan available hai."${genderNote} CRITICAL: Never say you cannot answer a question due to language settings.`
                                : `\n# LANGUAGE\nRespond primarily in ${langName}. Understand queries in both ${langName} and English. Always answer the user's actual question.${genderNote}`)
                            : `\n# LANGUAGE\nALWAYS respond in English ONLY. NEVER switch to any other language. Speech transcription may occasionally produce garbled text that looks like Russian or Korean — ignore the apparent language of the transcription and always respond in English. If you cannot understand a request, ask the user to repeat in English.`;

                        return `${systemPrompt}
${languageRule}

# CRITICAL: DATE & TIME VERIFICATION
1. YOU DO NOT KNOW THE DATE. The date provided in your static training data or internal clock is WRONG.
2. YOU MUST call the "getCurrentDateTime" tool at the START of EVERY CALL.
3. If a user asks "What is today?", "What is the date?", or tries to book "today" or "tomorrow", you MUST call "getCurrentDateTime" and use EXACTLY what that tool returns.
4. If "getCurrentDateTime" says today is March 17th, then today is March 17th. DO NOT argue with the tool.

# BEHAVIOR RULES:
1. EMAIL CONFIRMATION: If the user provides their email by speaking it, you MUST spell it back to them character-by-character to confirm it is correct.
2. PITCHING A DEMO: After explaining our services and how we can help in their domain, you MUST ask: 'Can I book a demo with the owner? He can explain things to you in more detail.'

# USER CONTEXT (PRE-VERIFIED)
The caller's details have been collected before this call via a secure form:
- Name: {{leadName}}
- Email: {{leadEmail}}
- Phone: {{leadPhone}}

CONTACT RULE: If any of the above are NOT 'Unknown', you MUST NOT ask the user for that field again. Use the exact value in all tool calls (createEvent, cancelEvent, etc.). NEVER use placeholder text like [User's Name].
CONTACT RULE: Only ask for a field if its value is literally 'Unknown'.
TITLE RULE: Always ask the user "What is this booking for?" to get the service/event title.
AVAILABILITY RULE: You MUST NEVER book an appointment without FIRST calling checkAvailability or findAvailableSlots.`;
                    })()
                }
            ],
            temperature: Number(config.vapi.temperature || 0.1), // Reduced temperature for more deterministic tool usage
        };

        // Normalize and guarantee non-empty voice provider
        const VALID_VAPI_VOICE_PROVIDERS = new Set(['vapi','11labs','azure','cartesia','custom-voice','deepgram','hume','lmnt','neuphonic','openai','playht','rime-ai','smallest-ai','tavus','sesame','inworld','minimax','wellsaid','orpheus']);
        let vProvider = String(config.vapi.voiceProvider || 'vapi').toLowerCase().trim();
        if (!vProvider) vProvider = 'vapi';
        if (vProvider === 'elevenlabs') vProvider = '11labs';
        if (vProvider === 'rime') vProvider = 'rime-ai';
        if (!VALID_VAPI_VOICE_PROVIDERS.has(vProvider)) vProvider = 'vapi';

        // Determine default voiceId per provider if empty
        const providerDefaultVoice: Record<string, string> = {
            'vapi': 'Rohan', // Indian Hindi male — default for Hindi-first deployments
            '11labs': 'sarah',
            'deepgram': 'aura-asteria-en',
            'openai': 'alloy',
            'azure': 'hi-IN-SwaraNeural',
            'cartesia': 'ava',
        };
        const VALID_VAPI_VOICE_IDS = new Set(['Clara','Godfrey','Elliot','Kylie','Rohan','Lily','Savannah','Hana','Cole','Harry','Paige','Spencer','Nico','Kai','Emma','Sagar','Neil','Leah','Tara','Jess','Leo','Dan','Mia','Zac','Zoe']);
        let voiceId = String(config.vapi.voiceId || '').trim() || providerDefaultVoice[vProvider] || 'Rohan';
        if (vProvider === 'vapi' && !VALID_VAPI_VOICE_IDS.has(voiceId)) voiceId = 'Rohan';

        const voiceObj: any = {
            provider: vProvider,
            voiceId,
        };
        // VAPI PlayAI voices are English-trained — forcing hi-IN makes them produce garbled audio.
        // Always use en-US for PlayAI; the AI will speak in Hinglish (Hindi words in English script)
        // which the English TTS can pronounce clearly. Azure voices use their own native language.
        if (vProvider === 'vapi') {
            voiceObj.language = 'en-US';
        }

        if (vProvider === '11labs' && config.vapi.voiceModel) {
            voiceObj.model = config.vapi.voiceModel;
        }

        let transcriberObj: any = null;
        const tProvider = String(config.vapi.transcriber.provider || 'deepgram').toLowerCase();

        // Deepgram/OpenAI: short ISO codes ('en', 'hi', 'fr')
        const normalizeShortLang = (lang: string): string => {
            const raw = String(lang || 'en').toLowerCase().trim();
            if (raw === 'multilingual') return 'en';
            return raw.split('-')[0]; // 'en-IN' => 'en', 'zh-TW' => 'zh'
        };
        // Google transcriber requires full English names ('English', 'Hindi', 'Multilingual')
        const ISO_TO_FULL_LANG: Record<string, string> = {
            'en': 'English', 'hi': 'Hindi', 'fr': 'French', 'de': 'German', 'es': 'Spanish',
            'pt': 'Portuguese', 'ar': 'Arabic', 'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean',
            'it': 'Italian', 'nl': 'Dutch', 'pl': 'Polish', 'ru': 'Russian', 'sv': 'Swedish',
            'tr': 'Turkish', 'vi': 'Vietnamese', 'th': 'Thai', 'id': 'Indonesian', 'uk': 'Ukrainian',
            'bg': 'Bulgarian', 'cs': 'Czech', 'da': 'Danish', 'et': 'Estonian', 'fi': 'Finnish',
            'el': 'Greek', 'he': 'Hebrew', 'hr': 'Croatian', 'hu': 'Hungarian', 'lv': 'Latvian',
            'lt': 'Lithuanian', 'no': 'Norwegian', 'ro': 'Romanian', 'sr': 'Serbian', 'sk': 'Slovak',
            'sl': 'Slovenian', 'sw': 'Swahili', 'bn': 'Bengali', 'multilingual': 'Multilingual',
        };
        const normalizeFullLang = (lang: string): string => {
            const short = normalizeShortLang(lang);
            return ISO_TO_FULL_LANG[short] || 'English';
        };

        if (tProvider === 'openai') {
            const tModel = String(config.vapi.transcriber.model || 'gpt-4o-mini-transcribe');
            transcriberObj = { 
                provider: 'openai',
                model: tModel.includes('transcribe') ? tModel : 'gpt-4o-mini-transcribe',
                language: normalizeShortLang(String(config.vapi.transcriber.language || 'en'))
            };
        } else if (tProvider === 'google') {
            const tModel = String(config.vapi.transcriber.model || 'gemini-2.0-flash');
            transcriberObj = {
                provider: 'google',
                model: (tModel.includes('gemini') || tModel.includes('gemma')) ? tModel : 'gemini-2.0-flash',
                language: normalizeFullLang(String(config.vapi.transcriber.language || 'en'))
            };
        } else {
            // nova-3 only supports English reliably. For Hindi and other Indic/non-Latin languages,
            // use nova-2 which has broader multilingual support. Without this, Deepgram produces
            // garbled Russian/Korean/Kazakh characters when trying to transcribe Hindi speech.
            const rawLangCode = normalizeShortLang(String(config.vapi.transcriber.language || 'en'));
            const NOVA3_UNSUPPORTED = new Set(['hi','ur','bn','gu','mr','pa','ta','te','kn','ml','si','ne','or','as']);
            let tModel = String(config.vapi.transcriber.model || '').toLowerCase();
            if (!tModel || tModel === 'nova-3') {
                // nova-2 handles Indian English accent and all Indic languages better than nova-3
                tModel = 'nova-2';
            }
            transcriberObj = {
                provider: tProvider,
                model: tModel,
                language: rawLangCode,
            };
        }

        const payload: any = {
            name: String(companyName),
            model: modelObj,
            voice: voiceObj,
            transcriber: transcriberObj,
            backgroundSound: (config.vapi.backgroundSound === 'default' || !config.vapi.backgroundSound) ? 'off' : config.vapi.backgroundSound,
            firstMessage: String(firstMessage),
            metadata: {
                leadEmail: config.vapi.transcriber?.userEmail || config.vapi.userEmail || '',
                leadName: config.vapi.transcriber?.userName || config.vapi.userName || '',
                leadCompany: companyName,
                orgId: config.metadata?.orgId || '',
                agentId: config.metadata?.agentId || ''
            }
        };

        if (config.vapi.knowledgeBase) {
            const kb = config.vapi.knowledgeBase
                .replace(/{{COMPANY_NAME}}/g, companyName)
                .replace(/{{Company name}}/gi, companyName);
            payload.model.messages[0].content += `\n\n# KNOWLEDGE BASE / FAQs\n${kb}`;
        }

        // Add calendar tools if enabled
        if (config.integrations?.googleCalendar) {
            // CRITICAL: Vapi needs a public URL. Localhost will likely fail unless tunneled.
            let baseUrl = process.env.NEXT_PUBLIC_APP_URL;

            if (baseUrl) {
                // Remove trailing slash if present to avoid double slashes
                baseUrl = baseUrl.replace(/\/$/, "");
                payload.serverUrl = `${baseUrl}/api/vapi/webhook`;
                console.log("[Vapi Config] Setting Server URL to:", payload.serverUrl);
            } else {
                console.warn("[Vapi Config] NEXT_PUBLIC_APP_URL is missing. Server URL (Webhook) will NOT be set for this assistant.");
            }
            payload.model.tools = [
                {
                    type: "function",
                    function: {
                        name: "checkAvailability",
                        description: "Check if a specific date and time is available for an appointment",
                        parameters: {
                            type: "object",
                            properties: {
                                date: { type: "string", description: "Date in YYYY-MM-DD format" },
                                time: { type: "string", description: "Time in HH:MM format (24-hour) to check" }
                            },
                            required: ["date"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "findAvailableSlots",
                        description: "Find all available appointment slots for a given date. Returns actual times that can be presented to the user. ALWAYS use this to show available times to the user.",
                        parameters: {
                            type: "object",
                            properties: {
                                date: { type: "string", description: "Date in YYYY-MM-DD format" },
                                duration: { type: "number", description: "Appointment duration in minutes (default: 60)" }
                            },
                            required: ["date"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "createEvent",
                        description: "Create a calendar appointment after confirming all details with the user",
                        parameters: {
                            type: "object",
                            properties: {
                                date: { type: "string", description: "Date in YYYY-MM-DD format" },
                                time: { type: "string", description: "Time in HH:MM format (24-hour)" },
                                service: { type: "string", description: "Type of service" },
                                customerName: { type: "string", description: "Customer name. MUST use the real name from USER CONTEXT. NEVER use placeholder text like [User's Name]." },
                                customerEmail: { type: "string", description: "Customer email. MUST use the real email from USER CONTEXT. NEVER use placeholder text like [User's Email]. DO NOT ask user again." },
                                customerPhone: { type: "string", description: "Customer phone. MUST use the real phone number from USER CONTEXT. NEVER use placeholder text like [User's Phone]. DO NOT ask user again." }
                            },
                            required: ["date", "time", "customerName", "service", "customerPhone"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "cancelEvent",
                        description: "Cancel an existing calendar appointment if the user requests it",
                        parameters: {
                            type: "object",
                            properties: {
                                date: { type: "string", description: "Date of the appointment to cancel in YYYY-MM-DD format" },
                                time: { type: "string", description: "Time of the appointment to cancel in HH:MM format (24-hour)" },
                                customerName: { type: "string", description: "Customer name" },
                                customerEmail: { type: "string", description: "Customer email" },
                                customerPhone: { type: "string", description: "Customer phone" }
                            },
                            required: ["date"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "getCurrentDateTime",
                        description: "Get the current date, time, and day of the week. Call this tool immediately if you need to know 'today' or 'now' to schedule appointments accurately.",
                        parameters: {
                            type: "object",
                            properties: {},
                            required: []
                        }
                    }
                }
            ];
        }

        let method = 'POST';
        let url = 'https://api.vapi.ai/assistant';
        let logMsg = "[Vapi Assistant] Creating NEW assistant...";

        // If assistantID exists, use PATCH to update
        if (config.vapi.assistantId) {
            method = 'PATCH';
            url = `https://api.vapi.ai/assistant/${config.vapi.assistantId}`;
            logMsg = `[Vapi Assistant] Updating EXISTING assistant (${config.vapi.assistantId})...`;
        }

        console.log(logMsg);

        const response = await axios({
            method: method,
            url: url,
            data: payload,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("[Vapi Assistant] Operation successful:", response.data?.id);
        return NextResponse.json(response.data);
    } catch (error: any) {
        console.error('[VAPI Assistant API Error]', error.response?.data || error.message);
        return NextResponse.json({
            error: error.response?.data?.message || error.message
        }, { status: error.response?.status || 500 });
    }
}
