"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { LoginScreen } from '@/components/LoginScreen';
import { CalendarView } from '@/components/CalendarView';
import { generateConfigFromDescription, translateAgentContent } from '@/services/geminiService';
import { saveConfiguration, auth, loginWithGoogle, logoutUser, getOrgId, getBranding, saveBranding } from '@/services/firebase';
import { firebaseService } from '@/services/agent-ui/firebaseService';
import { createVapiAssistant } from '@/services/vapiService';
import { researchBusiness } from '@/services/researchService';
import { getTemplateByIndustry } from '@/services/templateService';
import { AgentConfiguration, INITIAL_CONFIG, DeliveryModeType, SUPPORTED_INDUSTRIES, BrandingConfig, DEFAULT_BRANDING } from '@/types';
import { Wand2, Plus, Trash2, Loader2, AlertCircle, Copy, Check, Database, Calendar, Bot, Rocket, Braces, Search, Upload, Palette, Image as ImageIcon, Phone, PhoneCall, Link, Globe, ShieldCheck, Settings2, Users } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { loadStripe } from '@stripe/stripe-js';

const TIME_ZONES = [
    'UTC',
    'Africa/Johannesburg',
    'America/Anchorage',
    'America/Chicago',
    'America/Denver',
    'America/Honolulu',
    'America/Los_Angeles',
    'America/New_York',
    'America/Phoenix',
    'America/Sao_Paulo',
    'America/Toronto',
    'Asia/Dubai',
    'Asia/Hong_Kong',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Europe/Berlin',
    'Europe/London',
    'Europe/Paris',
    'Europe/Zurich',
    'Pacific/Auckland'
];

const VAPI_MODEL_PROVIDERS = [
    { id: 'openai', name: 'OpenAI' },
    { id: 'azure-openai', name: 'Azure OpenAI' },
    { id: 'anthropic', name: 'Anthropic' },
    { id: 'anthropic-bedrock', name: 'Anthropic Bedrock' },
    { id: 'google', name: 'Google' },
    { id: 'groq', name: 'Groq' },
    { id: 'cerebras', name: 'Cerebras' },
    { id: 'deepseek', name: 'Deepseek' },
    { id: 'xai', name: 'Xai' },
    { id: 'mistral', name: 'Mistral' },
    { id: 'perplexity-ai', name: 'Perplexity AI' },
    { id: 'together-ai', name: 'Together AI' },
    { id: 'anyscale', name: 'Anyscale' },
    { id: 'openrouter', name: 'Openrouter' },
    { id: 'deepinfra', name: 'Deepinfra' },
    { id: 'inflection-ai', name: 'Inflection AI' },
    { id: 'custom-llm', name: 'Custom LLM' }
];

