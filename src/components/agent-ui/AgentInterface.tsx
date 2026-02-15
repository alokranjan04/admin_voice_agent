'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import InfoPanel from '@/components/agent-ui/InfoPanel';
import LiveVisualizer from '@/components/agent-ui/LiveVisualizer';
import AdminSettings from '@/components/agent-ui/AdminSettings';
import ChatWidget from '@/components/agent-ui/ChatWidget';
import ErrorBoundary from '@/components/agent-ui/ErrorBoundary';
// import { WelcomeForm } from '@/components/agent-ui/WelcomeForm'; // Not used in rendered JSX? functionality seems embedded or missing usage in App.tsx excerpt? 
// Ah, App.tsx line 7 imported it, line 60 used state showWelcomeForm, but line 273 handleWelcomeFormSubmit defined.
// The JSX was NOT in the previous view's snippet for WelcomeForm rendering? 
// Wait, looking at App.tsx again. 
// It has `showWelcomeForm` state. 
// But I don't see `<WelcomeForm />` in the JSX returned in the previous view.
// It might be inside `ChatWidget` or just missing from my view? 
// Line 337 says: "ChatWidget now handles the welcome form internally" for widget mode.
// For non-widget mode? 
// I'll keep the import if I find where it's used. 
// Let's assume it might be needed, or I'll check if I missed lines.
// Actually, `App.tsx` lines 351-540 don't show `WelcomeForm` usage. 
// Maybe it was removed? 
// I'll import it just in case, but comment it out if unused.

import { voiceService, LogEntry } from '@/services/agent-ui/vapiService';
import { calendarService } from '@/services/agent-ui/calendarService';
import { firebaseService } from '@/services/agent-ui/firebaseService';
import { formatMessage, renderFormattedMessage } from '@/utils/agent-ui/messageFormatter';
import { Mic, MicOff, AlertCircle, Phone, Terminal, User, Bot, Info, Settings, ShieldCheck, CheckCircle2, Globe, KeyRound, ChevronDown } from 'lucide-react';
import { DEFAULT_BUSINESS_CONFIG } from '@/lib/agent-ui/constants';
import { BusinessConfig } from '@/types/agent-ui/types';

// Fallback Keys
const FALLBACK_GOOGLE_CLIENT_ID = "";

// Helper to get env vars safely
const getEnvVar = (key: string, fallback?: string) => {
    // try process.env.NEXT_PUBLIC_ first
    const nextKey = key.startsWith('VITE_') ? key.replace('VITE_', 'NEXT_PUBLIC_') : key;
    if (typeof process !== 'undefined' && process.env[nextKey]) {
        return process.env[nextKey];
    }
    // fallback to original key if defined (rare in nextjs public)
    if (typeof process !== 'undefined' && process.env[key]) {
        return process.env[key];
    }
    return fallback || '';
};

// NotFound Component
const NotFoundState: React.FC = () => (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
        <div className="text-center px-4">
            <h1 className="text-6xl font-bold text-white mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-indigo-200 mb-4">Agent Not Found</h2>
            <p className="text-indigo-300 mb-2">
                Please provide a valid organization and agent ID.
            </p>
        </div>
    </div>
);

interface AgentInterfaceProps {
    initialOrgId?: string;
    initialAgentId?: string;
}

