"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Vapi from '@vapi-ai/web';
import { Mic, MicOff, Loader2, Link2, Download, RefreshCw, BarChart2 } from 'lucide-react';

export default function TestAssistantPage() {
    const params = useParams();
    const assistantId = params.assistantId as string;

    const [vapi, setVapi] = useState<any>(null);
    const [isPulsing, setIsPulsing] = useState(false);
    const [callStatus, setCallStatus] = useState<'idle' | 'loading' | 'active'>('idle');
    const [transcript, setTranscript] = useState<{ role: string, text: string }[]>([]);

    // We expect the user to have NEXT_PUBLIC_VAPI_PUBLIC_KEY in environment
    const vapiPublicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.VITE_VAPI_PUBLIC_KEY || "fb3fd3dd-8d96-419b-a794-2ec5055b40d5"; // Ensure this fallback or required env is properly set 

    useEffect(() => {
        if (!vapiPublicKey) {
            console.error("Vapi Public Key is missing! Voice calls will fail.");
            return;
        }

        const vapiInstance = new Vapi(vapiPublicKey);
        setVapi(vapiInstance);

        vapiInstance.on('call-start', () => {
            setCallStatus('active');
            setTranscript([]);
        });

        vapiInstance.on('call-end', () => {
            setCallStatus('idle');
            setIsPulsing(false);
        });

        vapiInstance.on('speech-start', () => {
            setIsPulsing(true);
        });

        vapiInstance.on('speech-end', () => {
            setIsPulsing(false);
        });

        vapiInstance.on('message', (message: any) => {
            if (message.type === 'transcript' && message.transcriptType === 'final') {
                setTranscript(prev => [...prev, { role: message.role, text: message.transcript }]);
            }
        });

        vapiInstance.on('error', (err: any) => {
            console.error('Vapi Error:', err);
            setCallStatus('idle');
            setIsPulsing(false);
        });

        return () => {
            if (vapiInstance) {
                vapiInstance.stop();
            }
        };
    }, []);

    const toggleCall = async () => {
        if (!vapi) return;

        if (callStatus === 'active') {
            vapi.stop();
        } else {
            setCallStatus('loading');
            try {
                // Initialize the direct VAPI ID generated for this prospect
                await vapi.start(assistantId);
            } catch (err) {
                console.error("Failed to start Vapi call:", err);
                setCallStatus('idle');
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Animations */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] bg-indigo-600" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] bg-purple-600" />
            </div>

            <div className="relative z-10 max-w-2xl w-full flex flex-col items-center">
                <div className="inline-block px-4 py-1.5 rounded-full border border-indigo-400/30 bg-indigo-400/10 text-indigo-300 text-sm font-semibold mb-6 flex items-center shadow-lg">
                    <BarChart2 className="w-4 h-4 mr-2" />
                    Live Demo Environment
                </div>

                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 text-center mb-4">
                    Test Your AI Agent
                </h1>
                <p className="text-indigo-200/70 text-center mb-10 max-w-lg">
                    This completely custom Voice Assistant has been trained using your company details. Tap the microphone and say "Hello" to test its capabilities.
                </p>

                {/* Voice Orb */}
                <div className="relative flex justify-center items-center mb-12">
                    {/* Pulsing ring during speech */}
                    <div className={`absolute w-48 h-48 rounded-full border-2 border-indigo-500/30 transition-all duration-300 ${isPulsing ? 'scale-150 opacity-0 animate-ping' : 'scale-100 opacity-100'}`} />
                    <div className={`absolute w-40 h-40 rounded-full border border-purple-500/50 transition-all duration-300 ${isPulsing ? 'scale-125 opacity-20 animate-ping animation-delay-150' : 'scale-100 opacity-100'}`} />

                    <button
                        onClick={toggleCall}
                        disabled={callStatus === 'loading'}
                        className={`relative z-20 w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${callStatus === 'active'
                                ? 'bg-gradient-to-br from-red-500 to-rose-600 hover:shadow-red-500/40 animate-pulse'
                                : 'bg-gradient-to-br from-indigo-500 to-purple-600 hover:shadow-indigo-500/40 hover:scale-105'
                            }`}
                    >
                        {callStatus === 'loading' ? (
                            <Loader2 className="w-12 h-12 text-white animate-spin" />
                        ) : callStatus === 'active' ? (
                            <MicOff className="w-12 h-12 text-white" />
                        ) : (
                            <Mic className="w-12 h-12 text-white" />
                        )}
                    </button>
                </div>

                <div className="text-center mb-8">
                    <p className={`text-lg font-medium transition-colors ${callStatus === 'active' ? 'text-green-400' : 'text-slate-400'}`}>
                        {callStatus === 'loading' ? 'Connecting to Agent...' : callStatus === 'active' ? 'Call in progress. Speak now.' : 'Tap to start call'}
                    </p>
                </div>

                {/* Live Transcript Box */}
                <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md min-h-[200px] max-h-[300px] overflow-y-auto no-scrollbar shadow-xl">
                    <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Live Transcript</h3>
                    {transcript.length === 0 ? (
                        <p className="text-slate-500 text-sm italic text-center mt-8">Your conversation will appear here...</p>
                    ) : (
                        <div className="space-y-4">
                            {transcript.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 border border-white/10 rounded-tl-none'}`}>
                                        <p className="text-xs opacity-50 mb-1 capitalize">{msg.role === 'assistant' ? 'AI Agent' : 'You'}</p>
                                        <p>{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <p className="text-xs text-slate-500 mt-6 text-center">
                    Agent ID: {assistantId}
                </p>
            </div>
        </div>
    );
}
