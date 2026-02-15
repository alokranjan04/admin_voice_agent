import { collection, addDoc, getDocs, getDoc, serverTimestamp, setDoc, doc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase'; // Use shared instance
import { LogEntry } from './geminiLiveService';
import { BusinessConfig } from '@/types/agent-ui/types';
import { DEFAULT_BUSINESS_CONFIG } from '@/lib/agent-ui/constants';

// Robust Timestamp Calculator - SANITIZED PRIORITY
const getDocumentTimestamp = (doc: any) => {
  const now = Date.now();
  const FUTURE_CUTOFF = now + (7 * 24 * 60 * 60 * 1000); // 7 Days Buffer

  // 1. Pending Local Write (serverTimestamp is null) -> Priority #1
  // Immediate UI feedback for local actions
  if (doc.updatedAt === null || doc.createdAt === null) {
    return now + 315360000000; // Future + 10 years
  }

  // 2. updatedAt (Server Truth)
  // We prioritize the Server Timestamp because it cannot be spoofed/bugged easily.
  if (doc.updatedAt) {
    if (typeof doc.updatedAt.toMillis === 'function') return doc.updatedAt.toMillis();
    // Handle case where updatedAt might be a string (rare but possible in manual edits)
    const t = new Date(doc.updatedAt).getTime();
    if (!isNaN(t)) return t;
  }

  // 3. savedAt (Business Logic - SANITIZED)
  // If 'savedAt' is present, we use it, BUT we filter out crazy future dates (e.g. 2026)
  // which effectively "bans" bugged configs from taking over.
  if (doc.savedAt) {
    let t = 0;
    if (typeof doc.savedAt === 'string') {
      t = new Date(doc.savedAt).getTime();
    } else if (typeof doc.savedAt.toMillis === 'function') {
      t = doc.savedAt.toMillis();
    }

    // Only accept if it is a valid time AND not unreasonably in the future
    if (!isNaN(t) && t > 0) {
      if (t < FUTURE_CUTOFF) {
        return t;
      } else {
        console.warn(`[Config Skipped] Ignored future date in ${doc.id}: ${doc.savedAt}`);
      }
    }
  }

  // 4. createdAt (Fallback)
  if (doc.createdAt) {
    if (typeof doc.createdAt.toMillis === 'function') return doc.createdAt.toMillis();
    const t = new Date(doc.createdAt).getTime();
    if (!isNaN(t)) return t;
  }

  if (doc.metadata?.createdAt) {
    const t = new Date(doc.metadata.createdAt).getTime();
    if (!isNaN(t)) return t;
  }

  return 0;
};

export const firebaseService = {
  async saveLog(entry: LogEntry) {
    if (!db) return;
    try {
      const orgId = localStorage.getItem('tenant_org_id');
      const agentId = localStorage.getItem('tenant_agent_id');

      let targetCollection;
      if (orgId && agentId) {
        // Multi-tenant Path: organizations/{orgId}/agents/{agentId}/transcription
        targetCollection = collection(db, `organizations/${orgId}/agents/${agentId}/transcription`);
        console.log(`[Log] Saving to: organizations/${orgId}/agents/${agentId}/transcription`);
      } else {
        // Legacy Fallback
        targetCollection = collection(db, 'transcription');
      }

      await addDoc(targetCollection, {
        ...entry,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Failed to save log to Firebase', e);
    }
  },

  async saveBooking(booking: any) {
    if (!db) return;
    try {
      const orgId = localStorage.getItem('tenant_org_id');
      const agentId = localStorage.getItem('tenant_agent_id');

      let targetCollection;
      if (orgId && agentId) {
        // Multi-tenant Path: organizations/{orgId}/agents/{agentId}/bookings
        targetCollection = collection(db, `organizations/${orgId}/agents/${agentId}/bookings`);
        console.log(`[Booking] Saving to: organizations/${orgId}/agents/${agentId}/bookings`);
      } else {
        // Legacy Fallback
        targetCollection = collection(db, 'bookings');
      }

      await addDoc(targetCollection, {
        ...booking,
        createdAt: serverTimestamp(),
        status: 'confirmed'
      });
      console.log('Booking saved to Firebase');
    } catch (e) {
      console.error('Failed to save booking to Firebase', e);
    }
  },

  async saveCallSummary(summary: string, transcript: string, metadata: any, emailStatus?: string, emailError?: string) {
    if (!db) return;
    try {
      const orgId = localStorage.getItem('tenant_org_id');
      const agentId = localStorage.getItem('tenant_agent_id');

      let targetCollection;
      if (orgId && agentId) {
        // Multi-tenant Path: organizations/{orgId}/agents/{agentId}/summaries
        targetCollection = collection(db, `organizations/${orgId}/agents/${agentId}/summaries`);
        console.log(`[Summary] Saving to tenant-specific path.`);
      } else {
        targetCollection = collection(db, 'summaries');
        console.log(`[Summary] Saving to legacy global path.`);
      }

      // Sanitize metadata to remove undefined values which Firebase rejects
      const sanitizedMetadata = Object.fromEntries(
        Object.entries(metadata || {}).map(([k, v]) => [k, v === undefined ? null : v])
      );

      await addDoc(targetCollection, {
        summary,
        transcript,
        metadata: sanitizedMetadata,
        emailStatus: emailStatus || 'not_sent',
        emailError: emailError || null,
        createdAt: serverTimestamp(),
      });
      console.log('Call summary saved to Firebase');
    } catch (e) {
      console.error('Failed to save call summary to Firebase', e);
    }
  },

  async updateTranscriberUserDetails(userName: string, userEmail: string, userPhone: string) {
    if (!db) return;
    try {
      const orgId = localStorage.getItem('tenant_org_id');
      const agentId = localStorage.getItem('tenant_agent_id');

      if (orgId && agentId) {
        // Multi-tenant Path: Update the agent document's transcriber field
        const agentRef = doc(db, `organizations/${orgId}/agents`, agentId);
        console.log(`[Transcriber Update] Updating organizations/${orgId}/agents/${agentId}`);

        await setDoc(agentRef, {
          vapi: {
            transcriber: {
              userName,
              userEmail,
              userPhone
            }
          },
          updatedAt: serverTimestamp()
        }, { merge: true });

        console.log('Transcriber user details updated in Firebase');
      } else {
        console.warn('[Transcriber Update] No tenant context available, skipping update');
      }
    } catch (e) {
      console.error('Failed to update transcriber user details in Firebase', e);
    }
  },

  // Real-time subscription to the latest configuration
  subscribeToLatestConfig(callback: (config: BusinessConfig, source: 'tenant' | 'global') => void) {
    if (!db) return () => { };

    const params = new URLSearchParams(window.location.search);
    let orgId = params.get('orgId');
    let agentId = params.get('agentId');

    // Persistence: If URL is empty, try recovering from localStorage
    if (!orgId || !agentId) {
      orgId = localStorage.getItem('tenant_org_id');
      agentId = localStorage.getItem('tenant_agent_id');
      if (orgId && agentId) {
        // We will log this transition in App.tsx
      }
    } else {
      localStorage.setItem('tenant_org_id', orgId);
      localStorage.setItem('tenant_agent_id', agentId);
    }

    if (orgId && agentId) {
      const agentRef = doc(db, `organizations/${orgId}/agents`, agentId);

      return onSnapshot(agentRef, (snapshot: any) => {
        if (snapshot.exists()) {
          const rawData = { id: snapshot.id, ...snapshot.data() } as BusinessConfig;
          const fallbackIntegrations = { googleCalendar: { isConnected: false }, firebase: { isConnected: true } };
          const patchedConfig = {
            ...DEFAULT_BUSINESS_CONFIG,
            ...rawData,
            integrations: rawData.integrations || DEFAULT_BUSINESS_CONFIG.integrations || fallbackIntegrations,
            id: snapshot.id
          };
          callback(patchedConfig, 'tenant');
        } else {
          console.warn(`[Config Sync] Tenant doc ${agentId} missing in ${orgId}.`);
        }
      }, (error: any) => {
        console.error("Config subscription error:", error);
      });
    }

    // LEGACY FALLBACK
    const configsRef = collection(db, 'agent_configurations');
    const q = query(configsRef, orderBy('metadata.createdAt', 'desc'), limit(1));

    return onSnapshot(q, (snapshot: any) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        const rawData = { id: docData.id, ...docData.data() } as BusinessConfig;
        const fallbackIntegrations = { googleCalendar: { isConnected: false }, firebase: { isConnected: true } };
        const patchedConfig = {
          ...DEFAULT_BUSINESS_CONFIG,
          ...rawData,
          integrations: rawData.integrations || DEFAULT_BUSINESS_CONFIG.integrations || fallbackIntegrations,
          id: docData.id
        };
        callback(patchedConfig, 'global');
      }
    }, (error: any) => {
      console.error("Config subscription error:", error);
    });
  },

  async getAgentConfig(): Promise<BusinessConfig | null> {
    if (!db) return null;
    try {
      // 1. Check for Multi-tenant URL or Cache
      const params = new URLSearchParams(window.location.search);
      let orgId = params.get('orgId');
      let agentId = params.get('agentId');

      if (!orgId || !agentId) {
        orgId = localStorage.getItem('tenant_org_id');
        agentId = localStorage.getItem('tenant_agent_id');
      }

      if (orgId && agentId) {
        console.log(`[Auth] Tenant Fetch: organizations/${orgId}/agents/${agentId}`);
        const agentRef = doc(db, `organizations/${orgId}/agents`, agentId);
        const docSnap = await getDoc(agentRef);

        if (docSnap.exists()) {
          const rawData = { id: docSnap.id, ...docSnap.data() } as unknown as BusinessConfig;
          const fallbackIntegrations = { googleCalendar: { isConnected: false }, firebase: { isConnected: true } };

          // Refresh cache on success
          localStorage.setItem('tenant_org_id', orgId);
          localStorage.setItem('tenant_agent_id', agentId);

          return {
            ...DEFAULT_BUSINESS_CONFIG,
            ...rawData,
            integrations: rawData.integrations || DEFAULT_BUSINESS_CONFIG.integrations || fallbackIntegrations,
            id: docSnap.id
          } as BusinessConfig;
        }
        console.warn("[Auth] Tenant not found. Using legacy fallback.");
        localStorage.removeItem('tenant_org_id');
        localStorage.removeItem('tenant_agent_id');
      }

      // 2. Legacy Fallback: latest admin-saved config
      console.log("[Auth] Fallback Mode: fetching latest global config...");
      const configsRef = collection(db, 'agent_configurations');

      // Query ordered by metadata.createdAt descending, limit to 1 (most efficient)
      const q = query(
        configsRef,
        orderBy('metadata.createdAt', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        const rawData = { id: docData.id, ...docData.data() } as unknown as BusinessConfig;

        console.log(`Latest config loaded by metadata.createdAt: ${docData.id}`);

        const fallbackIntegrations = { googleCalendar: { isConnected: false }, firebase: { isConnected: true } };
        return {
          ...DEFAULT_BUSINESS_CONFIG,
          ...rawData,
          integrations: rawData.integrations || DEFAULT_BUSINESS_CONFIG.integrations || fallbackIntegrations,
          savedAt: (rawData as any).savedAt,
          id: docData.id
        } as BusinessConfig;
      }

      // Legacy Fallback: admin_configuration collection
      const legacyRef = collection(db, 'admin_configuration');
      const legacyQuery = query(
        legacyRef,
        orderBy('metadata.createdAt', 'desc'),
        limit(1)
      );

      const legacySnapshot = await getDocs(legacyQuery);
      if (!legacySnapshot.empty) {
        const legacyDoc = legacySnapshot.docs[0];
        console.log(`Config loaded from admin_configuration (legacy) by metadata.createdAt: ${legacyDoc.id}`);
        const rawConfig = { id: legacyDoc.id, ...legacyDoc.data() } as BusinessConfig;
        const fallbackIntegrations = { googleCalendar: { isConnected: false }, firebase: { isConnected: true } };
        return {
          ...DEFAULT_BUSINESS_CONFIG,
          ...rawConfig,
          integrations: rawConfig.integrations || DEFAULT_BUSINESS_CONFIG.integrations || fallbackIntegrations,
          id: legacyDoc.id
        };
      }

      return null;
    } catch (e) {
      console.error('Error fetching agent config:', e);
      return null;
    }
  },

  async saveAgentConfig(config: BusinessConfig): Promise<boolean> {
    if (!db) return false;
    try {
      const configToSave = {
        ...config,
        metadata: {
          ...config.metadata,
          createdAt: new Date().toISOString()
        }
      };

      // IMPORTANT: Write to the SPECIFIC ID if available, otherwise fallback to main_config
      const docId = config.id || 'main_config';

      await setDoc(doc(db, 'agent_configurations', docId), {
        ...configToSave,
        updatedAt: serverTimestamp(),
        // Use REAL time. Do not try to beat future dates artificially.
        savedAt: new Date().toISOString()
      });
      console.log(`Configuration saved successfully to agent_configurations/${docId}`);
      return true;
    } catch (e) {
      console.error("Error saving config:", e);
      return false;
    }
  }
};