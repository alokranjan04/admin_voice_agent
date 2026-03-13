import React, { useState } from 'react';
import { User, Phone, Mail, ArrowRight, Bot } from 'lucide-react';

interface WelcomeFormProps {
    onSubmit: (data: { name: string; phone: string; email?: string }) => void;
    businessName?: string;
    avatarUrl?: string;
}

export const WelcomeForm: React.FC<WelcomeFormProps> = ({ onSubmit, businessName = 'AI Assistant', avatarUrl }) => {
    const [name, setName] = useState('');
    const [countryCode, setCountryCode] = useState('+1');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
    const [isTyping, setIsTyping] = useState(true);

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
        <div className="flex flex-col h-full bg-white p-6 overflow-y-auto">
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
                {/* Welcome Message */}
                <div className="mb-8">
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-3">
                            {avatarUrl ? (
                                <div className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden bg-white flex-shrink-0">
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                            )}
                            <div className="flex-1">
                                <p className="text-slate-700 leading-relaxed">
                                    {isTyping ? (
                                        <span className="inline-flex items-center gap-1">
                                            <span className="animate-pulse">Typing</span>
                                            <span className="animate-bounce">.</span>
                                            <span className="animate-bounce delay-100">.</span>
                                            <span className="animate-bounce delay-200">.</span>
                                        </span>
                                    ) : (
                                        welcomeMessage
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form */}
                {!isTyping && (
                    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
                        {/* Name Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Your Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setErrors((prev) => ({ ...prev, name: undefined }));
                                    }}
                                    className={`w-full pl-11 pr-4 py-3 bg-white border ${errors.name ? 'border-red-500' : 'border-slate-300'
                                        } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all`}
                                    placeholder="Enter your name"
                                />
                            </div>
                            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                        </div>

                        {/* Phone Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <div className={`relative flex items-center bg-white border ${errors.phone ? 'border-red-500' : 'border-slate-300'} rounded-xl transition-all focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent overflow-hidden`}>
                                <div className="pl-3 pr-2 py-3 flex items-center h-full border-r border-slate-200 bg-slate-50">
                                    <Phone className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                                    <select
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        className="bg-transparent text-slate-700 text-sm focus:outline-none cursor-pointer font-medium appearance-none pr-4 relative z-10"
                                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394A3B8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '8px auto' }}
                                    >
                                        <option value="+1">US/CA (+1)</option>
                                        <option value="+44">UK (+44)</option>
                                        <option value="+61">AU (+61)</option>
                                        <option value="+65">SG (+65)</option>
                                        <option value="+91">IN (+91)</option>
                                        <option value="+966">SA (+966)</option>
                                        <option value="+971">AE (+971)</option>
                                    </select>
                                </div>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => {
                                        // Allow digits and basic spacing helpers
                                        const val = e.target.value.replace(/[^\d\s-]/g, '');
                                        setPhone(val);
                                        setErrors((prev) => ({ ...prev, phone: undefined }));
                                    }}
                                    className="flex-1 w-full pl-3 pr-4 py-3 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none"
                                    placeholder="202-555-1234"
                                />
                            </div>
                            {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                        </div>

                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Your Email <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setErrors((prev) => ({ ...prev, email: undefined }));
                                    }}
                                    className={`w-full pl-11 pr-4 py-3 bg-white border ${errors.email ? 'border-red-500' : 'border-slate-300'
                                        } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all`}
                                    placeholder="your.email@example.com"
                                />
                            </div>
                            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                        </div>
                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
                        >
                            Start Conversation
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
