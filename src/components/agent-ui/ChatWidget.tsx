import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Phone, Mic, MicOff, ChevronDown, User, Bot, Info, Terminal } from 'lucide-react';
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
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ config, status, volume, logs, onToggleCall }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showWelcomeForm, setShowWelcomeForm] = useState(true);
    const [userDetails, setUserDetails] = useState<{ name: string; phone: string; email?: string } | null>(null);
    const [textInput, setTextInput] = useState('');
    const logsEndRef = useRef<HTMLDivElement>(null);

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

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (textInput.trim()) {
            // If not connected, start a call first
            if (status === 'disconnected') {
                onToggleCall(); // Start the call
                // Wait a moment for the call to connect, then send the message
                setTimeout(() => {
                    voiceService.sendTextMessage(textInput.trim());
                }, 2000);
            } else {
                voiceService.sendTextMessage(textInput.trim());
            }
            setTextInput('');
        }
    };

    return (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-[9999] flex flex-col items-end pointer-events-auto">
            {/* Expanded Chat Window */}
            {isExpanded && (
                <div className="mb-0 sm:mb-4 w-screen h-screen sm:w-[360px] md:w-[400px] sm:h-[520px] md:h-[600px] sm:max-h-[80vh] bg-white sm:rounded-2xl shadow-2xl border-t sm:border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    {/* Show Welcome Form on First Expansion */}
                    {showWelcomeForm ? (
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
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="bg-slate-900 text-white p-4 pt-safe flex justify-between items-center">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm leading-tight truncate">{config.metadata.businessName} Assistant</h3>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                                {status === 'connected' ? 'Live Now' : 'Online'}
                                            </span>
                                        </div>
                                        {userDetails && (
                                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                                Welcome, {userDetails.name}!
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="p-1.5 hover:bg-slate-800 rounded-full transition-colors outline-none focus:ring-0 flex-shrink-0"
                                >
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            {/* Live Visualizer (Only when connected) */}
                            {status === 'connected' && (
                                <div className="bg-slate-50 border-b border-slate-100 p-4">
                                    <LiveVisualizer volume={volume} isActive={true} />
                                </div>
                            )}

                            {/* Chat Logs */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                                {logs.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
                                            <MessageSquare className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-600">Welcome to {config.metadata.businessName}!</p>
                                        <p className="text-xs text-slate-400">Start a call or type a message below to begin.</p>
                                    </div>
                                )}
                                {logs.map((log, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${log.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
                                    >
                                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${log.type === 'user'
                                            ? 'bg-teal-600 text-white rounded-tr-none shadow-md shadow-teal-100'
                                            : log.type === 'model'
                                                ? 'bg-white text-slate-700 border border-slate-200 rounded-tl-none shadow-sm'
                                                : 'bg-slate-100 text-slate-500 italic text-[10px] py-1 px-3 rounded-full mx-auto'
                                            }`}>
                                            {log.type !== 'system' && log.type !== 'tool' && (
                                                <div className="flex items-center gap-1.5 mb-1 opacity-70">
                                                    {log.type === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">
                                                        {log.type === 'user' ? 'You' : 'Agent'}
                                                    </span>
                                                </div>
                                            )}
                                            {log.type === 'model' ? (
                                                <div className="leading-relaxed">
                                                    {renderFormattedMessage(formatMessage(log.text))}
                                                </div>
                                            ) : (
                                                <p className="leading-relaxed">{log.text}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>

                            {/* Footer / Input */}
                            <div className="p-4 pb-safe bg-white border-t border-slate-100 space-y-3">
                                <div className="flex items-center gap-2">
                                    <form onSubmit={handleSendMessage} className="flex-1 relative">
                                        <input
                                            type="text"
                                            placeholder="Type a message..."
                                            className="w-full pl-4 pr-10 py-2.5 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-teal-500 transition-all outline-none"
                                            value={textInput}
                                            onChange={(e) => setTextInput(e.target.value)}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!textInput.trim()}
                                            className="absolute right-1 top-1 p-1.5 text-teal-600 hover:bg-teal-50 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-all outline-none"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </form>

                                    <button
                                        onClick={onToggleCall}
                                        disabled={status === 'connecting'}
                                        className={`p-3 rounded-full shadow-lg transition-all transform hover:scale-110 active:scale-95 outline-none focus:ring-0 ${status === 'connected'
                                            ? 'bg-rose-500 text-white shadow-rose-100'
                                            : 'bg-teal-600 text-white shadow-teal-100'
                                            }`}
                                        title={status === 'connected' ? "End Call" : "Start Voice Call"}
                                    >
                                        {status === 'connected' ? <MicOff className="w-5 h-5" /> : status === 'connecting' ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Phone className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-center text-slate-400">
                                    Available 24/7 for your assistance.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Floating Bubble Icon */}
            {!isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="group relative w-14 h-14 sm:w-16 sm:h-16 bg-teal-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 hover:bg-teal-500 border-4 border-white ring-4 ring-teal-600/20 outline-none focus:ring-4 focus:ring-teal-600/40"
                >
                    {status === 'connected' ? (
                        <div className="relative">
                            <Phone className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse text-white" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                        </div>
                    ) : (
                        <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
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
