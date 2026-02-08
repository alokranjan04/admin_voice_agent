
import axios from 'axios';
import { AgentConfiguration } from '../types';

const VAPI_API_URL = 'https://api.vapi.ai/assistant';

export const createVapiAssistant = async (config: AgentConfiguration) => {
    try {
        const response = await axios.post('/api/vapi/assistant', config);
        console.log("VAPI Assistant Created Successfully via Proxy");
        return response.data;
    } catch (error: any) {
        console.error("VAPI Proxy Error:", error.response?.data);
        throw new Error(`VAPI Creation Failed: ${error.response?.data?.error || error.message}`);
    }
};

export const makeOutboundCall = async (phoneNumber: string, assistantId: string) => {
    try {
        const response = await axios.post('/api/vapi/call', {
            phoneNumber,
            assistantId
        });
        console.log("Outbound call triggered successfully via Proxy");
        return response.data;
    } catch (error: any) {
        console.error("VAPI Call Proxy Error:", error.response?.data);
        throw new Error(`Outbound Call Failed: ${error.response?.data?.error || error.message}`);
    }
};
