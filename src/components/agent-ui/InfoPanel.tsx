import React from 'react';
import { BusinessConfig } from '@/types/agent-ui/types';
import { MapPin, Clock, Phone, Mail, Award, Calendar, CheckCircle2 } from 'lucide-react';

interface InfoPanelProps {
  config: BusinessConfig;
  connectedEmail?: string | null;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ config, connectedEmail }) => {
  return (
    <div className="h-full overflow-y-auto bg-white border-r border-slate-200 p-6 shadow-sm flex flex-col">
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl font-bold text-teal-700 mb-2">{config.metadata.businessName}</h1>
        <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">{config.metadata.industry}</p>
        <p className="mt-3 text-slate-600 text-sm leading-relaxed">{config.metadata.description}</p>
      </div>

      <div className="mb-4 sm:mb-8">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Location & Hours</h2>
        <div className="space-y-4">
          {config.locations.map(loc => (
            <div key={loc.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex items-start gap-3 mb-2">
                <MapPin className="w-5 h-5 text-teal-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-900">{loc.name}</h3>
                  <p className="text-xs text-slate-500">{loc.timeZone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-teal-600 mt-0.5" />
                <div className="text-sm text-slate-600">
                  <p className="font-medium">{loc.operatingHours}</p>
                  <p className="text-xs mt-1 text-slate-500">Mon - Sat</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 sm:mb-8">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Services</h2>
        <div className="space-y-3">
          {config.services.map(service => (
            <div key={service.id} className="group relative bg-white p-3 rounded-md border border-slate-200 hover:border-teal-400 transition-colors cursor-default">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-semibold text-slate-800">{service.name}</h3>
                <span className="text-xs font-mono bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{service.durationMinutes}m</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{service.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 sm:mb-8">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Available Specialists</h2>
        <div className="space-y-3">
          {config.resources.map(res => (
            <div key={res.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                {res.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{res.name}</p>
                <p className="text-xs text-slate-500">{res.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-slate-100">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">System Status</h2>
        <div className={`p-3 rounded-lg border ${connectedEmail ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${connectedEmail ? 'text-green-600' : 'text-slate-300'}`} />
            <span className={`text-sm font-medium ${connectedEmail ? 'text-green-800' : 'text-slate-500'}`}>
              {connectedEmail ? 'Google Workspace Active' : 'Calendar Disconnected'}
            </span>
          </div>
          {connectedEmail && (
            <p className="text-xs text-green-600 mt-1 ml-6">
              Scheduling & Emails enabled for {connectedEmail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;