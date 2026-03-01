import React from 'react';
import {
  Building2,
  Calendar,
  MapPin,
  Users,
  Database,
  Link2,
  MessageSquare,
  ShieldAlert,
  Settings2,
  CheckCircle2,
  Lock,
  Loader2,
  ExternalLink,
  ChevronDown,
  LayoutGrid,
  CreditCard
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onLock: () => void;
  onLaunchClient: () => void;
  isValid: boolean;
  isSaving?: boolean;
  isLocked?: boolean;
  isLaunching?: boolean;
  agents: any[];
  onSelectAgent: (agentId: string) => void;
  branding?: {
    appName: string;
    logoUrl: string;
    primaryColor: string;
  };
  currentAgentId?: string;
}

const NAV_ITEMS = [
  { id: 'metadata', label: 'Business Metadata', icon: Building2 },
  { id: 'services', label: 'Services', icon: Calendar },
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'resources', label: 'Resources', icon: Users },
  { id: 'data', label: 'User Data Fields', icon: Database },
  { id: 'integrations', label: 'System Integrations', icon: Link2 },
  { id: 'conversation', label: 'Behavior Rules', icon: MessageSquare },
  { id: 'safety', label: 'Safety & Boundaries', icon: ShieldAlert },
  { id: 'mode', label: 'Operation Modes', icon: Settings2 },
  { id: 'vapi', label: 'VAPI Setup', icon: Settings2 },
  { id: 'calendar', label: 'Calendar & Bookings', icon: Calendar },
  { id: 'billing', label: 'Plan & Billing', icon: CreditCard },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  onLock,
  onLaunchClient,
  isValid,
  isSaving,
  isLocked,
  isLaunching,
  agents,
  onSelectAgent,
  branding,
  currentAgentId
}) => {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 overflow-y-auto border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-white" />
            </div>
          )}
          {branding?.appName || 'Voice Admin'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">Configurator v1.0</p>
      </div>

      {/* Agents Selection Section */}
      {agents.length > 0 && (
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">
            Organization Agents
          </label>
          <div className="space-y-1">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-2 ${agent.id === currentAgentId
                  ? 'bg-slate-800 text-white font-medium border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
              >
                <LayoutGrid className="w-3 h-3 text-brand-500" />
                <span className="truncate">{agent.metadata?.businessName || agent.id}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="flex-1 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${isActive
                    ? 'bg-brand-900/30 text-brand-500 border-r-2 border-brand-500'
                    : 'hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-500' : 'text-slate-500'}`} />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-6 border-t border-slate-800 text-center">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest">
          Configuration Dashboard
        </p>
      </div>
    </aside>
  );
};