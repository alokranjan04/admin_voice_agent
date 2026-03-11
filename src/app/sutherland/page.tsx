"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
    Phone, 
    ShieldCheck, 
    Zap, 
    Users, 
    Globe, 
    Headphones, 
    TrendingUp, 
    CheckCircle2,
    ArrowRight
} from 'lucide-react';
import SutherlandLeadForm from '@/components/SutherlandLeadForm';
import DemoCallButton from '@/components/DemoCallButton';
import Image from 'next/image';

const stats = [
    { label: "Phone Calls Weekly", value: "2,400+", icon: Phone },
    { label: "Global Locations", value: "140+", icon: Globe },
    { label: "Conversion Lift", value: "32%", icon: TrendingUp },
    { label: "Platform Uptime", value: "99.9%", icon: ShieldCheck },
];

const features = [
    {
        title: "AI Receptionist",
        description: "Handle incoming inquiries 24/7 with zero latency. Seamlessly qualify leads and route urgent requests to the right experts.",
        icon: Headphones
    },
    {
        title: "Outbound Sales",
        description: "Scale your reach with autonomous agents that sound human, empathize with customers, and drive high-fidelity conversion.",
        icon: Zap
    },
    {
        title: "Multilingual Intelligence",
        description: "Break language barriers with native support for 6+ languages. Seamlessly transition between English, Spanish, Hindi, and more.",
        icon: Globe
    }
];

