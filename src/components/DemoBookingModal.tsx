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
            <div className="relative w-full max-w-5xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl shadow-indigo-500/10 overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[600px]">

                {/* Close Button */}
                <button
                    onClick={() => {
                        if (callStatus === 'active') endCall();
                        onClose();
                    }}
                    className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Left Panel: Form */}
                <div className="w-full md:w-1/2 p-6 lg:p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/10 bg-slate-900/50 relative overflow-y-auto">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />

                    <h2 className="text-2xl font-bold text-white mb-2 relative z-10">Your Details</h2>
                    <p className="text-slate-400 text-sm mb-8 relative z-10">
                        You can speak with the AI or type your details here manually to speed things up.
                    </p>

                    <div className="space-y-4 relative z-10">
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={details.name}
                                onChange={(e) => handleDetailSubmit('name', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="email"
                                placeholder="Work Email"
                                value={details.email}
                                onChange={(e) => handleDetailSubmit('email', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Company Name"
                                value={details.company}
                                onChange={(e) => handleDetailSubmit('company', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Industry"
                                value={details.industry}
                                onChange={(e) => handleDetailSubmit('industry', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <textarea
                                placeholder="Main problem you want to solve..."
                                value={details.problem}
                                onChange={(e) => handleDetailSubmit('problem', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white resize-none h-24 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Panel: Voice AI Control & Transcript */}
                <div className="w-full md:w-1/2 flex flex-col bg-slate-950 relative">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
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
                    </div>

                    {/* Chat Transcript Area */}
                    <div className="flex-grow p-6 overflow-y-auto space-y-4">
                        {transcript.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 opacity-50">
                                <MessageSquare className="w-10 h-10" />
                                <p className="text-sm">Click "Start Call" to begin speaking.</p>
                            </div>
                        ) : (
                            transcript.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                                        : 'bg-white/10 text-slate-200 rounded-tl-sm'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={transcriptEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}
