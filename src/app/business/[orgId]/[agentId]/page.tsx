'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Script from 'next/script';
import { AgentConfiguration } from '@/types';

export default function BusinessLandingPage() {
    const params = useParams();
    const orgId = params.orgId as string;
    const agentId = params.agentId as string;

    const [config, setConfig] = useState<AgentConfiguration | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [errorDetails, setErrorDetails] = useState<any>(null);

    // 1. Hook for fetching configuration
    useEffect(() => {
        async function fetchConfig() {
            try {
                const response = await fetch(`/api/agent/${orgId}/${agentId}`);
                
                // Defensive check before parsing JSON
                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    const text = await response.text();
                    console.error("Non-JSON response received:", text.substring(0, 100));
                    throw new Error(`Server returned non-JSON response (${response.status})`);
                }

                const data = await response.json();

                if (!response.ok) {
                    setError(true);
                    setErrorDetails(data);
                    setLoading(false);
                    return;
                }

                setConfig(data as AgentConfiguration);
            } catch (err: any) {
                console.error('Error fetching config:', err);
                setError(true);
                setErrorDetails({ message: err.message || 'Unknown network error' });
            } finally {
                setLoading(false);
            }
        }

        fetchConfig();
    }, [orgId, agentId]);

    // Derived variables used in effects and render
    const vapiPublicKey = typeof window !== 'undefined'
        ? (window as any).NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '3413ee7b-c5f5-4dc3-93f1-a2185da2aa15'
        : '';

    const vapiAssistantId = (config?.vapi as any)?.assistantId || '';

    // Log VAPI status for debugging
    useEffect(() => {
        if (loading) return;
        console.log(`[VAPI Debug] Public Key Present: ${!!vapiPublicKey}, Assistant ID: ${vapiAssistantId}`);
    }, [loading, vapiPublicKey, vapiAssistantId]);

    // 2. Hook for voice widget attachment
    useEffect(() => {
        // Only attach if we have valid VAPI configuration
        if (!vapiPublicKey || !vapiAssistantId) {
            console.warn('VAPI configuration missing, voice button will not be functional');
            return;
        }

        // Configure the voice widget
        if (typeof window !== 'undefined') {
            const widgetConfig = {
                vapiPublicKey: vapiPublicKey,
                assistantId: vapiAssistantId,
                orgId: orgId,
                agentId: agentId,
                position: 'bottom-right',
                primaryColor: '#667eea',
                secondaryColor: '#764ba2'
            };
            
            (window as any).VOICE_WIDGET_CONFIG = widgetConfig;
            
            // Notify the widget if it's already loaded
            window.dispatchEvent(new CustomEvent('VOICE_WIDGET_UPDATE', { 
                detail: widgetConfig 
            }));
        }

        const attachVoiceHandler = () => {
            const voiceBtn = document.getElementById('voiceCallBtn');
            const widgetBtn = document.getElementById('voiceWidgetBtn');
            const startBtn = document.getElementById('voiceWidgetStartBtn');

            if (voiceBtn && widgetBtn && startBtn) {
                const handleClick = () => {
                    const panel = document.getElementById('voiceWidgetPanel');
                    if (panel && !panel.classList.contains('open')) {
                        widgetBtn.click();
                    }
                    setTimeout(() => {
                        startBtn.click();
                    }, 100);
                };

                voiceBtn.addEventListener('click', handleClick);
                return () => {
                    voiceBtn.removeEventListener('click', handleClick);
                };
            }
            return undefined;
        };

        let checkInterval: NodeJS.Timeout | null = null;
        let cleanupHandler: (() => void) | undefined;

        checkInterval = setInterval(() => {
            if (document.getElementById('voiceWidgetBtn')) {
                if (checkInterval) clearInterval(checkInterval);
                cleanupHandler = attachVoiceHandler();
            }
        }, 100);

        return () => {
            if (checkInterval) clearInterval(checkInterval);
            if (cleanupHandler) cleanupHandler();
        };
    }, [vapiPublicKey, vapiAssistantId, orgId, agentId]);

    // Early returns for loading and error states
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a1628] to-[#1a2b4b] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#CC0000] border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-white font-black uppercase tracking-widest text-xs">Synchronizing intelligence...</div>
                </div>
            </div>
        );
    }

    if (error || !config) {
        return (
            <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full">
                    <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[2rem] backdrop-blur-xl">
                        <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Business Not Found</h1>
                        <p className="text-gray-400 text-xs font-medium mb-6">The requested agent could not be synchronized.</p>
                        
                        {errorDetails && (
                            <div className="bg-black/40 p-4 rounded-xl text-left border border-white/5 mb-6">
                                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Debug Info</p>
                                <pre className="text-[9px] text-gray-500 overflow-auto max-h-32 leading-relaxed">
                                    {JSON.stringify(errorDetails, null, 2)}
                                </pre>
                            </div>
                        )}
                        
                        <button 
                            onClick={() => window.location.reload()}
                            className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-xl border border-white/10 transition-all text-xs uppercase tracking-widest"
                        >
                            Retry Connection
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Main render logic starts here
    const businessName = config.metadata?.businessName || 'Our Business';
    const description = config.metadata?.description || 'Welcome to our business';
    const services = Array.isArray(config.services) ? config.services : [];
    const locations = Array.isArray(config.locations) ? config.locations : [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
            {/* Hero Section */}
            <section className="relative overflow-hidden pt-12">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-50"></div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            Agent Live & Trained
                        </div>
                        <h1 className="text-5xl sm:text-7xl font-extrabold text-white tracking-tighter mb-6 leading-[0.9]">
                            {businessName}
                        </h1>
                        <p className="text-xl sm:text-2xl text-indigo-200/70 max-w-2xl mx-auto mb-10 font-medium">
                            {description}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                id="voiceCallBtn"
                                className="px-10 py-5 bg-white text-indigo-950 font-black rounded-2xl hover:bg-white/90 transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center gap-3 cursor-pointer uppercase tracking-widest text-xs"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                                </svg>
                                Start Voice Conversation
                            </button>
                            {(() => {
                                const phoneNum = (locations.length > 0 && (locations[0] as any).phone) 
                                    || '+18205022243';
                                
                                return (
                                    <a
                                        href={`tel:${phoneNum}`}
                                        className="px-10 py-5 bg-indigo-600/20 backdrop-blur-md border border-indigo-500/30 text-white font-black rounded-2xl hover:bg-indigo-600/30 transition-all hover:scale-105 shadow-xl flex items-center gap-3 uppercase tracking-widest text-xs"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                        </svg>
                                        Inbound: {phoneNum}
                                    </a>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </section>

            {/* AI Training & Intelligence Section (Hidden as requested) */}
            {/* 
            <section className="py-24 relative overflow-hidden">
                ... 
            </section>
            */}

            {/* Services Section */}
            {services.length > 0 && (
                <section className="py-20 bg-white/5 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-4xl font-bold text-white text-center mb-12">Our Services</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {services.map((service, index) => (
                                <div
                                    key={service.id || index}
                                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all hover:scale-105"
                                >
                                    <h3 className="text-2xl font-bold text-white mb-3">{service.name}</h3>
                                    <p className="text-indigo-200 mb-4">{service.description}</p>
                                    {service.durationMinutes && (
                                        <p className="text-sm text-indigo-300">
                                            Duration: {service.durationMinutes} minutes
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Locations Section */}
            {locations.length > 0 && (
                <section className="py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-4xl font-bold text-white text-center mb-12">Visit Us</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {locations.map((location, index) => (
                                <div
                                    key={location.id || index}
                                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8"
                                >
                                    <h3 className="text-2xl font-bold text-white mb-4">{location.name}</h3>
                                    {(location as any).address && (
                                        <p className="text-indigo-200 mb-2 flex items-start gap-2">
                                            <svg className="w-5 h-5 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            </svg>
                                            {(location as any).address}
                                        </p>
                                    )}
                                    {(location as any).phone && (
                                        <p className="text-indigo-200 mb-2 flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                            </svg>
                                            <a href={`tel:${(location as any).phone}`} className="hover:text-white transition-colors">
                                                {(location as any).phone}
                                            </a>
                                        </p>
                                    )}
                                    {(location as any).hours && (
                                        <p className="text-indigo-200 flex items-start gap-2">
                                            <svg className="w-5 h-5 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            {(location as any).hours}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="py-12 bg-black/30 backdrop-blur-sm border-t border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-indigo-300">
                        © {new Date().getFullYear()} {businessName}. All rights reserved.
                    </p>
                    <p className="text-indigo-400 text-sm mt-2">
                        Powered by Voice AI Technology
                    </p>
                </div>
            </footer>

            {/* Voice Bot Widget Script */}
            <Script 
                src="/voice-widget-v3.js" 
                strategy="afterInteractive"
                onLoad={() => {
                    console.log("[Business Page] Voice widget script loaded successfully.");
                    if (vapiPublicKey && vapiAssistantId) {
                        const widgetConfig = {
                            vapiPublicKey: vapiPublicKey,
                            assistantId: vapiAssistantId,
                            orgId: orgId,
                            agentId: agentId,
                            position: 'bottom-right',
                            primaryColor: '#667eea',
                            secondaryColor: '#764ba2'
                        };
                        window.dispatchEvent(new CustomEvent('VOICE_WIDGET_UPDATE', { 
                            detail: widgetConfig
                        }));
                    }
                }}
            />
        </div>
    );
}
