import React, { useState } from 'react';
import { ShieldCheck, Mail, Calendar, Settings2, ArrowRight, Loader2, AlertTriangle, FileJson, Copy, Globe, EyeOff, ExternalLink, HelpCircle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => Promise<void>;
  onDemoLogin?: () => void;
  isLoggingIn: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onDemoLogin, isLoggingIn }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLoginClick = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (username === 'admin' && password === 'admin') {
      try {
        await onLogin();
      } catch (err: any) {
        setError(err.message || "Failed to sign in");
      }
    } else {
      setError("Invalid credentials. Please use admin / admin.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-[128px]"></div>
      </div>

      <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-8 z-10 transition-all duration-300">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-900/50">
            <Settings2 className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Voice AI Admin</h1>
          <p className="text-slate-400">Sign in to configure your AI Agents</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg overflow-hidden border border-red-800 bg-red-900/20">
            <div className="p-4 flex items-start gap-3 bg-red-900/30">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200 font-medium break-words">
                {error}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleLoginClick} className="space-y-4 mb-8">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Username</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-slate-900/50 border border-slate-600 text-white rounded-xl py-3 pl-11 pr-4 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/50 border border-slate-600 text-white rounded-xl py-3 pl-11 pr-4 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-white text-slate-900 font-bold py-3 px-4 rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5" />
            )}
            <span>{isLoggingIn ? 'Verifying...' : 'Sign In'}</span>
          </button>
        </form>

        {onDemoLogin && (
          <button
            onClick={onDemoLogin}
            className="w-full bg-slate-800/50 text-slate-400 font-semibold py-3 px-4 rounded-xl hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center gap-2 border border-slate-700/50"
          >
            <EyeOff className="w-4 h-4" />
            <span>Continue as Guest</span>
          </button>
        )}

        <p className="text-center text-xs text-slate-500 mt-6">
          <ShieldCheck className="w-3 h-3 inline mr-1" />
          Authorized Personnel Only
        </p>
      </div>
    </div>
  );
};