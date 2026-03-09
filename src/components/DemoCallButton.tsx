"use client";

import React, { useState, useEffect } from 'react';
import { sendGAEvent } from '@next/third-parties/google';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import Vapi from '@vapi-ai/web';

export default function DemoCallButton() {
    const [vapi, setVapi] = useState<any>(null);
    const [callStatus, setCallStatus] = useState<'idle' | 'loading' | 'active'>('idle');
    const [isPulsing, setIsPulsing] = useState(false);

    const vapiPublicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.VITE_VAPI_PUBLIC_KEY || "fb3fd3dd-8d96-419b-a794-2ec5055b40d5";

    useEffect(() => {
        if (!vapiPublicKey) return;

        const vapiInstance = new Vapi(vapiPublicKey);
        setVapi(vapiInstance);

        vapiInstance.on('call-start', () => {
            setCallStatus('active');
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

    const toggleDemoCall = async () => {
        sendGAEvent('event', 'book_demo_click', { category: 'engagement', label: 'Header Voice Demo CTA' });

        if (!vapi) return;

        if (callStatus === 'active') {
            vapi.stop();
        } else {
            setCallStatus('loading');
            try {
                // Generate the tailored demo agent
                const res = await fetch('/api/generate-demo-agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!res.ok) throw new Error('Failed to generate demo agent');

                const data = await res.json();
                const assistantId = data.assistantId;

                // Start the call
                await vapi.start(assistantId);
            } catch (err) {
                console.error("Failed to start Demo Voice call:", err);
                setCallStatus('idle');
            }
        }
    };

    return (
        <div className="relative flex items-center justify-center">
            {callStatus === 'active' && (
                <>
                    <div className={`absolute w-full h-full rounded-full border-2 border-rose-500/30 transition-all duration-300 ${isPulsing ? 'scale-150 opacity-0 animate-ping' : 'scale-110 opacity-100'}`} />
                    <div className={`absolute w-full h-full rounded-full border border-red-500/50 transition-all duration-300 ${isPulsing ? 'scale-125 opacity-20 animate-ping animation-delay-150' : 'scale-100 opacity-100'}`} />
                </>
            )}

            <button
                onClick={toggleDemoCall}
                disabled={callStatus === 'loading'}
                className={`relative z-20 flex items-center justify-center px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-500 shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer ${callStatus === 'active'
                        ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white hover:shadow-red-500/40 animate-pulse px-4'
                        : 'bg-white text-slate-900 hover:scale-105'
                    }`}
            >
                {callStatus === 'loading' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : callStatus === 'active' ? (
                    <div className="flex items-center gap-2">
                        <MicOff className="w-4 h-4" />
                        <span>End Call</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-indigo-600" />
                        <span>Book a Demo</span>
                    </div>
                )}
            </button>
        </div>
    );
}
