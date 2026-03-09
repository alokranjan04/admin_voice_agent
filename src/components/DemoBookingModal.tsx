"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Loader2, MessageSquare, Briefcase, FileText, User, Mail, Send, Bot, Pause, Play } from 'lucide-react';

interface DemoBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    vapiInstance: any;
    callStatus: 'idle' | 'loading' | 'active';
    startCall: () => void;
    endCall: () => void;
}

export default function DemoBookingModal({ isOpen, onClose, vapiInstance, callStatus, startCall, endCall }: DemoBookingModalProps) {
    const [transcript, setTranscript] = useState<Array<{ role: 'user' | 'assistant', text: string }>>([]);
    const [chatInput, setChatInput] = useState('');
    const [isOnHold, setIsOnHold] = useState(false);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll transcript
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    useEffect(() => {
        if (!vapiInstance || callStatus !== 'active') return;

        const onMessage = (message: any) => {
            if (message.type === 'transcript' && message.transcriptType === 'final') {
                setTranscript(prev => [...prev, { role: message.role, text: message.transcript }]);
            }
        };

        vapiInstance.on('message', onMessage);

        return () => {
            vapiInstance.off('message', onMessage);
        };
    }, [vapiInstance, callStatus]);

    // Send a regular chat message to the Vapi assistant
    const sendChatMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !vapiInstance || callStatus !== 'active') return;

        // Send the user's message to the AI
        vapiInstance.send({
            type: 'add-message',
            message: {
                role: 'user',
                content: chatInput
            }
        });

        // FORCE the AI to acknowledge the typed input (since it sometimes ignores silent text injections if it expects voice)
        vapiInstance.send({
            type: 'add-message',
            message: {
                role: 'system',
                content: `The user just typed the following into the chat box: "${chatInput}". You MUST accept this typed text as the absolute truth. Acknowledge what they typed immediately.`
            }
        });

        // Add visual feedback to transcript
        setTranscript(prev => [...prev, { role: 'user', text: chatInput }]);
        setChatInput('');
    };

    const setHoldState = (hold: boolean, e?: React.SyntheticEvent) => {
        if (e && e.cancelable) e.preventDefault();

        if (!vapiInstance || callStatus !== 'active') return;
        if (hold === isOnHold) return;

        // Mute/unmute user
        vapiInstance.setMuted(hold);

        // Mute/unmute assistant
        vapiInstance.send({
            type: 'control',
            control: hold ? 'mute-assistant' : 'unmute-assistant'
        });

        // Prompt the AI to resume its thought when the user releases the hold button
        if (!hold) {
            vapiInstance.send({
                type: 'add-message',
                message: {
                    role: 'system',
                    content: 'The user was briefly on hold and has now returned. Please seamlessly resume your previous sentence or ask if they are ready to continue.'
                }
            });
        }

        setIsOnHold(hold);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl shadow-indigo-500/10 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20 relative z-20">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Demo Booker AI</h3>
                            <p className="text-xs text-indigo-400 flex items-center gap-1">
                                <span className="relative flex h-2 w-2">
                                    <span className={callStatus === 'active' ? "animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" : "absolute inline-flex h-full w-full rounded-full bg-slate-500 opacity-75"}></span>
                                    <span className={callStatus === 'active' ? "relative inline-flex rounded-full h-2 w-2 bg-green-500" : "relative inline-flex rounded-full h-2 w-2 bg-slate-500"}></span>
                                </span>
                                {callStatus === 'active' ? 'Live Call' : callStatus === 'loading' ? 'Connecting...' : 'Ready'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={callStatus === 'active' ? endCall : startCall}
                            disabled={callStatus === 'loading'}
                            className={`flex items-center justify-center px-4 py-2 rounded-lg font-bold text-sm transition-all ${callStatus === 'active'
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
                                : 'bg-indigo-600 text-white hover:bg-indigo-500'
                                }`}
                        >
                            {callStatus === 'loading' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : callStatus === 'active' ? (
                                <div className="flex items-center gap-2">
                                    <X className="w-4 h-4" />
                                    <span>End Call</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Mic className="w-4 h-4" />
                                    <span>Start Call</span>
                                </div>
                            )}
                        </button>
                        <button
                            onClick={() => {
                                if (callStatus === 'active') endCall();
                                onClose();
                            }}
                            className="p-2 ml-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Pre-Call State */}
                {callStatus !== 'active' && transcript.length === 0 && (
                    <div className="p-10 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-indigo-500/20 animate-pulse">
                            <Mic className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">Ready to Book Your Demo?</h3>
                        <p className="text-slate-400 text-sm mb-8 max-w-sm">
                            Simply talk to our AI assistant. It will handle gathering your details and finding a time on our calendar.
                        </p>
                        <button
                            onClick={startCall}
                            disabled={callStatus === 'loading'}
                            className="flex items-center justify-center px-8 py-4 rounded-full font-bold text-lg transition-all bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {callStatus === 'loading' ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Mic className="w-5 h-5" />
                                    <span>Start Conversation</span>
                                </div>
                            )}
                        </button>
                    </div>
                )}

                {/* Active Call UI */}
                {(callStatus === 'active' || transcript.length > 0) && (
                    <div className="flex flex-col flex-grow overflow-hidden relative">

                        {/* Call Controls Bar */}
                        {callStatus === 'active' && (
                            <div className="flex flex-col items-center justify-center space-y-2 py-4 bg-slate-900/80 border-b border-white/5">
                                <button
                                    onMouseDown={(e) => setHoldState(true, e)}
                                    onMouseUp={(e) => setHoldState(false, e)}
                                    onMouseLeave={(e) => setHoldState(false, e)}
                                    onTouchStart={(e) => setHoldState(true, e)}
                                    onTouchEnd={(e) => setHoldState(false, e)}
                                    className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-full font-semibold transition-all select-none ${isOnHold ? 'bg-amber-500 text-slate-900 scale-95 shadow-inner' : 'bg-slate-800 text-white hover:bg-slate-700 hover:scale-105 shadow-md shadow-black/50'}`}
                                >
                                    {isOnHold ? <Pause className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                                    <span>{isOnHold ? 'Call Paused...' : 'Hold to Pause'}</span>
                                </button>
                                <p className="text-[10px] text-slate-500">Press and hold to mute yourself and the AI.</p>
                            </div>
                        )}

                        {/* Transcript Area */}
                        <div className="flex-grow p-4 overflow-y-auto space-y-4 max-h-[300px]">
                            {transcript.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                                        : 'bg-white/10 text-slate-200 rounded-tl-sm'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={transcriptEndRef} />
                        </div>

                        {/* Standard Chat Input Field */}
                        {callStatus === 'active' && (
                            <div className="p-4 border-t border-white/10 bg-slate-900/50">
                                <form onSubmit={sendChatMessage} className="flex gap-2 relative">
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!chatInput.trim()}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-500 rounded-lg text-white disabled:opacity-50 disabled:bg-slate-700 transition-all hover:bg-indigo-400"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                    </button>
                                </form>
                                <p className="text-[10px] text-slate-500 mt-2 text-center">You can speak naturally or type your responses.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
