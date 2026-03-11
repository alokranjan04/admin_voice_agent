"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

        // Guarantee that the AI processes the typed text instantly by injecting it as a commanding system prompt.
        vapiInstance.send({
            type: 'add-message',
            message: {
                role: 'system',
                content: `[URGENT SYSTEM OVERRIDE] The user just explicitly typed the following message into their screen's chat box: "${chatInput}". You MUST accept this typed text as absolute truth, stop asking for it verbally, and respond immediately to acknowledge you received it.`
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

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center bg-black/80 backdrop-blur-xl pt-[10vh] overflow-y-auto p-4 cursor-default">
            <div className="relative w-full max-w-lg bg-[#0a1628] border border-white/10 rounded-[2rem] shadow-2xl shadow-[#CC0000]/10 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] relative z-20">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#CC0000]/10 flex items-center justify-center border border-[#CC0000]/20">
                            <Bot className="w-6 h-6 text-[#CC0000]" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold font-display tracking-tight text-lg">Sutherland Voice Support</h3>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-1">
                                <span className="relative flex h-2 w-2">
                                    <span className={callStatus === 'active' ? "animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CC0000] opacity-75" : "absolute inline-flex h-full w-full rounded-full bg-gray-600 opacity-75"}></span>
                                    <span className={callStatus === 'active' ? "relative inline-flex rounded-full h-2 w-2 bg-[#CC0000]" : "relative inline-flex rounded-full h-2 w-2 bg-gray-600"}></span>
                                </span>
                                {callStatus === 'active' ? 'Live Session' : callStatus === 'loading' ? 'Initializing...' : 'Systems Ready'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={callStatus === 'active' ? endCall : startCall}
                            disabled={callStatus === 'loading'}
                            className={`flex items-center justify-center px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${callStatus === 'active'
                                ? 'bg-white/5 text-red-500 border border-red-500/20 hover:bg-red-500/10'
                                : 'bg-[#CC0000] text-white hover:bg-[#AA0000] shadow-xl shadow-red-900/20'
                                }`}
                        >
                            {callStatus === 'loading' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : callStatus === 'active' ? (
                                <div className="flex items-center gap-2">
                                    <X className="w-4 h-4" />
                                    <span>Disconnect</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Mic className="w-4 h-4" />
                                    <span>Connect</span>
                                </div>
                            )}
                        </button>
                        <button
                            onClick={() => {
                                if (callStatus === 'active') endCall();
                                onClose();
                            }}
                            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 hover:text-white transition-all border border-white/5"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Pre-Call State */}
                {callStatus !== 'active' && transcript.length === 0 && (
                    <div className="p-12 flex flex-col items-center justify-center text-center space-y-8">
                        <div className="relative">
                            <div className="absolute -inset-4 bg-[#CC0000]/20 blur-2xl rounded-full animate-pulse" />
                            <div className="relative w-24 h-24 bg-[#CC0000]/10 rounded-[2rem] flex items-center justify-center border border-[#CC0000]/20">
                                <Mic className="w-12 h-12 text-[#CC0000]" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-3xl font-bold text-white font-display tracking-tight">Ready?</h3>
                            <p className="text-gray-400 text-sm max-w-[280px] mx-auto font-medium leading-relaxed">
                                Experience autonomous voice intelligence. Book your session in seconds.
                            </p>
                        </div>
                        <button
                            onClick={startCall}
                            disabled={callStatus === 'loading'}
                            className="group relative flex items-center justify-center px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all bg-[#CC0000] text-white hover:bg-[#AA0000] hover:scale-105 shadow-2xl shadow-red-900/40 disabled:opacity-50"
                        >
                            {callStatus === 'loading' ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <span>Initiate Agent</span>
                                    <div className="absolute inset-0 rounded-2xl border border-white/20 group-hover:scale-110 opacity-0 group-hover:opacity-100 transition-all" />
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Active Call UI */}
                {(callStatus === 'active' || transcript.length > 0) && (
                    <div className="flex flex-col flex-grow overflow-hidden relative">

                        {/* Call Controls Bar */}
                        {callStatus === 'active' && (
                            <div className="flex flex-col items-center justify-center space-y-3 py-6 bg-white/[0.02] border-b border-white/5">
                                <button
                                    onMouseDown={(e) => setHoldState(true, e)}
                                    onMouseUp={(e) => setHoldState(false, e)}
                                    onMouseLeave={(e) => setHoldState(false, e)}
                                    onTouchStart={(e) => setHoldState(true, e)}
                                    onTouchEnd={(e) => setHoldState(false, e)}
                                    className={`flex items-center justify-center space-x-3 px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all select-none border ${isOnHold ? 'bg-[#CC0000] border-[#CC0000] text-white scale-95 shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:-translate-y-0.5'}`}
                                >
                                    {isOnHold ? <Pause className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
                                    <span>{isOnHold ? 'Session Paused' : 'Hold to Mute'}</span>
                                </button>
                                <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Global Experience Intelligence active</p>
                            </div>
                        )}

                        {/* Grounded Transcript Area */}
                        <div className="flex-grow flex flex-col justify-end bg-black/10">
                            <div className="p-6 overflow-y-auto space-y-4 max-h-[400px] scroll-smooth">
                                {transcript.length === 0 && callStatus === 'active' && (
                                    <div className="flex justify-start">
                                        <div className="bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border border-white/5">
                                            Initializing strategist session...
                                        </div>
                                    </div>
                                )}
                                {transcript.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                        <div className={`max-w-[85%] rounded-[1.5rem] px-5 py-3.5 text-[11px] font-medium leading-relaxed shadow-sm ${msg.role === 'user'
                                            ? 'bg-[#CC0000] text-white rounded-tr-none'
                                            : 'bg-white/5 text-gray-300 border border-white/5 rounded-tl-none'
                                            }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                <div ref={transcriptEndRef} />
                            </div>
                        </div>

                        {/* Integrated Chat Input Field */}
                        {callStatus === 'active' && (
                            <div className="p-6 bg-white/[0.02] border-t border-white/5">
                                <form onSubmit={sendChatMessage} className="flex gap-3 relative group">
                                    <input
                                        type="text"
                                        placeholder="Type your goals or response..."
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4.5 pl-6 pr-14 text-xs text-white focus:outline-none focus:border-[#CC0000]/50 transition-all placeholder:text-gray-600 font-medium"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!chatInput.trim()}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-3 bg-[#CC0000] rounded-xl text-white disabled:opacity-10 transition-all hover:bg-[#AA0000] shadow-xl shadow-red-900/40"
                                    >
                                        <Send className="w-4.5 h-4.5" />
                                    </button>
                                </form>
                                <div className="flex items-center justify-center gap-4 mt-6">
                                    <div className="flex items-center gap-1.5 opacity-30">
                                        <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-white">Voice Enabled</span>
                                    </div>
                                    <div className="w-px h-2 bg-white/10" />
                                    <div className="flex items-center gap-1.5 opacity-30">
                                        <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-white">Multimodal Chat</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
