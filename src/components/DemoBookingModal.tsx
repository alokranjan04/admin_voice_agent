"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Loader2, MessageSquare, Briefcase, FileText, User, Mail, Send, Bot } from 'lucide-react';

interface DemoBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    vapiInstance: any;
    callStatus: 'idle' | 'loading' | 'active';
    startCall: () => void;
    endCall: () => void;
}

export default function DemoBookingModal({ isOpen, onClose, vapiInstance, callStatus, startCall, endCall }: DemoBookingModalProps) {
    const [transcript, setTranscript] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);

    // User Manual Details
    const [details, setDetails] = useState({
        name: '',
        email: '',
        company: '',
        industry: '',
        problem: ''
    });

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

    // Handle manual form submission per field
    const handleDetailSubmit = (field: keyof typeof details, value: string) => {
        setDetails(prev => ({ ...prev, [field]: value }));

        // Only send to Vapi if actively on a call
        if (callStatus === 'active' && value.trim() !== '' && vapiInstance) {
            const fieldNames: Record<string, string> = {
                name: "Name",
                email: "Email",
                company: "Company Name",
                industry: "Industry",
                problem: "Core Problem to Solve"
            };

            const systemMsg = `SYSTEM NOTE: The user has manually typed their ${fieldNames[field]} into the form. Value: "${value}". Do not ask them for this information over voice anymore.`;

            vapiInstance.send({
                type: 'add-message',
                message: {
                    role: 'system',
                    content: systemMsg
                }
            });

            // Add visual feedback to transcript
            setTranscript(prev => [...prev, { role: 'user', text: `*[Typed ${fieldNames[field]}: ${value}]*` }]);
        }
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
                                    <MicOff className="w-4 h-4" />
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
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                            <Mic className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Ready to Book Your Demo?</h3>
                        <p className="text-slate-400 text-sm mb-6 max-w-sm">
                            Click start and simply talk to our AI assistant. It will handle gathering your details and finding a time on our calendar.
                        </p>
                    </div>
                )}

                {/* Active Call UI */}
                {(callStatus === 'active' || transcript.length > 0) && (
                    <div className="flex flex-col flex-grow overflow-hidden relative">
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

                        {/* Fast-track Form Elements (Only visible on active call naturally requested by user) */}
                        {callStatus === 'active' && (
                            <div className="p-4 border-t border-white/10 bg-slate-900/50">
                                <p className="text-xs text-slate-400 mb-3 text-center">Optional: Type details manually to speed up the process</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Name"
                                            value={details.name}
                                            onChange={(e) => handleDetailSubmit('name', e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                        <input
                                            type="email"
                                            placeholder="Email"
                                            value={details.email}
                                            onChange={(e) => handleDetailSubmit('email', e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Company"
                                            value={details.company}
                                            onChange={(e) => handleDetailSubmit('company', e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Industry"
                                            value={details.industry}
                                            onChange={(e) => handleDetailSubmit('industry', e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
