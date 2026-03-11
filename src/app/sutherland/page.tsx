"use client";

import React from 'react';
import ThreeDElement from '@/components/ThreeDElement';
import SutherlandLeadForm from '@/components/SutherlandLeadForm';
import { Bot, PhoneCall, CalendarCheck, Sparkles, Linkedin, Mail, Menu, X, Globe, Search } from 'lucide-react';
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
            <header className="fixed top-0 left-0 right-0 z-50 w-full py-4 px-6 lg:px-12 border-b border-gray-200 bg-white shadow-sm transition-all duration-300">
                <div className="container mx-auto flex items-center justify-between max-w-[1400px]">
                    <div className="flex items-center space-x-2 z-50 relative">
                        {/* CSS-based approximated logo */}
                        <div className="flex gap-[3px] transform rotate-45 mr-1 overflow-hidden h-6 w-5 justify-center">
                            <div className="w-1.5 h-8 bg-[#E31837] rounded-full translate-y-[-4px]"></div>
                            <div className="w-1.5 h-8 bg-[#1D1D3A] rounded-full translate-y-2"></div>
                            <div className="w-1.5 h-8 bg-[#E31837] rounded-full translate-y-[-2px]"></div>
                        </div>
                        <span style={{color: '#1D1D3A'}} className="text-[22px] font-semibold tracking-[0.15em]">
                            SUTHERLAND<sup className="text-[10px]">&reg;</sup>
                        </span>
                    </div>

                    <nav className="hidden lg:flex items-center space-x-6 text-[14.5px] font-medium text-[#4C535F]">
                        <a href="#services" className="hover:text-[#E31837] transition-colors">Services</a>
                        <a href="#industries" className="hover:text-[#E31837] transition-colors">Industries</a>
                        <a href="#products" className="hover:text-[#E31837] transition-colors">Products and Platforms</a>
                        <a href="#insights" className="hover:text-[#E31837] transition-colors">Insights</a>
                        <a href="#about" className="hover:text-[#E31837] transition-colors">About Us</a>
                        <a href="#careers" className="hover:text-[#E31837] transition-colors">Careers</a>
                    </nav>

                    <div className="hidden lg:flex items-center space-x-6">
                        <button className="text-[#4C535F] hover:text-[#E31837] transition-colors">
                            <Globe className="w-5 h-5 flex-shrink-0" />
                        </button>
                        <button className="text-[#4C535F] hover:text-[#E31837] transition-colors">
                            <Search className="w-5 h-5 flex-shrink-0" />
                        </button>
                        <a href="#contact" className="bg-[#E31837] hover:bg-[#C2142E] text-white px-7 py-2.5 rounded text-sm font-semibold transition-colors shadow-none text-center inline-block">
                            Contact Us
                        </a>
                    </div>

                    <div className="flex lg:hidden items-center">
                        <button
                            className="p-2 text-[#1D1D3A] hover:text-[#E31837] transition-colors relative z-50"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Toggle Menu"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                <div className={`fixed inset-0 bg-white transition-all duration-300 ease-in-out z-40 lg:hidden flex flex-col pt-24 px-6 overflow-y-auto ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <nav className="flex flex-col space-y-6 text-xl font-semibold text-[#1D1D3A]">
                        <a href="#services" onClick={(e) => { scrollToSection(e, 'services'); }} className="hover:text-[#E31837] transition-colors border-b border-gray-100 pb-2">Services</a>
                        <a href="#industries" onClick={(e) => { scrollToSection(e, 'industries'); }} className="hover:text-[#E31837] transition-colors border-b border-gray-100 pb-2">Industries</a>
                        <a href="#products" onClick={(e) => { scrollToSection(e, 'products'); }} className="hover:text-[#E31837] transition-colors border-b border-gray-100 pb-2">Products and Platforms</a>
                        <a href="#insights" onClick={(e) => { scrollToSection(e, 'insights'); }} className="hover:text-[#E31837] transition-colors border-b border-gray-100 pb-2">Insights</a>
                        <a href="#about" onClick={(e) => { scrollToSection(e, 'about'); }} className="hover:text-[#E31837] transition-colors border-b border-gray-100 pb-2">About Us</a>
                        <a href="#careers" onClick={(e) => { scrollToSection(e, 'careers'); }} className="hover:text-[#E31837] transition-colors">Careers</a>
                        <a href="#contact" onClick={(e) => { scrollToSection(e, 'contact'); }} className="bg-[#E31837] text-white text-center py-3 rounded mt-4">Contact Us</a>
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
            <footer id="contact" className="w-full bg-[#f8f9fa] py-8 border-t border-gray-200 mt-10 lg:mt-20 relative z-20">
                <div className="container mx-auto px-6 lg:px-12 max-w-[1400px]">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
                        
                        {/* Left side: Logo + Links */}
                        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16 w-full lg:w-auto">
                            <div className="flex items-center space-x-2">
                                <div className="flex gap-[2px] transform rotate-45 scale-75 overflow-hidden h-6 w-5 justify-center">
                                    <div className="w-1 bg-[#E31837] rounded-full h-8 translate-y-[-4px]"></div>
                                    <div className="w-1 bg-[#1D1D3A] rounded-full h-8 translate-y-2"></div>
                                    <div className="w-1 bg-[#E31837] rounded-full h-8 translate-y-[-2px]"></div>
                                </div>
                            </div>

                            <nav className="flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-4 text-[13px] font-bold text-[#1D1D3A]">
                                <a href="#services" className="hover:text-[#E31837] transition-colors">Services</a>
                                <a href="#industries" className="hover:text-[#E31837] transition-colors">Industries</a>
                                <a href="#about" className="hover:text-[#E31837] transition-colors">About Us</a>
                                <a href="#contact" className="hover:text-[#E31837] transition-colors">Contact Us</a>
                                <a href="#careers" className="hover:text-[#E31837] transition-colors">Careers</a>
                                <a href="#locations" className="hover:text-[#E31837] transition-colors">Locations</a>
                            </nav>
                        </div>

                        {/* Right side: Social Icons */}
                        <div className="flex items-center gap-6 text-[#1D1D3A] opacity-80">
                            <a href="#" aria-label="LinkedIn" className="hover:text-[#E31837] transition-colors"><Linkedin className="w-4 h-4 fill-current" /></a>
                            <a href="#" aria-label="X (Twitter)" className="hover:text-[#E31837] transition-colors">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                            </a>
                            <a href="#" aria-label="Facebook" className="hover:text-[#E31837] transition-colors">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path></svg>
                            </a>
                            <a href="#" aria-label="YouTube" className="hover:text-[#E31837] transition-colors">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd"></path></svg>
                            </a>
                            <a href="#" aria-label="Vimeo" className="hover:text-[#E31837] transition-colors">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22.396 7.164c-.093 2.026-1.507 4.8-4.245 8.32C15.322 19.161 12.93 21 10.97 21c-1.214 0-2.24-1.12-3.08-3.36-.56-2.052-1.119-4.1-1.68-6.15-.653-2.332-1.306-3.499-1.959-3.499-.187 0-.933.466-2.24 1.399l-1.399-1.68c1.4-1.213 2.893-2.52 4.479-3.919 1.866-1.586 3.173-2.426 3.919-2.52 1.866-.186 2.893 1.027 3.08 3.639.186 2.333.373 3.919.56 4.759.56 2.52 1.213 3.733 1.959 3.733.56 0 1.4-1.026 2.52-3.08 1.12-2.052 1.68-3.639 1.68-4.759 0-1.586-1.12-2.333-3.36-2.24h-.56C16.92 1.77 18.226 1.023 19.533 1.023c2.053 0 3.08 2.053 2.863 6.141z"></path></svg>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
