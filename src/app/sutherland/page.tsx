"use client";

import React from 'react';
import ThreeDElement from '@/components/ThreeDElement';
import SutherlandLeadForm from '@/components/SutherlandLeadForm';
import { Bot, PhoneCall, CalendarCheck, Sparkles, Linkedin, Mail, Menu, X } from 'lucide-react';
import { sendGAEvent } from '@next/third-parties/google';
import DemoCallButton from '@/components/DemoCallButton';

export default function SutherlandLandingPage() {
    const [isMounted, setIsMounted] = React.useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    // Prevent scrolling when mobile menu is open
    React.useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        setIsMobileMenuOpen(false);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 overflow-x-hidden flex flex-col font-sans">
            {/* Top Navigation Bar / Branding */}
            <header className="fixed top-0 left-0 right-0 z-50 w-full py-4 px-6 lg:px-12 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl transition-all duration-300 shadow-lg shadow-black/10">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3 z-50 relative">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tighter">
                            Sutherland <span className="text-cyan-400">Global</span>
                        </span>
                    </div>

                    <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-300">
                        <a href="#services" onClick={(e) => { sendGAEvent('event', 'nav_click', { label: 'Services' }); scrollToSection(e, 'services'); }} className="hover:text-cyan-400 transition-colors relative group">
                            Services
                            <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 bg-cyan-500 transition-all group-hover:w-full rounded-full"></span>
                        </a>
                        <a href="#technology" onClick={(e) => { sendGAEvent('event', 'nav_click', { label: 'Technology' }); scrollToSection(e, 'technology'); }} className="hover:text-cyan-400 transition-colors relative group">
                            Technology
                            <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 bg-cyan-500 transition-all group-hover:w-full rounded-full"></span>
                        </a>
                        <a href="#contact" onClick={(e) => { sendGAEvent('event', 'nav_click', { label: 'Contact' }); scrollToSection(e, 'contact'); }} className="hover:text-cyan-400 transition-colors relative group">
                            Contact
                            <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 bg-cyan-500 transition-all group-hover:w-full rounded-full"></span>
                        </a>
                    </nav>

                    <div className="flex items-center">
                        <button
                            className="md:hidden p-2 -mr-2 text-slate-300 hover:text-white transition-colors relative z-50"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Toggle Menu"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                <div className={`fixed inset-0 bg-slate-950/95 backdrop-blur-2xl transition-all duration-300 ease-in-out z-40 md:hidden flex flex-col justify-center items-center ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <nav className="flex flex-col items-center space-y-8 text-xl font-bold text-slate-200">
                        <a href="#services" onClick={(e) => { sendGAEvent('event', 'nav_click', { label: 'Services' }); scrollToSection(e, 'services'); }} className="hover:text-cyan-400 transition-colors">Services</a>
                        <a href="#technology" onClick={(e) => { sendGAEvent('event', 'nav_click', { label: 'Technology' }); scrollToSection(e, 'technology'); }} className="hover:text-cyan-400 transition-colors">Technology</a>
                        <a href="#contact" onClick={(e) => { sendGAEvent('event', 'nav_click', { label: 'Contact' }); scrollToSection(e, 'contact'); }} className="hover:text-cyan-400 transition-colors">Contact</a>
                    </nav>
                </div>
            </header>

            {/* Abstract Animated Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] bg-cyan-600 animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] bg-blue-600 animate-pulse animation-delay-2000" />
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
                            Enterprise Grade Voice AI
                        </span>
                        <span className="hidden sm:inline text-slate-600">|</span>
                        <span>Infinite Scalability for Support</span>
                        <span className="hidden sm:inline text-slate-600">|</span>
                        <span>Multi-language Global Coverage</span>
                    </div>
                </div>

                {/* Main Hero & Lead Capture Section */}
                <div className="container mx-auto px-6 lg:px-12 py-8 lg:py-2 relative z-10 w-full min-h-[calc(100vh-140px)] flex flex-col justify-center">

                    {/* Background 3D Element wrapper */}
                    <div id="technology" className="absolute inset-0 z-0 opacity-40 lg:opacity-100 pointer-events-none overflow-hidden flex items-center justify-center lg:justify-start">
                        <div className="w-full lg:w-[60%] h-full pointer-events-auto mix-blend-screen mask-image-linear-to-b lg:-ml-32 mt-20 lg:mt-0">
                            <ThreeDElement />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 xl:gap-16 items-center relative z-10 pointer-events-none">
                        {/* Left Column: Value Prop & Headline */}
                        <div id="services" className="flex flex-col items-center lg:items-start text-center lg:text-left pt-2 lg:pt-0">
                            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-blue-400/30 bg-blue-400/10 text-cyan-300 text-[11px] font-semibold mb-2 shadow-xl shadow-blue-500/10 pointer-events-auto">
                                <Bot className="w-3.5 h-3.5" />
                                <span>Sutherland Exclusive Platform</span>
                            </div>

                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-tr from-white via-blue-100 to-cyan-400 leading-[1.1] mb-0.5 py-1 flex flex-col gap-1 pointer-events-auto selection:bg-blue-500/30">
                                <span>Autonomous Support</span>
                                <span>At Infinite Scale.</span>
                            </h1>

                            <p className="text-base md:text-lg font-medium text-blue-100/90 max-w-xl leading-relaxed mb-4 lg:mb-6 pointer-events-auto selection:bg-blue-500/30">
                                Built for enterprise BPO. Automate tier-1 support, deflect routine calls, and scale customer experience without expanding headcount — 24/7 across multiple languages.
                            </p>

                            {/* Trust Stats below headline */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl pointer-events-auto">
                                <div className="flex flex-col space-y-0 border-l-2 border-cyan-500 pl-3 bg-white/5 p-1 rounded-r-xl backdrop-blur-sm shadow-xl shadow-black/50 hover:bg-white/10 transition-colors">
                                    <span className="text-lg font-bold flex items-center text-white">
                                        <PhoneCall className="w-4 h-4 mr-2 text-emerald-400" />
                                        100% CSAT Focus
                                    </span>
                                    <span className="text-[11px] text-blue-200">Human-level empathy & resolution.</span>
                                </div>
                                <div className="flex flex-col space-y-0 border-l-2 border-blue-500 pl-3 bg-white/5 p-1 rounded-r-xl backdrop-blur-sm shadow-xl shadow-black/50 hover:bg-white/10 transition-colors">
                                    <span className="text-lg font-bold flex items-center text-white">
                                        <CalendarCheck className="w-4 h-4 mr-2 text-amber-400" />
                                        Infinite Concurrency
                                    </span>
                                    <span className="text-[11px] text-blue-200">Handle 10,000 calls simultaneously.</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Lead Capture Form */}
                        <div className="w-full max-w-[540px] mx-auto lg:mr-0 lg:ml-auto relative z-20 mt-4 lg:mt-0 pointer-events-auto">
                            {/* Decorative glow behind form */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-3xl blur-2xl -z-10" />
                            <SutherlandLeadForm />
                        </div>
                    </div>
                </div>
            </main>

            {/* Professional Custom Footer */}
            <footer id="contact" className="w-full relative z-20 mt-10 lg:mt-20 border-t border-white/10 bg-slate-950 pt-16 pb-8">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute bottom-0 left-[20%] w-[40%] h-[300px] rounded-full opacity-10 blur-[100px] bg-blue-500" />
                </div>

                <div className="container mx-auto px-6 lg:px-12 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-12">
                        <div className="lg:col-span-4 lg:pr-8">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-xl font-black text-white tracking-tighter">
                                    Sutherland <span className="text-cyan-400">Global</span>
                                </span>
                            </div>
                            <p className="text-slate-400 leading-relaxed max-w-sm mb-8">
                                Engineering autonomous voice intelligence that perfectly represents your enterprise brand, handles limitless concurrency, and drives measurable CSAT 24/7.
                            </p>
                        </div>

                        <div className="lg:col-span-2">
                            <h4 className="text-white font-semibold mb-6 tracking-wide uppercase text-xs">Quick Links</h4>
                            <ul className="space-y-4 text-sm text-slate-400">
                                <li><a href="#services" className="hover:text-cyan-400 transition-colors">Tier-1 Support</a></li>
                                <li><a href="#services" className="hover:text-cyan-400 transition-colors">Call Deflection</a></li>
                                <li><a href="#technology" className="hover:text-cyan-400 transition-colors">Architecture</a></li>
                                <li><a href="#contact" className="hover:text-cyan-400 transition-colors">Corporate Contact</a></li>
                            </ul>
                        </div>

                        <div className="lg:col-span-3">
                            <h4 className="text-white font-semibold mb-6 tracking-wide uppercase text-xs">Contact Us</h4>
                            <ul className="space-y-4 text-sm text-slate-400">
                                <li className="flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500/30 flex-shrink-0">
                                        <img src="/images/alok.jpg" alt="Alok Ranjan - Director" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Director</span>
                                        <span className="text-slate-200 font-semibold tracking-tight">Alok Ranjan</span>
                                    </div>
                                </li>
                                <li className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Direct Line</span>
                                    <a href="tel:+917042915552" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium tracking-wide">+91 7042915552</a>
                                </li>
                                <li className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Social</span>
                                    <div className="flex flex-col space-y-2">
                                        <a
                                            href="https://www.linkedin.com/in/alokranjan04/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center text-cyan-400 hover:text-cyan-300 transition-colors font-medium group text-[13px]"
                                        >
                                            <Linkedin className="w-3.5 h-3.5 mr-2" />
                                            Connect on LinkedIn
                                        </a>
                                        <a
                                            href="mailto:alokranjan04@gmail.com"
                                            className="flex items-center text-cyan-400 hover:text-cyan-300 transition-colors font-medium group text-[13px]"
                                        >
                                            <Mail className="w-3.5 h-3.5 mr-2" />
                                            alokranjan04@gmail.com
                                        </a>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div className="lg:col-span-3">
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
                        <p>&copy; {new Date().getFullYear()} TellYourJourney & Sutherland Global. All rights reserved.</p>
                        <div className="flex space-x-6 mt-4 md:mt-0">
                            <a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
                            <a href="#" className="hover:text-cyan-400 transition-colors">Terms of Service</a>
                            <a href="#" className="hover:text-cyan-400 transition-colors">Data Security</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
