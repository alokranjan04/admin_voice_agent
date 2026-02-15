import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { AgentConfiguration, BrandingConfig } from "../types";

// Helper to get env var from various sources
const getEnv = (key: string) => {
  const nextKey = key.startsWith('VITE_')
    ? key.replace('VITE_', 'NEXT_PUBLIC_')
    : (key.startsWith('NEXT_PUBLIC_') ? key : `NEXT_PUBLIC_${key}`);

  // Check process.env (Next.js/Node)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[nextKey]) return process.env[nextKey];
    if (process.env[key]) return process.env[key];
  }

  // Check import.meta.env (Vite)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    if (import.meta.env[nextKey]) return import.meta.env[nextKey];
    // @ts-ignore
    if (import.meta.env[key]) return import.meta.env[key];
  }
  return null;
};

/**
 * Saves organization-level branding settings.
 */
export const saveBranding = async (branding: BrandingConfig) => {
  if (!db || !auth.currentUser) throw new Error("Authentication required to save branding.");

  const orgId = getOrgId(auth.currentUser);
  const orgRef = doc(db, "organizations", orgId);

  try {
    await setDoc(orgRef, { branding }, { merge: true });
    console.log(`Branding saved for Org: ${orgId}`);
  } catch (error) {
    console.error("Error saving branding:", error);
    throw error;
  }
};

/**
 * Retrieves full organization data (branding, plan, etc).
 */
export const getOrgData = async (): Promise<any | null> => {
  if (!db || !auth.currentUser) return null;

  const orgId = getOrgId(auth.currentUser);
  const orgRef = doc(db, "organizations", orgId);

  try {
    const docSnap = await getDoc(orgRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.error("Error fetching organization data:", error);
  }
  return null;
};

/**
 * Retrieves organization-level branding settings.
 */
export const getBranding = async (): Promise<BrandingConfig | null> => {
  if (!db || !auth.currentUser) return null;

  const orgId = getOrgId(auth.currentUser);
  const orgRef = doc(db, "organizations", orgId);

  try {
    const docSnap = await getDoc(orgRef);
    if (docSnap.exists() && docSnap.data().branding) {
      return docSnap.data().branding as BrandingConfig;
    }
  } catch (error) {
    console.error("Error fetching branding:", error);
  }
  return null;
};

export const GOOGLE_CLIENT_ID = getEnv('VITE_GOOGLE_CLIENT_ID') || "";
export const GOOGLE_CALENDAR_TOKEN_FALLBACK = getEnv('VITE_GOOGLE_CALENDAR_TOKEN') || "";

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
};

// Validate critical config
if (!firebaseConfig.apiKey) {
  console.error("CRITICAL: VITE_FIREBASE_API_KEY is missing from environment.");
}
if (!firebaseConfig.projectId) {
  console.error("CRITICAL: VITE_FIREBASE_PROJECT_ID is missing from environment.");
}

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
    if (error.code === 'auth/api-key-not-valid' || error.message.includes('api-key-not-valid') || error.message.includes('API_KEY_ERROR')) {
      throw new Error("API_KEY_ERROR: The API Key is rejected by Firebase. This usually happens if the Identity Toolkit API is disabled or if there's a project mismatch.");
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

/**
 * Derives a stable organization ID from user metadata.
 * For professional emails, uses the domain. For generic emails, uses the UID.
 */
export const getOrgId = (user: any): string => {
  if (!user) return 'anonymous_org';
  const email = user.email || '';
  const domain = email.split('@')[1];
  const genericDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com'];

  if (domain && !genericDomains.includes(domain.toLowerCase())) {
    return `org_${domain.replace(/[^a-z0-9]+/g, '_')}`;
  }
  return `user_${user.uid.substring(0, 10)}`;
};

export const saveConfiguration = async (config: AgentConfiguration) => {
  if (!db) {
    throw new Error("Firestore is not initialized.");
  }

  try {
    const currentUser = auth?.currentUser;
    const orgId = getOrgId(currentUser);
    const companyName = config.metadata.businessName || "Default Company";

    // 1. Ensure Organization Document exists
    const orgRef = doc(db, "organizations", orgId);
    await setDoc(orgRef, {
      id: orgId,
      name: companyName,
      lastUpdated: new Date().toISOString(),
      ownerUid: currentUser?.uid || null,
      status: 'ACTIVE'
    }, { merge: true });

    // 2. Save Agent Configuration under Organization
    const safeName = companyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const agentId = `agent_${safeName}`;
    const agentRef = doc(db, `organizations/${orgId}/agents`, agentId);

    // Fetch existing config to preserve tokens
    let existingData: any = {};
    try {
      const existingDoc = await getDoc(agentRef);
      if (existingDoc.exists()) {
        existingData = existingDoc.data();
      }
    } catch (e) {
      console.warn("Could not fetch existing agent config for merge", e);
    }

    // Preserve Google Calendar tokens if they exist and incoming is just 'true'
    let integrations = { ...(config.integrations || {}) };

    // Default fallback
    if (integrations.firebase === undefined) integrations.firebase = true;
    if (integrations.googleCalendar === undefined) integrations.googleCalendar = true;

    // Critical: Do not overwrite object with boolean
    if (existingData.integrations?.googleCalendar && typeof existingData.integrations.googleCalendar === 'object') {
      if (integrations.googleCalendar === true) {
        integrations.googleCalendar = existingData.integrations.googleCalendar;
      }
    }

    const finalConfig = {
      ...config,
      integrations: integrations
    };

    await setDoc(agentRef, {
      ...finalConfig,
      orgId: orgId,
      savedAt: new Date().toISOString(),
      updatedBy: currentUser ? currentUser.email : 'anonymous',
      ownerUid: currentUser ? currentUser.uid : null,
      status: 'LOCKED'
    }, { merge: true });

    console.log(`Configuration saved for Org: ${orgId}, Agent: ${agentId}`);
    return agentId;
  } catch (error) {
    console.error("Error saving configuration to Firebase:", error);
    throw error;
  }
};

/**
 * Retrieves all agents belonging to the user's organization.
 */
export const getAgents = async () => {
  if (!db || !auth.currentUser) return [];

  const orgId = getOrgId(auth.currentUser);
  const agentsRef = collection(db, `organizations/${orgId}/agents`);

  try {
    const querySnapshot = await getDocs(agentsRef);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
};

/**
 * Retrieves a specific agent configuration.
 */
export const getAgentConfig = async (agentId: string) => {
  if (!db || !auth.currentUser) return null;

  const orgId = getOrgId(auth.currentUser);
  const agentRef = doc(db, `organizations/${orgId}/agents`, agentId);

  try {
    const docSnap = await getDoc(agentRef);
    if (docSnap.exists()) {
      return docSnap.data() as AgentConfiguration;
    }
  } catch (error) {
    console.error("Error fetching agent config:", error);
  }
  return null;
};