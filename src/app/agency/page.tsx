import React from 'react';
import ThreeDElement from '@/components/ThreeDElement';
import AgencyLeadForm from '@/components/AgencyLeadForm';
import { Bot, PhoneCall, CalendarCheck, Sparkles } from 'lucide-react';

export default function AgencyLandingPage() {
    return (
        <div className="min-h-screen bg-slate-950 overflow-x-hidden flex flex-col font-sans">
            {/* Top Navigation Bar / Branding */}
            <header className="w-full relative z-20 py-6 px-6 lg:px-12 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                            TellYourJourney
                        </span>
                    </div>
                </div>
            </header>

            {/* Abstract Animated Gradients */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] bg-purple-600 animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] bg-indigo-600 animate-pulse animation-delay-2000" />
            </div>

            {/* Main Content Container */}
            <main className="flex-grow container mx-auto px-6 lg:px-12 relative z-10 py-16 lg:py-24">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left Column - Copy & 3D */}
                    <div className="flex flex-col space-y-8">
                        <div className="relative z-20">
                            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border border-indigo-400/30 bg-indigo-400/10 text-indigo-300 text-sm font-semibold mb-6 shadow-xl shadow-indigo-500/10">
                                <Bot className="w-4 h-4" />
                                <span>TellYourJourney Exclusive Access</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-tr from-white via-indigo-100 to-indigo-400 leading-[1.1] mb-6">
                                Deploy Voice AI <br /> That Converts.
                            </h1>
                            <p className="text-xl text-indigo-100/70 max-w-xl leading-relaxed">
                                Supercharge your business with completely autonomous AI Voice Agents that handle customer support, execute outbound sales, and automate calendar bookings 24/7.
                            </p>
                        </div>

                        {/* Premium 3D Element Container */}
                        <div className="w-full relative z-10 -mt-8 -mb-12 pointer-events-none">
                            {/* Embedded 3D Canvas */}
                            <ThreeDElement />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white max-w-xl relative z-20">
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
                    </div>

                    {/* Right Column - Lead Capture Form */}
                    <div className="w-full max-w-lg mx-auto lg:mr-0 lg:ml-auto relative z-20">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
                        <AgencyLeadForm />
                    </div>

                </div>
            </main>

            {/* Custom Footer */}
            <footer className="w-full relative z-20 border-t border-white/10 bg-slate-950/80 backdrop-blur-lg mt-12 py-10">
                <div className="container mx-auto px-6 lg:px-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div>
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-lg font-bold text-white tracking-tight">TellYourJourney</span>
                            </div>
                            <p className="text-sm text-slate-400 max-w-xs">
                                Powering the next generation of conversational AI. We build systems that speak for you, perfectly, every time.
                            </p>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
                            <ul className="space-y-2 text-sm text-slate-400">
                                <li>
                                    <span className="text-slate-300 font-medium">Name:</span> Alok Ranjan
                                </li>
                                <li>
                                    <span className="text-slate-300 font-medium">Phone:</span> 7042915552
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-4">Headquarters</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                E 311, Ace City Noida Ext<br />
                                Greater Noida West<br />
                                Gautam Buddha Nagar, 201306
                            </p>
                        </div>
                    </div>
                    <div className="mt-10 pt-6 border-t border-white/10 text-center md:text-left flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
                        <p>&copy; {new Date().getFullYear()} TellYourJourney. All rights reserved.</p>
                        <div className="flex space-x-4 mt-4 md:mt-0">
                            <span className="hover:text-slate-300 cursor-pointer transition-colors">Privacy Policy</span>
                            <span className="hover:text-slate-300 cursor-pointer transition-colors">Terms of Service</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
