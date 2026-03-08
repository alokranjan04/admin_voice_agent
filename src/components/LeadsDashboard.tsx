import React from 'react';
import {
    Users,
    Mail,
    Phone,
    Building2,
    Calendar,
    ExternalLink,
    Clock,
    CheckCircle2,
    AlertCircle,
    MessageSquare,
    ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lead } from '@/types/agent-ui/types';

interface LeadsDashboardProps {
    leads: Lead[];
}

const LeadsDashboard: React.FC<LeadsDashboardProps> = ({ leads }) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatus = (lead: Lead) => {
        const now = new Date().getTime();
        const expiry = new Date(lead.expiresAt).getTime();
        return expiry > now ? 'Active' : 'Expired';
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        Agency Leads
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">
                        Real-time tracking of prospects testing your Voice AI.
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Prospects</span>
                        <p className="text-xl font-black text-indigo-600">{leads.length}</p>
                    </div>
                    <div className="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Active Now</span>
                        <p className="text-xl font-black text-emerald-700">
                            {leads.filter(l => getStatus(l) === 'Active').length}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Company & Contact</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Communication</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Generated at</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <AnimatePresence>
                                {leads.length > 0 ? (
                                    leads.map((lead, index) => (
                                        <motion.tr
                                            key={lead.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="group hover:bg-slate-50/80 transition-all duration-200"
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-110 transition-transform">
                                                        {lead.company.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{lead.company}</div>
                                                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                                                            <Users className="w-3 h-3" />
                                                            {lead.name}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                        {lead.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                        {lead.phone}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {getStatus(lead) === 'Active' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-tight border border-emerald-100 ring-4 ring-emerald-50/30">
                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                        Active Agent
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-tight border border-slate-200">
                                                        <Clock className="w-3 h-3" />
                                                        Expired
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-xs font-bold text-slate-700">{formatDate(lead.createdAt)}</div>
                                                <div className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-tighter">
                                                    ID: {lead.id.substring(0, 8)}...
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2 opactiy-0 group-hover:opacity-100 transition-opacity">
                                                    <a
                                                        href={`/test/${lead.assistantId}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 rounded-lg shadow-sm transition-all active:scale-95"
                                                        title="Open Test Drive"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                    <button
                                                        className="p-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 text-xs font-bold"
                                                        onClick={() => alert('Referenced outbound call capability coming soon!')}
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                        Contact
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                                    <Users className="w-10 h-10" />
                                                </div>
                                                <div>
                                                    <p className="text-slate-900 font-bold">No leads captured yet</p>
                                                    <p className="text-slate-500 text-xs mt-1">When someone uses your /agency landing page, they'll appear here.</p>
                                                </div>
                                                <a
                                                    href="/agency"
                                                    target="_blank"
                                                    className="mt-4 px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-all"
                                                >
                                                    View Landing Page
                                                    <ArrowRight className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-8 bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-blue-900 font-bold text-sm">Lead Retention & Cleanup</h4>
                        <p className="text-blue-700 text-xs leading-relaxed mt-1">
                            Temporary agents expire after <strong>30 minutes</strong> to manage costs and keep your Vapi workspace clean.
                            Contact information is persisted in your Firebase database for long-term CRM tracking.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeadsDashboard;
