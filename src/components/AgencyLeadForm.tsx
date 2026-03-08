"use client";

import React, { useState } from 'react';
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMessage('');

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
                body: JSON.stringify({ ...formData, deliveryOption, language }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate agent.');
            }

            setGeneratedServices(data.services || []);
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

    if (status === 'success') {
        return (
            <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl text-center relative z-30"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                >
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-2">
                    {deliveryOption === 'call' ? 'Calling You Now! 📞' : 'Agent Generated! 🚀'}
                </h3>
                <p className="text-indigo-100 mb-6">
                    {deliveryOption === 'call'
                        ? `Your phone (${formData.phone}) should be ringing in seconds with a live call from your new ${formData.company} AI Agent!`
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
                        }}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                    >
                        Build Another
                    </button>
                    {deliveryOption === 'email' && (
                        <a
                            href="https://vapi.ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            Open Dashboard <ArrowRight className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl relative z-20"
        >
            <div className="mb-6 text-center sm:text-left">
                <h3 className="text-2xl font-bold text-white mb-2">Get Your Free AI Agent</h3>
                <p className="text-indigo-100 text-sm">See the magic in action. Enter your details and we'll instantly generate a custom AI Voice Agent for your business.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Name + Company */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-indigo-100 mb-1">Full Name</label>
                        <input
                            required type="text" name="name" value={formData.name} onChange={handleChange}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Elon Musk"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-indigo-100 mb-1">Company Name</label>
                        <input
                            required type="text" name="company" value={formData.company} onChange={handleChange}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Tesla"
                        />
                    </div>
                </div>

                {/* Row 2: Email + Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-indigo-100 mb-1">Work Email</label>
                        <input
                            required type="email" name="email" value={formData.email} onChange={handleChange}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="elon@tesla.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-indigo-100 mb-1">Phone Number</label>
                        <input
                            required type="tel" name="phone" value={formData.phone} onChange={handleChange}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>
                </div>

                {/* Row 3: Company Website + Industry */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-indigo-100 mb-1">Company Website <span className="text-white/30 text-xs">(optional)</span></label>
                        <input
                            type="url" name="website" value={formData.website} onChange={handleChange}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="https://tesla.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-indigo-100 mb-1">Industry <span className="text-white/30 text-xs">(optional)</span></label>
                        <input
                            type="text" name="industry" value={formData.industry} onChange={handleChange}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. Legal & Compliance, Healthcare, SaaS"
                        />
                    </div>
                </div>

                {/* Company Details */}
                <div>
                    <label className="block text-sm font-medium text-indigo-100 mb-1">What does your company do? <span className="text-white/30 text-xs">(optional but helps the AI)</span></label>
                    <textarea
                        name="companyDetails" value={formData.companyDetails} onChange={handleChange} rows={3}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        placeholder="e.g. We help factories get Factories Act licenses, ESI & PF compliance, Pollution NOC, Fire Safety NOC, and more across UP..."
                    />
                </div>

                {/* Row 4: Agent Language */}
                <div>
                    <label className="block text-sm font-medium text-indigo-100 mb-3">Agent Language</label>
                    <div className="flex flex-wrap gap-2">
                        {LANGUAGES.map(lang => (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => setLanguage(lang.code)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 font-semibold text-xs transition-all ${language === lang.code
                                    ? 'border-indigo-400 bg-indigo-500/30 text-white scale-105'
                                    : 'border-white/10 bg-black/20 text-white/50 hover:border-white/30'
                                    }`}
                            >
                                <span className="text-base">{lang.flag}</span>
                                {lang.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-indigo-100 mb-3">How would you like to receive your agent?</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setDeliveryOption('email')}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${deliveryOption === 'email'
                                ? 'border-indigo-400 bg-indigo-500/30 text-white'
                                : 'border-white/10 bg-black/20 text-white/50 hover:border-white/30'
                                }`}
                        >
                            <Mail className="w-4 h-4" />
                            Email Me the Agent
                        </button>
                        <button
                            type="button"
                            onClick={() => setDeliveryOption('call')}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${deliveryOption === 'call'
                                ? 'border-purple-400 bg-purple-500/30 text-white'
                                : 'border-white/10 bg-black/20 text-white/50 hover:border-white/30'
                                }`}
                        >
                            <Phone className="w-4 h-4" />
                            Call Me Now
                        </button>
                    </div>
                </div>

                {status === 'error' && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg border border-red-400/20">
                        {errorMessage}
                    </motion.p>
                )}

                <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {status === 'loading' ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            {deliveryOption === 'call' ? 'Calling You...' : 'Building Your AI...'}
                        </>
                    ) : (
                        <>
                            {deliveryOption === 'call' ? <Phone className="w-5 h-5 mr-2" /> : <ArrowRight className="w-5 h-5 ml-2 order-last" />}
                            {deliveryOption === 'call' ? 'Call Me with My Agent' : 'Generate & Email My Agent'}
                        </>
                    )}
                </button>
                <p className="text-xs text-white/40 text-center mt-2">
                    {deliveryOption === 'call'
                        ? '~5 seconds to build, then your phone will ring.'
                        : 'Takes ~5 seconds to build. We will email you the secure link.'}
                </p>
            </form>
        </motion.div>
    );
}
