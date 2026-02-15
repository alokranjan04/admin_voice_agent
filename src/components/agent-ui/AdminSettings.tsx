import React, { useState, useEffect } from 'react';
import { X, Save, Check, Calendar as CalendarIcon, AlertTriangle, Shield, Zap, Copy } from 'lucide-react';
import { BusinessConfig } from '@/types/agent-ui/types';
import { firebaseService } from '@/services/agent-ui/firebaseService';
import { calendarService } from '@/services/agent-ui/calendarService';
import { DEFAULT_BUSINESS_CONFIG } from '@/lib/agent-ui/constants';

interface AdminSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    isCalendarAuth: boolean;
    connectedEmail: string | null;
    onConnectCalendar: () => void;
    authError?: string | null;
    googleClientId: string;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({
    isOpen, onClose, isCalendarAuth, connectedEmail, onConnectCalendar, authError, googleClientId
}) => {
    const [loading, setLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    // We maintain a local config state to handle the manual token persistence logic
    const [config, setConfig] = useState<BusinessConfig>(DEFAULT_BUSINESS_CONFIG);
    const [origin, setOrigin] = useState('');
    const [orgId, setOrgId] = useState('YOUR_ORG_ID');
    const [agentId, setAgentId] = useState('YOUR_AGENT_ID');


    // Load config on open to check for existing persistence
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
            setOrgId(localStorage.getItem('tenant_org_id') || 'YOUR_ORG_ID');
            setAgentId(localStorage.getItem('tenant_agent_id') || 'YOUR_AGENT_ID');
        }

        if (isOpen) {
            setLoading(true);
            firebaseService.getAgentConfig().then(remoteConfig => {
                if (remoteConfig) setConfig(remoteConfig);
                setLoading(false);
            });
        }
    }, [isOpen]);

    const handleAutoSave = async (newConfig: BusinessConfig) => {
        setSaveStatus('saving');
        const success = await firebaseService.saveAgentConfig(newConfig);
        if (success) {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
            setSaveStatus('error');
        }
    };

    const handleToggleWidget = async () => {
        const newValue = config.vapi?.showFloatingWidget === false;

        const updatedConfig: BusinessConfig = {
            ...config,
            vapi: {
                ...(config.vapi || {}),
                showFloatingWidget: newValue
            }
        };
        setConfig(updatedConfig);

        if (typeof window !== 'undefined') {
            if (!newValue) {
                localStorage.setItem('hide_floating_widget', 'true');
            } else {
                localStorage.removeItem('hide_floating_widget');
            }
        }

        const iframe = document.getElementById('voice-agent-widget');
        if (iframe) {
            iframe.style.display = !newValue ? 'none' : 'block';
        }

        await handleAutoSave(updatedConfig);
    };

    const handleClearToken = async () => {
        const updatedConfig: BusinessConfig = {
            ...config,
            integrations: {
                ...config.integrations,
                googleCalendar: undefined
            }
        };
        setConfig(updatedConfig);
        await handleAutoSave(updatedConfig);
    };

    const persistCurrentSession = async () => {
        const token = prompt("To persist authentication across reloads without a backend server, please paste a valid Google OAuth Access Token here.");

        if (token) {

            const updatedConfig: BusinessConfig = {
                ...config,
                integrations: {
                    ...(config.integrations || {}),
                    googleCalendar: {
                        isConnected: true,
                        accessToken: token,
                        connectedEmail: connectedEmail || "Manual Token User"
                    }
                }
            };
            // ... logic continues from here (truncated for brevity in diff, but existing code follows)
            setConfig(updatedConfig);
            await handleAutoSave(updatedConfig);
        }
    };

    // ... render return ...
    // Note: I am replacing the Component start. I need to make sure I don't delete the JSX logic if I don't include it. 
    // The previous tool usage showed the file content. 
    // I need to be careful. I will target up to the `persistCurrentSession` function end or logic. 

    // Wait, replacing a large chunk might be risky if I don't hav the full content. 
    // I have up to line 324. 
    // The `persistCurrentSession` logic continues. 

    // Let's replace imports and `useEffect` first.




    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">

                {/* HEADER */}
                <div className="bg-slate-900 text-white px-6 py-5 flex justify-between items-center flex-shrink-0 border-b border-slate-800">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2.5">
                            <div className="p-1.5 bg-teal-500/20 rounded-lg">
                                <Shield className="w-5 h-5 text-teal-400" />
                            </div>
                            Admin Settings
                        </h2>
                        <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">System Configuration</p>
                            {saveStatus !== 'idle' && (
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter animate-pulse ${saveStatus === 'saving' ? 'bg-amber-500/20 text-amber-400' :
                                    saveStatus === 'saved' ? 'bg-emerald-500/20 text-emerald-400' :
                                        'bg-rose-500/20 text-rose-400'
                                    }`}>
                                    {saveStatus === 'saving' ? <Zap className="w-2.5 h-2.5" /> : saveStatus === 'saved' ? <Check className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                                    {saveStatus === 'saving' ? 'Syncing...' : saveStatus === 'saved' ? 'Saved' : 'Error'}
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-all hover:rotate-90 duration-200 group"
                        title="Close Settings"
                    >
                        <X className="w-5 h-5 text-slate-400 group-hover:text-white" />
                    </button>
                </div>

                {/* CONTENT AREA (SCROLLABLE) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/30 space-y-6">

                    {/* GOOGLE CALENDAR */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 ring-1 ring-blue-100">
                                    <CalendarIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Google Calendar</h4>
                                    <p className="text-xs text-slate-500">Sync appointments & availability</p>
                                </div>
                            </div>
                            {isCalendarAuth || config.integrations?.googleCalendar?.isConnected ? (
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                // Force disconnect logic
                                                const newConfig = { ...config };
                                                if (newConfig.integrations?.googleCalendar) {
                                                    newConfig.integrations.googleCalendar.isConnected = false;
                                                    newConfig.integrations.googleCalendar.accessToken = "";
                                                }
                                                setConfig(newConfig);
                                                handleAutoSave(newConfig);
                                                window.location.reload(); // Simple way to reset local state
                                            }}
                                            className="text-[10px] text-rose-500 hover:text-rose-700 font-bold underline decoration-dotted mr-2"
                                        >
                                            Disconnect
                                        </button>
                                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100 flex items-center gap-1">
                                            <Check className="w-3 h-3" /> ACTIVE
                                        </span>
                                    </div>
                                    {/* DEBUG INFO */}
                                    <div className="text-[9px] text-slate-400 font-mono text-right mt-1">
                                        Status: {calendarService.getTokenDebugInfo()}<br />
                                        <span title={calendarService.getGrantedScopes()} className="cursor-help underline decoration-dotted">
                                            Hover for Scopes
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={onConnectCalendar} className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-200 active:scale-95">
                                    Connect Account
                                </button>
                            )}
                        </div>

                        {authError && (
                            <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-[11px] rounded-lg border border-rose-100 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{authError}</span>
                            </div>
                        )}

                        <div className="mb-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-[11px] font-semibold text-slate-500 uppercase">Client ID</span>
                                <span className="font-mono text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-600 truncate max-w-[250px] select-all shadow-sm">{googleClientId}</span>
                            </div>
                            <div className="flex items-start gap-2.5 pt-3 border-t border-slate-200/60 mt-3">
                                <Shield className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                                <span className="text-[10px] text-slate-500 leading-relaxed italic">OAuth protection enabled. Client Secret is not required for public browser integrations.</span>
                            </div>
                        </div>

                        {/* TOKEN PERSISTENCE */}
                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-amber-100 rounded-lg shrink-0">
                                    <Zap className="w-4 h-4 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-amber-800">Persistent Auth (Database Sync)</p>
                                    <p className="text-[10px] text-amber-700/70 leading-relaxed mb-3">
                                        Save token to cloud to keep agent functional after page reloads.
                                    </p>

                                    {config.integrations?.googleCalendar?.accessToken ? (
                                        <div className="flex items-center justify-between bg-white/80 p-2 rounded-lg border border-amber-200 text-[10px] shadow-sm">
                                            <span className="text-slate-700 truncate mr-2">
                                                Token: <span className="font-mono">{config.integrations.googleCalendar.accessToken.substring(0, 12)}...</span>
                                            </span>
                                            <button onClick={handleClearToken} className="text-rose-600 hover:text-rose-700 font-bold px-2 py-1 hover:bg-rose-50 rounded transition-colors underline decoration-dotted">Clear</button>
                                        </div>
                                    ) : (
                                        <button onClick={persistCurrentSession} className="text-[11px] text-blue-600 hover:text-blue-700 font-bold underline decoration-blue-200 underline-offset-4">
                                            Enter Manual Token
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* VAPI CONFIGURATION */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 ring-1 ring-indigo-100">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">Voice Bot Settings</h4>
                                <p className="text-xs text-slate-500">Customize appearance & behavior</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">

                            {/* Provider & Model Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase">Provider</label>
                                    <select
                                        className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        value={config.vapi?.provider || "OpenAI"}
                                        onChange={(e) => {
                                            const newConfig = { ...config, vapi: { ...(config.vapi || {}), provider: e.target.value } };
                                            setConfig(newConfig);
                                            handleAutoSave(newConfig);
                                        }}
                                    >
                                        {["OpenAI", "Azure OpenAI", "Anthropic", "Anthropic bedrock", "Google", "Custom llm", "Groq", "Cerebras", "Deep seek", "Xai", "Mistral"].map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase">Model</label>
                                    <select
                                        className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        value={config.vapi?.model || "GPT 4o Mini Cluster"}
                                        onChange={(e) => {
                                            const newConfig = { ...config, vapi: { ...(config.vapi || {}), model: e.target.value } };
                                            setConfig(newConfig);
                                            handleAutoSave(newConfig);
                                        }}
                                    >
                                        {["GPT 4o Mini Cluster", "GPT 4.1", "GPT 4.1 Mini", "GPT 4.1 Nano", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"].map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Voice Provider & Voice ID Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase">Voice Provider</label>
                                    <select
                                        className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        value={config.vapi?.voiceProvider || "OpenAI"}
                                        onChange={(e) => {
                                            const newConfig = { ...config, vapi: { ...(config.vapi || {}), voiceProvider: e.target.value } };
                                            setConfig(newConfig);
                                            handleAutoSave(newConfig);
                                        }}
                                    >
                                        {["OpenAI", "Vapi", "Cartesia", "11labs", "Rime AI", "LMNT", "Deepgram", "Azure", "MiniMax", "Neuphonic", "Smallest AI"].map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase">Voice</label>
                                    {/* If Provider is OpenAI, show standard voices. Else text input or different list? User screenshot showed simple dropdown for Alloy/Onyx context */}
                                    <select
                                        className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        value={config.vapi?.voiceId || "alloy"}
                                        onChange={(e) => {
                                            const newConfig = { ...config, vapi: { ...(config.vapi || {}), voiceId: e.target.value } };
                                            setConfig(newConfig);
                                            handleAutoSave(newConfig);
                                        }}
                                    >
                                        {["alloy", "echo", "fable", "onyx", "nova", "shimmer"].map(opt => (
                                            <option key={opt} value={opt} className="capitalize">{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 mt-1">
                                <div>
                                    <p className="text-[13px] font-bold text-slate-700">Floating Voice Bot</p>
                                    <p className="text-[11px] text-slate-500">Show chat bubble on host website</p>
                                </div>
                                <button
                                    onClick={handleToggleWidget}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ring-offset-2 focus:ring-2 focus:ring-teal-500 ${config.vapi?.showFloatingWidget !== false ? 'bg-teal-600' : 'bg-slate-300'}`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${config.vapi?.showFloatingWidget !== false ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* EMBED AGENT */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 ring-1 ring-teal-100">
                                <Copy className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">Embed Agent</h4>
                                <p className="text-xs text-slate-500">Add the voice bot to your web platform</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="relative group">
                                <textarea
                                    readOnly
                                    className="w-full bg-slate-900 text-slate-300 font-mono text-[9px] p-4 rounded-xl h-40 border border-slate-800 resize-none shadow-inner group-hover:border-slate-700 transition-colors"
                                    value={`<!-- Voice Agent Integration Script -->
<script>
  (function() {
    const iframe = document.createElement('iframe');
    iframe.id = 'voice-agent-widget';

    const widgetParams = new URLSearchParams();
    widgetParams.set('mode', 'widget');
    widgetParams.set('orgId', '${orgId}');
    widgetParams.set('agentId', '${agentId}');

    iframe.src = "${origin}/agentUI?" + widgetParams.toString();
    iframe.width = "400px";
    iframe.height = "100px";
    iframe.frameBorder = "0";
    iframe.allow = "microphone";
    iframe.style.cssText = "position:fixed; bottom:20px; right:20px; z-index:9999; border:none; background:transparent; transition:height 0.3s ease;";
    
    window.addEventListener('message', (e) => {
      if (e.data.type === 'VOICE_WIDGET_RESIZE') {
        iframe.height = e.data.isExpanded ? "620px" : "100px";
      }
    });
    
    document.body.appendChild(iframe);
  })();
</script>`}
                                />
                                <button
                                    onClick={() => {
                                        const code = `<!-- Voice Agent Integration Script -->\n<script>\n  (function() {\n    const iframe = document.createElement('iframe');\n    iframe.id = 'voice-agent-widget';\n\n    const widgetParams = new URLSearchParams();\n    widgetParams.set('mode', 'widget');\n    widgetParams.set('orgId', '${orgId}');\n    widgetParams.set('agentId', '${agentId}');\n\n    iframe.src = "${origin}/agentUI?" + widgetParams.toString();\n    iframe.width = "400px";\n    iframe.height = "100px";\n    iframe.frameBorder = "0";\n    iframe.allow = "microphone";\n    iframe.style.cssText = "position:fixed; bottom:20px; right:20px; z-index:9999; border:none; background:transparent; transition:height 0.3s ease;";\n    \n    window.addEventListener('message', (e) => {\n      if (e.data.type === 'VOICE_WIDGET_RESIZE') {\n        iframe.height = e.data.isExpanded ? "620px" : "100px";\n      }\n    });\n    \n    document.body.appendChild(iframe);\n  })();\n<` + `/script>`;
                                        navigator.clipboard.writeText(code);
                                        alert("Premium integration script copied!");
                                    }}
                                    className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                                    title="Copy Script"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-[10px] text-blue-700/80 leading-relaxed italic shadow-sm">
                                <p className="flex items-start gap-2">
                                    <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <span><strong>Pro Tip:</strong> The widget is fully responsive. Ensure your container allows microphone access if using HTTPS.</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ACTION BAR (AUTO-SAVE) */}
                <div className="flex justify-between items-center px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
                    <p className="text-[10px] text-slate-400 italic">Settings are saved automatically as you change them.</p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-lg active:scale-95"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;