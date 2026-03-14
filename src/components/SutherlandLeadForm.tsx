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
    Monitor,
    Calendar,
    PhoneCall,
    Headphones,
    TrendingUp,
    Settings,
    Workflow,
    Briefcase
} from 'lucide-react';
import { sendGAEvent } from '@next/third-parties/google';

const INDUSTRIES = [
    "Retail & E-commerce",
    "Financial Services",
    "Healthcare",
    "Technology",
    "Manufacturing",
    "Education",
    "Hospitality",
    "Public Sector",
    "Real Estate",
    "Energy & Utilities",
    "Media & Entertainment",
    "Professional Services"
];
const LANGUAGES = [
    "English",
    "Hindi",
    "French",
    "German",
    "Spanish",
    "Arabic"
];

const INTERESTS = [
    { id: "Customer Support", label: "Support", fullLabel: "Customer Support", icon: Headphones, desc: "Digital CX" },
    { id: "Sales/Lead Gen", label: "Sales", fullLabel: "Sales & Growth", icon: TrendingUp, desc: "Lead Gen" },
    { id: "Operations", label: "Ops", fullLabel: "Operations", icon: Workflow, desc: "Process AI" }
];

export default function SutherlandLeadForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        phone: '',
        industry: '',
        language: 'English',
        interest: 'Customer Support'
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [generatedAgent, setGeneratedAgent] = useState<{ id: string, link: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMessage('');

        sendGAEvent('event', 'sutherland_lead_submit', {
            category: 'acquisition',
            action: 'submit',
            label: formData.industry,
            company: formData.company,
        });

        try {
            const res = await fetch('/api/generate-lead-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    deliveryOption: 'call',
                    isSutherland: true
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
        
        try {
            await fetch('/api/generate-lead-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    deliveryOption: 'call',
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
        <div className="relative w-full max-w-[480px] lg:mr-0 lg:ml-auto">
            <AnimatePresence mode="wait">
                {status === 'success' ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-8 rounded-[2rem] text-center border-[#CC0000]/30 overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#CC0000]/5 to-transparent pointer-events-none" />
                        <div className="bg-green-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 font-display uppercase tracking-tight">Agent Deployed.</h3>
                        <p className="text-gray-400 text-xs mb-8 font-medium">
                            Intelligence profile active for <span className="text-white">{formData.company}</span>.
                        </p>
                        <div className="space-y-3 mb-6">
                            <button
                                onClick={handleCallMeNow}
                                className="w-full bg-[#CC0000] hover:bg-[#AA0000] text-white font-black py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 transition-all animate-pulse-red group text-xs uppercase tracking-widest"
                            >
                                <PhoneCall className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span>Call Me Now</span>
                            </button>
                            <a
                                href={generatedAgent?.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 transition-all text-xs uppercase tracking-widest"
                            >
                                <Monitor className="w-4 h-4" />
                                <span>Interact Online</span>
                            </a>
                        </div>
                        <div className="pt-6 border-t border-white/5">
                            <button
                                onClick={() => window.open('https://calendly.com/alok-ranjan-tellyourjourney/30min', '_blank')}
                                className="text-[#CC0000] hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 mx-auto"
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                Book Strategy Session
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-6 rounded-[2rem] border-white/10 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#CC0000]/5 via-transparent to-transparent pointer-events-none" />
                        
                        <div className="mb-6 relative">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CC0000]/10 border border-[#CC0000]/20 text-[#CC0000] text-[9px] font-black uppercase tracking-[0.2em] mb-3">
                                <Sparkles className="w-3 h-3" />
                                Agent Deployment
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1 font-display tracking-tight">The Agentic Enterprise</h3>
                            <p className="text-gray-500 text-[10px] font-medium tracking-tight">Configure and generate in 60 seconds.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 relative">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                        <User className="w-2.5 h-2.5" /> Name
                                    </label>
                                    <input
                                        required name="name" value={formData.name} onChange={handleChange}
                                        className="glass-input w-full py-2 px-3 text-[11px]"
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                        <Mail className="w-2.5 h-2.5" /> Email
                                    </label>
                                    <input
                                        required type="email" name="email" value={formData.email} onChange={handleChange}
                                        className="glass-input w-full py-2 px-3 text-[11px]"
                                        placeholder="Work Email"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                        <Building2 className="w-2.5 h-2.5" /> Company
                                    </label>
                                    <input
                                        required name="company" value={formData.company} onChange={handleChange}
                                        className="glass-input w-full py-2 px-3 text-[11px]"
                                        placeholder="e.g. Sutherland"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                        <Phone className="w-2.5 h-2.5" /> Phone
                                    </label>
                                    <input
                                        required type="tel" name="phone" value={formData.phone} onChange={handleChange}
                                        className="glass-input w-full py-2 px-3 text-[11px]"
                                        placeholder="+1 (555) 000-0000"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                        <Globe className="w-2.5 h-2.5" /> Industry
                                    </label>
                                    <input
                                        required 
                                        name="industry" 
                                        list="industry-options"
                                        value={formData.industry} 
                                        onChange={handleChange}
                                        className="glass-input w-full py-2 px-3 text-[11px]"
                                        placeholder="e.g. Healthcare, Aviation"
                                    />
                                    <datalist id="industry-options">
                                        {INDUSTRIES.map(i => <option key={i} value={i} />)}
                                    </datalist>
                                </div>
                                <div className="space-y-1">
                                    <label className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                        <Globe className="w-2.5 h-2.5" /> Language
                                    </label>
                                    <select
                                        required name="language" value={formData.language} onChange={handleChange}
                                        className="glass-input w-full appearance-none cursor-pointer py-2 px-3 text-[11px] bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:8px_8px] bg-[right_0.75rem_center] bg-no-repeat"
                                    >
                                        {LANGUAGES.map(l => <option key={l} value={l} className="bg-[#0a1628]">{l}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="flex items-center gap-1 text-[8px] font-black text-gray-400/80 uppercase tracking-widest ml-1">
                                    <Target className="w-2.5 h-2.5" /> Focal Area
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {INTERESTS.map(item => {
                                        const Icon = item.icon;
                                        const isActive = formData.interest === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, interest: item.id }))}
                                                className={`relative flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl border transition-all duration-500 overflow-hidden ${
                                                    isActive 
                                                    ? 'bg-gradient-to-br from-[#CC0000]/20 to-[#CC0000]/5 border-[#CC0000] text-white shadow-[0_0_20px_rgba(204,0,0,0.15)]' 
                                                    : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/20 hover:bg-white/[0.08] hover:-translate-y-0.5'
                                                }`}
                                            >
                                                <Icon className={`w-4 h-4 mb-1.5 transition-all duration-500 ${isActive ? 'text-[#CC0000] scale-110' : 'text-gray-500 group-hover:text-gray-300'}`} />
                                                <div className="font-black text-[9px] uppercase tracking-wider mb-0.5">{item.label}</div>
                                                <div className="text-[7px] opacity-40 font-bold tracking-tight truncate w-full text-center px-1">{item.desc}</div>
                                                {isActive && (
                                                    <motion.div 
                                                        layoutId="activeGlow"
                                                        className="absolute inset-0 bg-gradient-to-t from-[#CC0000]/10 to-transparent pointer-events-none"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ duration: 0.4 }}
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {status === 'error' && (
                                <p className="text-red-400 text-[9px] bg-red-400/10 p-2 rounded-lg border border-red-400/20 text-center">
                                    {errorMessage}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full bg-[#CC0000] hover:bg-[#AA0000] text-white font-black py-4 rounded-xl shadow-2xl flex items-center justify-center transition-all disabled:opacity-70 disabled:cursor-not-allowed group uppercase tracking-[0.2em] text-[10px]"
                            >
                                {status === 'loading' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <span>Generate My AI Agent</span>
                                        <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-gray-600 text-[7.5px] font-black uppercase tracking-[0.15em]">
                            <div className="flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" /> SOC2 COMPLIANT</div>
                            <div className="flex items-center gap-1">ISO 27001 SECURE</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
