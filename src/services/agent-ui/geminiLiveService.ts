import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration, Tool } from "@google/genai";
import { generateSystemInstruction } from '@/lib/agent-ui/constants';
import { firebaseService } from './firebaseService';
import { calendarService } from './calendarService';
import { BusinessConfig } from '@/types/agent-ui/types';
import { createPcmBlob, decodeAudioData, decodeBase64 } from './audioUtils';

export interface LogEntry {
    type: 'user' | 'model' | 'system' | 'tool';
    text: string;
    timestamp: Date;
}

const getEnvVar = (key: string) => {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key] as string;
    }
    return '';
};

// Define Tools in Gemini Format
const toolDeclarations: FunctionDeclaration[] = [
    {
        name: "checkAvailability",
        description: "Check if a specific date/time is available. Returns status and next steps. STOP if successful.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                dateTime: { type: Type.STRING, description: "ISO 8601 format (e.g. 2026-01-17T15:00:00)." }
            },
            required: ["dateTime"]
        }
    },
    {
        name: "findAvailableSlots",
        description: "Find alternative slots. DO NOT USE if 'checkAvailability' was just successful.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                startFrom: { type: Type.STRING, description: "ISO 8601 date to start searching from." }
            },
            required: ["startFrom"]
        }
    },
    {
        name: "createBooking",
        description: "Finalize booking after verifying details.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                patientName: { type: Type.STRING },
                phoneNumber: { type: Type.STRING },
                email: { type: Type.STRING },
                serviceName: { type: Type.STRING },
                dateTime: { type: Type.STRING }
            },
            required: ["patientName", "phoneNumber", "email", "serviceName", "dateTime"]
        }
    }
];

export class VoiceService {
    private client: GoogleGenAI | null = null;
    private currentConfig: BusinessConfig | null = null;

    // Audio State (Singleton Pattern)
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private inputSource: MediaStreamAudioSourceNode | null = null;
    private processor: ScriptProcessorNode | null = null;

    private nextStartTime = 0;
    private session: any = null;
    private sources = new Set<AudioBufferSourceNode>();

    // Connection Locking
    private currentConnectionId: string = '';
    private pendingSessionPromise: Promise<any> | null = null;
    private isConnecting: boolean = false;

    // Interruption Handling
    private interruptionCount = 0;

    // Audio Playback State - to prevent self-interruption
    private isPlayingAudio = false;

    public onVolumeChange: (volume: number) => void = () => { };
    public onStatusChange: (status: 'disconnected' | 'connecting' | 'connected') => void = () => { };
    public onLog: (entry: LogEntry) => void = () => { };

    constructor() {
        // Initialize AudioContext lazily or on first user interaction in 'connect'
    }

    private logAndSave(entry: LogEntry) {
        this.onLog(entry);
        firebaseService.saveLog(entry);
    }