// Models validated against VAPI's accepted model list (as of 2026-03)
const VAPI_MODELS: { [provider: string]: string[] } = {
    'openai': ['gpt-5.2', 'gpt-5.1', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4.1-2025-04-14', 'gpt-4.1-mini-2025-04-14', 'chatgpt-4o-latest', 'gpt-4o', 'gpt-4o-mini', 'o4-mini', 'o3', 'o3-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    'google': ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    'groq': ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    'anthropic': ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    'azure-openai': ['gpt-4.1-2025-04-14', 'gpt-4.1-mini-2025-04-14', 'gpt-4.1-nano-2025-04-14', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    'deepseek': ['deepseek-chat', 'deepseek-reasoner'],
    'mistral': ['mistral-large-latest', 'mistral-small-latest'],
    'xai': ['grok-3', 'grok-3-fast', 'grok-beta'],
    'together-ai': ['meta-llama/Llama-3-70b-chat-hf', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
};

const VAPI_VOICE_PROVIDERS = [
    { id: 'vapi', name: 'Vapi' },
    { id: 'elevenlabs', name: 'ElevenLabs' },
    { id: 'playht', name: 'PlayHT' },
    { id: 'rime-ai', name: 'Rime' },
    { id: 'azure', name: 'Azure' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'deepgram', name: 'Deepgram' },
    { id: 'cartesia', name: 'Cartesia' },
    { id: 'hume', name: 'Hume (EVC)' },
    { id: 'neuphonic', name: 'Neuphonic' },
    { id: 'smallest-ai', name: 'Smallest AI' },
    { id: 'tavus', name: 'Tavus' },
    { id: 'minimax', name: 'Minimax' },
    { id: 'wellsaid', name: 'WellSaid' },
    { id: 'orpheus', name: 'Orpheus' },
    { id: 'lmnt', name: 'LMNT' }
];

const VAPI_TRANSCRIBER_PROVIDERS = [
    { id: 'deepgram', name: 'Deepgram' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'gladia', name: 'Gladia' },
    { id: 'azure', name: 'Azure' },
    { id: 'google', name: 'Google (Gemini)' },
    { id: 'talkscriber', name: 'Talkscriber' }
];

const VAPI_TRANSCRIBER_MODELS: Record<string, string[]> = {
    'openai': ['gpt-4o-mini-transcribe', 'gpt-4o-transcribe'],
    'google': ['gemini-2.0-flash', 'gemini-1.5-flash'],
    'deepgram': ['nova-3', 'nova-2', 'nova-2-medical', 'nova-2-meeting', 'nova-2-phonecall', 'nova-2-voicemail'],
    'azure': ['standard'],
    'gladia': ['standard'],
    'talkscriber': ['whisper']
};

const VAPI_VOICES_BY_PROVIDER: Record<string, { id: string, name: string }[]> = {
    'vapi': [
        // --- Hindi / Indian Accent ---
        { id: 'Rohan', name: '🇮🇳 Rohan — Hindi Male' },
        { id: 'Sagar', name: '🇮🇳 Sagar — Hinglish Male' },
        { id: 'Neil', name: '🇮🇳 Neil — Hindi Male' },
        { id: 'Leah', name: '🇮🇳 Leah — Hinglish Female' },
        // --- English (US/AU) ---
        { id: 'Mia', name: 'Mia — Female, US' },
        { id: 'Jess', name: 'Jess — Female, US' },
        { id: 'Tara', name: 'Tara — Female, US' },
        { id: 'Zoe', name: 'Zoe — Female, US' },
        { id: 'Paige', name: 'Paige — Female, US' },
        { id: 'Emma', name: 'Emma — Female, US' },
        { id: 'Kylie', name: 'Kylie — Female, AU' },
        { id: 'Savannah', name: 'Savannah — Female, US' },
        { id: 'Hana', name: 'Hana — Female' },
        { id: 'Lily', name: 'Lily — Female, US' },
        { id: 'Clara', name: 'Clara — Female' },
        { id: 'Zac', name: 'Zac — Male, US' },
        { id: 'Dan', name: 'Dan — Male, US' },
        { id: 'Leo', name: 'Leo — Male, US' },
        { id: 'Cole', name: 'Cole — Male, US' },
        { id: 'Harry', name: 'Harry — Male, US' },
        { id: 'Elliot', name: 'Elliot — Male, US' },
        { id: 'Spencer', name: 'Spencer — Male, US' },
        { id: 'Nico', name: 'Nico — Male' },
        { id: 'Kai', name: 'Kai — Male' },
        { id: 'Godfrey', name: 'Godfrey — Male, UK' },
    ],
    'deepgram': [
        { id: 'aura-asteria-en', name: 'Asteria' },
        { id: 'aura-luna-en', name: 'Luna' },
        { id: 'aura-stella-en', name: 'Stella' },
        { id: 'aura-athena-en', name: 'Athena' },
        { id: 'aura-hera-en', name: 'Hera' },
        { id: 'aura-orion-en', name: 'Orion' },
        { id: 'aura-arcas-en', name: 'Arcas' },
        { id: 'aura-perseus-en', name: 'Perseus' },
        { id: 'aura-zeus-en', name: 'Zeus' },
    ],
    'azure': [
        // --- Hindi (India) ---
        { id: 'hi-IN-SwaraNeural', name: '🇮🇳 Swara — Hindi Female' },
        { id: 'hi-IN-AnanyaNeural', name: '🇮🇳 Ananya — Hindi Female' },
        { id: 'hi-IN-NeerjaNeural', name: '🇮🇳 Neerja — Hindi Female' },
        { id: 'hi-IN-MadhurNeural', name: '🇮🇳 Madhur — Hindi Male' },
        { id: 'hi-IN-RehaanNeural', name: '🇮🇳 Rehaan — Hindi Male' },
        { id: 'en-IN-NeerjaNeural', name: '🇮🇳 Neerja — English Indian Female' },
        { id: 'en-IN-PrabhatNeural', name: '🇮🇳 Prabhat — English Indian Male' },
        // --- English ---
        { id: 'en-US-JennyNeural', name: 'Jenny — English US Female' },
        { id: 'en-US-GuyNeural', name: 'Guy — English US Male' },
        { id: 'en-GB-SoniaNeural', name: 'Sonia — English UK Female' },
        { id: 'en-GB-RyanNeural', name: 'Ryan — English UK Male' },
        { id: 'en-AU-NatashaNeural', name: 'Natasha — English AU Female' },
    ],
    'elevenlabs': [
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah - mature, reassuring, confident' },
        { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill - trustworthy' },
        { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum - intense, gruff' },
        { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie - natural' },
        { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte - seductive, mature' },
        { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris - casual, authentic' },
        { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel - calm, British' },
        { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric - friendly' },
        { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George - warm' },
        { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica - friendly' },
        { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura - upbeat' },
        { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam - articulate' },
        { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily - warm, British' },
        { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian - deep' },
        { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda - confident, warm' },
    ]
};

const VAPI_VOICE_MODELS: Record<string, string[]> = {
    'elevenlabs': [
        'eleven_multilingual_v2', 
        'eleven_turbo_v2', 
        'eleven_turbo_v2_5', 
        'eleven_flash_v2', 
        'eleven_flash_v2_5', 
        'eleven_english_v1', 
        'eleven_v3'
    ]
};

const VAPI_LANGUAGES = [
    { id: 'multilingual', name: 'Multilingual' },
    { id: 'en', name: 'English' },
    { id: 'en-US', name: 'English (US)' },
    { id: 'en-GB', name: 'English (UK)' },
    { id: 'en-IN', name: 'English (India)' },
    { id: 'hi', name: 'Hindi' },
    { id: 'es', name: 'Spanish' },
    { id: 'fr', name: 'French' },
    { id: 'de', name: 'German' },
    { id: 'it', name: 'Italian' },
    { id: 'pt', name: 'Portuguese' },
    { id: 'ja', name: 'Japanese' },
    { id: 'ko', name: 'Korean' },
    { id: 'zh', name: 'Chinese' },
];

const VAPI_BACKGROUND_SOUNDS = [
    { id: 'off', name: 'Off' },
    { id: 'office', name: 'Office' },
    { id: 'default', name: 'Default' },
    { id: 'custom', name: 'Custom' },
];

export default function AdminPage() {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);

    const [activeSection, setActiveSection] = useState('metadata');
    const [config, setConfig] = useState<AgentConfiguration>(INITIAL_CONFIG);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasBeenGenerated, setHasBeenGenerated] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isResearching, setIsResearching] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);
    const [showEmbedCode, setShowEmbedCode] = useState(false);
    const [copyVoiceSuccess, setCopyVoiceSuccess] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [contentLanguage, setContentLanguage] = useState('English');
    const [agents, setAgents] = useState<any[]>([]);
    const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
    const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
    const [isBrandingLoading, setIsBrandingLoading] = useState(false);
    const [plan, setPlan] = useState<'BASIC' | 'PRO'>('BASIC');
    const [isBillingLoading, setIsBillingLoading] = useState(false);
    const [isCalling, setIsCalling] = useState(false);
    const [vapiAssistantId, setVapiAssistantId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const avatarFileInputRef = useRef<HTMLInputElement>(null);
    // Normalize voiceProvider casing and reset voiceId if invalid for the current provider
    useEffect(() => {
        const rawProvider = (config.vapi.voiceProvider || '').toLowerCase();
        const validProvider = VAPI_VOICES_BY_PROVIDER[rawProvider] ? rawProvider : 'vapi';
        const options = VAPI_VOICES_BY_PROVIDER[validProvider];
        const isVoiceValid = options.some(v => v.id === config.vapi.voiceId);
        const updates: any = {};
        // Normalize casing: 'ElevenLabs' → 'elevenlabs', 'VAPI' → 'vapi', etc.
        if (config.vapi.voiceProvider !== validProvider) updates.voiceProvider = validProvider;
        if (!isVoiceValid) updates.voiceId = options[0]?.id || 'Rohan';
        if (Object.keys(updates).length > 0) {
            setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, ...updates } }));
        }
    }, [config.vapi.voiceProvider, config.vapi.voiceId]);

    // Handle Stripe Checkout Success Redirect
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('session_id')) {
                alert("Payment successful! Your account has been upgraded to PRO.");
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }, []);

    // Fetch organization data (branding & plan)
    useEffect(() => {
        if (user) {
            loadOrgData();
        }
    }, [user]);

    // Apply dynamic theme
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--brand-primary', branding.primaryColor);
    }, [branding.primaryColor]);

    const loadOrgData = async () => {
        setIsBrandingLoading(true);
        try {
            const { getOrgData } = await import('@/services/firebase');
            const data = await getOrgData();
            if (data) {
                if (data.branding) setBranding(data.branding);
                if (data.plan) setPlan(data.plan);
            }
        } catch (e) {
            console.error("Failed to load org data", e);
        } finally {
            setIsBrandingLoading(false);
        }
    };

    const handleSaveBranding = async () => {
        setIsBrandingLoading(true);
        try {
            const orgId = getOrgId(user);
            // 1. Save branding settings
            await saveBranding(branding);
            
            // 2. Also save current configuration to persist avatarUrl and metadata
            if (activeAgentId || !isDemoMode) {
                await saveConfiguration(config);
            }
            
            alert("All settings including Branding and Bot Face have been saved!");
        } catch (error: any) {
            alert("Error saving: " + error.message);
        } finally {
            setIsBrandingLoading(false);
        }
    };

    // Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
            setIsLoggingIn(false);
            if (currentUser) {
                setIsDemoMode(false);
                loadAgents();
                setConfig(prev => ({
                    ...prev,
                    integrations: {
                        firebase: true,
                        ...(prev.integrations || {}),
                        googleCalendar: true
                    },
                    vapi: {
                        ...prev.vapi,
                        transcriber: {
                            ...prev.vapi.transcriber,
                            userName: currentUser.displayName || '',
                            userEmail: currentUser.email || ''
                        }
                    }
                }));
            } else {
                setAgents([]);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async () => {
        setIsLoggingIn(true);
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error("Login Error", error);
            setIsLoggingIn(false);
            throw error;
        }
    };

    const handleDemoLogin = () => {
        setIsDemoMode(true);
    };

    const handleLogout = async () => {
        if (isDemoMode) {
            setIsDemoMode(false);
            setConfig(INITIAL_CONFIG);
            setIsLocked(false);
            return;
        }
        try {
            await logoutUser();
            setIsLocked(false);
            setConfig(INITIAL_CONFIG);
        } catch (error) {
            console.error("Logout Error", error);
        }
    };

    const loadAgents = async () => {
        try {
            const { getAgents } = await import('@/services/firebase');
            const list = await getAgents();
            setAgents(list);
        } catch (error) {
            console.error("Failed to load agents", error);
        }
    };

    const selectAgent = async (agentId: string) => {
        try {
            const { getAgentConfig } = await import('@/services/firebase');
            const loadedConfig = await getAgentConfig(agentId);
            if (loadedConfig) {
                setConfig(loadedConfig);
                setActiveAgentId(agentId);
                setIsLocked(true);
                setHasBeenGenerated(true);
            }
        } catch (error) {
            console.error("Failed to select agent", error);
        }
    };

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const isValid =
        hasBeenGenerated &&
        config.metadata.businessName.length > 0 &&
        config.services.length > 0 &&
        config.locations.length > 0;

    const handleLaunchClient = async () => {
        const orgId = user ? getOrgId(user) : 'anonymous_org';
        const safeName = config.metadata.businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const agentId = activeAgentId || `agent_${safeName}`;
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        // Force local route for the launch button to ensure it opens the internal agent interface
        const clientBaseUrl = `${origin}/agentUI`;

        if (isDemoMode) {
            const userParams = `&uName=${encodeURIComponent(config.vapi.transcriber?.userName || '')}&uEmail=${encodeURIComponent(config.vapi.transcriber?.userEmail || '')}&uPhone=${encodeURIComponent(config.vapi.transcriber?.userPhone || '')}`;
            const url = `${clientBaseUrl}?orgId=${orgId}&agentId=${agentId}&role=admin&demo=true${userParams}`;
            window.open(url, '_blank');
            return;
        }

        if (!user) {
            alert("Please sign in first or use Demo Mode.");
            return;
        }

        setIsLaunching(true);
        try {
            if (isValid) {
                await saveConfiguration(config);
                setIsLocked(true);
            }
            const token = await user.getIdToken(true);
            const userParams = `&uName=${encodeURIComponent(config.vapi.transcriber?.userName || '')}&uEmail=${encodeURIComponent(config.vapi.transcriber?.userEmail || '')}&uPhone=${encodeURIComponent(config.vapi.transcriber?.userPhone || '')}`;
            const url = `${clientBaseUrl}?authtoken=${encodeURIComponent(token)}&orgId=${orgId}&agentId=${agentId}&role=admin${userParams}`;
            window.open(url, '_blank');
        } catch (error) {
            console.error("Failed to launch client", error);
            alert("Error launching client. Check console for details.");
        } finally {
            setIsLaunching(false);
        }
    };

    const handleAiGenerate = async (useResearch = false) => {
        if (!aiPrompt.trim()) return;
        setActiveAgentId(null);
        setIsGenerating(true);
        if (useResearch) setIsResearching(true);

        try {
            let researchData = null;
            if (useResearch) {
                try {
                    researchData = await researchBusiness(aiPrompt);
                } catch (researchError) {
                    console.error("Research failed, proceeding with AI only", researchError);
                } finally {
                    setIsResearching(false);
                }
            }

            const template = getTemplateByIndustry(config.metadata.industry);
            const generated = await generateConfigFromDescription(aiPrompt, researchData, template);
            setConfig(prev => ({
                ...prev,
                metadata: { ...prev.metadata, ...generated.metadata },
                services: generated.services || prev.services,
                locations: generated.locations || prev.locations,
                resources: generated.resources || prev.resources,
                conversation: { ...prev.conversation, ...generated.conversation },
                safety: { ...prev.safety, ...generated.safety },
                integrations: { ...prev.integrations, ...generated.integrations },
                vapi: {
                    ...prev.vapi,
                    ...(generated.vapi || {}),
                    transcriber: {
                        ...(generated.vapi?.transcriber || prev.vapi.transcriber),
                        // Preserve user context fields from Gmail login
                        userName: prev.vapi.transcriber?.userName || generated.vapi?.transcriber?.userName || '',
                        userEmail: prev.vapi.transcriber?.userEmail || generated.vapi?.transcriber?.userEmail || '',
                        userPhone: prev.vapi.transcriber?.userPhone || generated.vapi?.transcriber?.userPhone || ''
                    }
                }
            }));
            setHasBeenGenerated(true);
        } catch (error: any) {
            console.error("AI Generation failed", error);
            const message = error.message || "Unknown error";
            alert("AI Assistant Error: " + message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteAgent = async (agentId: string, agentName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Delete "${agentName}"?\n\nThis will permanently remove the agent from Firebase and VAPI. This cannot be undone.`)) return;
        try {
            const { getAgentConfig, deleteAgentConfig } = await import('@/services/firebase');
            const agentConfig: any = await getAgentConfig(agentId);
            const vapiAssId = agentConfig?.vapi?.assistantId;
            if (vapiAssId) {
                await fetch('/api/vapi/assistant/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ assistantId: vapiAssId })
                });
            }
            await deleteAgentConfig(agentId);
            await loadAgents();
            if (activeAgentId === agentId) {
                setActiveAgentId(null);
                setConfig(INITIAL_CONFIG);
                setIsLocked(false);
                setVapiAssistantId(null);
            }
        } catch (err: any) {
            alert('Failed to delete agent: ' + (err.message || 'Unknown error'));
        }
    };

    const handleTranslateContent = async (language: string) => {
        if (language === 'English') return;
        setIsTranslating(true);
        try {
            const voiceProvider = (config.vapi.voiceProvider || 'vapi').toLowerCase();
            const isNativeHindiTTS = voiceProvider === 'azure' || voiceProvider === 'elevenlabs';
            const isHinglish = language === 'Hindi' && !isNativeHindiTTS;

            if (isHinglish) {
                // Hinglish mode: only translate the first message to Roman-script Hindi.
                // System prompt stays in English — the AI comprehends complex instructions (booking, tools)
                // better in English, and the Hinglish language directive injected at call time already
                // tells it to OUTPUT in Roman-script Hindi. Translating the full system prompt to Hinglish
                // creates a "script clash" where the body says one thing and the directive says another.
                const result = await translateAgentContent(
                    { systemPrompt: '', firstMessage: config.vapi.firstMessage, knowledgeBase: '' },
                    'Hinglish'
                );
                setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, firstMessage: result.firstMessage } }));
            } else {
                // For all other languages (including Azure/ElevenLabs Hindi with Devanagari), translate everything.
                const translated = await translateAgentContent(
                    { systemPrompt: config.vapi.systemPrompt, firstMessage: config.vapi.firstMessage, knowledgeBase: config.vapi.knowledgeBase },
                    language
                );
                setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, ...translated } }));
            }
        } catch (e: any) {
            alert('Translation failed: ' + (e.message || 'Unknown error'));
        } finally {
            setIsTranslating(false);
        }
    };

    const handleAvatarImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check file type
        if (!file.type.startsWith('image/')) {
            alert("Please select an image file.");
            return;
        }

        // Check file size (limit to 1MB for base64 storage)
        if (file.size > 1 * 1024 * 1024) {
            alert("Image size must be less than 1MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (content) {
                setConfig(prev => ({
                    ...prev,
                    vapi: {
                        ...prev.vapi,
                        avatarUrl: content
                    }
                }));
            }
        };
        reader.readAsDataURL(file);
        if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (content) {
                setConfig(prev => ({
                    ...prev,
                    vapi: {
                        ...prev.vapi,
                        knowledgeBase: (prev.vapi.knowledgeBase ? prev.vapi.knowledgeBase + "\n\n" : "") + content
                    }
                }));
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleTriggerCall = async () => {
        if (!config.vapi.transcriber?.userPhone || !vapiAssistantId) {
            alert("Assistant ID and User Phone Number are required.");
            return;
        }

        setIsCalling(true);
        try {
            const response = await fetch('/api/vapi/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber: config.vapi.transcriber?.userPhone,
                    assistantId: vapiAssistantId
                }),
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            alert("Calling your phone now...");
        } catch (error: any) {
            console.error("Call failed", error);
            alert("Call failed: " + error.message);
        } finally {
            setIsCalling(false);
        }
    };

    const handleUpgrade = async () => {
        if (!user) return;
        setIsBillingLoading(true);
        try {
            const orgId = getOrgId(user);
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orgId,
                    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_1Qv3W..._test',
                    successUrl: window.location.origin + '/agency/admin?session_id={CHECKOUT_SESSION_ID}',
                    cancelUrl: window.location.origin + '/agency/admin',
                }),
            });
            const { url, error } = await response.json();
            if (error) throw new Error(error);
            window.location.href = url;
        } catch (error: any) {
            console.error("Upgrade failed", error);
            alert("Upgrade failed: " + error.message);
        } finally {
            setIsBillingLoading(false);
        }
    };

    const handleManageSubscription = async () => {
        if (!user) return;
        setIsBillingLoading(true);
        try {
            const orgId = getOrgId(user);
            const response = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orgId,
                    returnUrl: window.location.origin + '/agency/admin',
                }),
            });
            const { url, error } = await response.json();
            if (error) throw new Error(error);
            window.location.href = url;
        } catch (error: any) {
            console.error("Portal failed", error);
            alert("Failed to open billing portal: " + error.message);
        } finally {
            setIsBillingLoading(false);
        }
    };

    const handleLock = async () => {
        setIsSaving(true);
        try {
            const savedAgentId = await saveConfiguration(config);
            setActiveAgentId(savedAgentId);
            await loadAgents();
            if (!isDemoMode && config.vapi.provider) {
                try {
                    const vapiRes = await createVapiAssistant(config);
                    if (vapiRes && vapiRes.id) {
                        setVapiAssistantId(vapiRes.id);
                        // Save assistantId back to Firebase so delete can reference it
                        const { saveConfiguration: save } = await import('@/services/firebase');
                        await save({ ...config, vapi: { ...config.vapi, assistantId: vapiRes.id } } as any);
                    }
                    handleLaunchClient();
                } catch (vapiError: any) {
                    console.error("VAPI Error", vapiError);
                    alert(`Saved to Cloud, but VAPI creation failed: ${vapiError.message}`);
                }
            }
            setIsLocked(true);
        } catch (error) {
            console.error("Failed to save config", error);
            if (isDemoMode) {
                alert("Demo Mode: Configuration validated locally.");
                setIsLocked(true);
            } else {
                alert("Failed to save configuration to database.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const updateMetadata = (field: string, value: string) => {
        setConfig(prev => ({ ...prev, metadata: { ...prev.metadata, [field]: value } }));
    };

    const addService = () => {
        setConfig(prev => ({
            ...prev,
            services: [...prev.services, {
                id: Math.random().toString(36).substring(2, 9),
                name: '',
                description: '',
                durationMinutes: 30,
                bookingRules: ''
            }]
        }));
    };

    const updateService = (id: string, field: string, value: any) => {
        setConfig(prev => ({
            ...prev,
            services: prev.services.map(s => s.id === id ? { ...s, [field]: value } : s)
        }));
    };

    const removeService = (id: string) => {
        setConfig(prev => ({
            ...prev,
            services: prev.services.filter(s => s.id !== id)
        }));
    };

    const addLocation = () => {
        setConfig(prev => ({
            ...prev,
            locations: [...prev.locations, {
                id: Math.random().toString(36).substring(2, 9),
                name: '',
                address: '',
                mode: 'Physical' as DeliveryModeType,
                operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                operatingHours: '09:00 - 17:00',
                timeZone: 'UTC'
            }]
        }));
    };

    const updateLocation = (id: string, field: string, value: any) => {
        setConfig(prev => ({
            ...prev,
            locations: prev.locations.map(l => l.id === id ? { ...l, [field]: value } : l)
        }));
    };

    const removeLocation = (id: string) => {
        setConfig(prev => ({
            ...prev,
            locations: prev.locations.filter(l => l.id !== id)
        }));
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!user && !isDemoMode) {
        return <LoginScreen onLogin={handleLogin} onDemoLogin={handleDemoLogin} isLoggingIn={isLoggingIn} />;
    }

    if (isLocked) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center justify-center p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-slate-900">
                <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center mb-4">
                            <Check className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">Configuration Submitted!</h1>
                        <p className="text-slate-400 text-lg max-w-md">
                            Your Voice AI Agent has been updated and the VAPI assistant is ready for action.
                        </p>
                    </div>

                    {/* Embed Voice Bot Code - Option 1: Script */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-3">
                                <Braces className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-lg font-bold text-white">Embed Code - Option 1: Floating Widget</h3>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-700 px-2 py-0.5 rounded">Script</span>
                        </div>
                        <p className="text-slate-400 text-sm">
                            Best for adding a floating bubble at the bottom of your website.
                        </p>
                        <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 space-y-3">
                            <code className="block text-emerald-400 font-mono text-xs break-all whitespace-pre-wrap">
                                {(() => {
                                    const orgId = user ? getOrgId(user) : 'anonymous_org';
                                    const safeName = config.metadata.businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                                    const agentId = activeAgentId || `agent_${safeName}`;
                                    const clientBaseUrl = config.vapi.clientUrl || (typeof window !== 'undefined' ? window.location.origin : '');
                                    return `<!-- Voice AI Widget -->
<script>
  window.VOICE_WIDGET_CONFIG = {
    vapiPublicKey: "${process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || 'your-vapi-public-key'}",
    assistantId: "${vapiAssistantId || 'your-assistant-id'}",
    orgId: "${orgId}",
    agentId: "${agentId}",
    position: "bottom-right",
    primaryColor: "#667eea",
    secondaryColor: "#764ba2"
  };
</script>
<script src="${clientBaseUrl}/voice-widget.js"></script>`;
                                })()}
                            </code>
                            <button
                                onClick={() => {
                                    const orgId = user ? getOrgId(user) : 'anonymous_org';
                                    const safeName = config.metadata.businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                                    const agentId = activeAgentId || `agent_${safeName}`;
                                    const clientBaseUrl = config.vapi.clientUrl || (typeof window !== 'undefined' ? window.location.origin : '');
                                    const embedCode = `<!-- Voice AI Widget -->
<script>
  window.VOICE_WIDGET_CONFIG = {
    vapiPublicKey: "${process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || 'your-vapi-public-key'}",
    assistantId: "${vapiAssistantId || 'your-assistant-id'}",
    orgId: "${orgId}",
    agentId: "${agentId}",
    position: "bottom-right",
    primaryColor: "#667eea",
    secondaryColor: "#764ba2"
  };
</script>
<script src="${clientBaseUrl}/voice-widget.js"></script>`;
                                    navigator.clipboard.writeText(embedCode);
                                    setCopyVoiceSuccess(true);
                                    setTimeout(() => setCopyVoiceSuccess(false), 2000);
                                }}
                                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {copyVoiceSuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copyVoiceSuccess ? 'Copied to Clipboard!' : 'Copy Embed Code'}
                            </button>
                        </div>
                    </div>

                    {/* Embed Voice Bot Code - Option 2: IFrame */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-emerald-400" />
                                <h3 className="text-lg font-bold text-white">Embed Code - Option 2: Embedded Page</h3>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-700 px-2 py-0.5 rounded">IFrame</span>
                        </div>
                        <p className="text-slate-400 text-sm">
                            Best for embedding the agent into a specific section of your page or a CMS (WordPress, Wix, Webflow).
                        </p>
                        <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 space-y-3">
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                                <p className="text-[10px] text-amber-200 uppercase font-bold mb-1 flex items-center gap-2">
                                    <ShieldCheck className="w-3 h-3" />
                                    Microphone Access Required
                                </p>
                                <p className="text-xs text-slate-400">
                                    IFrames REQUIRE the <code>allow="microphone"</code> attribute to work. The snippet below is pre-configured for you.
                                </p>
                            </div>
                            <code className="block text-emerald-400 font-mono text-xs break-all whitespace-pre-wrap">
                                {(() => {
                                    const orgId = user ? getOrgId(user) : 'anonymous_org';
                                    const safeName = config.metadata.businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                                    const agentId = activeAgentId || `agent_${safeName}`;
                                    const clientBaseUrl = config.vapi.clientUrl || (typeof window !== 'undefined' ? window.location.origin : '');
                                    return `<!-- Voice AI IFrame Integration -->
<iframe 
  src="${clientBaseUrl}/agentUI?orgId=${orgId}&agentId=${agentId}&widget=true" 
  width="100%" 
  height="700px" 
  frameborder="0" 
  allow="microphone; camera; clipboard-read; clipboard-write;"
></iframe>`;
                                })()}
                            </code>
                            <button
                                onClick={() => {
                                    const orgId = user ? getOrgId(user) : 'anonymous_org';
                                    const safeName = config.metadata.businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                                    const agentId = activeAgentId || `agent_${safeName}`;
                                    const clientBaseUrl = config.vapi.clientUrl || (typeof window !== 'undefined' ? window.location.origin : '');
                                    const embedCode = `<!-- Voice AI IFrame Integration -->
<iframe 
  src="${clientBaseUrl}/agentUI?orgId=${orgId}&agentId=${agentId}&widget=true" 
  width="100%" 
  height="700px" 
  frameborder="0" 
  allow="microphone; camera; clipboard-read; clipboard-write;"
></iframe>`;
                                    navigator.clipboard.writeText(embedCode);
                                    alert("IFrame embed code copied! Remember to ensure your site is served over HTTPS.");
                                }}
                                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Copy className="w-4 h-4" />
                                Copy IFrame Code
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                        {config.vapi.transcriber?.userPhone && vapiAssistantId && (
                            <button
                                onClick={handleTriggerCall}
                                disabled={isCalling}
                                className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl flex items-center gap-3 shadow-lg shadow-brand-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-70"
                            >
                                {isCalling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                                Call Me Now
                            </button>
                        )}
                        <button
                            onClick={handleLaunchClient}
                            disabled={isLaunching}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-50 text-white font-bold rounded-xl flex items-center gap-3 shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-70"
                        >
                            <Rocket className="w-5 h-5 font-bold" />
                            Launch Agent Interface
                        </button>

                        <button
                            onClick={() => setIsLocked(false)}
                            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all hover:bg-slate-700/80"
                        >
                            Back to Configurator
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar
                activeSection={activeSection}
                onNavigate={scrollToSection}
                onLock={handleLock}
                onLaunchClient={handleLaunchClient}
                isValid={isValid}
                isSaving={isSaving}
                isLocked={isLocked}
                isLaunching={isLaunching}
                agents={agents}
                onSelectAgent={selectAgent}
                onDeleteAgent={handleDeleteAgent}
                branding={branding}
                currentAgentId={activeAgentId || undefined}
            />

            <main className="ml-64 flex-1 p-8 max-w-5xl mx-auto space-y-16 pb-32">
                <div className="flex justify-end mb-4 items-center gap-4">
                    {isDemoMode && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                            DEMO MODE
                        </span>
                    )}

                    <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-500 px-3 py-1">
                        {isDemoMode ? 'Exit Demo' : `Sign Out (${user?.email})`}
                    </button>
                </div>

                {/* AI Assistant Banner */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl p-6 text-white shadow-lg mb-8">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/10 rounded-lg">
                            <Wand2 className="w-6 h-6 text-indigo-100" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold mb-2">AI Configuration Assistant</h2>
                            <p className="text-indigo-100 mb-4 text-sm">
                                Describe the business, and I will auto-fill the configuration for you.
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="e.g. A dental clinic in Chicago offering exams and cleanings..."
                                    className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                                />
                                <button
                                    onClick={() => handleAiGenerate(false)}
                                    disabled={isGenerating}
                                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 border border-white/20"
                                >
                                    {isGenerating && !isResearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    Auto-Fill
                                </button>
                                <button
                                    onClick={() => handleAiGenerate(true)}
                                    disabled={isGenerating}
                                    className="px-6 py-2 bg-white text-indigo-700 font-bold rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-black/10"
                                >
                                    {isResearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                    Research & Auto-Fill
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section A: Metadata */}
                <section id="metadata" className="space-y-6 scroll-mt-24">
                    <div className="border-b border-slate-200 pb-4">
                        <h2 className="text-2xl font-bold text-slate-800">Section A: Business Metadata</h2>
                        <p className="text-slate-500">Core identity and purpose of the business.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Business Name</label>
                            <input type="text" className="w-full p-2 border rounded-md"
                                value={config.metadata.businessName} onChange={(e) => updateMetadata('businessName', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Created At</label>
                            <div className="flex items-center gap-2 w-full p-2 border rounded-md bg-slate-100 text-slate-500">
                                <Calendar className="w-4 h-4" />
                                <span>{config.metadata.createdAt ? new Date(config.metadata.createdAt).toLocaleString() : 'New'}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Industry</label>
                            <input type="text" className="w-full p-2 border rounded-md"
                                list="industries"
                                value={config.metadata.industry}
                                onChange={(e) => updateMetadata('industry', e.target.value)}
                                placeholder="Search or select industry..."
                            />
                            <datalist id="industries">
                                {SUPPORTED_INDUSTRIES.map(ind => (
                                    <option key={ind} value={ind} />
                                ))}
                            </datalist>
                            <button
                                type="button"
                                onClick={() => {
                                    const template = getTemplateByIndustry(config.metadata.industry);
                                    if (template) {
                                        setConfig(prev => ({
                                            ...prev,
                                            vapi: {
                                                ...prev.vapi,
                                                systemPrompt: template.systemPrompt,
                                                firstMessage: template.firstMessage
                                            },
                                            dataFields: {
                                                ...prev.dataFields,
                                                mandatory: template.mandatoryFields,
                                                optional: template.optionalFields
                                            },
                                            conversation: {
                                                ...prev.conversation,
                                                tone: template.defaultTone
                                            }
                                        }));
                                        alert(`Applied ${template.name} template!`);
                                    }
                                }}
                                className="mt-2 text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-700"
                            >
                                <Rocket className="w-3 h-3" />
                                Apply Expert Template
                            </button>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Primary Use Case</label>
                            <input type="text" className="w-full p-2 border rounded-md"
                                value={config.metadata.primaryUseCase} onChange={(e) => updateMetadata('primaryUseCase', e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Business Description</label>
                        <textarea className="w-full p-2 border rounded-md h-24"
                            value={config.metadata.description} onChange={(e) => updateMetadata('description', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Website URL (Optional)</label>
                        <input
                            type="url"
                            className="w-full p-2 border rounded-md"
                            placeholder="https://www.yourcompany.com"
                            value={config.metadata.websiteUrl || ''}
                            onChange={(e) => updateMetadata('websiteUrl', e.target.value)}
                        />
                        <p className="text-xs text-slate-500">This will add a "Visit Website" button on the success screen</p>
                    </div>

                    <div className="space-y-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl mt-6">
                        <div className="flex items-center gap-2">
                             <div className="p-2 bg-indigo-600 rounded-lg shadow-md shadow-indigo-200">
                                <ImageIcon className="w-5 h-5 text-white" />
                             </div>
                             <h3 className="text-lg font-bold text-slate-800">Bot Personalization (Face of Agent)</h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-slate-700">Bot Avatar Image URL</label>
                                <button
                                    onClick={() => avatarFileInputRef.current?.click()}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 uppercase tracking-wider"
                                >
                                    <Upload className="w-3 h-3" />
                                    Upload Image
                                </button>
                                <input
                                    type="file"
                                    ref={avatarFileInputRef}
                                    onChange={handleAvatarImageUpload}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>
                            <div className="flex gap-4 items-start">
                                <div className="flex-1 relative">
                                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-4 py-3 text-sm border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-sm bg-white"
                                        placeholder="https://example.com/avatar.png"
                                        value={config.vapi.avatarUrl || ""}
                                        onChange={e => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, avatarUrl: e.target.value } }))}
                                    />
                                    <p className="text-[10px] text-slate-500 italic mt-2 ml-1">
                                        Tip: Go to Google Images, find a professional face, right-click and "Copy Image Address", then paste it here.
                                    </p>
                                </div>
                                <div className="w-20 h-20 rounded-2xl border-2 border-indigo-200 overflow-hidden shadow-lg bg-white flex-shrink-0 flex items-center justify-center">
                                    {config.vapi.avatarUrl ? (
                                        <img src={config.vapi.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Bot className="w-10 h-10 text-slate-300" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Palette className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-lg font-bold text-slate-800">Organization Branding</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">App Name / Identity</label>
                                <input type="text" className="w-full p-2 border rounded-md"
                                    value={branding.appName}
                                    onChange={(e) => setBranding(prev => ({ ...prev, appName: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Logo URL</label>
                                <input type="text" className="w-full p-2 border rounded-md"
                                    value={branding.logoUrl}
                                    onChange={(e) => setBranding(prev => ({ ...prev, logoUrl: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Primary Brand Color</label>
                                <input type="color" className="w-full h-10 p-1 rounded-md border"
                                    value={branding.primaryColor}
                                    onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))} />
                            </div>
                            <div className="flex items-end">
                                <button onClick={handleSaveBranding} disabled={isBrandingLoading} className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isBrandingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Save Branding
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section B: Services */}
                <section id="services" className="space-y-6 scroll-mt-24">
                    <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Section B: Services</h2>
                            <p className="text-slate-500">Define your offerings.</p>
                        </div>
                        <button onClick={addService} className="text-sm bg-slate-900 text-white px-3 py-2 rounded-md flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add Service
                        </button>
                    </div>
                    <div className="space-y-4">
                        {config.services.map((service) => (
                            <div key={service.id} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative group">
                                <button onClick={() => removeService(service.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-8 space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Service Name</label>
                                        <input type="text" className="w-full p-2 border rounded"
                                            value={service.name} onChange={(e) => updateService(service.id, 'name', e.target.value)} />
                                    </div>
                                    <div className="col-span-4 space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Duration (min)</label>
                                        <input type="number" className="w-full p-2 border rounded"
                                            value={service.durationMinutes} onChange={(e) => updateService(service.id, 'durationMinutes', parseInt(e.target.value))} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section C: Locations */}
                <section id="locations" className="space-y-6 scroll-mt-24">
                    <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                        <h2 className="text-2xl font-bold text-slate-800">Section C: Locations</h2>
                        <button onClick={addLocation} className="text-sm bg-slate-900 text-white px-3 py-2 rounded-md flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add Location
                        </button>
                    </div>
                    <div className="space-y-4">
                        {config.locations.map((loc) => (
                            <div key={loc.id} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative">
                                <button onClick={() => removeLocation(loc.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Location Name</label>
                                        <input type="text" className="w-full p-2 border rounded"
                                            value={loc.name} onChange={(e) => updateLocation(loc.id, 'name', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Type</label>
                                        <select className="w-full p-2 border rounded text-sm"
                                            value={loc.mode} onChange={(e) => updateLocation(loc.id, 'mode', e.target.value)}>
                                            <option value="Physical">Physical</option>
                                            <option value="Virtual">Virtual</option>
                                            <option value="Hybrid">Hybrid</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Address</label>
                                        <input type="text" className="w-full p-2 border rounded" placeholder="123 Business St, City, State"
                                            value={loc.address || ''} onChange={(e) => updateLocation(loc.id, 'address', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* VAPI Configuration */}
                <section id="vapi" className="space-y-6 scroll-mt-24 pb-20">
                    <div className="border-b border-slate-200 pb-4">
                        <h2 className="text-2xl font-bold text-slate-800">Section J: VAPI Configuration</h2>
                    </div>
                    <div className="bg-white p-6 border rounded-lg shadow-sm space-y-6">

                        {/* New Vapi Settings Grid */}
                        <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 border rounded-lg">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 uppercase">Provider</label>
                                <select
                                    className="w-full p-2 text-sm border rounded bg-white"
                                    value={config.vapi.provider || "openai"}
                                    onChange={e => {
                                        const newProvider = e.target.value;
                                        const defaultModel = VAPI_MODELS[newProvider]?.[0] || '';
                                        setConfig(prev => ({
                                            ...prev,
                                            vapi: {
                                                ...prev.vapi,
                                                provider: newProvider,
                                                model: defaultModel
                                            }
                                        }));
                                    }}
                                >
                                    {VAPI_MODEL_PROVIDERS.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 uppercase">Model</label>
                                <select
                                    className="w-full p-2 text-sm border rounded bg-white"
                                    value={config.vapi.model || ""}
                                    onChange={e => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, model: e.target.value } }))}
                                >
                                    {(VAPI_MODELS[config.vapi.provider?.toLowerCase() || 'openai'] || []).map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 uppercase">Voice Provider</label>
                                <select
                                    className="w-full p-2 text-sm border rounded bg-white"
                                    value={(config.vapi.voiceProvider || 'vapi').toLowerCase()}
                                    onChange={e => {
                                        const newProvider = e.target.value;
                                        const defaultVoice = VAPI_VOICES_BY_PROVIDER[newProvider]?.[0]?.id || '';
                                        setConfig(prev => ({
                                            ...prev,
                                            vapi: {
                                                ...prev.vapi,
                                                voiceProvider: newProvider,
                                                voiceId: defaultVoice
                                            }
                                        }));
                                    }}
                                >
                                    {VAPI_VOICE_PROVIDERS.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 uppercase">Voice</label>
                                <select
                                    className="w-full p-2 text-sm border rounded bg-white"
                                    value={config.vapi.voiceId || ""}
                                    onChange={e => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, voiceId: e.target.value } }))}
                                >
                                    {(VAPI_VOICES_BY_PROVIDER[config.vapi.voiceProvider?.toLowerCase() || 'vapi'] || VAPI_VOICES_BY_PROVIDER['vapi']).map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Content Language + Translate */}
                            <div className="space-y-1 col-span-2">
                                <label className="text-xs font-bold text-slate-600 uppercase">Content Language</label>
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 p-2 text-sm border rounded bg-white"
                                        value={contentLanguage}
                                        onChange={e => {
                                            const lang = e.target.value;
                                            setContentLanguage(lang);

                                            // Language name → ISO code for transcriber
                                            const LANG_TO_ISO: Record<string, string> = {
                                                'English':'en','Hindi':'hi','Arabic':'ar','Bengali':'bn',
                                                'Chinese':'zh','French':'fr','German':'de','Gujarati':'gu',
                                                'Indonesian':'id','Italian':'it','Japanese':'ja','Kannada':'kn',
                                                'Korean':'ko','Malayalam':'ml','Marathi':'mr','Nepali':'ne',
                                                'Odia':'or','Polish':'pl','Portuguese':'pt','Punjabi':'pa',
                                                'Russian':'ru','Spanish':'es','Swahili':'sw','Tamil':'ta',
                                                'Telugu':'te','Thai':'th','Turkish':'tr','Ukrainian':'uk',
                                                'Urdu':'ur','Vietnamese':'vi',
                                            };
                                            const isoCode = LANG_TO_ISO[lang] || 'en';

                                            // Always sync transcriber language with content language
                                            const currentProvider = (config.vapi.voiceProvider || 'vapi').toLowerCase();
                                            setConfig(prev => ({
                                                ...prev,
                                                vapi: {
                                                    ...prev.vapi,
                                                    transcriber: {
                                                        ...prev.vapi.transcriber,
                                                        language: isoCode,
                                                    },
                                                    // Auto-switch voice for Hindi
                                                    ...(lang === 'Hindi' && currentProvider === 'vapi' ? { voiceProvider: 'vapi', voiceId: 'Rohan' } : {}),
                                                    ...(lang === 'Hindi' && currentProvider === 'azure' ? { voiceId: 'hi-IN-SwaraNeural' } : {}),
                                                }
                                            }));

                                            if (lang !== 'English') handleTranslateContent(lang);
                                        }}
                                    >
                                        {[
                                            'English','Hindi','Arabic','Bengali','Chinese','French','German',
                                            'Gujarati','Indonesian','Italian','Japanese','Kannada','Korean',
                                            'Malayalam','Marathi','Nepali','Odia','Polish','Portuguese',
                                            'Punjabi','Russian','Spanish','Swahili','Tamil','Telugu',
                                            'Thai','Turkish','Ukrainian','Urdu','Vietnamese'
                                        ].map(lang => (
                                            <option key={lang} value={lang}>{lang}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => handleTranslateContent(contentLanguage)}
                                        disabled={isTranslating || contentLanguage === 'English'}
                                        className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                                    >
                                        {isTranslating ? <><Loader2 className="w-4 h-4 animate-spin" /> Translating...</> : 'Translate Content'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const template = getTemplateByIndustry(config.metadata.industry);
                                            if (template) {
                                                setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, systemPrompt: template.systemPrompt, firstMessage: template.firstMessage } }));
                                            }
                                            setContentLanguage('English');
                                        }}
                                        disabled={isTranslating}
                                        className="px-4 py-2 text-sm font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                        title="Reset system prompt and first message back to English template"
                                    >
                                        Reset to English
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400">Auto-translates the first message when you select a language. Click "Reset to English" if the system prompt gets into a non-English state.</p>
                            </div>

                            {/* Voice Model Selection (Conditional for ElevenLabs) */}
                            {config.vapi.voiceProvider?.toLowerCase() === 'elevenlabs' && (
                                <div className="space-y-1 col-span-2">
                                    <label className="text-xs font-bold text-slate-600 uppercase">Voice Model</label>
                                    <select
                                        className="w-full p-2 text-sm border rounded bg-white"
                                        value={config.vapi.voiceModel || "eleven_turbo_v2_5"}
                                        onChange={e => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, voiceModel: e.target.value } }))}
                                    >
                                        {(VAPI_VOICE_MODELS['elevenlabs'] || []).map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border rounded-lg grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600">User Name</label>
                                <input
                                    className="w-full p-2 text-sm border border-slate-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                                    placeholder="Optional"
                                    value={config.vapi.transcriber?.userName || ''}
                                    onChange={e => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, transcriber: { ...prev.vapi.transcriber, userName: e.target.value } } }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600">User Email</label>
                                <input
                                    className="w-full p-2 text-sm border border-slate-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                                    placeholder="Optional"
                                    value={config.vapi.transcriber?.userEmail || ''}
                                    onChange={e => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, transcriber: { ...prev.vapi.transcriber, userEmail: e.target.value } } }))}
                                />
                            </div>
                            <div className="space-y-1 col-span-2">
                                <label className="text-xs font-bold text-slate-600">User Phone</label>
                                <div className="flex gap-2">
                                    <input
                                        className="w-full p-2 text-sm border border-slate-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                                        placeholder="Optional (e.g. +1234567890)"
                                        value={config.vapi.transcriber?.userPhone || ''}
                                        onChange={e => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, transcriber: { ...prev.vapi.transcriber, userPhone: e.target.value } } }))}
                                    />
                                    {vapiAssistantId && (
                                        <button
                                            onClick={handleTriggerCall}
                                            disabled={isCalling}
                                            className="px-3 py-1 bg-brand-500 text-white rounded text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2 whitespace-nowrap"
                                        >
                                            {isCalling ? <Loader2 className="w-3 h-3 animate-spin" /> : <PhoneCall className="w-3 h-3" />}
                                            Test Call
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">System Prompt</label>
                            <textarea className="w-full p-2 border rounded h-64 font-mono text-sm"
                                value={config.vapi.systemPrompt} onChange={e => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, systemPrompt: e.target.value } }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">First Message</label>
                                <textarea className="w-full p-2 border rounded text-sm h-20" value={config.vapi.firstMessage} onChange={e => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, firstMessage: e.target.value } }))} />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase text-slate-500">Knowledge Base</label>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 uppercase tracking-wider"
                                    >
                                        <Upload className="w-3 h-3" />
                                        Upload Text/Docs
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept=".txt,.md,.doc,.docx"
                                        className="hidden"
                                    />
                                </div>
                                <textarea className="w-full p-2 border rounded text-xs font-mono h-20" value={config.vapi.knowledgeBase} onChange={e => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, knowledgeBase: e.target.value } }))} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section J: Calendar & Bookings */}
                <section id="calendar" className="space-y-6 scroll-mt-24 pb-12">
                    <div className="border-b border-slate-200 pb-4">
                        <h2 className="text-2xl font-bold text-slate-800">Section J: Calendar & Bookings</h2>
                        <p className="text-slate-500">Book meetings and send automated email invitations directly.</p>
                    </div>
                    <CalendarView />
                </section>

                {/* Section K: Plan & Billing */}
                <section id="billing" className="space-y-6 scroll-mt-24 pb-12">
                    <div className="border-b border-slate-200 pb-4">
                        <h2 className="text-2xl font-bold text-slate-800">Section K: Plan & Billing</h2>
                        <p className="text-slate-500">Manage your organization's subscription and usage.</p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${plan === 'PRO' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {plan} PLAN
                                </span>
                                {plan === 'BASIC' && <span className="text-sm text-slate-400">Limited to 1 Agent</span>}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">
                                {plan === 'PRO' ? 'Professional Organization' : 'Starter Account'}
                            </h3>
                            <p className="text-sm text-slate-500 max-w-sm">
                                {plan === 'PRO'
                                    ? 'You have unlimited agents, custom branding, and professional support.'
                                    : 'Upgrade to Professional for unlimited agents, advanced analytics, and custom branding persistence.'}
                            </p>
                        </div>
                        {plan === 'BASIC' && (
                            <button
                                onClick={handleUpgrade}
                                disabled={isBillingLoading}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70"
                            >
                                {isBillingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                                Upgrade to Pro
                            </button>
                        )}
                        {plan === 'PRO' && (
                            <div className="flex flex-col items-end gap-3">
                                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                    <Check className="w-6 h-6" />
                                    Active
                                </div>
                                <button
                                    onClick={handleManageSubscription}
                                    disabled={isBillingLoading}
                                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2 text-sm"
                                >
                                    {isBillingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
                                    Manage Subscription
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Sticky Action Footer */}
                {!isLocked && (
                    <div className="fixed bottom-0 left-64 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-200 flex items-center justify-between z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${isValid ? 'bg-emerald-500' : 'bg-red-500'}`} />
                             <span className="text-sm font-medium text-slate-600">
                                {isValid
                                    ? 'Configuration complete and ready for deployment.'
                                    : !hasBeenGenerated
                                        ? 'Please search for a business to generate the initial configuration.'
                                        : 'Please complete all required fields (highlighted in red) to proceed.'}
                            </span>
                        </div>
                        <button
                            onClick={handleLock}
                            disabled={!isValid || isSaving}
                            className={`flex items-center gap-3 px-12 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl ${isValid
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105 active:scale-95 shadow-emerald-500/25'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
                            {isSaving ? 'Validating...' : 'Validate and Lock Configuration'}
                        </button>
                    </div>
                )}
            </main>
        </div >
    );
}
