"use client";

import React, { useState, useEffect } from 'react';
import { sendGAEvent } from '@next/third-parties/google';
import { Mic, Loader2, CalendarCheck } from 'lucide-react';
import Vapi from '@vapi-ai/web';
import DemoBookingModal from './DemoBookingModal';
interface DemoCallButtonProps {
    customClass?: string;
    text?: string;
}

export default function DemoCallButton({ customClass, text }: DemoCallButtonProps) {
    const [vapi, setVapi] = useState<any>(null);
    const [callStatus, setCallStatus] = useState<'idle' | 'loading' | 'active'>('idle');
    const [isPulsing, setIsPulsing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    const startCall = async () => {
        if (!vapi) return;
        setCallStatus('loading');
        try {
            const res = await fetch('/api/generate-demo-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) throw new Error('Failed to generate demo agent');

            const data = await res.json();
            const assistantId = data.assistantId;

            await vapi.start(assistantId);
        } catch (err) {
            console.error("Failed to start Demo Voice call:", err);
            setCallStatus('idle');
        }
    };

    const endCall = () => {
        if (vapi) {
            vapi.stop();
        }
    };

    const handleOpenModal = () => {
        sendGAEvent('event', 'book_demo_click', { category: 'engagement', label: 'Header Voice Demo CTA' });
        setIsModalOpen(true);
    };

    return (
        <div className="relative flex items-center justify-center">
            {callStatus === 'active' && !isModalOpen && (
                <>
                    <div className={`absolute w-full h-full rounded-full border-2 border-rose-500/30 transition-all duration-300 ${isPulsing ? 'scale-150 opacity-0 animate-ping' : 'scale-110 opacity-100'}`} />
                    <div className={`absolute w-full h-full rounded-full border border-red-500/50 transition-all duration-300 ${isPulsing ? 'scale-125 opacity-20 animate-ping animation-delay-150' : 'scale-100 opacity-100'}`} />
                </>
            )}

            <button
                onClick={handleOpenModal}
                className={customClass || "relative z-20 flex items-center justify-center px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl cursor-pointer bg-[#CC0000] text-white hover:bg-[#AA0000] hover:scale-105 shadow-red-900/40 active:scale-95"}
            >
                <div className="flex items-center gap-2">
                    {callStatus === 'active' ? (
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    ) : (
                        <Mic className={customClass ? "w-5 h-5 text-white" : "w-4 h-4 text-white"} />
                    )}
                    <span className="hidden sm:inline">{text || 'Book a Demo'}</span>
                    <span className="sm:hidden">{text ? text : <CalendarCheck className="w-4 h-4" />}</span>
                </div>
            </button>

            <DemoBookingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                vapiInstance={vapi}
                callStatus={callStatus}
                startCall={startCall}
                endCall={endCall}
            />
        </div>
    );
}