    // Helper to ensure AudioContext exists and is running
    private getAudioContext(): AudioContext {
        if (!this.audioContext) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.audioContext = new AudioContextClass({ sampleRate: 24000 }); // Output rate
        }
        return this.audioContext;
    }

    async connect(config: BusinessConfig) {
        // 1. Strict Lock
        if (this.isConnecting) return;
        this.isConnecting = true;

        // 2. Generate ID & Cleanup
        const connectionId = Date.now().toString();
        this.currentConnectionId = connectionId;

        if (this.session || this.pendingSessionPromise) {
            this.disconnect(false);
        }

        this.currentConfig = config;
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.error("Gemini API Key is missing (NEXT_PUBLIC_GEMINI_API_KEY).");
        }
        if (!apiKey) {
            this.logAndSave({ type: 'system', text: 'Error: Gemini API Key is missing (NEXT_PUBLIC_GEMINI_API_KEY).', timestamp: new Date() });
            this.onStatusChange('disconnected');
            this.isConnecting = false;
            return;
        }

        this.onStatusChange('connecting');
        this.client = new GoogleGenAI({ apiKey });
        this.interruptionCount = 0; // Reset counter

        try {
            const ctx = this.getAudioContext();
            if (ctx.state === 'suspended') await ctx.resume();

            // Get Microphone
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                    sampleRate: 16000
                }
            });

            // Connect to Gemini Live
            const sessionPromise = this.client.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } }
                    },
                    systemInstruction: generateSystemInstruction(config),
                    tools: [{ functionDeclarations: toolDeclarations }],
                    inputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        if (this.currentConnectionId !== connectionId) return;

                        this.onStatusChange('connected');
                        this.logAndSave({ type: 'system', text: 'Connected to Gemini Live', timestamp: new Date() });

                        // Start Input Stream
                        if (ctx && this.mediaStream) {
                            this.inputSource = ctx.createMediaStreamSource(this.mediaStream);
                            this.processor = ctx.createScriptProcessor(4096, 1, 1);

                            // DOUBLE SAFETY FOR LOOPBACK (Silent Destination)
                            const silentDestination = ctx.createMediaStreamDestination();
                            const muteNode = ctx.createGain();
                            muteNode.gain.value = 0;

                            this.processor.onaudioprocess = (e) => {
                                if (this.currentConnectionId !== connectionId) return;

                                const inputData = e.inputBuffer.getChannelData(0);

                                // Safety zero-out output
                                const outputData = e.outputBuffer.getChannelData(0);
                                for (let i = 0; i < outputData.length; i++) { outputData[i] = 0; }

                                // Calculate Input Volume
                                let sum = 0;
                                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                                const rms = Math.sqrt(sum / inputData.length);
                                this.onVolumeChange(Math.min(1, rms * 5));

                                // NOISE GATE - higher threshold when AI is speaking to prevent echo
                                const noiseThreshold = this.isPlayingAudio ? 0.08 : 0.02;
                                if (rms < noiseThreshold) return;

                                const blob = createPcmBlob(inputData, 16000);

                                // Use the stored session reference to avoid closure staleness
                                if (this.session && this.currentConnectionId === connectionId) {
                                    this.session.sendRealtimeInput({ media: blob });
                                }
                            };

                            this.inputSource.connect(this.processor);
                            this.processor.connect(muteNode);
                            muteNode.connect(silentDestination);
                        }
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        if (this.currentConnectionId !== connectionId) return;

                        // 0. Handle Interruption
                        if (msg.serverContent?.interrupted) {
                            this.interruptionCount++; // INVALIDATE PENDING AUDIO
                            this.logAndSave({ type: 'system', text: 'User interrupted. Clearing audio queue.', timestamp: new Date() });
                            this.sources.forEach(source => {
                                try { source.stop(); } catch (e) { }
                            });
                            this.sources.clear();
                            this.nextStartTime = 0;
                            return;
                        }

                        // 1. Handle Audio Output - Scan all parts
                        const parts = msg.serverContent?.modelTurn?.parts || [];
                        for (const part of parts) {
                            if (part.inlineData?.data) {
                                if (this.audioContext) {
                                    // CAPTURE STATE BEFORE ASYNC
                                    const currentInterruption = this.interruptionCount;

                                    const buffer = await decodeAudioData(decodeBase64(part.inlineData.data), this.audioContext, 24000);

                                    // CHECK STATE AFTER ASYNC
                                    if (this.interruptionCount !== currentInterruption) {
                                        console.log("Discarding stale audio chunk due to interruption");
                                        continue;
                                    }

                                    this.playAudio(buffer, connectionId);
                                }
                            }
                        }

                        // 2. Handle User Transcription
                        const inputTranscript = msg.serverContent?.inputTranscription?.text;
                        if (inputTranscript) {
                            this.logAndSave({ type: 'user', text: inputTranscript, timestamp: new Date() });
                        }

                        // 3. Handle Model Text
                        const modelParts = msg.serverContent?.modelTurn?.parts;
                        if (modelParts) {
                            for (const part of modelParts) {
                                if (part.text) {
                                    this.logAndSave({ type: 'model', text: part.text, timestamp: new Date() });
                                }
                            }
                        }

                        // 4. Handle Tool Calls
                        if (msg.toolCall) {
                            this.handleToolCalls(this.session, msg.toolCall, connectionId);
                        }
                    },
                    onclose: (event) => {
                        if (this.currentConnectionId !== connectionId) return;
                        this.onStatusChange('disconnected');
                        const reason = (event as any).reason || 'No reason provided';
                        const code = (event as any).code || 'Unknown code';
                        this.logAndSave({ type: 'system', text: `Session closed. Code: ${code}, Reason: ${reason}`, timestamp: new Date() });
                    },
                    onerror: (err: any) => {
                        if (this.currentConnectionId !== connectionId) return;
                        console.error("Gemini Error:", err);
                        this.logAndSave({ type: 'system', text: `Error: ${err.message || 'Unknown error'}`, timestamp: new Date() });
                        this.onStatusChange('disconnected');
                    }
                }
            });

            // TRAP THE PENDING PROMISE
            this.pendingSessionPromise = sessionPromise;
            const session = await sessionPromise;
            this.pendingSessionPromise = null;

            // Check if we disconnected while waiting
            if (this.currentConnectionId !== connectionId) {
                console.warn("Connection ID mismatch after handshake. Closing zombie session.");
                session.close();
                return;
            }

            this.session = session;
            this.isConnecting = false;

            // KICKSTART: Send greeting trigger NOW that session is firmly established
            // We use a small timeout to ensure the backend is fully listening
            setTimeout(() => {
                if (this.currentConnectionId === connectionId && this.session) {
                    this.logAndSave({ type: 'system', text: 'Triggering greeting...', timestamp: new Date() });

                    try {
                        // Simple, natural greeting trigger - just simulate the user has connected
                        // Using a minimal prompt that encourages immediate speech, not text thinking
                        const businessName = this.currentConfig?.metadata?.businessName || 'our business';

                        // sendClientContent is synchronous (returns void) - it sends via WebSocket
                        this.session.sendClientContent({
                            turns: `Hi, I just called ${businessName}.`,
                            turnComplete: true
                        });
                        console.log("Greeting sent via sendClientContent");

                    } catch (e: any) {
                        console.error("Failed to send greeting:", e);
                        this.logAndSave({ type: 'system', text: `Greeting failed: ${e.message}`, timestamp: new Date() });
                    }
                }
            }, 500);

        } catch (e: any) {
            if (this.currentConnectionId !== connectionId) return;
            console.error("Connection failed", e);
            this.logAndSave({ type: 'system', text: `Connection failed: ${e.message}`, timestamp: new Date() });
            this.onStatusChange('disconnected');
            this.isConnecting = false;
            this.pendingSessionPromise = null;
        }
    }

    private playAudio(buffer: AudioBuffer, connectionId: string) {
        if (!this.audioContext || this.currentConnectionId !== connectionId) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

        const now = this.audioContext.currentTime;

        // CRITICAL FIX: Only reset queue if we are BEHIND current time (underrun).
        // Do NOT reset if we are ahead (buffering), otherwise we overwrite existing audio.
        // Add a small buffer (100ms) for the first chunk to prevent clipping
        if (this.nextStartTime < now) {
            this.nextStartTime = now + 0.1; // 100ms buffer to prevent "Hello" from being clipped
        }

        const startTime = this.nextStartTime;

        source.connect(this.audioContext.destination);
        source.start(startTime);

        // Mark as playing audio to suppress mic echo
        this.isPlayingAudio = true;

        this.nextStartTime = startTime + buffer.duration;
        this.sources.add(source);

        source.onended = () => {
            this.sources.delete(source);
            // Only mark as not playing if no other sources are active
            if (this.sources.size === 0) {
                this.isPlayingAudio = false;
            }
        };
    }

    private async handleToolCalls(session: any, toolCall: any, connectionId: string) {
        if (this.currentConnectionId !== connectionId) return;

        const functionCalls = toolCall.functionCalls;
        if (!functionCalls || functionCalls.length === 0) return;

        this.logAndSave({ type: 'tool', text: `Processing ${functionCalls.length} tool calls...`, timestamp: new Date() });

        const functionResponses = [];
        const capturedInterruption = this.interruptionCount;

        for (const call of functionCalls) {
            if (this.currentConnectionId !== connectionId) break;
            // Don't process stale tool calls if we've been interrupted significantly? 
            // Actually, sometimes user speaks but we still want the tool to finish. 
            // But if interruptionCount changed, it means the SERVER sent an interrupted signal, so the turn is dead.
            if (this.interruptionCount !== capturedInterruption) {
                console.log("Tool execution aborted due to interruption.");
                break;
            }

            const { id, name, args } = call;
            let result: any = {};

            try {
                if (name === 'checkAvailability') {
                    this.logAndSave({ type: 'system', text: `Checking availability for ${args.dateTime}`, timestamp: new Date() });
                    const res = await calendarService.checkAvailability(args.dateTime);

                    result = {
                        status: res.available ? "success" : "unavailable",
                        slot: res.checkedDateTime,
                        available: res.available,
                        nextAction: res.available ? "ask_patient_name" : "offer_alternatives",
                        message: res.available ? "Slot is AVAILABLE." : "Slot is busy."
                    };
                    this.logAndSave({ type: 'tool', text: `Output (${name}): ${JSON.stringify(result)}`, timestamp: new Date() });

                } else if (name === 'findAvailableSlots') {
                    this.logAndSave({ type: 'system', text: `Finding slots from ${args.startFrom}`, timestamp: new Date() });
                    const res = await calendarService.findAvailableSlots(args.startFrom);

                    result = {
                        status: "success",
                        slots: res.slots,
                        count: res.slots.length,
                        nextAction: "read_slots_to_user"
                    };
                    this.logAndSave({ type: 'tool', text: `Output (${name}): Found ${res.slots.length} slots`, timestamp: new Date() });

                } else if (name === 'createBooking') {
                    this.logAndSave({ type: 'system', text: `Booking for ${args.patientName}`, timestamp: new Date() });

                    // Execute booking
                    const bookingResult = await calendarService.createEvent({
                        name: args.patientName,
                        phone: args.phoneNumber,
                        email: args.email,
                        service: args.serviceName,
                        dateTime: args.dateTime
                    });

                    await firebaseService.saveBooking(args);

                    let emailStatus = "skipped (guest mode)";

                    if (this.currentConfig && !bookingResult.isSimulated) {
                        try {
                            const emailRes = await calendarService.sendConfirmationEmail({
                                name: args.patientName,
                                email: args.email,
                                service: args.serviceName,
                                dateTime: args.dateTime
                            }, this.currentConfig);
                            emailStatus = emailRes.success ? "success" : `failed (${emailRes.error})`;
                        } catch (e: any) {
                            console.error("Email fail", e);
                            emailStatus = "failed (error)";
                        }
                    }

                    const responseMessage = bookingResult.isSimulated
                        ? "Booking simulated (Guest Mode). No real calendar invite or email sent."
                        : `Booking confirmed. Calendar Invite: Sent. Email: ${emailStatus}.`;

                    result = {
                        status: "success",
                        bookingId: "bk_" + Date.now(),
                        nextAction: "end_call_polite",
                        message: responseMessage
                    };
                    this.logAndSave({ type: 'tool', text: `Output (${name}): ${responseMessage}`, timestamp: new Date() });
                }
            } catch (e: any) {
                console.error("Tool execution failed", e);
                result = { status: "error", message: e.message };
                this.logAndSave({ type: 'system', text: `Tool Error: ${e.message}`, timestamp: new Date() });
            }

            functionResponses.push({
                id: id,
                name: name,
                response: { result: result }
            });
        }

        // Only send response if we haven't been interrupted AND connection is same
        if (this.currentConnectionId === connectionId && session && this.interruptionCount === capturedInterruption && functionResponses.length > 0) {
            session.sendToolResponse({ functionResponses });
        }
    }

    disconnect(clearId: boolean = true) {
        if (clearId) {
            this.currentConnectionId = '';
            this.isConnecting = false;
        }

        // 1. Clean Pending Sessions (Zombie Kill)
        if (this.pendingSessionPromise) {
            this.pendingSessionPromise.then(s => {
                try { s.close(); console.log("Killed pending zombie session"); } catch (e) { }
            });
            this.pendingSessionPromise = null;
        }

        // 2. Stop Input
        if (this.processor) {
            this.processor.disconnect();
            this.processor.onaudioprocess = null;
            this.processor = null;
        }
        if (this.inputSource) {
            this.inputSource.disconnect();
            this.inputSource = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(t => t.stop());
            this.mediaStream = null;
        }

        // 3. Stop Output (BUT KEEP CONTEXT ALIVE)
        this.sources.forEach(s => {
            try { s.stop(); } catch (e) { }
        });
        this.sources.clear();

        // 4. Close Session
        if (this.session) {
            try { this.session.close(); } catch (e) { }
            this.session = null;
        }

        // 5. Cleanup
        this.client = null;
        this.nextStartTime = 0;

        this.onStatusChange('disconnected');
    }
}

export const voiceService = new VoiceService();