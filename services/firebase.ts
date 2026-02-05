import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { AgentConfiguration } from "../types";

// Helper to get env var from various sources
const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return null;
};

export const GOOGLE_CLIENT_ID = getEnv('VITE_GOOGLE_CLIENT_ID') || "101257437274-9p20p1jo0ovin7k9cdfuk5nvhdkv0o31.apps.googleusercontent.com";
export const GOOGLE_CALENDAR_TOKEN_FALLBACK = getEnv('VITE_GOOGLE_CALENDAR_TOKEN') || "optional_fallback_token";

// Explicit configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyDUj6JWI2f9UNaj4fySRU4-MBqgHTUceRc",
  // Reverting to firebaseapp.com as it is the default for auto-generated clients
  authDomain: "ai-voice-agent-c2a2b.firebaseapp.com",
  projectId: "ai-voice-agent-c2a2b",
  storageBucket: "ai-voice-agent-c2a2b.firebasestorage.app",
  messagingSenderId: "536573436709",
  appId: "1:536573436709:web:7f4997b23cbdfa996070cc",
  measurementId: "G-YQJ7HBDYVZ"
};

// Initialize Firebase
let app;
let dbInstance;
let authInstance;

try {
  console.log("Initializing Firebase with Project:", firebaseConfig.projectId);
  app = initializeApp(firebaseConfig);
  dbInstance = getFirestore(app);
  authInstance = getAuth(app);
} catch (e) {
  console.error("Firebase Initialization Critical Error:", e);
}

// EXPORT services
export const db = dbInstance!;
export const auth = authInstance!;

// Configure Google Auth Provider
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.setCustomParameters({
  prompt: 'select_account'
});

export const loginWithGoogle = async () => {
  if (!auth) {
    throw new Error("Firebase Authentication failed to initialize. Please check console logs.");
  }

  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("Login failed", error);
    
    // Detailed Error Handling
    if (error.code === 'auth/api-key-not-valid' || error.message.includes('api-key-not-valid')) {
        throw new Error("API_KEY_ERROR: The API Key is rejected by Firebase. Check Google Cloud Console > APIs & Services > Credentials.");
    }
    if (error.code === 'auth/operation-not-allowed') {
         throw new Error("AUTH_ERROR: Google Sign-In is not enabled in the Firebase Console.");
    }
    if (error.code === 'auth/popup-closed-by-user') {
        throw new Error("Login cancelled. PLEASE READ: If you see 'redirect_uri_mismatch', you must add '" + `https://${firebaseConfig.authDomain}/__/auth/handler` + "' to your Authorized Redirect URIs in Google Cloud Console.");
    }
    if (error.code === 'auth/unauthorized-domain') {
        let domain = window.location.hostname;
        
        // Robust fallback if hostname is empty
        if (!domain) {
            try {
                // Try to extract hostname from href (strips protocol)
                const url = new URL(window.location.href);
                domain = url.hostname;
            } catch (e) {
                // Fallback to host or origin, then manually strip
                domain = window.location.host || window.location.origin || '';
            }
        }
        
        // Ensure no protocol (https://) remains, as Firebase Console only wants the domain
        domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

        let msg = `DOMAIN_NOT_ALLOWED: The domain '${domain || 'UNKNOWN'}' is not authorized in Firebase Console.`;
        if (domain === 'localhost') {
           msg += ` Try adding '127.0.0.1' to the Authorized Domains list as well.`;
        }
        throw new Error(msg);
    }
    
    throw error;
  }
};

export const logoutUser = async () => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed", error);
    throw error;
  }
};

export const saveConfiguration = async (config: AgentConfiguration) => {
  if (!db) {
     throw new Error("Firestore is not initialized.");
  }

  try {
    const safeName = config.metadata.businessName
      ? config.metadata.businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
      : 'default_config';
      
    const docId = `config_${safeName}`;
    const docRef = doc(db, "agent_configurations", docId);
    
    const currentUser = auth?.currentUser;

    // Safety fallback: Deep merge defaults to ensure no required fields are missing
    const defaultIntegrations = { firebase: true, googleCalendar: false };
    const finalConfig = {
      ...config,
      integrations: { ...defaultIntegrations, ...(config.integrations || {}) }
    };

    await setDoc(docRef, {
      ...finalConfig,
      savedAt: new Date().toISOString(),
      updatedBy: currentUser ? currentUser.email : 'anonymous',
      ownerUid: currentUser ? currentUser.uid : null,
      status: 'LOCKED'
    });
    
    console.log("Configuration saved with ID: ", docId);
    return docId;
  } catch (error) {
    console.error("Error saving configuration to Firebase:", error);
    throw error;
  }
};