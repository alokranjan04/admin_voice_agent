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
        <div className="min-h-screen bg-white overflow-x-hidden flex flex-col font-sans">
            {/* Top Navigation Bar / Branding */}
            <header className="fixed top-0 left-0 right-0 z-50 w-full py-4 px-6 lg:px-12 border-b border-gray-200 bg-white shadow-sm transition-all duration-300">
                <div className="container mx-auto flex items-center justify-between max-w-[1400px]">
                    
                    {/* Real Sutherland Logo */}
                    <div className="flex items-center space-x-2 z-50 relative">
                        <img 
                            src="https://www.sutherlandglobal.com/wp-content/uploads/sites/2/2023/08/sutherland-logo-colour.png" 
                            alt="Sutherland Logo" 
                            className="h-8 md:h-10 w-auto object-contain"
                        />
                    </div>

                    {/* Talk to AI Button */}
                    <div className="flex items-center">
                        <DemoCallButton />
                    </div>
                </div>
            </header>

            {/* Abstract Animated Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] bg-cyan-600 animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] bg-blue-600 animate-pulse animation-delay-2000" />
            </div>

            {/* Main Content Container */}
            <main className="flex-grow flex flex-col justify-start">
                
                {/* Full-width Dark Hero Section matching the Screenshot */}
                <section className="relative w-full pt-28 lg:pt-36 pb-20 lg:pb-32 overflow-hidden bg-[#0A0E17]">
                    
                    {/* Dark Background Effects mimicking the Server Room / Circuit Board aesthetic */}
                    <div className="absolute inset-0 z-0">
                        {/* A very faint instance of the 3D element to simulate background tech structures */}
                        <div className="absolute inset-0 opacity-30 mix-blend-screen -ml-40 lg:-ml-20 scale-110 lg:scale-125 transform">
                            <ThreeDElement />
                        </div>
                        {/* Gradients to mimic the lighting in the provided image (blue on left, strong red traces on right/bottom) */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0E17] via-[#0A0E17]/80 to-transparent z-10"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E17] via-transparent to-transparent z-10"></div>
                        <div className="absolute bottom-[-100px] right-0 w-full h-[300px] bg-[#E31837] opacity-[0.15] blur-[150px] z-10 pointer-events-none"></div>
                        <div className="absolute top-0 right-[-10%] w-[50%] h-[500px] bg-blue-600 opacity-[0.1] blur-[150px] z-10 pointer-events-none"></div>
                    </div>

                    <div className="container mx-auto px-6 lg:px-12 max-w-[1400px] relative z-20">
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 lg:gap-16 items-center">
                            
                            {/* Left Column: Exact Text/Layout from Screenshot */}
                            <div className="xl:col-span-6 flex flex-col justify-center order-2 xl:order-1 text-center xl:text-left pr-0 xl:pr-10">
                                
                                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4rem] font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
                                    Outlook 2026: The Road to the <br className="hidden lg:block"/>Agentic Enterprise
                                </h1>

                                <p className="text-lg md:text-xl lg:text-[22px] font-medium text-gray-300 leading-relaxed mb-10 max-w-2xl mx-auto xl:mx-0">
                                    A step-by-step path to building AI-native, self-optimizing enterprises.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center xl:justify-start">
                                    <button className="bg-[#E31837] hover:bg-[#C2142E] text-white px-8 py-4 rounded-md text-base font-bold transition-all shadow-[0_0_20px_rgba(227,24,55,0.3)] hover:shadow-[0_0_30px_rgba(227,24,55,0.5)] w-full sm:w-auto tracking-wide scale-100 hover:scale-[1.02]">
                                        Unlock the Agentic Future
                                    </button>
                                </div>
                                
                                {/* Bottom Slide Indicators matching screenshot */}
                                <div className="flex items-center justify-center xl:justify-start mt-16 space-x-2">
                                    <button className="w-8 h-8 rounded border border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                    </button>
                                    <div className="flex space-x-2 px-2">
                                        <div className="w-2 h-2 rounded-full bg-white opacity-50"></div>
                                        <div className="w-2 h-2 rounded-full bg-[#E31837]"></div>
                                        <div className="w-2 h-2 rounded-full bg-white opacity-50"></div>
                                    </div>
                                    <button className="w-8 h-8 rounded border border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Right Column: Lead Capture Form (Dark Glassmorphism) */}
                            <div className="xl:col-span-6 w-full max-w-[600px] mx-auto xl:mr-0 relative z-20 order-1 xl:order-2">
                                <SutherlandLeadForm />
                            </div>

                        </div>
                    </div>
                    
                    {/* Bottom Red Strip from Screenshot */}
                    <div className="absolute bottom-0 left-0 right-0 w-full bg-[#E31837] py-3 px-6 z-30 flex items-center justify-between text-white text-sm">
                        <div className="container mx-auto text-center font-medium pr-8">
                            Outlook 2026: The Road to the Agentic Enterprise. <span className="font-bold underline cursor-pointer ml-1">Download Outlook 2026</span>
                        </div>
                        <button className="absolute right-4 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </section>

                <section className="bg-white pt-20 pb-16">
                    <div className="container mx-auto px-6 lg:px-12 text-center text-[#1D1D3A]">
                        <h2 className="text-3xl font-bold mb-4">Enterprise Voice AI Platform</h2>
                        <p className="text-[#4C535F] max-w-2xl mx-auto">Experience our real-time voice intelligence integrated with Sutherland's deep BPO expertise. The perfect synergy of technology and human-level nuance.</p>
                    </div>
                </section>

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
