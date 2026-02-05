import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import { generateConfigFromDescription } from './services/geminiService';
import { saveConfiguration, auth, loginWithGoogle, logoutUser } from './services/firebase';
import { createVapiAssistant } from './services/vapiService';
import { researchBusiness } from './services/researchService';
import { AgentConfiguration, INITIAL_CONFIG, DeliveryModeType } from './types';
import { Wand2, Plus, Trash2, Loader2, AlertCircle, Copy, Check, Database, Calendar, Rocket, Braces, Search } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';

const TIME_ZONES = [
  'UTC',
  'Africa/Johannesburg',
  'America/Anchorage',
  'America/Chicago',
  'America/Denver',
  'America/Honolulu',
  'America/Los_Angeles',
  'America/New_York',
  'America/Phoenix',
  'America/Sao_Paulo',
  'America/Toronto',
  'Asia/Dubai',
  'Asia/Hong_Kong',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Paris',
  'Europe/Zurich',
  'Pacific/Auckland'
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [activeSection, setActiveSection] = useState('metadata');
  const [config, setConfig] = useState<AgentConfiguration>(INITIAL_CONFIG);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false); // New state for launch process
  const [copySuccess, setCopySuccess] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      setIsLoggingIn(false);
      if (currentUser) {
        setIsDemoMode(false);
        // Automatically enable calendar integration if logged in, but PRESERVE existing keys
        setConfig(prev => ({
          ...prev,
          integrations: {
            firebase: true, // Default ensure
            ...(prev.integrations || {}),
            googleCalendar: true
          }
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login Error", error);
      setIsLoggingIn(false);
      throw error;
    }
  };

  const handleDemoLogin = () => {
    setIsDemoMode(true);
  };

  const handleLogout = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setConfig(INITIAL_CONFIG);
      setIsLocked(false);
      return;
    }
    try {
      await logoutUser();
      setIsLocked(false);
      setConfig(INITIAL_CONFIG);
    } catch (error) {
      console.error("Logout Error", error);
    }
  };

  // Helper to scroll to section
  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isValid =
    config.metadata.businessName.length > 0 &&
    config.services.length > 0 &&
    config.locations.length > 0;

  // Generates a token and opens the client app on Vercel
  const handleLaunchClient = async () => {
    if (isDemoMode) {
      window.open('https://voice-agent-eight-delta.vercel.app/', '_blank');
      return;
    }

    if (!user) {
      alert("Please sign in first.");
      return;
    }

    setIsLaunching(true);
    try {
      // Step 1: Force Save if valid. 
      // This ensures the DB has the latest schema (including integrations field) before the client reads it.
      // We skip the confirmation prompt here because "Launch" implies "Use current config".
      if (isValid) {
        await saveConfiguration(config);
        setIsLocked(true); // Ensure UI reflects saved state
      }

      // Step 2: Get Fresh Token
      // Pass true to force refresh and avoid "Session expired" errors on client
      const token = await user.getIdToken(true);

      // Step 3: Open Client
      // We also pass 'role=admin' to help the client context (optional usage)
      const url = `https://voice-agent-eight-delta.vercel.app?authtoken=${encodeURIComponent(token)}&role=admin`;
      window.open(url, '_blank');
    } catch (error) {
      console.error("Failed to launch client", error);
      alert("Error launching client. Check console for details.");
    } finally {
      setIsLaunching(false);
    }
  };

  const handleAiGenerate = async (useResearch = false) => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    if (useResearch) setIsResearching(true);

    try {
      let researchData = null;
      if (useResearch) {
        try {
          researchData = await researchBusiness(aiPrompt);
        } catch (researchError) {
          console.error("Research failed, proceeding with AI only", researchError);
        } finally {
          setIsResearching(false);
        }
      }

      const generated = await generateConfigFromDescription(aiPrompt, researchData);
      setConfig(prev => ({
        ...prev,
        metadata: { ...prev.metadata, ...generated.metadata },
        services: generated.services || prev.services,
        locations: generated.locations || prev.locations,
        resources: generated.resources || prev.resources,
        conversation: { ...prev.conversation, ...generated.conversation },
        safety: { ...prev.safety, ...generated.safety },
        integrations: { ...prev.integrations, ...generated.integrations },
        vapi: { ...prev.vapi, ...(generated.vapi || {}) } // Merge AI generated rules/FAQs with existing VAPI settings
      }));
    } catch (error: any) {
      console.error("AI Generation failed", error);
      const message = error.message || "Unknown error";

      if (message.includes("API_KEY_INVALID") || message.includes("API key not valid")) {
        alert("API Key Rejected: The key detected in your environment was rejected by Google.\n\n" +
          "Troubleshooting:\n" +
          "1. IMPORTANT: Restart your terminal/server (`npm run dev`) if you just changed the .env file.\n" +
          "2. Ensure the key starts with 'VITE_' in your .env file (e.g., VITE_GEMINI_API_KEY).\n" +
          "3. Open the Browser Console (F12) to see which key is being loaded.");
      } else if (message.includes("API Key is missing")) {
        alert("Configuration Error: " + message);
      } else {
        alert("AI Assistant Error: " + message);
      }
    } finally {
      setIsGenerating(false);
    }
  };



  // ... (existing imports)

  const handleLock = async () => {
    setIsSaving(true);
    try {
      // 1. Save to Firebase
      await saveConfiguration(config);

      // 2. Create in VAPI (if in Production or standard mode)
      if (!isDemoMode && config.vapi.provider) {
        try {
          await createVapiAssistant(config);
          // alert("Success! Configuration saved to Firebase AND VAPI Assistant created.");
          // Automatically launch the client after successful save/lock
          handleLaunchClient();
        } catch (vapiError: any) {
          console.error("VAPI Error", vapiError);
          alert(`Saved to Cloud, but VAPI creation failed: ${vapiError.message}`);
        }
      }

      setIsLocked(true);
    } catch (error) {
      console.error("Failed to save config", error);
      if (isDemoMode) {
        alert("Demo Mode: Configuration validated locally (Firebase save skipped or failed).");
        setIsLocked(true);
      } else {
        alert("Failed to save configuration to database. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateMetadata = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, metadata: { ...prev.metadata, [field]: value } }));
  };

  const addService = () => {
    setConfig(prev => ({
      ...prev,
      services: [...prev.services, {
        id: Math.random().toString(36).substring(2, 9),
        name: '',
        description: '',
        durationMinutes: 30,
        bookingRules: ''
      }]
    }));
  };

  const updateService = (id: string, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      services: prev.services.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const removeService = (id: string) => {
    setConfig(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id)
    }));
  };

  const addLocation = () => {
    setConfig(prev => ({
      ...prev,
      locations: [...prev.locations, {
        id: Math.random().toString(36).substring(2, 9),
        name: '',
        mode: 'Physical',
        operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        operatingHours: '09:00 - 17:00',
        timeZone: 'UTC'
      }]
    }));
  };

  const updateLocation = (id: string, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      locations: prev.locations.map(l => l.id === id ? { ...l, [field]: value } : l)
    }));
  };

  const removeLocation = (id: string) => {
    setConfig(prev => ({
      ...prev,
      locations: prev.locations.filter(l => l.id !== id)
    }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!user && !isDemoMode) {
    return <LoginScreen onLogin={handleLogin} onDemoLogin={handleDemoLogin} isLoggingIn={isLoggingIn} />;
  }

  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center justify-center p-8 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-slate-900">
        <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center mb-4">
              <Check className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Configuration Submitted!</h1>
            <p className="text-slate-400 text-lg max-w-md">
              Your Voice AI Agent has been updated and the VAPI assistant is ready for action.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={handleLaunchClient}
              disabled={isLaunching}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-3 shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-70"
            >
              <Rocket className="w-5 h-5 font-bold" />
              Launch Agent Interface
            </button>
            <button
              onClick={() => setIsLocked(false)}
              className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all hover:bg-slate-700/80"
            >
              Back to Configurator
            </button>
          </div>

          <div className="pt-8 border-t border-slate-800 mt-8">
            <button
              onClick={() => {
                const el = document.getElementById('json-preview');
                if (el) el.classList.toggle('hidden');
              }}
              className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-2 mx-auto"
            >
              <Braces className="w-4 h-4" />
              View Technical JSON
            </button>
            <div id="json-preview" className="hidden mt-4 bg-slate-950 rounded-lg p-6 border border-slate-800 text-left overflow-auto max-h-[300px]">
              <pre className="font-mono text-xs text-emerald-400">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        activeSection={activeSection}
        onNavigate={scrollToSection}
        onLock={handleLock}
        onLaunchClient={handleLaunchClient}
        isValid={isValid}
        isSaving={isSaving}
        isLocked={isLocked}
        isLaunching={isLaunching}
      />

      <main className="ml-64 flex-1 p-8 max-w-5xl mx-auto space-y-16 pb-32">
        <div className="flex justify-end mb-4 items-center gap-4">
          {isDemoMode && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
              DEMO MODE
            </span>
          )}
          <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-500 px-3 py-1">
            {isDemoMode ? 'Exit Demo' : `Sign Out (${user?.email})`}
          </button>
        </div>

        {/* AI Assistant Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl p-6 text-white shadow-lg mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-lg">
              <Wand2 className="w-6 h-6 text-indigo-100" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold mb-2">AI Configuration Assistant</h2>
              <p className="text-indigo-100 mb-4 text-sm">
                Describe the business, and I will auto-fill the configuration for you.
                Try: "A high-end hair salon in New York specializing in color and styling."
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. A dental clinic in Chicago offering exams and cleanings..."
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                  onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                />
                <button
                  onClick={() => handleAiGenerate(false)}
                  disabled={isGenerating}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 border border-white/20"
                  title="Generate purely from AI"
                >
                  {isGenerating && !isResearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  Auto-Fill
                </button>
                <button
                  onClick={() => handleAiGenerate(true)}
                  disabled={isGenerating}
                  className="px-6 py-2 bg-white text-indigo-700 font-bold rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-black/10"
                  title="Search the web & Maps for real data first"
                >
                  {isResearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {isResearching ? 'Searching...' : 'Research & Auto-Fill'}
                </button>
              </div>
              {isResearching && (
                <p className="mt-2 text-xs text-indigo-200 animate-pulse">
                  Finding real-world details for "{aiPrompt}" on Google...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section A: Metadata */}
        <section id="metadata" className="space-y-6 scroll-mt-24">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-800">Section A: Business Metadata</h2>
            <p className="text-slate-500">Core identity and purpose of the business.</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Business Name</label>
              <input type="text" className="w-full p-2 border rounded-md"
                value={config.metadata.businessName} onChange={(e) => updateMetadata('businessName', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Created At</label>
              <div className="flex items-center gap-2 w-full p-2 border rounded-md bg-slate-100 text-slate-500">
                <Calendar className="w-4 h-4" />
                <span>{config.metadata.createdAt ? new Date(config.metadata.createdAt).toLocaleString() : 'New'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Industry</label>
              <input type="text" className="w-full p-2 border rounded-md"
                value={config.metadata.industry} onChange={(e) => updateMetadata('industry', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Primary Use Case</label>
              <input type="text" className="w-full p-2 border rounded-md"
                value={config.metadata.primaryUseCase} onChange={(e) => updateMetadata('primaryUseCase', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Target Users</label>
              <input type="text" className="w-full p-2 border rounded-md"
                value={config.metadata.targetUsers} onChange={(e) => updateMetadata('targetUsers', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium text-slate-700">Business Description</label>
              <textarea className="w-full p-2 border rounded-md h-24"
                value={config.metadata.description} onChange={(e) => updateMetadata('description', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Section B: Services */}
        <section id="services" className="space-y-6 scroll-mt-24">
          <div className="flex justify-between items-end border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Section B: Services / Offerings</h2>
              <p className="text-slate-500">Define the services available for booking.</p>
            </div>
            <button onClick={addService} className="text-sm bg-slate-900 text-white px-3 py-2 rounded-md hover:bg-slate-700 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Service
            </button>
          </div>

          <div className="space-y-4">
            {config.services.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-lg text-slate-400">
                No services defined. Booking will be disabled.
              </div>
            )}
            {config.services.map((service, index) => (
              <div key={service.id} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative group">
                <button onClick={() => removeService(service.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-4 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Service Name</label>
                    <input type="text" className="w-full p-2 border rounded bg-slate-50"
                      value={service.name} onChange={(e) => updateService(service.id, 'name', e.target.value)} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Duration (min)</label>
                    <input type="number" className="w-full p-2 border rounded bg-slate-50"
                      value={service.durationMinutes} onChange={(e) => updateService(service.id, 'durationMinutes', parseInt(e.target.value))} />
                  </div>
                  <div className="col-span-6 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Booking Rules</label>
                    <input type="text" className="w-full p-2 border rounded bg-slate-50" placeholder="e.g. 24h notice required"
                      value={service.bookingRules} onChange={(e) => updateService(service.id, 'bookingRules', e.target.value)} />
                  </div>
                  <div className="col-span-12 space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Description</label>
                    <input type="text" className="w-full p-2 border rounded bg-slate-50"
                      value={service.description} onChange={(e) => updateService(service.id, 'description', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section C: Locations */}
        <section id="locations" className="space-y-6 scroll-mt-24">
          <div className="flex justify-between items-end border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Section C: Locations</h2>
              <p className="text-slate-500">Physical or virtual delivery points.</p>
            </div>
            <button onClick={addLocation} className="text-sm bg-slate-900 text-white px-3 py-2 rounded-md hover:bg-slate-700 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Location
            </button>
          </div>

          <div className="space-y-4">
            {config.locations.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-lg text-slate-400">
                At least one location is required.
              </div>
            )}
            {config.locations.map((loc) => (
              <div key={loc.id} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative">
                <button onClick={() => removeLocation(loc.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Location Name</label>
                    <input type="text" className="w-full p-2 border rounded bg-slate-50"
                      value={loc.name} onChange={(e) => updateLocation(loc.id, 'name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Type</label>
                    <select className="w-full p-2 border rounded bg-slate-50"
                      value={loc.mode} onChange={(e) => updateLocation(loc.id, 'mode', e.target.value)}>
                      <option value="Physical">Physical</option>
                      <option value="Virtual">Virtual</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Hours</label>
                    <input type="text" className="w-full p-2 border rounded bg-slate-50"
                      value={loc.operatingHours} onChange={(e) => updateLocation(loc.id, 'operatingHours', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Time Zone</label>
                    <select
                      className="w-full p-2 border rounded bg-slate-50"
                      value={loc.timeZone}
                      onChange={(e) => updateLocation(loc.id, 'timeZone', e.target.value)}
                    >
                      {TIME_ZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section E: Data Fields */}
        <section id="data" className="space-y-6 scroll-mt-24">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-800">Section E: Required User Data</h2>
            <p className="text-slate-500">Information the agent must collect.</p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-white p-6 border rounded-lg shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> Mandatory Fields
              </h3>
              <div className="space-y-2">
                {['Name', 'Phone', 'Email', 'Service Type', 'Date', 'Time'].map(field => (
                  <label key={field} className="flex items-center gap-2">
                    <input type="checkbox" checked={config.dataFields.mandatory.includes(field)}
                      onChange={(e) => {
                        const newFields = e.target.checked
                          ? [...config.dataFields.mandatory, field]
                          : config.dataFields.mandatory.filter(f => f !== field);
                        setConfig(prev => ({ ...prev, dataFields: { ...prev.dataFields, mandatory: newFields } }));
                      }}
                    />
                    <span className="text-sm">{field}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="bg-white p-6 border rounded-lg shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-300"></span> Optional Fields
              </h3>
              <div className="space-y-2">
                {['Email', 'Address', 'Notes', 'Referral Source'].map(field => (
                  <label key={field} className="flex items-center gap-2">
                    <input type="checkbox" checked={config.dataFields.optional.includes(field)}
                      onChange={(e) => {
                        const newFields = e.target.checked
                          ? [...config.dataFields.optional, field]
                          : config.dataFields.optional.filter(f => f !== field);
                        setConfig(prev => ({ ...prev, dataFields: { ...prev.dataFields, optional: newFields } }));
                      }}
                    />
                    <span className="text-sm">{field}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Validation Rules</label>
            <input type="text" className="w-full p-2 border rounded-md"
              value={config.dataFields.validationRules} onChange={(e) => setConfig(prev => ({ ...prev, dataFields: { ...prev.dataFields, validationRules: e.target.value } }))} />
          </div>
        </section>

        {/* Section F: Integrations */}
        <section id="integrations" className="space-y-6 scroll-mt-24">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-800">Section F: System Integrations</h2>
            <p className="text-slate-500">Fixed external connections.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border flex items-start gap-3 transition-colors ${config.integrations?.firebase ? 'bg-slate-50 border-emerald-200' : 'bg-slate-100 border-slate-200'}`}>
              <div className="p-2 bg-orange-100 rounded text-orange-600"><Database className="w-5 h-5" /></div>
              <div>
                <h4 className="font-semibold text-slate-900">Google Firebase</h4>
                <p className="text-xs text-slate-500 mt-1">Users, Bookings, Logs</p>
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.integrations?.firebase || false}
                      onChange={(e) => setConfig(prev => ({ ...prev, integrations: { ...prev.integrations, firebase: e.target.checked } }))}
                    />
                    <span>Enable Database</span>
                  </label>
                  <span className={`px-2 py-0.5 ${isDemoMode ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'} text-[10px] font-bold rounded`}>
                    {isDemoMode ? 'DEMO MODE' : 'CONNECTED'}
                  </span>
                </div>
              </div>
            </div>
            <div className={`p-4 rounded-lg border flex items-start gap-3 transition-colors ${config.integrations?.googleCalendar ? 'bg-slate-50 border-emerald-200' : 'bg-slate-100 border-slate-200'}`}>
              <div className="p-2 bg-blue-100 rounded text-blue-600"><Calendar className="w-5 h-5" /></div>
              <div>
                <h4 className="font-semibold text-slate-900">Google Calendar</h4>
                <p className="text-xs text-slate-500 mt-1">Availability & Events</p>
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.integrations?.googleCalendar || false}
                      onChange={(e) => setConfig(prev => ({ ...prev, integrations: { ...prev.integrations, googleCalendar: e.target.checked } }))}
                    />
                    <span>Enable Booking</span>
                  </label>
                  <span className={`px-2 py-0.5 ${user ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'} text-[10px] font-bold rounded`}>
                    {user ? 'AUTHORIZED' : (isDemoMode ? 'SIMULATED' : 'PENDING')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section G: Conversation */}
        <section id="conversation" className="space-y-6 scroll-mt-24">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-800">Section G: Conversation & Behavior</h2>
            <p className="text-slate-500">Voice personality and interaction rules.</p>
          </div>
          <div className="bg-white p-6 border rounded-lg shadow-sm grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tone</label>
              <input type="text" className="w-full p-2 border rounded"
                value={config.conversation.tone}
                onChange={(e) => setConfig(prev => ({ ...prev, conversation: { ...prev.conversation, tone: e.target.value } }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Formality</label>
              <select className="w-full p-2 border rounded"
                value={config.conversation.formality}
                onChange={(e) => setConfig(prev => ({ ...prev, conversation: { ...prev.conversation, formality: e.target.value as any } }))}>
                <option>Casual</option>
                <option>Professional</option>
                <option>Formal</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Speech Pace</label>
              <select className="w-full p-2 border rounded"
                value={config.conversation.speechPace}
                onChange={(e) => setConfig(prev => ({ ...prev, conversation: { ...prev.conversation, speechPace: e.target.value as any } }))}>
                <option>Slow</option>
                <option>Normal</option>
                <option>Fast</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Identity Disclosure</label>
              <select className="w-full p-2 border rounded"
                value={config.conversation.identityDisclosure}
                onChange={(e) => setConfig(prev => ({ ...prev, conversation: { ...prev.conversation, identityDisclosure: e.target.value as any } }))}>
                <option>Always</option>
                <option>On Demand</option>
                <option>Never</option>
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" checked={config.conversation.smallTalkAllowed}
                onChange={(e) => setConfig(prev => ({ ...prev, conversation: { ...prev.conversation, smallTalkAllowed: e.target.checked } }))} />
              <label className="text-sm font-medium">Allow Small Talk</label>
            </div>
          </div>
        </section>

        {/* Section H: Safety */}
        <section id="safety" className="space-y-6 scroll-mt-24">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-800">Section H: Safety & Boundaries</h2>
            <p className="text-slate-500">Guardrails for AI operation.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-emerald-700">Allowed Topics</label>
              <textarea className="w-full p-2 border border-emerald-200 bg-emerald-50 rounded-md h-24"
                value={config.safety.allowedTopics} onChange={(e) => setConfig(prev => ({ ...prev, safety: { ...prev.safety, allowedTopics: e.target.value } }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-red-700">Disallowed Topics</label>
              <textarea className="w-full p-2 border border-red-200 bg-red-50 rounded-md h-24"
                value={config.safety.disallowedTopics} onChange={(e) => setConfig(prev => ({ ...prev, safety: { ...prev.safety, disallowedTopics: e.target.value } }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Compliance Constraints</label>
              <input type="text" className="w-full p-2 border rounded-md"
                value={config.safety.complianceConstraints} onChange={(e) => setConfig(prev => ({ ...prev, safety: { ...prev.safety, complianceConstraints: e.target.value } }))} />
            </div>
          </div>
        </section>

        {/* Section J: VAPI Configuration */}
        <section id="vapi" className="space-y-6 scroll-mt-24">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-800">Section J: VAPI Configuration</h2>
            <p className="text-slate-500">Settings for the Voice AI Provider.</p>
          </div>
          <div className="bg-white p-6 border rounded-lg shadow-sm space-y-6">

            {/* System Prompt */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">System Prompt</label>
              <textarea
                className="w-full p-2 border rounded-md h-64 font-mono text-sm"
                value={config.vapi.systemPrompt}
                onChange={(e) => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, systemPrompt: e.target.value } }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Model Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 border-b pb-2">Model</h3>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Provider</label>
                  <input type="text" className="w-full p-2 border rounded bg-slate-50"
                    value={config.vapi.provider}
                    onChange={(e) => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, provider: e.target.value } }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Model</label>
                  <input type="text" className="w-full p-2 border rounded bg-slate-50"
                    value={config.vapi.model}
                    onChange={(e) => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, model: e.target.value } }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Temperature</label>
                  <input type="number" step="0.1" className="w-full p-2 border rounded bg-slate-50"
                    value={config.vapi.temperature}
                    onChange={(e) => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, temperature: parseFloat(e.target.value) } }))}
                  />
                </div>
              </div>

              {/* Voice Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 border-b pb-2">Voice & Audio</h3>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Voice Provider</label>
                  <input type="text" className="w-full p-2 border rounded bg-slate-50"
                    value={config.vapi.voiceProvider}
                    onChange={(e) => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, voiceProvider: e.target.value } }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Voice ID</label>
                  <input type="text" className="w-full p-2 border rounded bg-slate-50"
                    value={config.vapi.voiceId}
                    onChange={(e) => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, voiceId: e.target.value } }))}
                  />
                </div>
              </div>
            </div>

            {/* Transcriber Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 border-b pb-2">Transcriber</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Provider</label>
                  <input type="text" className="w-full p-2 border rounded bg-slate-50"
                    value={config.vapi.transcriber.provider}
                    onChange={(e) => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, transcriber: { ...prev.vapi.transcriber, provider: e.target.value } } }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Model</label>
                  <input type="text" className="w-full p-2 border rounded bg-slate-50"
                    value={config.vapi.transcriber.model}
                    onChange={(e) => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, transcriber: { ...prev.vapi.transcriber, model: e.target.value } } }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Language</label>
                  <input type="text" className="w-full p-2 border rounded bg-slate-50"
                    value={config.vapi.transcriber.language}
                    onChange={(e) => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, transcriber: { ...prev.vapi.transcriber, language: e.target.value } } }))}
                  />
                </div>
              </div>
            </div>

            {/* First Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">First Message</label>
              <textarea
                className="w-full p-2 border rounded-md h-20"
                value={config.vapi.firstMessage}
                onChange={(e) => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, firstMessage: e.target.value } }))}
              />
            </div>

            {/* Knowledge Base */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Knowledge Base (Files/FAQs)</label>
              <p className="text-xs text-slate-500">Markdown content to represent files to train upon.</p>
              <textarea
                className="w-full p-2 border rounded-md h-48 font-mono text-xs"
                value={config.vapi.knowledgeBase}
                onChange={(e) => setConfig(prev => ({ ...prev, vapi: { ...prev.vapi, knowledgeBase: e.target.value } }))}
                placeholder="Content from FAQs..."
              />
            </div>

          </div>
        </section>

        {/* Section I: Modes */}
        <section id="mode" className="space-y-6 scroll-mt-24 pb-20">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-800">Section I: Operation Modes</h2>
            <p className="text-slate-500">Control the runtime environment.</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { id: 'Training', desc: 'Data stored, no calendar writes.' },
              { id: 'Production', desc: 'Live calendar + Firebase writes.' },
              { id: 'Fallback', desc: 'Human escalation only.' }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setConfig(prev => ({ ...prev, operationMode: mode.id as any }))}
                className={`p-6 rounded-lg border-2 text-left transition-all ${config.operationMode === mode.id
                  ? 'border-brand-600 bg-brand-50 shadow-md ring-2 ring-brand-200'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
              >
                <div className={`w-4 h-4 rounded-full border mb-4 ${config.operationMode === mode.id ? 'bg-brand-600 border-brand-600' : 'border-slate-400'}`}></div>
                <h3 className="font-bold text-slate-900">{mode.id} Mode</h3>
                <p className="text-sm text-slate-500 mt-2">{mode.desc}</p>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}