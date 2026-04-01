
import axios from 'axios';
import { AgentConfiguration } from '../types';
import { auth } from './firebase';

/**
 * Gets the current user's Firebase ID token for authenticated API calls.
 * Returns null if the user is not logged in.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
    const user = auth?.currentUser;
    if (!user) return {};
    try {
        const token = await user.getIdToken();
        return { 'Authorization': `Bearer ${token}` };
    } catch {
        return {};
    }
}

export const createVapiAssistant = async (config: AgentConfiguration) => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await axios.post('/api/vapi/assistant', config, {
            headers: authHeaders
        });
        console.log("VAPI Assistant Created Successfully via Proxy");
        return response.data;
    } catch (error: any) {
        const errData = error.response?.data;
        const errMsg = errData?.error || errData?.message || JSON.stringify(errData) || error.message;
        console.error("VAPI Proxy Error:", errMsg, '| Status:', error.response?.status, '| Data:', errData);
        throw new Error(`VAPI Creation Failed: ${errMsg}`);
    }
};

export const makeOutboundCall = async (phoneNumber: string, assistantId: string) => {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await axios.post('/api/vapi/call', {
            phoneNumber,
            assistantId
        }, {
            headers: authHeaders
        });
        console.log("Outbound call triggered successfully via Proxy");
        return response.data;
    } catch (error: any) {
        console.error("VAPI Call Proxy Error:", error.response?.data);
        throw new Error(`Outbound Call Failed: ${error.response?.data?.error || error.message}`);
    }
};
