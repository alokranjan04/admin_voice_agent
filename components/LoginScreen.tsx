import React, { useState } from 'react';
import { ShieldCheck, Mail, Calendar, Settings2, ArrowRight, Loader2, AlertTriangle, FileJson, Copy, Globe, EyeOff, ExternalLink, HelpCircle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => Promise<void>;
  onDemoLogin?: () => void;
  isLoggingIn: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onDemoLogin, isLoggingIn }) => {
  const [error, setError] = useState<string | null>(null);

  const handleLoginClick = async () => {
    setError(null);
    try {
        await onLogin();
    } catch (err: any) {
        setError(err.message || "Failed to sign in");
    }
  };

  const isConfigError = error && (error.includes('CONFIGURATION_ERROR') || error.includes('api-key-not-valid'));
  const isDomainError = error && (error.includes('DOMAIN_NOT_ALLOWED') || error.includes('unauthorized-domain'));
  const isProviderError = error && (error.includes('AUTH_ERROR') || error.includes('operation-not-allowed'));
  const isCancelled = error && (error.includes('Login cancelled'));

  // Logic to display the domain to be added
  let domainToDisplay = "ai-voice-agent-c2a2b.firebaseapp.com";
  let redirectUriToDisplay = `https://${domainToDisplay}/__/auth/handler`;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600 rounded-full blur-[128px]"></div>
         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-[128px]"></div>
      </div>

      <div className={`w-full ${isConfigError || isDomainError || isProviderError || isCancelled ? 'max-w-2xl' : 'max-w-md'} bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-8 z-10 transition-all duration-300`}>
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
                    {isConfigError ? "Configuration Required" : 
                     isDomainError ? "Domain Not Authorized" : 
                     isProviderError ? "Provider Not Enabled" : 
                     isCancelled ? "Login Cancelled / Blocked" : error}
                  </p>
              </div>
              
              {isCancelled && (
                 <div className="p-4 bg-slate-950/50 text-left border-t border-red-800/50 space-y-4">
                   <div>
                     <p className="text-sm text-white font-semibold flex items-center gap-2">
                       <HelpCircle className="w-4 h-4 text-brand-400" />
                       Fixing "redirect_uri_mismatch"
                     </p>
                     <p className="text-xs text-slate-400 mt-1">
                       If you saw "Error updating Google" in Firebase Console, follow these steps instead of trying to fix Firebase.
                     </p>
                   </div>

                   <ol className="text-xs text-slate-300 space-y-3 list-decimal pl-4">
                     <li>
                       Go to <a href="https://console.cloud.google.com/apis/credentials?project=ai-voice-agent-c2a2b" target="_blank" className="text-brand-400 hover:underline">Google Cloud Console &gt; Credentials</a>.
                     </li>
                     <li>
                       Find the client named <strong>"Web client (auto created by Google Service)"</strong>.
                       <div className="text-slate-500 italic mt-0.5">Do NOT use the one you created manually.</div>
                     </li>
                     <li>
                       Edit it and add this EXACT URI to "Authorized redirect URIs":
                       <div className="mt-2 flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-700">
                         <code className="text-emerald-400 font-mono break-all">{redirectUriToDisplay}</code>
                         <button onClick={() => navigator.clipboard.writeText(redirectUriToDisplay)} className="text-slate-500 hover:text-white p-1">
                           <Copy className="w-4 h-4"/>
                         </button>
                       </div>
                     </li>
                     <li>Click Save and try logging in again.</li>
                   </ol>
                 </div>
              )}

              {isProviderError && (
                <div className="p-4 bg-slate-950/50 text-left border-t border-red-800/50">
                  <p className="text-sm text-slate-300 mb-3">
                    Google Sign-In is currently disabled in your Firebase project settings.
                  </p>
                  <div className="text-xs text-slate-400 space-y-2 mb-4">
                    <p>1. Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-brand-400 hover:underline inline-flex items-center gap-1">Firebase Console <ExternalLink className="w-3 h-3"/></a></p>
                    <p>2. Select your project: <strong>ai-voice-agent-c2a2b</strong></p>
                    <p>3. Navigate to <strong>Authentication</strong> &gt; <strong>Sign-in method</strong></p>
                    <p>4. Click <strong>Add new provider</strong> (or edit Google if listed)</p>
                    <p>5. Select <strong>Google</strong>, toggle <strong>Enable</strong>, and click <strong>Save</strong></p>
                  </div>
                </div>
              )}
            </div>
        )}

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Calendar Integration</h3>
              <p className="text-xs text-slate-500">Access to manage bookings</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
            <button
              onClick={handleLoginClick}
              disabled={isLoggingIn}
              className="w-full bg-white text-slate-900 font-bold py-3 px-4 rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              )}
              <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
              {!isLoggingIn && <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />}
            </button>

            {onDemoLogin && (
                <button 
                    onClick={onDemoLogin}
                    className="w-full bg-slate-800 text-slate-400 font-semibold py-3 px-4 rounded-xl hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                    <EyeOff className="w-4 h-4" />
                    <span>{isCancelled ? 'Skip Login (Demo Mode)' : 'Continue in Demo Mode'}</span>
                </button>
            )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          <ShieldCheck className="w-3 h-3 inline mr-1" />
          Secure Enterprise Access
        </p>
      </div>
    </div>
  );
};