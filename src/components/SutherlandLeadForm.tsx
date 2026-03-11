"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, ArrowRight, Sparkles, ShieldCheck, Mail, Building2, User } from 'lucide-react';
import { sendGAEvent } from '@next/third-parties/google';

export default function SutherlandLeadForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMessage('');

        sendGAEvent('event', 'sutherland_lead_form_submit', {
            category: 'acquisition',
            action: 'submit',
            label: 'Premium Sutherland Form',
            company: formData.company,
        });

        try {
            const res = await fetch('/api/generate-lead-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    deliveryOption: 'email',
                    language: 'English',
                    industry: 'Enterprise',
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate agent.');
            }

            setStatus('success');
            sendGAEvent('event', 'sutherland_agent_generated_success', {
                category: 'conversion',
                action: 'generate',
                label: 'Email Dispatch Only',
            });

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMessage(err.message || 'Something went wrong. Please try again.');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="relative w-full max-w-lg mx-auto">
            <AnimatePresence mode="wait">
                {status === 'success' ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass-card p-10 rounded-3xl text-center border-[#CC0000]/30"
                    >
                        <div className="bg-green-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-400" />
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-4 font-display uppercase tracking-tight">Agent Created!</h3>
                        <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                            Account configured for <span className="text-white font-semibold">{formData.company}</span>. 
                            Check your email (<span className="text-white">{formData.email}</span>) for your exclusive agent access link.
                        </p>
                        <button
                            onClick={() => setStatus('idle')}
                            className="text-gray-400 hover:text-white transition-colors text-sm font-medium underline underline-offset-4"
                        >
                            Create another agent
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="glass-card p-8 lg:p-10 rounded-3xl border-white/10 relative overflow-hidden"
                    >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#CC0000]/5 via-transparent to-transparent pointer-events-none" />

                        <div className="mb-8 relative">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CC0000]/10 border border-[#CC0000]/20 text-[#CC0000] text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                                <Sparkles className="w-3 h-3" />
                                Ready in 60s
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2 font-display tracking-tight">Generate Your Agent</h3>
                            <p className="text-gray-400 text-sm font-medium">Step into the Agentic Enterprise.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 relative">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">
                                    <User className="w-3 h-3" />
                                    Full Name
                                </label>
                                <input
                                    required name="name" value={formData.name} onChange={handleChange}
                                    className="glass-input w-full"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">
                                    <Mail className="w-3 h-3" />
                                    Work Email
                                </label>
                                <input
                                    required type="email" name="email" value={formData.email} onChange={handleChange}
                                    className="glass-input w-full"
                                    placeholder="john@enterprise.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">
                                    <Building2 className="w-3 h-3" />
                                    Company Name
                                </label>
                                <input
                                    required name="company" value={formData.company} onChange={handleChange}
                                    className="glass-input w-full"
                                    placeholder="e.g. Sutherland"
                                />
                            </div>

                            {status === 'error' && (
                                <p className="text-red-400 text-xs bg-red-400/10 p-3 rounded-xl border border-red-400/20 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                    {errorMessage}
                                </p>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full bg-[#CC0000] hover:bg-[#AA0000] text-white font-black py-5 px-8 rounded-2xl shadow-2xl shadow-[#CC0000]/20 flex items-center justify-center transition-all disabled:opacity-70 disabled:cursor-not-allowed group animate-pulse-red uppercase tracking-widest text-sm"
                                >
                                    {status === 'loading' ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <span className="mr-3">Generate My Agent</span>
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                            <ShieldCheck className="w-4 h-4 text-green-500/40" />
                            Trusted by 50+ Enterprises · ISO 27001
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
