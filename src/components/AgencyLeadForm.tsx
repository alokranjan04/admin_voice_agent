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
];

export default function AgencyLeadForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        website: '',
        companyDetails: '',
        industry: '',
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
        setCallEnded(false); // Reset on new submission

        sendGAEvent('event', 'lead_form_submit', {
            category: 'acquisition',
            action: 'submit',
            label: 'Agency Lead Form',
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

            sendGAEvent('event', 'lead_agent_generated_success', {
                category: 'conversion',
                action: 'generate',
                label: deliveryOption === 'call' ? 'Call Dispatched' : 'Email Sent',
            });

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            sendGAEvent('event', 'lead_agent_generated_error', {
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
                className="bg-white/10 backdrop-blur-xl border border-indigo-500/30 p-8 rounded-2xl shadow-[0_0_40px_rgba(79,70,229,0.1)] text-center relative z-30"
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
                <p className="text-indigo-100 mb-6">
                    {deliveryOption === 'call'
                        ? (callStatus === 'failed'
                            ? `We built your agent, but couldn't trigger the call: ${callError || 'Check server Twilio config'}.`
                            : (callEnded
                                ? `The conversation and summary email has been sent to your email ID (${formData.email}).`
                                : `Your phone (${formData.phone}) should be ringing in seconds with a live call from your new ${formData.company} AI Agent!`)
                        )
                        : `We've built a custom Voice AI agent for ${formData.company}. Check ${formData.email} for the exclusive test link!`
                    }
                </p>

                {generatedServices.length > 0 && (
                    <div className="mb-8 text-left">
                        <h4 className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
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
                                        <div className="mt-1 bg-indigo-500/20 text-indigo-300 p-1.5 rounded-lg group-hover:bg-indigo-500/40 transition-colors">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-white font-semibold text-sm mb-1">{service.name}</div>
                                            <div className="text-indigo-200/70 text-xs leading-relaxed">{service.description}</div>
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
                            setFormData({ name: '', email: '', phone: '', company: '', website: '', companyDetails: '', industry: '' });
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
                        className="bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        Edit & Refine
                    </button>

                    {deliveryOption === 'email' && (
                        <a
                            href="#"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
                className="bg-white/10 backdrop-blur-xl border border-indigo-500/30 p-8 rounded-2xl shadow-[0_0_40px_rgba(79,70,229,0.1)] relative z-30"
            >
                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">Refine Your AI Agent</h3>
                    <p className="text-indigo-100/70 text-sm">Edit the details below to perfect your agent's capabilities before the next call.</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">Core Services / Capabilities</label>
                        <div className="space-y-3">
                            {generatedServices.map((service, idx) => (
                                <div key={idx} className="bg-black/30 border border-white/10 rounded-xl p-3">
                                    <input
                                        className="w-full bg-transparent text-white font-semibold text-sm mb-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
                                        value={service.name}
                                        onChange={(e) => {
                                            const newServices = [...generatedServices];
                                            newServices[idx].name = e.target.value;
                                            setGeneratedServices(newServices);
                                        }}
                                    />
                                    <textarea
                                        className="w-full bg-transparent text-indigo-200/70 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 resize-none"
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
                        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">Company Context</label>
                        <textarea
                            name="companyDetails"
                            value={formData.companyDetails}
                            onChange={handleChange}
                            rows={4}
                            className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                            className="flex-[2] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2"
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
            className="bg-white/10 backdrop-blur-xl border border-indigo-500/40 p-4 lg:p-5 rounded-2xl shadow-[0_0_40px_rgba(79,70,229,0.15)] relative z-20"
        >
            <div className="mb-1.5 text-center sm:text-left">
                <h3 className="text-xl font-bold text-white mb-1">Generate Your Custom AI Agent</h3>
                <p className="text-indigo-100 text-sm">See the magic in action. Instantly build an AI Voice Agent tailored to your exact business needs.</p>

                {/* Progress Indicator */}
                <div className="flex items-center gap-2 mt-2">
                    <div className={`h-1.5 flex-1 rounded-full transition-colors ${currentStep >= 1 ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-white/10'}`} />
                    <div className={`h-1.5 flex-1 rounded-full transition-colors ${currentStep >= 2 ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-white/10'}`} />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5">
                {currentStep === 1 && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-[13px] font-medium text-indigo-100 mb-0.5">Full Name</label>
                            <input
                                required type="text" name="name" value={formData.name} onChange={handleChange}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-1.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Elon Musk"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-medium text-indigo-100 mb-0.5">Work Email</label>
                            <input
                                required type="email" name="email" value={formData.email} onChange={handleChange}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-1.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="elon@tesla.com"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-medium text-indigo-100 mb-0.5">Company Name</label>
                            <input
                                required type="text" name="company" value={formData.company} onChange={handleChange}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-1.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Tesla"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                if (formData.name && formData.email && formData.company) {
                                    setCurrentStep(2);
                                } else {
                                    // Let native form validation or simple alert handle empty fields
                                    if (document.querySelector('form')?.checkValidity()) {
                                        setCurrentStep(2);
                                    } else {
                                        document.querySelector('form')?.reportValidity();
                                    }
                                }
                            }}
                            className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-2.5 px-6 rounded-lg shadow-lg flex items-center justify-center transition-all cursor-pointer"
                        >
                            Continue to Step 2 <ArrowRight className="w-5 h-5 ml-2" />
                        </button>
                    </motion.div>
                )}

                {currentStep === 2 && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-indigo-100 mb-1">Phone Number</label>
                                <input
                                    required type="tel" name="phone" value={formData.phone} onChange={handleChange}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-indigo-100 mb-1">Industry <span className="text-white/30 text-xs">(optional)</span></label>
                                <input
                                    type="text" name="industry" value={formData.industry} onChange={handleChange}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Healthcare, SaaS"
                                />
                            </div>
                        </div>

                        {/* Company Details */}
                        <div>
                            <label className="block text-sm font-medium text-indigo-100 mb-1">What does your company do? <span className="text-white/30 text-xs">(optional)</span></label>
                            <textarea
                                name="companyDetails" value={formData.companyDetails} onChange={handleChange} rows={2}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                placeholder="e.g. We help factories get licenses..."
                            />
                        </div>

                        {/* Row 4: Agent Language */}
                        <div>
                            <label className="block text-sm font-medium text-indigo-100 mb-2">Agent Language</label>
                            <div className="flex flex-wrap gap-2">
                                {LANGUAGES.map(lang => (
                                    <button
                                        key={lang.code}
                                        type="button"
                                        onClick={() => setLanguage(lang.code)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-semibold text-xs transition-all ${language === lang.code
                                            ? 'border-indigo-400 bg-indigo-500/30 text-white scale-105'
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
                            <label className="block text-sm font-medium text-indigo-100 mb-2">How would you like to receive your agent?</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDeliveryOption('email')}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 font-semibold text-xs transition-all ${deliveryOption === 'email'
                                        ? 'border-indigo-400 bg-indigo-500/30 text-white'
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
                                        ? 'border-purple-400 bg-purple-500/30 text-white'
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

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setCurrentStep(1)}
                                className="px-5 py-3 rounded-lg border border-white/10 bg-black/20 text-white/80 hover:bg-black/40 hover:text-white transition-all text-sm font-semibold border-b-4 border-b-black/50 active:border-b-0 active:translate-y-[4px]"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm border-b-4 border-b-indigo-800 active:border-b-0 active:translate-y-[4px]"
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
                    </motion.div>
                )}
            </form>
        </motion.div>
    );
}
