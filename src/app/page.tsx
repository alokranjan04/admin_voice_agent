"use client";

import React from 'react';
import ThreeDElement from '@/components/ThreeDElement';
import AgencyLeadForm from '@/components/AgencyLeadForm';
import { Bot, PhoneCall, CalendarCheck, Sparkles } from 'lucide-react';
import { sendGAEvent } from '@next/third-parties/google';
import { PopupModal } from 'react-calendly';

export default function AgencyLandingPage() {
    const [isCalendlyOpen, setIsCalendlyOpen] = React.useState(false);
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 overflow-x-hidden flex flex-col font-sans">
            {/* Top Navigation Bar / Branding */}
            <header className="fixed top-0 left-0 right-0 z-50 w-full py-4 px-6 lg:px-12 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl transition-all duration-300">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Sparkles className="w-5 h-5 text-white" />
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
                        <button
                            onClick={() => {
                                sendGAEvent('event', 'book_demo_click', { category: 'engagement', label: 'Header CTA' });
                                setIsCalendlyOpen(true);
                            }}
                            className="hidden sm:flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-slate-900 font-bold text-sm hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer"
                        >
                            Book a Demo
                        </button>
                    </div>
                </div>
            </header>

            {/* Abstract Animated Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] bg-purple-600 animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] bg-indigo-600 animate-pulse animation-delay-2000" />
            </div>

            {/* Main Content Container */}
            <main className="flex-grow relative z-10 pt-20">

                {/* Full-Width 3D Hero Section */}
                <div className="relative w-full">
                    {/* Headline overlaid on top of the 3D element */}
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
                        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border border-indigo-400/30 bg-indigo-400/10 text-indigo-300 text-sm font-semibold mb-4 shadow-xl shadow-indigo-500/10">
                            <Bot className="w-4 h-4" />
                            <span>TellYourJourney Exclusive Access</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-tr from-white via-indigo-100 to-indigo-400 leading-[1.1] mb-4 py-2 flex flex-col gap-2">
                            <span>Voice AI That Converts</span>
                            <span>Missed Calls Into Revenue.</span>
                        </h1>
                        <p className="text-xl text-indigo-100/70 max-w-2xl leading-relaxed">
                            Supercharge your business with completely autonomous AI Voice Agents that handle customer support, execute outbound sales, and automate calendar bookings 24/7.
                        </p>
                    </div>

                    {/* Full-width 3D Canvas */}
                    <div className="w-full pointer-events-auto">
                        <ThreeDElement />
                    </div>
                </div>

                {/* Below-fold: Stats + Form */}
                <div className="container mx-auto px-6 lg:px-12 py-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

                        {/* Left: Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
                            <div className="flex flex-col space-y-2 border-l-2 border-indigo-500 pl-4 bg-white/5 p-4 rounded-r-xl backdrop-blur-sm shadow-xl shadow-black/50 hover:bg-white/10 transition-colors">
                                <span className="text-3xl font-bold flex items-center">
                                    <PhoneCall className="w-6 h-6 mr-3 text-indigo-400" />
                                    24/7
                                </span>
                                <span className="text-sm text-indigo-200">Flawless Operation. Answer every customer without a single break.</span>
                            </div>
                            <div className="flex flex-col space-y-2 border-l-2 border-purple-500 pl-4 bg-white/5 p-4 rounded-r-xl backdrop-blur-sm shadow-xl shadow-black/50 hover:bg-white/10 transition-colors">
                                <span className="text-3xl font-bold flex items-center">
                                    <CalendarCheck className="w-6 h-6 mr-3 text-purple-400" />
                                    100%
                                </span>
                                <span className="text-sm text-indigo-200">Scalability. Handle infinite simultaneous callers & book meetings instantly.</span>
                            </div>
                        </div>

                        {/* Right: Lead Capture Form */}
                        <div className="w-full max-w-lg mx-auto lg:mr-0 lg:ml-auto relative z-20">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
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
                                <li className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Director</span>
                                    <span className="text-slate-200">Alok Ranjan</span>
                                </li>
                                <li className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Direct Line</span>
                                    <a href="tel:7042915552" className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">7042915552</a>
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

            {/* Calendly Interactive Popup */}
            {isMounted && (
                <PopupModal
                    url={process.env.NEXT_PUBLIC_CALENDAR_BOOKING_LINK || "https://calendly.com/"}
                    onModalClose={() => setIsCalendlyOpen(false)}
                    open={isCalendlyOpen}
                    rootElement={document.getElementById("__next") || document.body}
                />
            )}
        </div>
    );
}
