"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, ArrowRight, Phone, Mail, Sparkles } from 'lucide-react';
import { sendGAEvent } from '@next/third-parties/google';

type DeliveryOption = 'email' | 'call';

const LANGUAGES = [
    { code: 'English', flag: '🇬🇧', label: 'English' },
    { code: 'Hindi', flag: '🇮🇳', label: 'Hinglish' },
    { code: 'French', flag: '🇫🇷', label: 'Français' },
    { code: 'German', flag: '🇩🇪', label: 'Deutsch' },
    { code: 'Spanish', flag: '🇪🇸', label: 'Español' },
    { code: 'Arabic', flag: '🇸🇦', label: 'العربية' },
];

export default function SutherlandLeadForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: 'Sutherland Global', // Hardcoded for this specific page
        website: 'sutherlandglobal.com',
        companyDetails: 'We are a digital transformation company providing BPO and customer experience solutions.',
        industry: 'BPO & Customer Experience',
    });
    const [language, setLanguage] = useState('English');
    const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('email');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [generatedServices, setGeneratedServices] = useState<Array<{ name: string, description: string }>>([]);
    const [callStatus, setCallStatus] = useState<string>('not_requested');
    const [callError, setCallError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [assistantId, setAssistantId] = useState<string | null>(null);
    const [callEnded, setCallEnded] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status === 'success' && deliveryOption === 'call' && assistantId && !callEnded) {
            // Poll for call completion
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/check-call-status?assistantId=${assistantId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === 'completed') {
                            setCallEnded(true);
                            clearInterval(interval);
                        }
                    }
                } catch (e) {
                    console.error('Failed to poll call status', e);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [status, deliveryOption, assistantId, callEnded]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setStatus('loading');
        setErrorMessage('');
        setIsEditing(false);
        setCallEnded(false); 

        sendGAEvent('event', 'sutherland_lead_form_submit', {
            category: 'acquisition',
            action: 'submit',
            label: 'Sutherland Lead Form',
            company: formData.company,
            delivery: deliveryOption,
            language,
        });

        try {
            const res = await fetch('/api/generate-lead-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    deliveryOption,
                    language,
                    services: isEditing ? generatedServices : undefined // Send custom services if editing
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate agent.');
            }

            setGeneratedServices(data.services || []);
            setCallStatus(data.callStatus || 'not_requested');
            setCallError(data.callError || null);
            setAssistantId(data.assistantId || null);
            setStatus('success');

            sendGAEvent('event', 'sutherland_agent_generated_success', {
                category: 'conversion',
                action: 'generate',
                label: deliveryOption === 'call' ? 'Call Dispatched' : 'Email Sent',
            });

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            sendGAEvent('event', 'sutherland_agent_generated_error', {
                category: 'error',
                action: 'generate_failed',
                label: err.message,
            });
            setErrorMessage(err.message || 'Something went wrong. Please try again.');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const [currentStep, setCurrentStep] = useState<1 | 2>(1);

    if (status === 'success' && !isEditing) {
        return (
            <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-xl border border-blue-500/30 p-8 rounded-2xl shadow-[0_0_40px_rgba(37,99,235,0.1)] text-center relative z-30"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                >
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-2">
                    {deliveryOption === 'call'
                        ? (callStatus === 'failed' ? 'Agent Ready, but Call Failed ⚠️' : (callEnded ? 'Call Ended ✅' : 'Calling You Now! 📞'))
                        : 'Agent Generated! 🚀'
                    }
                </h3>
                <p className="text-blue-100 mb-6">
                    {deliveryOption === 'call'
                        ? (callStatus === 'failed'
                            ? `We built your agent, but couldn't trigger the call: ${callError || 'Check server Twilio config'}.`
                            : (callEnded
                                ? `The conversation and summary email has been sent to your email ID (${formData.email}).`
                                : `Your phone (${formData.phone}) should be ringing in seconds with a live call from your new Sutherland Global AI Agent!`)
                        )
                        : `We've built a custom Voice AI agent for Sutherland Global. Check ${formData.email} for the exclusive test link!`
                    }
                </p>

                {generatedServices.length > 0 && (
                    <div className="mb-8 text-left">
                        <h4 className="text-blue-300 text-xs font-bold uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
                            AI Agent Capabilities
                        </h4>
                        <div className="space-y-3">
                            {generatedServices.map((service, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-all group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-blue-500/20 text-blue-300 p-1.5 rounded-lg group-hover:bg-blue-500/40 transition-colors">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-white font-semibold text-sm mb-1">{service.name}</div>
                                            <div className="text-blue-200/70 text-xs leading-relaxed">{service.description}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => {
                            setStatus('idle');
                            setFormData({ 
                                name: '', email: '', phone: '', 
                                company: 'Sutherland Global', 
                                website: 'sutherlandglobal.com', 
                                companyDetails: 'We are a digital transformation company providing BPO and customer experience solutions.', 
                                industry: 'BPO & Customer Experience' 
                            });
                            setDeliveryOption('email');
                            setLanguage('English');
                            setGeneratedServices([]);
                            setCallStatus('not_requested');
                            setCallError(null);
                            setCurrentStep(1);
                        }}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                    >
                        Build New
                    </button>

                    <button
                        onClick={() => setIsEditing(true)}
                        className="bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        Edit & Refine
                    </button>

                    {deliveryOption === 'email' && (
                        <a
                            href="#"
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            Open Dashboard <ArrowRight className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </motion.div>
        );
    }

    if (isEditing) {
        return (
            <motion.div
                key="editing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/10 backdrop-blur-xl border border-blue-500/30 p-8 rounded-2xl shadow-[0_0_40px_rgba(37,99,235,0.1)] relative z-30"
            >
                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">Refine Sutherland AI Agent</h3>
                    <p className="text-blue-100/70 text-sm">Edit the details below to perfect your agent's capabilities before the next call.</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-blue-300 uppercase tracking-widest mb-2">Core Services / Capabilities</label>
                        <div className="space-y-3">
                            {generatedServices.map((service, idx) => (
                                <div key={idx} className="bg-black/30 border border-white/10 rounded-xl p-3">
                                    <input
                                        className="w-full bg-transparent text-white font-semibold text-sm mb-1 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                                        value={service.name}
                                        onChange={(e) => {
                                            const newServices = [...generatedServices];
                                            newServices[idx].name = e.target.value;
                                            setGeneratedServices(newServices);
                                        }}
                                    />
                                    <textarea
                                        className="w-full bg-transparent text-blue-200/70 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 resize-none"
                                        rows={2}
                                        value={service.description}
                                        onChange={(e) => {
                                            const newServices = [...generatedServices];
                                            newServices[idx].description = e.target.value;
                                            setGeneratedServices(newServices);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-blue-300 uppercase tracking-widest mb-2">Sutherland Context</label>
                        <textarea
                            name="companyDetails"
                            value={formData.companyDetails}
                            onChange={handleChange}
                            rows={4}
                            className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl font-bold transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => handleSubmit()}
                            className="flex-[2] bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2"
                        >
                            <Phone className="w-5 h-5" />
                            Update & Call Me Now
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-xl border border-blue-500/40 p-4 lg:p-5 rounded-2xl shadow-[0_0_40px_rgba(37,99,235,0.15)] relative z-20"
        >
            <div className="mb-1.5 text-center sm:text-left">
                <h3 className="text-xl font-bold text-white mb-1">Generate Sutherland AI Agent</h3>
                <p className="text-blue-100 text-sm">Experience Sutherland Global's enterprise voice AI solutions directly on your phone.</p>

                {/* Progress Indicator */}
                <div className="flex items-center gap-2 mt-2">
                    <div className={`h-1.5 flex-1 rounded-full text-blue-500 bg-blue-500`} />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[13px] font-medium text-blue-100 mb-0.5">Full Name</label>
                        <input
                            required type="text" name="name" value={formData.name} onChange={handleChange}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-1.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-[13px] font-medium text-blue-100 mb-0.5">Work Email</label>
                        <input
                            required type="email" name="email" value={formData.email} onChange={handleChange}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-1.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="john@example.com"
                        />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-blue-100 mb-1">Phone Number</label>
                    <input
                        required type="tel" name="phone" value={formData.phone} onChange={handleChange}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+1 (555) 000-0000"
                    />
                </div>

                {/* Row 4: Agent Language */}
                <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">Agent Language</label>
                    <div className="flex flex-wrap gap-2">
                        {LANGUAGES.map(lang => (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => setLanguage(lang.code)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-semibold text-xs transition-all ${language === lang.code
                                    ? 'border-blue-400 bg-blue-500/30 text-white scale-105'
                                    : 'border-white/10 bg-black/20 text-white/50 hover:border-white/30'
                                    }`}
                            >
                                <span className="text-sm">{lang.flag}</span>
                                {lang.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-blue-100 mb-2">How would you like to receive your agent?</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setDeliveryOption('email')}
                            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 font-semibold text-xs transition-all ${deliveryOption === 'email'
                                ? 'border-blue-400 bg-blue-500/30 text-white'
                                : 'border-white/10 bg-black/20 text-white/50 hover:border-white/30'
                                }`}
                        >
                            <Mail className="w-3.5 h-3.5" />
                            Email Me
                        </button>
                        <button
                            type="button"
                            onClick={() => setDeliveryOption('call')}
                            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 font-semibold text-xs transition-all ${deliveryOption === 'call'
                                ? 'border-cyan-400 bg-cyan-500/30 text-white'
                                : 'border-white/10 bg-black/20 text-white/50 hover:border-white/30'
                                }`}
                        >
                            <Phone className="w-3.5 h-3.5" />
                            Call Me Now
                        </button>
                    </div>
                </div>

                {status === 'error' && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg border border-red-400/20">
                        {errorMessage}
                    </motion.p>
                )}

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm border-b-4 border-b-blue-800 active:border-b-0 active:translate-y-[4px]"
                    >
                        {status === 'loading' ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                {deliveryOption === 'call' ? 'Calling...' : 'Building...'}
                            </>
                        ) : (
                            <>
                                {deliveryOption === 'call' ? <Phone className="w-5 h-5 mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                                {deliveryOption === 'call' ? 'Call Me With My Agent' : 'Generate Agent'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </motion.div>
    );
}