const AgentInterface: React.FC<AgentInterfaceProps> = ({ initialOrgId, initialAgentId }) => {
    const searchParams = useSearchParams();
    const router = useRouter(); // For programmatic navigation if needed

    // Derived state from props or search params
    // In Next.js App Router, we should use props for dynamic routes, but check search params for fallbacks/overrides
    // Actually, logic in App.tsx was: path segments OR query params.

    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [volume, setVolume] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [isCalendarAuth, setIsCalendarAuth] = useState(false);
    const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    const [config, setConfig] = useState<BusinessConfig>(DEFAULT_BUSINESS_CONFIG);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showLogs, setShowLogs] = useState(false); // Default false for simplicity, will update in useEffect
    const [isWidget, setIsWidget] = useState(false);

    // getEnvVar
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || FALLBACK_GOOGLE_CLIENT_ID;
    const vapiKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.VITE_VAPI_PUBLIC_KEY;

    useEffect(() => {
        // Initial setup
        setShowLogs(window.innerHeight > 850);

        let bridgeToken = "";

        // Widget Mode Check
        const mode = searchParams?.get('mode');
        const widgetParam = searchParams?.get('widget');

        if (mode === 'widget' || widgetParam === 'true') {
            setIsWidget(true);
            document.body.style.backgroundColor = 'transparent'; // This might affect other pages if not cleaned up? 
            // In Next.js, we should be careful modifying body directly. 
            // But for this page, it might be fine. 
        } else {
            setIsWidget(false);
            // document.body.style.backgroundColor = '#f8fafc'; // Default
        }

        // Tenant Context
        const orgId = initialOrgId || searchParams?.get('orgId');
        const agentId = initialAgentId || searchParams?.get('agentId');

        if (orgId && agentId) {
            localStorage.setItem('tenant_org_id', orgId);
            localStorage.setItem('tenant_agent_id', agentId);
            setLogs(prev => [...prev, {
                type: 'system',
                text: `[AUTH] Tenant Context Locked: ${orgId}/${agentId}`,
                timestamp: new Date()
            }]);
        } else {
            const cachedOrgId = localStorage.getItem('tenant_org_id');
            const cachedAgentId = localStorage.getItem('tenant_agent_id');
            if (cachedOrgId && cachedAgentId) {
                setLogs(prev => [...prev, {
                    type: 'system',
                    text: `[AUTH] Recovered Tenant Context: ${cachedOrgId}/${cachedAgentId}`,
                    timestamp: new Date()
                }]);
            }
        }

        // Auth Strategy
        bridgeToken = searchParams?.get('token') || searchParams?.get('authtoken') || "";
        // Hash params handling in Next.js? window.location.hash works on client.
        if (typeof window !== 'undefined' && window.location.hash) {
            const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
            if (!bridgeToken) bridgeToken = hashParams.get('token') || "";
        }

        if (bridgeToken) {
            setLogs(prev => [...prev, { type: 'system', text: `[AUTH] Bridge token detected.`, timestamp: new Date() }]);
            sessionStorage.setItem('voice_agent_auth_token', bridgeToken);

            // Clean URL? In Next.js we use router.replace
            // const params = new URLSearchParams(searchParams.toString());
            // params.delete('token');
            // router.replace(...)
        } else {
            const storedToken = sessionStorage.getItem('voice_agent_auth_token');
            if (storedToken) {
                bridgeToken = storedToken;
                setLogs(prev => [...prev, { type: 'system', text: `[AUTH] Restored session from local storage.`, timestamp: new Date() }]);
            }
        }

        // Verify Token
        if (bridgeToken) {
            // CRITICAL FIX: Distinguish between JWT (App Auth) and Opaque (Calendar Auth)
            // Google OAuth tokens do NOT start with 'ey'. If it's a JWT, it's for the App, not Calendar.
            const isJwt = bridgeToken.startsWith('ey');

            if (isJwt) {
                setLogs(prev => [...prev, { type: 'system', text: `[AUTH] App Session Token detected (JWT). Not using for Calendar.`, timestamp: new Date() }]);
                // Do NOT set manual token for calendarService if it's a JWT
            } else {
                calendarService.setManualToken(bridgeToken).then(profile => {
                    setIsCalendarAuth(true);
                    setConnectedEmail(profile.email);

                    if (profile.email === 'linked-account@google.com') {
                        setLogs(prev => [...prev, { type: 'system', text: `[AUTH] Connected (Profile Scope Restricted).`, timestamp: new Date() }]);
                    } else {
                        setLogs(prev => [...prev, { type: 'system', text: `[AUTH] Session Active: ${profile.email}`, timestamp: new Date() }]);
                    }
                }).catch(err => {
                    console.error("Critical Auth Error", err);
                    setLogs(prev => [...prev, { type: 'system', text: `[AUTH] Error: ${err.message}`, timestamp: new Date() }]);
                    sessionStorage.removeItem('voice_agent_auth_token');
                });
            }
        }

        // Initialize Google Auth (Client-side)
        // CRITICAL FIX: Always initialize if we have a client ID, unless we specifically have a VALID Calendar token (non-JWT)
        const hasValidCalendarToken = bridgeToken && !bridgeToken.startsWith('ey');

        if (googleClientId && !hasValidCalendarToken) {
            calendarService.initializeGoogleAuth(
                googleClientId,
                async (email, tokens) => {
                    setIsCalendarAuth(true);
                    setConnectedEmail(email);
                    setError(null);
                    setAuthError(null);
                    setLogs(prev => [...prev, { type: 'system', text: `Google Workspace connected as ${email}`, timestamp: new Date() }]);

                    // PERSIST TOKENS TO FIREBASE
                    // We use the token from the callback (which comes from backend) or fallback to service memory
                    const accessToken = tokens?.access_token || calendarService.getAccessToken();
                    const refreshToken = tokens?.refresh_token;

                    if (accessToken) {
                        try {
                            const newConfig: BusinessConfig = {
                                ...config,
                                integrations: {
                                    ...config.integrations,
                                    googleCalendar: {
                                        isConnected: true,
                                        accessToken: accessToken,
                                        refreshToken: refreshToken, // CRITICAL: Save Refresh Token for Backend Webhook
                                        connectedEmail: email
                                    }
                                }
                            };
                            setConfig(newConfig);
                            await firebaseService.saveAgentConfig(newConfig);
                            setLogs(prev => [...prev, { type: 'system', text: `[AUTH] Tokens saved to database (Access + Refresh).`, timestamp: new Date() }]);

                            if (!refreshToken) {
                                alert("Warning: No Refresh Token received. The agent may disconnect after 1 hour. Please revoke access and try again.");
                            }

                        } catch (e) {
                            console.error("Failed to save token", e);
                        }
                    }
                },
                (err) => {
                    // silent fail
                }
            );
        }

        // Firebase Config
        const unsubscribeConfig = firebaseService.subscribeToLatestConfig(async (remoteConfig, source) => {
            const sourceTag = source === 'tenant' ? '[TENANT]' : '[GLOBAL-LATEST]';
            setLogs(prev => [...prev, {
                type: 'system',
                text: `${sourceTag} Configuration active: ${remoteConfig.metadata.businessName}`,
                timestamp: new Date()
            }]);

            setConfig(remoteConfig);
            setIsLoadingConfig(false);

            // Sync Floating Widget Preference
            if (remoteConfig.vapi?.showFloatingWidget === false) {
                localStorage.setItem('hide_floating_widget', 'true');
                // iframe handling if embedded? 
            } else {
                localStorage.removeItem('hide_floating_widget');
            }

            // Auto-load persisted calendar token
            if (!calendarService.isAuthenticated()) {
                const calIntegration = remoteConfig.integrations?.googleCalendar;
                if (calIntegration?.accessToken) {
                    // ... same logic as App.tsx
                    try {
                        const token = calIntegration.accessToken;
                        const profile = await calendarService.setManualToken(token);
                        setIsCalendarAuth(true);
                        setConnectedEmail(profile.email);
                        setLogs(prev => [...prev, { type: 'system', text: `[AUTH] Database Synced (${profile.email})`, timestamp: new Date() }]);
                    } catch (e: any) {
                        setLogs(prev => [...prev, { type: 'system', text: `[AUTH SYNC FAIL] ${e.message}`, timestamp: new Date() }]);
                    }
                } else {
                    // Log Guest Mode
                }
            }
        });

        // Service Updates
        voiceService.onStatusChange = (newStatus) => setStatus(newStatus);
        voiceService.onVolumeChange = (vol) => setVolume(vol);
        voiceService.onLog = (entry) => setLogs(prev => [...prev, entry]);

        return () => {
            unsubscribeConfig();
            voiceService.disconnect();
        };

    }, [initialOrgId, initialAgentId, searchParams, googleClientId]);

    // Title effect
    useEffect(() => {
        if (config.metadata?.businessName) {
            document.title = `${config.metadata.businessName} Voice Agent`;
        }
    }, [config]);

    // Auto-scroll imports
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Handlers
    const handleToggleConnection = async () => {
        if (status === 'connected' || status === 'connecting') {
            voiceService.disconnect();
        } else {
            setError(null);
            setLogs([]);
            if (!vapiKey) {
                setError('API Key is missing (NEXT_PUBLIC_VAPI_PUBLIC_KEY).');
                return;
            }
            await voiceService.connect(config);
        }
    };

    const handleCalendarAuth = () => {
        if (!googleClientId) {
            setError("Google Client ID is missing.");
            return;
        }
        calendarService.requestAccess();
    };

    // Renders
    if (isLoadingConfig) {
        return (
            <div className={`flex h-screen w-full items-center justify-center ${isWidget ? 'bg-transparent' : 'bg-slate-50'} text-slate-500`}>
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                <span>Loading Agent Configuration...</span>
            </div>
        );
    }

    // Check missing ids
    if (!isWidget) {
        // check localStorage if not provided in props? 
        // Logic in App.tsx used localStorage as fallback
        const currentOrgId = initialOrgId || (typeof window !== 'undefined' ? localStorage.getItem('tenant_org_id') : null);
        const currentAgentId = initialAgentId || (typeof window !== 'undefined' ? localStorage.getItem('tenant_agent_id') : null);

        if (!currentOrgId || !currentAgentId) {
            return <NotFoundState />;
        }
    }

    if (isWidget) {
        return (
            <div className="h-screen w-full bg-transparent overflow-hidden pointer-events-none">
                <ChatWidget
                    config={config}
                    status={status}
                    volume={volume}
                    logs={logs}
                    onToggleCall={handleToggleConnection}
                />
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className={`flex h-screen w-full ${isWidget ? 'bg-transparent' : 'bg-slate-100'} overflow-hidden`}>
                <AdminSettings
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    isCalendarAuth={isCalendarAuth}
                    connectedEmail={connectedEmail}
                    onConnectCalendar={handleCalendarAuth}
                    authError={authError}
                    googleClientId={googleClientId}
                />

                {/* Left Sidebar: Business Information */}
                {!isWidget && (
                    <div className="w-1/4 min-w-[300px] max-w-[400px] h-full hidden lg:block border-r border-slate-200">
                        <InfoPanel config={config} connectedEmail={connectedEmail} />
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 flex flex-col h-full relative min-w-0">
                    {/* Header */}
                    {!isWidget && (
                        <header className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Live Agent Interface</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                    <span className="text-xs text-slate-500 uppercase font-semibold tracking-wide">
                                        {status === 'connected' ? 'System Online' : 'System Offline'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Status Badge */}
                                <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-xs font-medium ${isCalendarAuth ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                                    {isCalendarAuth ? (
                                        <>
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {connectedEmail === 'linked-account@google.com' ? 'Linked Account' : connectedEmail}
                                        </>
                                    ) : (
                                        <>
                                            <Globe className="w-3.5 h-3.5" />
                                            Guest Mode (Request Only)
                                        </>
                                    )}
                                </div>

                                {/* Settings Button */}
                                <button
                                    onClick={() => setShowSettings(true)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
                                    title="Admin Settings"
                                >
                                    <Settings className="w-5 h-5" />
                                    {!isCalendarAuth && (
                                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
                                    )}
                                </button>
                            </div>
                        </header>
                    )}

                    {/* Main Visualizer Area */}
                    <main className={`flex-1 flex flex-col items-center justify-center p-4 sm:p-6 ${isWidget ? 'bg-transparent' : 'bg-slate-50/50'} overflow-y-auto min-h-0`}>
                        <div className="w-full max-w-2xl">
                            <div className={`${!isWidget ? 'bg-slate-50 rounded-2xl border border-slate-200 shadow-inner' : ''}`}>
                                <LiveVisualizer volume={volume} isActive={status === 'connected'} />
                            </div>

                            {/* Controls */}
                            <div className="mt-8 flex flex-col items-center gap-4 w-full">

                                <button
                                    onClick={handleToggleConnection}
                                    disabled={status === 'connecting'}
                                    className={`
                                flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 min-w-[200px]
                                ${status === 'connected'
                                            ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200'
                                            : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-200'}
                                ${status === 'connecting' ? 'opacity-75 cursor-wait' : ''}
                            `}
                                >
                                    {status === 'connected' ? (
                                        <>
                                            <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
                                            End Session
                                        </>
                                    ) : status === 'connecting' ? (
                                        <>
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <Phone className="w-5 h-5 sm:w-6 sm:h-6" />
                                            Start Call
                                        </>
                                    )}
                                </button>

                                {error && (
                                    <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-2 rounded-md text-sm mt-4 border border-rose-100">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                {!isWidget && (
                                    <p className="text-slate-400 text-sm mt-2 max-w-md text-center">
                                        {status === 'connected'
                                            ? "Listening... Speak naturally to the agent."
                                            : "Click 'Start Call' to initialize the Voice AI Agent (Powered by Gemini)."}
                                    </p>
                                )}

                                {!isCalendarAuth && !isWidget && (
                                    <div className="mt-2 text-center">
                                        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded border border-amber-100 inline-flex items-center gap-2">
                                            <KeyRound className="w-3 h-3" />
                                            Guest Mode Active. Launch from your Admin Dashboard or use Settings to authenticate.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>

                    {/* Bottom Log / Debug Panel */}
                    {!isWidget && (
                        <div className={`bg-slate-900 text-slate-300 ${showLogs ? 'h-40 sm:h-56' : 'h-9'} border-t border-slate-700 flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden`}>
                            <div
                                className="px-4 py-1.5 flex items-center justify-between gap-2 text-slate-400 border-b border-slate-800 bg-slate-900/50 cursor-pointer hover:bg-slate-800 transition-colors"
                                onClick={() => setShowLogs(!showLogs)}
                            >
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-teal-500" />
                                    <span className="font-semibold text-[10px] sm:text-xs uppercase tracking-wider">Live Transcript & Logs</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {showLogs && <span className="text-[10px] text-slate-500 hidden sm:inline">Click to collapse</span>}
                                    <button className="p-1 hover:text-white transition-colors">
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showLogs ? 'rotate-0' : 'rotate-180'}`} />
                                    </button>
                                </div>
                            </div>
                            {showLogs && (
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[10px] sm:text-xs">
                                    <div className="flex gap-2 opacity-50">
                                        <span className="text-teal-500">[INIT]</span>
                                        <span>Configuration loaded for {config.metadata.businessName}</span>
                                    </div>

                                    {logs.map((log, index) => (
                                        <div key={index} className={`flex gap-3 ${log.type === 'user' ? 'text-blue-300' : log.type === 'model' ? 'text-green-300' : 'text-slate-500'}`}>
                                            <div className="min-w-[60px] text-slate-600 select-none">
                                                {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </div>
                                            <div className="flex-shrink-0 mt-0.5">
                                                {log.type === 'user' ? <User className="w-3 h-3" /> : log.type === 'model' ? <Bot className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                                            </div>
                                            <div className="break-words w-full">
                                                <span className={`font-bold mr-2 uppercase text-[10px] tracking-wider ${log.type === 'user' ? 'text-blue-500' : log.type === 'model' ? 'text-green-500' : 'text-slate-500'
                                                    }`}>
                                                    {log.type === 'model' ? 'Agent' : log.type}
                                                </span>
                                                {log.type === 'model' ? (
                                                    <div className="inline-block">
                                                        {renderFormattedMessage(formatMessage(log.text))}
                                                    </div>
                                                ) : (
                                                    log.text
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={logsEndRef} />
                                </div>
                            )}
                        </div>
                    )}
                    {!isWidget && config.vapi?.showFloatingWidget !== false && (
                        <ChatWidget
                            config={config}
                            status={status}
                            volume={volume}
                            logs={logs}
                            onToggleCall={handleToggleConnection}
                        />
                    )}
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default AgentInterface;
