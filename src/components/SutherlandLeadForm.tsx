"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Loader2, 
    CheckCircle, 
    ArrowRight, 
    Sparkles, 
    ShieldCheck, 
    Mail, 
    Building2, 
    User, 
    Phone, 
    Globe, 
    Target,
    ArrowLeft,
    Monitor,
    Calendar,
    PhoneCall
} from 'lucide-react';
import { sendGAEvent } from '@next/third-parties/google';

const INDUSTRIES = [
    "Retail & E-commerce",
    "Financial Services & Fintech",
    "Healthcare & Life Sciences",
    "Technology & Software",
    "Manufacturing & Logistics",
    "Education & EdTech",
    "Hospitality & Travel",
    "Public Sector & Government",
    "Real Estate & Construction",
    "Energy & Utilities",
    "Media & Entertainment",
    "Professional Services"
];

const INTERESTS = [
    { id: "Customer Support", label: "Customer Support", desc: "24/7 resolution & CRM sync" },
    { id: "Sales/Lead Gen", label: "Sales & Growth", desc: "Outbound qualifying & booking" },
    { id: "Operations", label: "Internal Ops", desc: "Process automation & data entry" }
];

export default function SutherlandLeadForm() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        phone: '',
        industry: '',
        interest: 'Customer Support'
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [generatedAgent, setGeneratedAgent] = useState<{ id: string, link: string } | null>(null);

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMessage('');

        sendGAEvent('event', 'sutherland_lead_full_submit', {
            category: 'acquisition',
            action: 'submit_full',
            label: formData.industry,
            company: formData.company,
        });

        try {
            const res = await fetch('/api/generate-lead-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    deliveryOption: 'email', // Default for background gen
                    language: 'English',
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate agent.');
            }

            setGeneratedAgent({ id: data.assistantId, link: data.testLink });
            setStatus('success');
            
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMessage(err.message || 'Something went wrong. Please try again.');
        }
    };

    const handleCallMeNow = async () => {
        if (!formData.phone) return;
        
        // Soft loading state for the call button
        sendGAEvent('event', 'sutherland_direct_call_request', {
            company: formData.company,
            interest: formData.interest
        });

        try {
            await fetch('/api/generate-lead-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    deliveryOption: 'call',
                    language: 'English',
                }),
            });
            alert("Call initiated! Your phone should ring shortly.");
        } catch (err) {
            console.error("Call trigger failed", err);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
                        className="glass-card p-10 rounded-[2.5rem] text-center border-[#CC0000]/30 overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#CC0000]/5 to-transparent pointer-events-none" />
                        
                        <div className="bg-green-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                        
                        <h3 className="text-3xl font-bold text-white mb-2 font-display uppercase tracking-tight">Agent Deployed.</h3>
                        <p className="text-gray-400 text-sm mb-8 font-medium">
                            Intelligence profile active for <span className="text-white">{formData.company}</span>.
                        </p>

                        <div className="space-y-4 mb-8">
                            <button
                                onClick={handleCallMeNow}
                                className="w-full bg-[#CC0000] hover:bg-[#AA0000] text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all animate-pulse-red group"
                            >
                                <PhoneCall className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span>Call My Phone Now</span>
                            </button>
                            
                            <a
                                href={generatedAgent?.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all"
                            >
                                <Monitor className="w-5 h-5" />
                                <span>Interact Online</span>
                            </a>
                        </div>

                        <div className="pt-6 border-t border-white/5">
                            <button
                                onClick={() => window.open('https://calendly.com/alok-ranjan-tellyourjourney/30min', '_blank')}
                                className="text-[#CC0000] hover:text-white transition-colors text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 mx-auto"
                            >
                                <Calendar className="w-4 h-4" />
                                Book Strategy Session
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: step === 1 ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: step === 1 ? 20 : -20 }}
                        className="glass-card p-8 lg:p-10 rounded-[2.5rem] border-white/10 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#CC0000]/5 via-transparent to-transparent pointer-events-none" />

                        <div className="mb-10 relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CC0000]/10 border border-[#CC0000]/20 text-[#CC0000] text-[10px] font-black uppercase tracking-[0.2em]">
                                    <Sparkles className="w-3 h-3" />
                                    Phase {step === 1 ? '01: Identity' : '02: Configuration'}
                                </div>
                                <div className="flex gap-1">
                                    <div className={`w-6 h-1 rounded-full ${step === 1 ? 'bg-[#CC0000]' : 'bg-white/10'}`} />
                                    <div className={`w-6 h-1 rounded-full ${step === 2 ? 'bg-[#CC0000]' : 'bg-white/10'}`} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2 font-display tracking-tighter">
                                {step === 1 ? 'The Agentic Enterprise' : 'Configure Your AI'}
                            </h3>
                            <p className="text-gray-400 text-sm font-medium">
                                {step === 1 ? 'Start your high-fidelity deployment.' : 'Tailor the intelligence to your legacy systems.'}
                            </p>
                        </div>

                        <form onSubmit={step === 1 ? handleNext : handleSubmit} className="space-y-6 relative">
                            {step === 1 ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                                            <User className="w-3 h-3" />
                                            Full Name
                                        </label>
                                        <input
                                            required name="name" value={formData.name} onChange={handleChange}
                                            className="glass-input w-full"
                                            placeholder="Lead Decision Maker"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                                            <Mail className="w-3 h-3" />
                                            Work Email
                                        </label>
                                        <input
                                            required type="email" name="email" value={formData.email} onChange={handleChange}
                                            className="glass-input w-full"
                                            placeholder="name@enterprise.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                                            <Building2 className="w-3 h-3" />
                                            Company Name
                                        </label>
                                        <input
                                            required name="company" value={formData.company} onChange={handleChange}
                                            className="glass-input w-full"
                                            placeholder="e.g. Sutherland"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                                                <Phone className="w-3 h-3" />
                                                Phone Number
                                            </label>
                                            <input
                                                required type="tel" name="phone" value={formData.phone} onChange={handleChange}
                                                className="glass-input w-full"
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                                                <Globe className="w-3 h-3" />
                                                Industry
                                            </label>
                                            <select
                                                required name="industry" value={formData.industry} onChange={handleChange}
                                                className="glass-input w-full appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled className="bg-[#0a1628]">Select Industry</option>
                                                {INDUSTRIES.map(i => <option key={i} value={i} className="bg-[#0a1628]">{i}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                                            <Target className="w-3 h-3" />
                                            Area of Interest
                                        </label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {INTERESTS.map(item => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setFormData(p => ({ ...p, interest: item.id }))}
                                                    className={`p-4 rounded-2xl border text-left transition-all relative group ${
                                                        formData.interest === item.id 
                                                        ? 'bg-[#CC0000]/10 border-[#CC0000] ring-1 ring-[#CC0000]' 
                                                        : 'bg-white/5 border-white/5 hover:border-white/20'
                                                    }`}
                                                >
                                                    <div className="font-bold text-sm mb-1">{item.label}</div>
                                                    <div className="text-[10px] text-gray-500 font-medium">{item.desc}</div>
                                                    {formData.interest === item.id && (
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                            <CheckCircle className="w-4 h-4 text-[#CC0000]" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {status === 'error' && (
                                <p className="text-red-400 text-xs bg-red-400/10 p-4 rounded-2xl border border-red-400/20 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                    {errorMessage}
                                </p>
                            )}

                            <div className="pt-4 flex items-center gap-4">
                                {step === 2 && (status !== 'loading') && (
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="p-5 rounded-2xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="flex-1 bg-[#CC0000] hover:bg-[#AA0000] text-white font-black py-5 px-8 rounded-2xl shadow-2xl shadow-[#CC0000]/20 flex items-center justify-center transition-all disabled:opacity-70 disabled:cursor-not-allowed group uppercase tracking-widest text-xs"
                                >
                                    {status === 'loading' ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <span className="mr-3">
                                                {step === 1 ? 'Next: Configure Agent' : 'Generate My Agent'}
                                            </span>
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                            <ShieldCheck className="w-4 h-4 text-green-500/40" />
                            Secure Enterprise Node · ISO 27001
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
