"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, ArrowRight } from 'lucide-react';

export default function AgencyLeadForm() {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '' });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMessage('');

        try {
            const res = await fetch('/api/generate-lead-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate agent.');
            }

            setStatus('success');
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMessage(err.message || 'Something went wrong. Please try again.');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    if (status === 'success') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl text-center"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                >
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-2">Agent Generated!</h3>
                <p className="text-indigo-100 mb-6">
                    We've just built a custom Voice AI agent for {formData.company}. Check your inbox ({formData.email}) for the exclusive test link to interact with your new digital employee!
                </p>
                <button
                    onClick={() => {
                        setStatus('idle');
                        setFormData({ name: '', email: '', phone: '', company: '' });
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                    Build Another
                </button>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl relative z-20"
        >
            <div className="mb-8 text-center sm:text-left">
                <h3 className="text-2xl font-bold text-white mb-2">Get Your Free AI Agent</h3>
                <p className="text-indigo-100 text-sm">See the magic in action. Enter your details and we'll instantly generate & email you a custom AI Voice Agent trained for your business.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-indigo-100 mb-1">Full Name</label>
                        <input
                            required
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Elon Musk"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-indigo-100 mb-1">Company Name</label>
                        <input
                            required
                            type="text"
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Tesla"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-indigo-100 mb-1">Work Email</label>
                    <input
                        required
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="elon@tesla.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-indigo-100 mb-1">Phone Number</label>
                    <input
                        required
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="+1 (555) 000-0000"
                    />
                </div>

                {status === 'error' && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg border border-red-400/20">
                        {errorMessage}
                    </motion.p>
                )}

                <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {status === 'loading' ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Building Your AI...
                        </>
                    ) : (
                        <>
                            Generate My Agent <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
                <p className="text-xs text-white/40 text-center mt-4">Takes ~5 seconds to build. We will email you the secure link.</p>
            </form>
        </motion.div>
    );
}
