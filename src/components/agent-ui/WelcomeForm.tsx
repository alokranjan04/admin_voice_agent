import React, { useState } from 'react';
import { User, Phone, Mail, ArrowRight } from 'lucide-react';

interface WelcomeFormProps {
    onSubmit: (data: { name: string; phone: string; email?: string }) => void;
    businessName?: string;
}

export const WelcomeForm: React.FC<WelcomeFormProps> = ({ onSubmit, businessName = 'AI Assistant' }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
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
        const newErrors: { name?: string; phone?: string } = {};

        if (!name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!validatePhone(phone)) {
            newErrors.phone = 'Please enter a valid phone number (e.g., +12025551234)';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined });
    };

    // Simulate typing effect on mount
    React.useEffect(() => {
        const timer = setTimeout(() => setIsTyping(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex flex-col h-full bg-white p-6 overflow-y-auto">
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
                {/* Welcome Message */}
                <div className="mb-8">
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-semibold text-sm">AI</span>
                            </div>
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
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => {
                                        setPhone(e.target.value);
                                        setErrors((prev) => ({ ...prev, phone: undefined }));
                                    }}
                                    className={`w-full pl-11 pr-4 py-3 bg-white border ${errors.phone ? 'border-red-500' : 'border-slate-300'
                                        } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all`}
                                    placeholder="+12025551234"
                                />
                            </div>
                            {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                            <p className="mt-1 text-xs text-slate-500">Format: +[country code][number]</p>
                        </div>

                        {/* Email Field (Optional) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Email <span className="text-slate-400">(optional)</span>
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                    placeholder="your.email@example.com"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
                        >
                            Start Conversation
                            <ArrowRight className="w-5 h-5" />
                        </button>

                        {/* Skip Button */}
                        <button
                            type="button"
                            onClick={() => onSubmit({ name: 'Guest', phone: 'N/A', email: '' })}
                            className="w-full text-slate-400 hover:text-slate-600 text-xs font-medium py-2 transition-colors cursor-pointer"
                        >
                            Skip for now
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