export default function SutherlandLandingPage() {
    return (
        <div className="bg-[#0a1628] text-white selection:bg-[#CC0000] selection:text-white overflow-x-hidden min-h-screen">
            {/* Animated Grid Background */}
            <div className="fixed inset-0 pointer-events-none opacity-20">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem]" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a1628] to-[#0a1628]" />
            </div>

            {/* Navigation */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a1628]/80 backdrop-blur-xl border-b border-white/5">
                <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        <Image 
                            src="/images/sutherland-logo.png"
                            alt="Sutherland Logo"
                            width={160}
                            height={40}
                            className="brightness-0 invert priority"
                            priority
                            unoptimized
                        />
                        <div className="hidden lg:flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
                            <a href="#" className="hover:text-white transition-colors">Services</a>
                            <a href="#" className="hover:text-white transition-colors text-white">Platform</a>
                            <a href="#" className="hover:text-white transition-colors">Industries</a>
                            <a href="#" className="hover:text-white transition-colors">Careers</a>
                        </div>
                    </div>
                    <DemoCallButton />
                </nav>
            </header>

            <main className="relative pt-32 pb-20">
                {/* Hero Section */}
                <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20 items-center mb-32 lg:mb-48">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="space-y-10"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 text-gray-300 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#CC0000] animate-ping" />
                            Live Enterprise Deployment
                        </div>
                        
                        <div className="space-y-6">
                            <h1 className="text-6xl lg:text-8xl font-bold leading-[0.9] font-display tracking-tighter">
                                The Agentic <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-500">
                                    Enterprise
                                </span>
                            </h1>
                            <p className="text-2xl font-display font-light text-gray-400 italic">
                                Starts Here.
                            </p>
                        </div>

                        <p className="text-xl text-gray-400 leading-relaxed max-w-xl font-medium">
                            Experience the perfect synergy of human-level nuance and machine precision. Autonomous voice agents designed for the most demanding enterprise ecosystems.
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-8 pt-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <CheckCircle2 className="w-5 h-5 text-[#CC0000]" />
                                SOC2 Type II
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <CheckCircle2 className="w-5 h-5 text-[#CC0000]" />
                                HIPAA Ready
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <CheckCircle2 className="w-5 h-5 text-[#CC0000]" />
                                PCI DSS v4.0
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative"
                    >
                        {/* Decorative glow */}
                        <div className="absolute -inset-10 bg-[#CC0000]/10 blur-[100px] rounded-full opacity-50" />
                        <SutherlandLeadForm />
                    </motion.div>
                </section>

                {/* Metrics Section */}
                <section className="bg-white/[0.02] border-y border-white/5 relative mb-32 group">
                    <div className="absolute inset-0 bg-[#CC0000]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 lg:grid-cols-4 gap-12 relative">
                        {stats.map((stat, idx) => (
                            <div key={idx} className="space-y-4">
                                <div className="flex items-center gap-3 text-gray-500">
                                    <stat.icon className="w-4 h-4 text-[#CC0000]" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{stat.label}</span>
                                </div>
                                <div className="text-4xl font-bold font-display tracking-tight hover:text-[#CC0000] transition-colors cursor-default">
                                    {stat.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Features Section */}
                <section className="max-w-7xl mx-auto px-6 mb-32 lg:mb-48">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-20">
                        <div className="space-y-6">
                            <h2 className="text-4xl lg:text-6xl font-bold font-display tracking-tighter">
                                Infinite Scale. <br />
                                <span className="text-[#CC0000]">Zero Friction.</span>
                            </h2>
                            <p className="text-gray-400 max-w-xl text-lg font-medium leading-relaxed">
                                Our platform integrates seamlessly with your existing technology stack to deliver autonomous, high-fidelity customer experiences at any scale.
                            </p>
                        </div>
                        <button className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-[#CC0000] group">
                            Explore All Features
                            <div className="w-12 h-12 rounded-full border border-[#CC0000]/30 flex items-center justify-center group-hover:bg-[#CC0000] group-hover:text-white transition-all">
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {features.map((feature, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -10 }}
                                className="glass-card p-10 rounded-[2.5rem] space-y-8 group border-[#CC0000]/0 hover:border-[#CC0000]/20 transition-all cursor-default"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-[#CC0000]/5 flex items-center justify-center text-[#CC0000] group-hover:bg-[#CC0000] group-hover:text-white group-hover:rotate-6 transition-all duration-500 shadow-xl">
                                    <feature.icon className="w-8 h-8" />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-bold font-display tracking-tight">{feature.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed font-medium">{feature.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Trust Section / Workflow */}
                <section className="max-w-7xl mx-auto px-6 mb-10">
                    <div className="glass-card p-12 lg:p-24 rounded-[4rem] text-center space-y-20 border-[#CC0000]/10 bg-gradient-to-br from-white/[0.03] to-transparent">
                        <div className="space-y-6">
                            <h2 className="text-4xl lg:text-6xl font-bold font-display tracking-tighter">Configuration to ROI.</h2>
                            <p className="text-gray-400 max-w-lg mx-auto text-lg font-medium">Simple. Powerful. Enterprise-grade execution.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 relative">
                            {[
                                { step: "01", title: "Configure", desc: "Define your persona and knowledge base in minutes." },
                                { step: "02", title: "Deploy", desc: "Launch across all channels with a single API call." },
                                { step: "03", title: "Convert", desc: "Autonomous agents handle interactions and drive outcomes." }
                            ].map((s, idx) => (
                                <div key={idx} className="space-y-6 relative group">
                                    <div className="text-8xl font-black text-white/[0.02] absolute -top-14 left-1/2 -translate-x-1/2 select-none group-hover:text-[#CC0000]/10 transition-colors duration-1000 leading-none">
                                        {s.step}
                                    </div>
                                    <h4 className="text-2xl font-bold font-display tracking-tight relative z-10">{s.title}</h4>
                                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest relative z-10 max-w-[200px] mx-auto leading-relaxed">
                                        {s.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-white/5 py-16 bg-black/20">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    <div className="space-y-8 col-span-1 lg:col-span-1">
                        <Image 
                            src="/images/sutherland-logo.png"
                            alt="Sutherland Logo"
                            width={160}
                            height={40}
                            className="brightness-0 invert opacity-60 unoptimized"
                            unoptimized
                        />
                        <p className="text-gray-500 text-xs font-bold leading-relaxed uppercase tracking-widest">
                            Global Experience <br />
                            Transformation Agency.
                        </p>
                    </div>
                    <div>
                        <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CC0000] mb-6">Capabilities</h5>
                        <ul className="space-y-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <li className="hover:text-white transition-colors cursor-pointer text-gray-400">Voice AI</li>
                            <li className="hover:text-white transition-colors cursor-pointer">BPO Services</li>
                            <li className="hover:text-white transition-colors cursor-pointer">Digital CX</li>
                            <li className="hover:text-white transition-colors cursor-pointer">Consulting</li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CC0000] mb-6">Company</h5>
                        <ul className="space-y-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <li className="hover:text-white transition-colors cursor-pointer">About</li>
                            <li className="hover:text-white transition-colors cursor-pointer cursor-default">Platform</li>
                            <li className="hover:text-white transition-colors cursor-pointer">Careers</li>
                            <li className="hover:text-white transition-colors cursor-pointer">Contact</li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#CC0000] mb-6">Connect</h5>
                        <ul className="space-y-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <li className="hover:text-white transition-colors cursor-pointer">LinkedIn</li>
                            <li className="hover:text-white transition-colors cursor-pointer">X / Twitter</li>
                            <li className="hover:text-white transition-colors cursor-pointer">Facebook</li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-600">
                    <p>© 2026 Sutherland Global. All rights reserved.</p>
                    <div className="flex gap-8">
                        <a href="#" className="hover:text-white">Privacy</a>
                        <a href="#" className="hover:text-white">Terms</a>
                        <a href="#" className="hover:text-white">Cookies</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
