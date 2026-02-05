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
  ExternalLink
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
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  onLock,
  onLaunchClient,
  isValid,
  isSaving,
  isLocked,
  isLaunching
}) => {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 overflow-y-auto border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-white" />
          </div>
          Voice Admin
        </h1>
        <p className="text-xs text-slate-500 mt-1">Configurator v1.0</p>
      </div>

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

      <div className="p-6 border-t border-slate-800 space-y-3">
        {/* Launch Client Button (Auth Bridge) */}
        <button
          onClick={onLaunchClient}
          disabled={isLaunching}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-indigo-400 hover:bg-slate-700 hover:text-indigo-300 border border-slate-700 transition-all disabled:opacity-70 disabled:cursor-wait"
          title="Open localhost:3001 with current auth session"
        >
          {isLaunching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
          {isLaunching ? 'Launching...' : 'Launch Web Client'}
        </button>

        {/* Lock/Save Button */}
        <button
          onClick={onLock}
          disabled={!isValid || isSaving || isLocked}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-all ${isValid && !isLocked
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            } ${isSaving ? 'opacity-80 cursor-wait' : ''}`}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isValid && !isLocked ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />)}
          {isSaving ? 'Saving...' : (isValid && !isLocked ? 'Validate & Lock' : (isLocked ? 'Locked' : 'Incomplete'))}
        </button>
      </div>
    </aside>
  );
};