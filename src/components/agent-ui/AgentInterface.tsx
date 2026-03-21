'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    initialAssistantId?: string;
}

const AgentInterface: React.FC<AgentInterfaceProps> = ({ initialOrgId, initialAgentId, initialAssistantId }) => {
    const searchParams = useSearchParams();
    const router = useRouter(); // For programmatic navigation if needed

    // Derived state from props or search params
    // In Next.js App Router, we should use props for dynamic routes, but check search params for fallbacks/overrides
    // Actually, logic in App.tsx was: path segments OR query params.

    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [error, setError] = useState<string | null>(null);
    const volumeRef = useRef(0);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [isCalendarAuth, setIsCalendarAuth] = useState(false);
    const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    const [config, setConfig] = useState<BusinessConfig>(DEFAULT_BUSINESS_CONFIG);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [isWidget, setIsWidget] = useState(false);

    // getEnvVar
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || FALLBACK_GOOGLE_CLIENT_ID;
    const vapiKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.VITE_VAPI_PUBLIC_KEY;

    useEffect(() => {
        // Initial setup

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
                    setAuthError(undefined);
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

        // Service Updates
        voiceService.onStatusChange = (newStatus) => setStatus(newStatus);
        voiceService.onVolumeChange = (v) => {
            volumeRef.current = v;
        };voiceService.onLog = (entry) => setLogs(prev => [...prev, entry]);

        return () => {
            voiceService.disconnect();
        };

    }, [initialOrgId, initialAgentId, searchParams, googleClientId]);

    const loadLeadConfig = useCallback(async (id: string) => {
        setIsLoadingConfig(true);
        setError(null);
        try {
            console.log(`[AgentInterface] Loading lead config for: ${id}`);
            const leadConfig = await firebaseService.getLeadAgentConfig(id);
            if (leadConfig) {
                console.log(`[AgentInterface] Config loaded: ${leadConfig.metadata.businessName}`);
                setConfig(leadConfig);
                setLogs(prev => [...prev, {
                    type: 'system',
                    text: `[LEAD-DEMO] Demo Configuration active: ${leadConfig.metadata.businessName}`,
                    timestamp: new Date()
                }]);
            } else {
                console.warn(`[AgentInterface] No config found for assistantId: ${id}`);
            }
        } catch (err) {
            console.error("Failed to load lead config:", err);
        } finally {
            setIsLoadingConfig(false);
        }
    }, []);

    useEffect(() => {
        if (initialAssistantId) {
            loadLeadConfig(initialAssistantId);
        } else {
            // Subscribe to regular config
            const unsubscribe = firebaseService.subscribeToLatestConfig(async (remoteConfig, source) => {
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
                } else {
                    localStorage.removeItem('hide_floating_widget');
                }
            });
            return () => unsubscribe();
        }
    }, [initialAssistantId, loadLeadConfig]);

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
    const handleToggleConnection = async (options: { silent?: boolean } = {}) => {
        if (status === 'connected' || status === 'connecting') {
            voiceService.disconnect();
        } else {
            setError(null);
            setLogs([]);
            if (!vapiKey) {
                setError('API Key is missing (NEXT_PUBLIC_VAPI_PUBLIC_KEY).');
                return;
            }
            await voiceService.connect(config, { 
                muteAssistant: options.silent,
                assistantId: initialAssistantId || config.vapi?.assistantId 
            });
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
            <div className="h-screen w-full bg-transparent overflow-hidden">
                <ChatWidget
                    config={config}
                    status={status}
                    volumeRef={volumeRef}
                    logs={logs}
                    onToggleCall={handleToggleConnection}
                />
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className={`flex h-screen w-full ${isWidget ? 'bg-transparent' : 'bg-slate-100'} overflow-hidden font-sans`}>
                <AdminSettings
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    isCalendarAuth={isCalendarAuth}
                    connectedEmail={connectedEmail}
                    onConnectCalendar={handleCalendarAuth}
                    authError={authError}
                    googleClientId={googleClientId}
                    config={config}
                    setConfig={setConfig}
                />

                {/* Left Sidebar: Business Information (Desktop Only) */}
                {!isWidget && (
                    <div className="hidden lg:flex w-80 lg:w-96 flex-col border-r border-slate-200 bg-white shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-10 flex-shrink-0">
                        <InfoPanel config={config} connectedEmail={connectedEmail} />
                    </div>
                )}

                {/* Main Vertical Stack (Content Area + Console) */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-hidden">
                    {/* Top: Main Visualizer Content */}
                    <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
                        {/* Header */}
                        {!isWidget && (
                            <header className="flex-shrink-0 bg-white border-b border-slate-100 px-8 py-5 flex justify-between items-center shadow-sm z-20">
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight truncate">Live Agent Interface</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${status === 'connected' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                            {status === 'connected' ? 'Link Established' : 'System Standby'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 flex-shrink-0">
                                    {/* Status Badge */}
                                    <div className={`hidden sm:flex px-4 py-2 rounded-full border items-center gap-2.5 text-[10px] font-black uppercase tracking-widest ${isCalendarAuth ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
                                        {isCalendarAuth ? (
                                            <>
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span className="truncate max-w-[120px]">{connectedEmail === 'linked-account@google.com' ? 'Linked Account' : connectedEmail}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Globe className="w-3.5 h-3.5" />
                                                Guest Mode
                                            </>
                                        )}
                                    </div>

                                    {/* Settings Button */}
                                    <button
                                        onClick={() => setShowSettings(true)}
                                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md border border-transparent hover:border-indigo-100 relative group"
                                        title="Admin Settings"
                                    >
                                        <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                                        {!isCalendarAuth && (
                                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
                                        )}
                                    </button>
                                </div>
                            </header>
                        )}

                        {/* Main Visualizer Area */}
                        <main className={`flex-1 flex flex-col items-center justify-center p-6 md:p-12 ${isWidget ? 'bg-transparent' : 'bg-transparent'} overflow-y-auto min-h-0 relative`}>
                            {/* Visual background decoration */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none opacity-50" />
                            
                            <div className="w-full max-w-3xl relative z-10 flex flex-col items-center">
                                <div className={`${!isWidget ? 'w-full bg-white/40 backdrop-blur-xl rounded-[40px] border border-white/50 shadow-2xl shadow-indigo-100/20 px-8 py-10' : ''}`}>
                                    <LiveVisualizer volumeRef={volumeRef} isActive={status === 'connected'} />
                                </div>

                                {/* Controls */}
                                <div className="mt-12 flex flex-col items-center gap-6 w-full">
                                    <button
                                        onClick={() => handleToggleConnection()}
                                        disabled={status === 'connecting'}
                                        className={`
                                            flex items-center justify-center gap-4 px-10 py-5 rounded-[24px] font-black text-xl tracking-tight shadow-2xl transition-all transform hover:scale-[1.03] active:scale-95 min-w-[280px]
                                            ${status === 'connected'
                                                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-rose-200 ring-4 ring-rose-500/20'
                                                : 'bg-gradient-to-r from-teal-500 to-indigo-500 text-white shadow-indigo-200 ring-4 ring-indigo-500/10'}
                                            ${status === 'connecting' ? 'opacity-70 cursor-wait animate-pulse' : ''}
                                        `}
                                    >
                                        {status === 'connected' ? (
                                            <>
                                                <MicOff className="w-7 h-7" />
                                                End Conversation
                                            </>
                                        ) : (
                                            <>
                                                <Phone className="w-7 h-7" />
                                                {status === 'connecting' ? 'Synchronizing...' : 'Start Conversation'}
                                            </>
                                        )}
                                    </button>

                                    {error && (
                                        <div className="flex items-center gap-3 text-rose-600 bg-rose-50/80 backdrop-blur-sm px-6 py-3 rounded-2xl text-sm font-bold border border-rose-100 shadow-sm animate-bounce">
                                            <AlertCircle className="w-5 h-5" />
                                            {error}
                                        </div>
                                    )}

                                    {!isWidget && (
                                        <div className="space-y-4 text-center">
                                            <p className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-[0.3em] opacity-60">
                                                {status === 'connected'
                                                    ? "Agent Listening... Speak naturally"
                                                    : "Audio Interface Standby"}
                                            </p>
                                            
                                            {!isCalendarAuth && (
                                                <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-amber-50 rounded-2xl border border-amber-100/50 shadow-sm">
                                                    <KeyRound className="w-4 h-4 text-amber-500" />
                                                    <span className="text-[10px] text-amber-700 font-bold uppercase tracking-widest">Guest Session Active</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </main>
                    </div>

                    {/* Bottom Console Panel */}
                    <div className="bg-slate-950 text-slate-300 h-64 md:h-80 border-t border-white/5 flex flex-col flex-shrink-0 relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
                        <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-slate-900/40 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                                    <Terminal className="w-4 h-4 text-teal-400" />
                                </div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">System Dynamics & Logs</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Live Stream</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 font-mono text-[11px] md:text-xs">
                            <div className="flex gap-4 opacity-40 italic">
                                <span className="text-teal-500 font-black tracking-widest">[BOOT]</span>
                                <span>Platform kernel active. Configuration '{config.metadata.businessName}' engaged.</span>
                            </div>

                            {logs.map((log, index) => (
                                <div key={index} className={`flex gap-4 transition-all duration-300 ${log.type === 'user' ? 'text-indigo-300' : log.type === 'model' ? 'text-emerald-300 border-l-2 border-emerald-500/30 pl-3' : 'text-slate-500 opacity-60'}`}>
                                    <div className="min-w-[70px] text-slate-700 select-none font-black opacity-40">
                                        {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </div>
                                    <div className="flex-shrink-0 mt-0.5 opacity-60">
                                        {log.type === 'user' ? <User className="w-3.5 h-3.5" /> : log.type === 'model' ? <Bot className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="break-words w-full">
                                        <span className={`font-black mr-3 uppercase text-[10px] tracking-[0.2em] ${log.type === 'user' ? 'text-indigo-400' : log.type === 'model' ? 'text-emerald-400' : 'text-slate-600'}`}>
                                            {log.type === 'model' ? 'SYSTEM_CORE' : log.type === 'user' ? 'HUMAN_INPUT' : 'INTERNAL'}
                                        </span>
                                        {log.type === 'model' ? (
                                            <div className="inline-block font-medium">
                                                {renderFormattedMessage(formatMessage(log.text))}
                                            </div>
                                        ) : (
                                            <span className="font-medium">{log.text}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>

                {/* Floating Premium Chat/Voice Bot Overlay for Full Page Mode */}
                {!isWidget && (
                    <div className="fixed bottom-12 right-12 z-[100]">
                        <ChatWidget
                            config={config}
                            status={status}
                            volumeRef={volumeRef}
                            logs={logs}
                            onToggleCall={handleToggleConnection}
                        />
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
};

export default AgentInterface;
