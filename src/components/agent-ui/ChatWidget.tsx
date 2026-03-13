import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Phone, Mic, MicOff, ChevronDown, User, Bot, Info, Terminal, Calendar, Wrench } from 'lucide-react';
import { voiceService, LogEntry } from '@/services/agent-ui/vapiService';
import LiveVisualizer from './LiveVisualizer';
import { WelcomeForm } from './WelcomeForm';
import { formatMessage, renderFormattedMessage } from '@/utils/agent-ui/messageFormatter';
import { BusinessConfig } from '@/types/agent-ui/types';

interface ChatWidgetProps {
    config: BusinessConfig;
    status: 'disconnected' | 'connecting' | 'connected';
    volume: number;
    logs: LogEntry[];
    onToggleCall: () => void;
    overrideWidgetType?: 'chat' | 'voice';
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ config, status, volume, logs, onToggleCall, overrideWidgetType }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showWelcomeForm, setShowWelcomeForm] = useState(true);
    const [userDetails, setUserDetails] = useState<{ name: string; phone: string; email?: string } | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const isChatOnly = overrideWidgetType === 'chat';

    // Handle welcome form submission
    const handleWelcomeFormSubmit = async (data: { name: string; phone: string; email?: string }) => {
        setUserDetails(data);
        setShowWelcomeForm(false);

        // Store user details in session metadata
        voiceService.setSessionMetadata({
            userName: data.name,
            userPhone: data.phone,
            userEmail: data.email || ''
        });

        // Save user details to Firebase transcriber configuration
        try {
            const { firebaseService } = await import('@/services/agent-ui/firebaseService');
            await firebaseService.updateTranscriberUserDetails(data.name, data.email || '', data.phone);
            console.log('[WelcomeForm] User details saved to Firebase transcriber');
        } catch (error) {
            console.error('[WelcomeForm] Failed to save user details to Firebase:', error);
        }

        // Auto-start the voice call
        onToggleCall();
    };

    // Notify parent to resize iframe on mount
    useEffect(() => {
        window.parent.postMessage({ type: 'VOICE_WIDGET_RESIZE', isExpanded }, '*');
    }, []);

    // Auto-scroll logs & handle expansion changes
    useEffect(() => {
        if (isExpanded) {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        // Notify parent to resize iframe when expanded state changes
        window.parent.postMessage({ type: 'VOICE_WIDGET_RESIZE', isExpanded }, '*');
    }, [logs, isExpanded]);


    return (
        <div className={`fixed bottom-0 ${isChatOnly ? 'right-[4.5rem] sm:right-28' : 'right-0 sm:right-6'} sm:bottom-6 z-[9999] flex flex-col items-end pointer-events-auto transition-all`}>
            {/* Expanded Chat Window */}
            {isExpanded && (
                <div className="mb-0 sm:mb-4 w-screen h-screen sm:w-[360px] md:w-[400px] sm:h-[520px] md:h-[600px] sm:max-h-[80vh] bg-white sm:rounded-2xl shadow-2xl border-t sm:border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    {/* Show Welcome Form on First Expansion (Strictly disabled for Chat Mode) */}
                    {showWelcomeForm && !isChatOnly ? (
                        <div className="h-full flex flex-col">
                            {/* Header */}
                            <div className="bg-slate-900 text-white p-4 pt-safe flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm leading-tight truncate">{config.metadata.businessName} Assistant</h3>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                            Online
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="p-1.5 hover:bg-slate-800 rounded-full transition-colors outline-none focus:ring-0 flex-shrink-0"
                                >
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            {/* Welcome Form Content */}
                            <div className="flex-1 overflow-y-auto bg-white">
                                    <WelcomeForm
                                        onSubmit={handleWelcomeFormSubmit}
                                        businessName={config.metadata?.businessName}
                                        avatarUrl={config.vapi?.avatarUrl}
                                    />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="bg-slate-900 text-white p-4 pt-safe flex justify-between items-center">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {config.vapi?.avatarUrl ? (
                                        <div className="w-10 h-10 rounded-full border-2 border-slate-700 overflow-hidden bg-slate-800 flex-shrink-0">
                                            <img src={config.vapi.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                                            <Bot className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm leading-tight truncate">{config.metadata.businessName} Assistant</h3>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                                {status === 'connected' ? 'Live Now' : 'Online'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="p-1.5 hover:bg-slate-800 rounded-full transition-colors outline-none focus:ring-0 flex-shrink-0"
                                >
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            {/* Voice-Only Content */}
                            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 relative overflow-hidden">
                                {/* Decorative background element */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

                                {config.vapi?.avatarUrl ? (
                                    <div className={`w-32 h-32 rounded-full border-4 ${status === 'connected' ? 'border-teal-500' : 'border-slate-200'} overflow-hidden shadow-2xl mb-6 relative z-10 transition-all duration-300`}>
                                        <img src={config.vapi.avatarUrl} alt="Bot Avatar" className="w-full h-full object-cover" />
                                        {status === 'connected' && (
                                            <div className="absolute inset-0 bg-teal-500/10 animate-pulse"></div>
                                        )}
                                    </div>
                                ) : (
                                    <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-2xl mb-6 relative z-10 transition-all duration-300 ${status === 'connected' ? 'ring-8 ring-teal-500/20' : ''}`}>
                                        <Bot className="w-16 h-16 text-white" />
                                    </div>
                                )}

                                <div className="text-center space-y-2 relative z-10">
                                    <h2 className="text-xl font-bold text-slate-800">
                                        {status === 'connected' ? "I'm Listening..." : "Ready to speak?"}
                                    </h2>
                                    <p className="text-slate-500 text-sm max-w-[200px] mx-auto">
                                        {status === 'connected' 
                                            ? "Speak now to interact with your AI assistant." 
                                            : "Start a call to speak with our AI agent about bookings and services."}
                                    </p>
                                </div>

                                {status === 'connected' && (
                                    <div className="w-full max-w-[240px] mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm relative z-10 border border-white">
                                        <LiveVisualizer volume={volume} isActive={true} />
                                    </div>
                                )}
                            </div>

                            {/* Footer / Call Toggle */}
                            <div className="p-6 bg-white border-t border-slate-100 flex justify-center">
                                <button
                                    onClick={onToggleCall}
                                    disabled={status === 'connecting'}
                                    className={`w-full max-w-[240px] py-4 rounded-2xl shadow-xl transition-all transform hover:scale-105 active:scale-95 outline-none focus:ring-0 flex items-center justify-center gap-3 font-bold text-lg ${status === 'connected'
                                        ? 'bg-rose-500 text-white shadow-rose-100 ring-rose-500/20'
                                        : 'bg-teal-600 text-white shadow-teal-100 ring-teal-600/20'
                                        }`}
                                >
                                    {status === 'connected' ? (
                                        <>
                                            <MicOff className="w-6 h-6" />
                                            End Call
                                        </>
                                    ) : status === 'connecting' ? (
                                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Phone className="w-6 h-6" />
                                            Start Call
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Floating Bubble Icon */}
            {!isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className={`group relative w-14 h-14 sm:w-16 sm:h-16 ${isChatOnly ? 'bg-indigo-600' : 'bg-teal-600'} text-white rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 ${isChatOnly ? 'hover:bg-indigo-500 ring-indigo-600/20 focus:ring-indigo-600/40' : 'hover:bg-teal-500 ring-teal-600/20 focus:ring-teal-600/40'} border-4 border-white ring-4 outline-none focus:ring-4`}
                >
                    {config.vapi?.avatarUrl ? (
                         <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
                            <img src={config.vapi.avatarUrl} alt="Bot" className="w-full h-full object-cover" />
                            {status === 'connected' && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse"></span>
                            )}
                        </div>
                    ) : (
                        status === 'connected' ? (
                            <div className="relative">
                                <Bot className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse text-white" />
                                <span className="absolute -top-1 -right-1 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                            </div>
                        ) : (
                            <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                        )
                    )}

                    {/* Tooltip-like label */}
                    <div className="hidden sm:block absolute right-20 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-slate-800">
                        How can I help?
                    </div>
                </button>
            )}
        </div>
    );
};

export default ChatWidget;
