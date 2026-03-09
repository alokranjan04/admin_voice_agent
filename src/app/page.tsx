"use client";

import React from 'react';
import ThreeDElement from '@/components/ThreeDElement';
import AgencyLeadForm from '@/components/AgencyLeadForm';
import { Bot, PhoneCall, CalendarCheck, Sparkles, Linkedin, Mail } from 'lucide-react';
import { sendGAEvent } from '@next/third-parties/google';
import DemoCallButton from '@/components/DemoCallButton';

export default function AgencyLandingPage() {
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 overflow-x-hidden flex flex-col font-sans">
            {/* Top Navigation Bar / Branding */}
            <header className="fixed top-0 left-0 right-0 z-50 w-full py-2 px-6 lg:px-12 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl transition-all duration-300">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tighter">
                            TellYour<span className="text-indigo-400">Journey</span>
                        </span>
                    </div>

                    <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
                        <a href="#services" onClick={() => sendGAEvent('event', 'nav_click', { label: 'Services' })} className="hover:text-white transition-colors">Services</a>
                        <a href="#technology" onClick={() => sendGAEvent('event', 'nav_click', { label: 'Technology' })} className="hover:text-white transition-colors">Technology</a>
                        <a href="#contact" onClick={() => sendGAEvent('event', 'nav_click', { label: 'Contact' })} className="hover:text-white transition-colors">Contact</a>
                    </nav>

                    <div className="flex items-center">
                        {/* Removed DemoCallButton per user request as there is a prominent CTA in hero now */}
                    </div>
                </div>
            </header>

            {/* Abstract Animated Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] bg-purple-600 animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] bg-indigo-600 animate-pulse animation-delay-2000" />
            </div>

            {/* Main Content Container */}
            <main className="flex-grow relative z-10 pt-14">

                {/* Trust/Social Proof Strip */}
                <div className="w-full border-b border-white/5 bg-slate-900/80 backdrop-blur-md py-1 z-20 relative pointer-events-auto">
                    <div className="container mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-12 text-sm font-semibold text-slate-300">
                        <span className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            2,400+ Calls Handled This Week
                        </span>
                        <span className="hidden sm:inline text-slate-600">|</span>
                        <span>Trusted by 50+ Local & SaaS Businesses</span>
                        <span className="hidden sm:inline text-slate-600">|</span>
                        <span>Avg. 35% Conversion Increase</span>
                    </div>
                </div>

                {/* Main Hero & Lead Capture Section */}
                <div className="container mx-auto px-6 lg:px-12 py-0 relative z-10 w-full min-h-[calc(100vh-140px)] flex flex-col justify-center">

                    {/* Background 3D Element wrapper */}
                    <div className="absolute inset-0 z-0 opacity-40 lg:opacity-100 pointer-events-none overflow-hidden flex items-center justify-center lg:justify-start">
                        <div className="w-full lg:w-[60%] h-full pointer-events-auto mix-blend-screen mask-image-linear-to-b lg:-ml-32 mt-20 lg:mt-0">
                            <ThreeDElement />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10 pointer-events-none">
                        {/* Left Column: Value Prop & Headline */}
                        <div className="flex flex-col items-center lg:items-start text-center lg:text-left pt-2 lg:pt-0">
                            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-indigo-400/30 bg-indigo-400/10 text-indigo-300 text-[11px] font-semibold mb-2 shadow-xl shadow-indigo-500/10 pointer-events-auto">
                                <Bot className="w-3.5 h-3.5" />
                                <span>TellYourJourney Exclusive Access</span>
                            </div>

                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-tr from-white via-indigo-100 to-indigo-400 leading-[1.1] mb-0.5 py-1 flex flex-col gap-1 pointer-events-auto selection:bg-indigo-500/30">
                                <span>Voice AI That Converts</span>
                                <span>Missed Calls Into Revenue.</span>
                            </h1>

                            <p className="text-base md:text-lg font-medium text-indigo-100/90 max-w-xl leading-relaxed mb-1 pointer-events-auto selection:bg-indigo-500/30">
                                Built for SMBs and service businesses. No hiring. No training. Just booked appointments and handled calls — around the clock.
                            </p>

                            {/* High-Converting Hero CTA */}
                            <div className="mb-1.5 pointer-events-auto w-full flex flex-col sm:flex-row items-center justify-start gap-4">
                                <DemoCallButton
                                    customClass="flex items-center justify-center px-6 py-2.5 rounded-full font-bold text-base transition-all bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:shadow-[0_0_40px_rgba(79,70,229,0.6)] w-full sm:w-auto"
                                    text="Talk to Our AI Now"
                                />
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <Bot className="w-3.5 h-3.5 text-slate-500" /> No form required. Just speak.
                                </span>
                            </div>

                            {/* Trust Stats below headline */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl pointer-events-auto">
                                <div className="flex flex-col space-y-0 border-l-2 border-indigo-500 pl-3 bg-white/5 p-1 rounded-r-xl backdrop-blur-sm shadow-xl shadow-black/50 hover:bg-white/10 transition-colors">
                                    <span className="text-lg font-bold flex items-center text-white">
                                        <PhoneCall className="w-4 h-4 mr-2 text-emerald-400" />
                                        24/7 Uptime
                                    </span>
                                    <span className="text-[11px] text-indigo-200">Answer every customer locally.</span>
                                </div>
                                <div className="flex flex-col space-y-0 border-l-2 border-purple-500 pl-3 bg-white/5 p-1 rounded-r-xl backdrop-blur-sm shadow-xl shadow-black/50 hover:bg-white/10 transition-colors">
                                    <span className="text-lg font-bold flex items-center text-white">
                                        <CalendarCheck className="w-4 h-4 mr-2 text-amber-400" />
                                        100% Scalable
                                    </span>
                                    <span className="text-[11px] text-indigo-200">Handle infinite callers instantly.</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Lead Capture Form */}
                        <div className="w-full max-w-[540px] mx-auto lg:mr-0 lg:ml-auto relative z-20 mt-4 lg:mt-0 pointer-events-auto">
                            {/* Decorative glow behind form */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl -z-10" />
                            <AgencyLeadForm />
                        </div>
                    </div>
                </div>
            </main>

            {/* Professional Custom Footer */}
            <footer id="contact" className="w-full relative z-20 mt-20 border-t border-white/10 bg-slate-950 py-16">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute bottom-0 left-[20%] w-[40%] h-[300px] rounded-full opacity-10 blur-[100px] bg-indigo-500" />
                </div>

                <div className="container mx-auto px-6 lg:px-12 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16">
                        <div className="lg:col-span-2">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-fuchsia-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-xl font-black text-white tracking-tighter">
                                    TellYour<span className="text-indigo-400">Journey</span>
                                </span>
                            </div>
                            <p className="text-slate-400 leading-relaxed max-w-sm mb-8">
                                We engineer autonomous voice intelligence that perfectly represents your brand, handles limitless concurrency, and drives measurable revenue 24/7.
                            </p>
                        </div>

                        <div className="lg:col-span-1">
                            <h4 className="text-white font-semibold mb-6 tracking-wide uppercase text-xs">Contact Us</h4>
                            <ul className="space-y-4 text-sm text-slate-400">
                                <li className="flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-500/30 flex-shrink-0">
                                        <img src="/images/alok.jpg" alt="Alok Ranjan - Director" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Director</span>
                                        <span className="text-slate-200 font-semibold tracking-tight">Alok Ranjan</span>
                                    </div>
                                </li>
                                <li className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Direct Line</span>
                                    <a href="tel:+917042915552" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium tracking-wide">+91 7042915552</a>
                                </li>
                                <li className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Social</span>
                                    <div className="flex flex-col space-y-2">
                                        <a
                                            href="https://www.linkedin.com/in/alokranjan04/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center text-indigo-400 hover:text-indigo-300 transition-colors font-medium group text-[13px]"
                                        >
                                            <Linkedin className="w-3.5 h-3.5 mr-2" />
                                            Connect on LinkedIn
                                        </a>
                                        <a
                                            href="mailto:alokranjan04@gmail.com"
                                            className="flex items-center text-indigo-400 hover:text-indigo-300 transition-colors font-medium group text-[13px]"
                                        >
                                            <Mail className="w-3.5 h-3.5 mr-2" />
                                            alokranjan04@gmail.com
                                        </a>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div className="lg:col-span-2">
                            <h4 className="text-white font-semibold mb-6 tracking-wide uppercase text-xs">Headquarters</h4>
                            <div className="text-sm text-slate-400 leading-relaxed p-6 bg-white/5 border border-white/10 rounded-2xl inline-block shadow-xl">
                                <p className="font-medium text-slate-200 mb-2">TellYourJourney AI Agency</p>
                                E 311, Ace City Noida Ext<br />
                                Greater Noida West<br />
                                Gautam Buddha Nagar, 201306<br />
                                Uttar Pradesh, India
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
                        <p>&copy; {new Date().getFullYear()} TellYourJourney. All rights reserved.</p>
                        <div className="flex space-x-6 mt-4 md:mt-0">
                            <a href="#" className="hover:text-indigo-400 transition-colors">Privacy Policy</a>
                            <a href="#" className="hover:text-indigo-400 transition-colors">Terms of Service</a>
                            <a href="#" className="hover:text-indigo-400 transition-colors">Data Security</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
