import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Phone, Mic, MicOff, ChevronDown, User, Bot, Info, Terminal, Calendar, Wrench, Sparkles, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceService, LogEntry } from '@/services/agent-ui/vapiService';
import LiveVisualizer from './LiveVisualizer';
import { WelcomeForm } from './WelcomeForm';
import { formatMessage, renderFormattedMessage } from '@/utils/agent-ui/messageFormatter';
import { BusinessConfig } from '@/types/agent-ui/types';

interface ChatWidgetProps {
    config: BusinessConfig;
    status: 'disconnected' | 'connecting' | 'connected';
    volumeRef: React.RefObject<number>;
    logs: LogEntry[];
    onToggleCall: () => void;
    overrideWidgetType?: 'chat' | 'voice';
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ config, status, volumeRef, logs, onToggleCall, overrideWidgetType }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showWelcomeForm, setShowWelcomeForm] = useState(true);
    const [userDetails, setUserDetails] = useState<{ name: string; phone: string; email?: string } | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    const isChatOnly = overrideWidgetType === 'chat';
    const transcriptMessages = logs.filter(l => l.type === 'user' || l.type === 'model');

    const saveUserDetails = async (data: { name: string; phone: string; email?: string }) => {
        setUserDetails(data);
        voiceService.setSessionMetadata({ userName: data.name, userPhone: data.phone, userEmail: data.email || '' });
        try {
            const { firebaseService } = await import('@/services/agent-ui/firebaseService');
            await firebaseService.updateTranscriberUserDetails(data.name, data.email || '', data.phone);
        } catch (error) {
            console.error('[WelcomeForm] Failed to save user details:', error);
        }
    };

    // Handle welcome form submission — starts web voice session
    const handleWelcomeFormSubmit = async (data: { name: string; phone: string; email?: string }) => {
        await saveUserDetails(data);
        setShowWelcomeForm(false);
        onToggleCall();
    };

    // Handle "Call Me" — triggers VAPI outbound call to user's phone
    const handleCallMe = async (data: { name: string; phone: string; email?: string }) => {
        await saveUserDetails(data);
        const assistantId = (config as any).vapi?.assistantId;
        if (!assistantId) throw new Error('No VAPI assistant configured for this agent.');
        const res = await fetch('/api/vapi/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: data.phone, assistantId })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Call failed');
        }
    };

    useEffect(() => {
        window.parent.postMessage({ type: 'VOICE_WIDGET_RESIZE', isExpanded }, '*');
    }, [isExpanded]);

    useEffect(() => {
        if (isExpanded) {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isExpanded]);

    return (
        <div className={`fixed bottom-0 ${isChatOnly ? 'right-[4.5rem] sm:right-28' : 'right-0 sm:right-6'} sm:bottom-6 z-[9999] flex flex-col items-end pointer-events-auto`}>
            {/* Expanded Chat Window */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-0 sm:mb-4 w-screen h-screen sm:w-[380px] md:w-[420px] sm:h-[580px] md:h-[650px] sm:max-h-[85vh] bg-white/95 backdrop-blur-xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-t sm:border border-white/20 flex flex-col overflow-hidden"
                    >
                        {showWelcomeForm && !isChatOnly ? (
                            <div className="h-full flex flex-col bg-gradient-to-b from-slate-900 to-slate-800">
                                <div className="p-6 pt-safe flex justify-between items-center border-b border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gradient-to-tr from-teal-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
                                            <Bot className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base text-white tracking-tight">{config.metadata.businessName}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] text-emerald-400 uppercase font-black tracking-tighter">AI Assistant Online</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <ChevronDown className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto no-scrollbar bg-white rounded-t-3xl mt-4 p-2">
                                    <WelcomeForm
                                        onSubmit={handleWelcomeFormSubmit}
                                        onCallMe={handleCallMe}
                                        businessName={config.metadata?.businessName}
                                        avatarUrl={config.vapi?.avatarUrl}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col bg-slate-50">
                                {/* Premium Header */}
                                <div className="bg-slate-900 text-white p-6 pt-safe flex justify-between items-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-teal-500/10 pointer-events-none" />
                                    <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
                                        {config.vapi?.avatarUrl ? (
                                            <div className="relative">
                                                <div className={`absolute -inset-1 rounded-full bg-gradient-to-tr from-teal-400 to-indigo-500 opacity-70 blur-sm ${status === 'connected' ? 'animate-pulse' : ''}`} />
                                                <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-slate-800 relative shadow-xl">
                                                    <img src={config.vapi.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 bg-gradient-to-tr from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl transform -rotate-3">
                                                <Bot className="w-7 h-7 text-white" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-lg leading-tight truncate text-white tracking-tight">{config.metadata.businessName}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Activity className={`w-3 h-3 ${status === 'connected' ? 'text-emerald-400 animate-bounce' : 'text-slate-500'}`} />
                                                <span className={`text-[10px] uppercase font-black tracking-widest ${status === 'connected' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                    {status === 'connected' ? 'Live Interaction' : 'Ready to Assist'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors relative z-10">
                                        <ChevronDown className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>

                                {/* Main Interaction Area */}
                                <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-slate-50/50 to-slate-100/50">
                                    <div className="flex flex-col items-center text-center space-y-2">
                                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                            {status === 'connected' ? "Call In Progress" : "Hello! Ready to talk?"}
                                        </h2>
                                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider opacity-60">
                                            {status === 'connected' ? "I'm listening to your request..." : "Start a call to begin speaking."}
                                        </p>
                                    </div>

                                    {/* Scrollable Transcript Area */}
                                    <div className="flex-1 min-h-0 bg-white/40 backdrop-blur-md rounded-3xl border border-white shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden group">
                                        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-white/40">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Transcript</span>
                                            <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar scroll-smooth">
                                            {transcriptMessages.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-20">
                                                    <Terminal className="w-10 h-10 text-indigo-600" />
                                                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Waiting for audio...</p>
                                                </div>
                                            ) : (
                                                transcriptMessages.map((log, index) => (
                                                    <motion.div
                                                        initial={{ opacity: 0, x: log.type === 'user' ? 10 : -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        key={index}
                                                        className={`flex flex-col ${log.type === 'user' ? 'items-end' : 'items-start'}`}
                                                    >
                                                        <div className={`mb-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                                            log.type === 'user' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-teal-50 text-teal-600 border border-teal-100'
                                                        }`}>
                                                            {log.type === 'model' ? 'AI Assistant' : 'You'}
                                                        </div>
                                                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                                                            log.type === 'user' 
                                                            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none' 
                                                            : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                                        }`}>
                                                            {log.text}
                                                        </div>
                                                    </motion.div>
                                                ))
                                            )}
                                            <div ref={logsEndRef} />
                                        </div>
                                    </div>

                                    {/* Live Pulse Visualizer */}
                                    <AnimatePresence>
                                        {status === 'connected' && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className="bg-white p-4 rounded-3xl shadow-xl border border-white"
                                            >
                                                <LiveVisualizer volumeRef={volumeRef} isActive={true} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Call Action Footer */}
                                <div className="p-8 bg-white/80 backdrop-blur-md border-t border-slate-100 flex justify-center">
                                    <button
                                        onClick={onToggleCall}
                                        disabled={status === 'connecting'}
                                        className={`w-full max-w-[280px] py-4 rounded-2xl shadow-2xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 font-black text-lg tracking-tight ${
                                            status === 'connected'
                                            ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-rose-200'
                                            : 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-emerald-200'
                                        }`}
                                    >
                                        {status === 'connected' ? (
                                            <><MicOff className="w-6 h-6" />End Conversation</>
                                        ) : status === 'connecting' ? (
                                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <><Phone className="w-6 h-6" />Start Conversation</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Floating Bubble */}
            {!isExpanded && (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsExpanded(true)}
                    className={`group relative w-16 h-16 sm:w-20 sm:h-20 ${isChatOnly ? 'bg-indigo-600' : 'bg-slate-900'} text-white rounded-[26px] shadow-[0_15px_30px_rgba(0,0,0,0.3)] flex items-center justify-center transition-all border-[3px] border-white z-10 overflow-hidden outline-none ring-offset-2 focus:ring-4 focus:ring-slate-900/20`}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {config.vapi?.avatarUrl ? (
                         <div className="w-full h-full p-0.5">
                            <img src={config.vapi.avatarUrl} alt="Bot" className="w-full h-full object-cover rounded-[22px]" />
                            {status === 'connected' && (
                                <span className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-pulse shadow-lg ring-4 ring-emerald-500/20" />
                            )}
                        </div>
                    ) : (
                        <div className="relative">
                            <Bot className={`w-8 h-8 sm:w-9 sm:h-9 ${status === 'connected' ? 'text-emerald-400' : 'text-white'}`} />
                            {status === 'connected' && (
                                <Activity className="absolute -top-1 -right-4 w-4 h-4 text-emerald-400 animate-pulse" />
                            )}
                        </div>
                    )}

                    <div className="hidden sm:block absolute right-[110%] bottom-4 bg-slate-900/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl text-xs font-black tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 pointer-events-none shadow-2xl border border-white/10 whitespace-nowrap">
                        TALK TO ME ✨
                    </div>
                </motion.button>
            )}
        </div>
    );
};

export default ChatWidget;
