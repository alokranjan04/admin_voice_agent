"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { LoginScreen } from '../components/LoginScreen';
import { generateConfigFromDescription } from '../services/geminiService';
import { saveConfiguration, auth, loginWithGoogle, logoutUser, getOrgId, getBranding, saveBranding } from '../services/firebase';
import { createVapiAssistant } from '../services/vapiService';
import { researchBusiness } from '../services/researchService';
import { getTemplateByIndustry } from '../services/templateService';
import { AgentConfiguration, INITIAL_CONFIG, DeliveryModeType, SUPPORTED_INDUSTRIES, BrandingConfig, DEFAULT_BRANDING } from '../types';
import { Wand2, Plus, Trash2, Loader2, AlertCircle, Copy, Check, Database, Calendar, Rocket, Braces, Search, Upload, Palette, Image as ImageIcon, Phone, PhoneCall, Link } from 'lucide-react';
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

const VAPI_MODELS: { [provider: string]: string[] } = {
    'openai': ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o-realtime-preview', 'gpt-4o-mini-realtime-preview'],
    'google': ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
    'groq': ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    'anthropic': ['claude-3-5-sonnet-20240620', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
    'deepseek': ['deepseek-chat', 'deepseek-coder'],
    'mistral': ['mistral-large-latest', 'mistral-small-latest', 'pixtral-12b-2409'],
    'perplexity-ai': ['llama-3-sonar-large-32k-online', 'llama-3-sonar-small-32k-online'],
    'xai': ['grok-beta'],
    'together-ai': ['meta-llama/Llama-3-70b-chat-hf', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
};

const VAPI_VOICE_PROVIDERS = [
    { id: 'vapi', name: 'Vapi' },
    { id: 'elevenlabs', name: 'ElevenLabs' },
    { id: 'playht', name: 'PlayHT' },
    { id: 'rime', name: 'Rime' },
    { id: 'azure', name: 'Azure' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'deepgram', name: 'Deepgram' },
    { id: 'cartesia', name: 'Cartesia' },
    { id: 'lmnt', name: 'LMNT' },
    { id: 'neets', name: 'Neets' }
];

const VAPI_TRANSCRIBER_PROVIDERS = [
    { id: 'deepgram', name: 'Deepgram' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'gladia', name: 'Gladia' },
    { id: 'azure', name: 'Azure' },
    { id: 'talkscriber', name: 'Talkscriber' }
];

const VAPI_TRANSCRIBER_MODELS: Record<string, string[]> = {
    'openai': ['whisper-1', 'gpt-4o-mini-transcribe'],
    'deepgram': ['nova-2', 'nova-2-medical', 'nova-2-meeting', 'nova-2-phonecall', 'nova-2-voicemail'],
    'azure': ['standard'],
    'gladia': ['standard'],
    'talkscriber': ['whisper']
};

const VAPI_VOICES_BY_PROVIDER: Record<string, { id: string, name: string }[]> = {
    'vapi': [
        { id: 'Mia', name: 'Mia' },
        { id: 'Leah', name: 'Leah' },
        { id: 'Zac', name: 'Zac' },
        { id: 'Jess', name: 'Jess' },
        { id: 'Tara', name: 'Tara' },
        { id: 'Dan', name: 'Dan' },
        { id: 'Zoe', name: 'Zoe' },
        { id: 'Leo', name: 'Leo' },
        { id: 'Savannah', name: 'Savannah' },
        { id: 'Rohan', name: 'Rohan' },
        { id: 'Elliot', name: 'Elliot' },
        { id: 'Andrew', name: 'Andrew' },
        { id: 'Lily', name: 'Lily' },
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
    'elevenlabs': [
        { id: 'pNInz6ovunSMqEisjW85', name: 'Rachel' },
        { id: 'Lcf7I4mD7T99S0x82oBy', name: 'Josh' },
        { id: 'VR6AewrXVre97E4pNM8C', name: 'Drew' },
        { id: 'MF3mGyEYCl7XYW7Y904z', name: 'Marcus' },
        { id: 'kPzsL2i3sdVqBn97W7oBy', name: 'Charlotte' },
    ]
};

const VAPI_LANGUAGES = [
    { id: 'en', name: 'English' },
    { id: 'en-US', name: 'English (US)' },
    { id: 'en-GB', name: 'English (UK)' },
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
    const [isLocked, setIsLocked] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isResearching, setIsResearching] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [agents, setAgents] = useState<any[]>([]);
    const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
    const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
    const [isBrandingLoading, setIsBrandingLoading] = useState(false);
    const [plan, setPlan] = useState<'BASIC' | 'PRO'>('BASIC');
    const [isBillingLoading, setIsBillingLoading] = useState(false);
    const [isCalling, setIsCalling] = useState(false);
    const [vapiAssistantId, setVapiAssistantId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            const { getOrgData } = await import('../services/firebase');
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
            await saveBranding(branding);
            alert("Branding settings saved for your organization!");
        } catch (error: any) {
            alert("Error saving branding: " + error.message);
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
                        userName: currentUser.displayName || '',
                        userEmail: currentUser.email || ''
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
            const { getAgents } = await import('../services/firebase');
            const list = await getAgents();
            setAgents(list);
        } catch (error) {
            console.error("Failed to load agents", error);
        }
    };

    const selectAgent = async (agentId: string) => {
        try {
            const { getAgentConfig } = await import('../services/firebase');
            const loadedConfig = await getAgentConfig(agentId);
            if (loadedConfig) {
                setConfig(loadedConfig);
                setActiveAgentId(agentId);
                setIsLocked(true);
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
        config.metadata.businessName.length > 0 &&
        config.services.length > 0 &&
        config.locations.length > 0 &&
        !!config.vapi.userName &&
        !!config.vapi.userEmail &&
        !!config.vapi.userPhone;

    const handleLaunchClient = async () => {
        const orgId = user ? getOrgId(user) : 'anonymous_org';
        const safeName = config.metadata.businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const agentId = activeAgentId || `agent_${safeName}`;
        const clientBaseUrl = config.vapi.clientUrl || 'https://voice-agent-eight-delta.vercel.app';

        if (isDemoMode) {
            const userParams = `&uName=${encodeURIComponent(config.vapi.userName || '')}&uEmail=${encodeURIComponent(config.vapi.userEmail || '')}&uPhone=${encodeURIComponent(config.vapi.userPhone || '')}`;
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
            const userParams = `&uName=${encodeURIComponent(config.vapi.userName || '')}&uEmail=${encodeURIComponent(config.vapi.userEmail || '')}&uPhone=${encodeURIComponent(config.vapi.userPhone || '')}`;
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
                vapi: { ...prev.vapi, ...(generated.vapi || {}) }
            }));
        } catch (error: any) {
            console.error("AI Generation failed", error);
            const message = error.message || "Unknown error";
            alert("AI Assistant Error: " + message);
        } finally {
            setIsGenerating(false);
        }
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
        if (!config.vapi.userPhone || !vapiAssistantId) {
            alert("Assistant ID and User Phone Number are required.");
            return;
        }

        setIsCalling(true);
        try {
            const response = await fetch('/api/vapi/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber: config.vapi.userPhone,
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
                    priceId: 'price_1Qv3W..._test', // Replace with actual Stripe Price ID
                    successUrl: window.location.origin + '?session_id={CHECKOUT_SESSION_ID}',
                    cancelUrl: window.location.origin,
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

                    {/* Unique Agent Link Display */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Link className="w-5 h-5 text-indigo-400" />
                            <h3 className="text-lg font-bold text-white">Your Unique Agent Link</h3>
                        </div>
                        <p className="text-slate-400 text-sm">
                            Share this unique link with your customers. Each agent has its own dedicated URL.
                        </p>
                        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-600 rounded-lg p-3">
                            <code className="flex-1 text-emerald-400 font-mono text-sm break-all">
                                {(() => {
                                    const orgId = user ? getOrgId(user) : 'anonymous_org';
                                    const safeName = config.metadata.businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                                    const agentId = activeAgentId || `agent_${safeName}`;
                                    const clientBaseUrl = config.vapi.clientUrl || 'https://voice-agent-eight-delta.vercel.app';
                                    return `${clientBaseUrl}?orgId=${orgId}&agentId=${agentId}`;
                                })()}
                            </code>
                            <button
                                onClick={() => {
                                    const orgId = user ? getOrgId(user) : 'anonymous_org';
                                    const safeName = config.metadata.businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
                                    const agentId = activeAgentId || `agent_${safeName}`;
                                    const clientBaseUrl = config.vapi.clientUrl || 'https://voice-agent-eight-delta.vercel.app';
                                    const url = `${clientBaseUrl}?orgId=${orgId}&agentId=${agentId}`;
                                    navigator.clipboard.writeText(url);
                                    setCopySuccess(true);
                                    setTimeout(() => setCopySuccess(false), 2000);
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                            >
                                {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copySuccess ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 italic">
                            ⚠️ The base URL without orgId and agentId will not work. Each agent requires its unique parameters.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                        {config.vapi.userPhone && vapiAssistantId && (
                            <button
                                onClick={handleTriggerCall}
                                disabled={isCalling}
                                className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl flex items-center gap-3 shadow-lg shadow-brand-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-70"
                            >
                                {isCalling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Phone className="w-5 h-5" />}
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
                        <div className="p-4 bg-slate-50 border rounded-lg grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600">User Name</label>
                                <input className="w-full p-2 text-sm border rounded" value={config.vapi.userName || ''} onChange={e => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, userName: e.target.value } }))} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600">User Email</label>
                                <input className="w-full p-2 text-sm border rounded" value={config.vapi.userEmail || ''} onChange={e => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, userEmail: e.target.value } }))} />
                            </div>
                            <div className="space-y-1 col-span-2">
                                <label className="text-xs font-bold text-slate-600">User Phone</label>
                                <div className="flex gap-2">
                                    <input className="w-full p-2 text-sm border rounded" value={config.vapi.userPhone || ''} onChange={e => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, userPhone: e.target.value } }))} />
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
                                <label className="text-xs font-bold uppercase text-slate-500">Knowledge Base</label>
                                <textarea className="w-full p-2 border rounded text-xs font-mono h-20" value={config.vapi.knowledgeBase} onChange={e => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, knowledgeBase: e.target.value } }))} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section K: Plan & Billing */}
                <section id="billing" className="space-y-6 scroll-mt-24 pb-20">
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
                            <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                <Check className="w-6 h-6" />
                                Active
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
