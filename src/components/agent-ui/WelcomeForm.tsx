import React, { useState } from 'react';
import { User, Phone, Mail, ArrowRight, Bot, ChevronDown, PhoneCall, Loader2 } from 'lucide-react';

interface WelcomeFormProps {
    onSubmit: (data: { name: string; phone: string; email?: string }) => void;
    onCallMe?: (data: { name: string; phone: string; email?: string }) => Promise<void>;
    businessName?: string;
    avatarUrl?: string;
}

export const WelcomeForm: React.FC<WelcomeFormProps> = ({ onSubmit, onCallMe, businessName = 'AI Assistant', avatarUrl }) => {
    const [name, setName] = useState('');
    const [countryCode, setCountryCode] = useState('+1');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
    const [isTyping, setIsTyping] = useState(true);
    const [isCalling, setIsCalling] = useState(false);
    const [callStatus, setCallStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Welcome message typing effect
    const welcomeMessage = `Welcome! I'm your ${businessName} assistant. Before we begin, I'd like to get to know you better.`;

    const validatePhone = (phoneNumber: string): boolean => {
        // E.164 format: +[country code][number]
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        return e164Regex.test(phoneNumber);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { name?: string; phone?: string; email?: string } = {};

        if (!name.trim()) {
            newErrors.name = 'Name is required';
        }

        const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`;

        if (!phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!validatePhone(fullPhone)) {
            newErrors.phone = 'Please enter a valid phone number';
        }

        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit({ name: name.trim(), phone: fullPhone, email: email.trim() || undefined });
    };

    const handleCallMe = async () => {
        const newErrors: { name?: string; phone?: string; email?: string } = {};
        if (!name.trim()) newErrors.name = 'Name is required';
        const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`;
        if (!phone.trim()) newErrors.phone = 'Phone number is required';
        else if (!validatePhone(fullPhone)) newErrors.phone = 'Please enter a valid phone number';
        if (!email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email address';

        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
        if (!onCallMe) return;

        setIsCalling(true);
        setCallStatus('idle');
        try {
            await onCallMe({ name: name.trim(), phone: fullPhone, email: email.trim() });
            setCallStatus('success');
        } catch {
            setCallStatus('error');
        } finally {
            setIsCalling(false);
        }
    };

    // Simulate typing effect on mount and Auto-detect timezone
    React.useEffect(() => {
        const timer = setTimeout(() => setIsTyping(false), 2000);

        // Auto-detect country code from system timezone safely
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            let detectedPrefix = '';

            if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') {
                detectedPrefix = '+91';
            } else if (tz.startsWith('America/')) {
                // Core North American zones
                const usCaZones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'America/Vancouver'];
                if (usCaZones.includes(tz)) detectedPrefix = '+1';
            } else if (tz === 'Europe/London') {
                detectedPrefix = '+44';
            } else if (tz === 'Australia/Sydney' || tz === 'Australia/Melbourne') {
                detectedPrefix = '+61';
            } else if (tz === 'Asia/Dubai') {
                detectedPrefix = '+971';
            } else if (tz === 'Asia/Singapore') {
                detectedPrefix = '+65';
            }

            // Set the prefix if we confidently detected one
            if (detectedPrefix) {
                setCountryCode(detectedPrefix);
            }
        } catch (e) {
            console.warn('[WelcomeForm] Intl TimeZone detection failed', e);
        }

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex flex-col h-full bg-white p-6 overflow-y-auto no-scrollbar">
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
                {/* Welcome Message */}
                <div className="mb-6">
                    <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100">
                        <div className="flex items-start gap-4">
                            {avatarUrl ? (
                                <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-white flex-shrink-0 shadow-sm">
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0 shadow-inner">
                                    <Bot className="w-7 h-7 text-white" />
                                </div>
                            )}
                            <div className="flex-1 pt-1">
                                <p className="text-slate-600 leading-relaxed text-sm font-medium">
                                    {isTyping ? (
                                        <span className="inline-flex items-center gap-1 opacity-50">
                                            <span>Typing</span>
                                            <span className="animate-bounce">.</span>
                                            <span className="animate-bounce delay-100">.</span>
                                            <span className="animate-bounce delay-200">.</span>
                                        </span>
                                    ) : (
                                        `Welcome! I'm your ${businessName} assistant. Before we begin, I'd like to get to know you better.`
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name Field */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                            Your Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative group transition-all">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-teal-600 transition-colors" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setErrors((prev) => ({ ...prev, name: undefined }));
                                }}
                                className={`w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border ${errors.name ? 'border-red-400 bg-red-50/30' : 'border-slate-100 group-hover:border-slate-200'
                                    } rounded-2xl text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all`}
                                placeholder="Enter your name"
                            />
                        </div>
                        {errors.name && <p className="mt-1.5 ml-1 text-[10px] font-medium text-red-500 uppercase tracking-wide">{errors.name}</p>}
                    </div>

                    {/* Phone Field */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                            Phone Number <span className="text-red-500">*</span>
                        </label>
                        <div className={`relative flex items-center bg-slate-50/50 border ${errors.phone ? 'border-red-400 bg-red-50/30' : 'border-slate-100'} rounded-2xl transition-all focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 focus-within:bg-white overflow-hidden`}>
                            <div className="pl-4 pr-2 py-3.5 flex items-center h-full border-r border-slate-100">
                                <span className="text-xs font-bold text-slate-400 mr-2">IN (+91)</span>
                                <ChevronDown className="w-3 h-3 text-slate-300" />
                            </div>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^\d\s-]/g, '');
                                    setPhone(val);
                                    setErrors((prev) => ({ ...prev, phone: undefined }));
                                }}
                                className="flex-1 w-full pl-4 pr-4 py-3.5 bg-transparent text-slate-800 placeholder-slate-300 focus:outline-none"
                                placeholder="202-555-1234"
                            />
                        </div>
                        {errors.phone && <p className="mt-1.5 ml-1 text-[10px] font-medium text-red-500 uppercase tracking-wide">{errors.phone}</p>}
                    </div>

                    {/* Email Field */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                            Your Email <span className="text-red-500">*</span>
                        </label>
                        <div className="relative group transition-all">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-teal-600 transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setErrors((prev) => ({ ...prev, email: undefined }));
                                }}
                                className={`w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border ${errors.email ? 'border-red-400 bg-red-50/30' : 'border-slate-100 group-hover:border-slate-200'
                                    } rounded-2xl text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all`}
                                placeholder="your.email@example.com"
                            />
                        </div>
                        {errors.email && <p className="mt-1.5 ml-1 text-[10px] font-medium text-red-500 uppercase tracking-wide">{errors.email}</p>}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 space-y-3">
                        <button
                            type="submit"
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-teal-500/20 active:scale-[0.98]"
                        >
                            Start Conversation
                            <ArrowRight className="w-5 h-5" />
                        </button>

                        {onCallMe && (
                            <button
                                type="button"
                                onClick={handleCallMe}
                                disabled={isCalling}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
                            >
                                {isCalling ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Calling you...</>
                                ) : callStatus === 'success' ? (
                                    <><PhoneCall className="w-5 h-5" /> Call on its way!</>
                                ) : (
                                    <><PhoneCall className="w-5 h-5" /> Call Me Instead</>
                                )}
                            </button>
                        )}
                        {callStatus === 'success' && (
                            <p className="text-center text-xs text-emerald-600 font-medium">
                                You'll receive a call on {phone} shortly.
                            </p>
                        )}
                        {callStatus === 'error' && (
                            <p className="text-center text-xs text-red-500 font-medium">
                                Call failed. Please try again or start a web conversation.
                            </p>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};
