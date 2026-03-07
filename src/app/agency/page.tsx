import React from 'react';
import ThreeDElement from '@/components/ThreeDElement';
import AgencyLeadForm from '@/components/AgencyLeadForm';
import { Bot, PhoneCall, CalendarCheck } from 'lucide-react';

export default function AgencyLandingPage() {
    return (
        <div className="min-h-screen bg-slate-950 overflow-x-hidden">
            {/* Abstract Animated Gradients */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] bg-purple-600" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[120px] bg-indigo-600" />
            </div>

            {/* Main Content Container */}
            <div className="container mx-auto px-6 lg:px-12 relative z-10 py-20 lg:py-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left Column - Copy & 3D */}
                    <div className="flex flex-col space-y-8">
                        <div className="relative z-20">
                            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border border-indigo-400/30 bg-indigo-400/10 text-indigo-300 text-sm font-semibold mb-6">
                                <Bot className="w-4 h-4" />
                                <span>Next-Gen Automation</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-tr from-white via-indigo-100 to-indigo-400 leading-[1.1] mb-6">
                                Deploy Voice AI <br /> That Converts.
                            </h1>
                            <p className="text-xl text-indigo-100/70 max-w-xl leading-relaxed">
                                Supercharge your business with completely autonomous AI Voice Agents that handle customer support, execute outbound sales, and automate calendar bookings 24/7.
                            </p>
                        </div>

                        {/* Premium 3D Element Container */}
                        <div className="w-full relative z-10 -mt-8 -mb-8 pointer-events-none">
                            {/* Embedded 3D Canvas */}
                            <ThreeDElement />
                        </div>

                        <div className="grid grid-cols-2 gap-6 text-white max-w-xl relative z-20">
                            <div className="flex flex-col space-y-2 border-l-2 border-indigo-500 pl-4 bg-white/5 p-4 rounded-r-xl backdrop-blur-sm">
                                <span className="text-3xl font-bold flex items-center">
                                    <PhoneCall className="w-6 h-6 mr-3 text-indigo-400" />
                                    24/7
                                </span>
                                <span className="text-sm text-indigo-200">Flawless Operation. Answer every customer without a single break.</span>
                            </div>
                            <div className="flex flex-col space-y-2 border-l-2 border-purple-500 pl-4 bg-white/5 p-4 rounded-r-xl backdrop-blur-sm">
                                <span className="text-3xl font-bold flex items-center">
                                    <CalendarCheck className="w-6 h-6 mr-3 text-purple-400" />
                                    100%
                                </span>
                                <span className="text-sm text-indigo-200">Scalability. Handle infinite simultaneous callers & book meetings instantly.</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Lead Capture Form */}
                    <div className="w-full max-w-lg mx-auto lg:mr-0 lg:ml-auto relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-3xl blur-xl" />
                        <AgencyLeadForm />
                    </div>

                </div>
            </div>
        </div>
    );
}
