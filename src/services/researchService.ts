
import axios from 'axios';

const SERPER_API_URL = 'https://google.serper.dev/search';

const getSerperApiKey = () => {
    return process.env.NEXT_PUBLIC_SERPER_API_KEY || process.env.VITE_SERPER_API_KEY || null;
};

const getJinaApiKey = () => {
    return process.env.NEXT_PUBLIC_JINA_API_KEY || process.env.VITE_JINA_API_KEY || null;
};

export interface ResearchContext {
    searchQuery: string;
    webResults: any[];
    placesResults?: any[];
}

/**
 * Searches for real-world business details using Serper.dev (Google Search API)
 * with a fallback to Jina Search.
 */
export const researchBusiness = async (query: string): Promise<ResearchContext> => {
    const serperKey = getSerperApiKey();
    const jinaKey = getJinaApiKey();

    if (!serperKey) {
        console.warn("[Research] SERPER_API_KEY missing. Falling back to Jina Search.");
        try {
            const jinaSearchUrl = `https://s.jina.ai/${encodeURIComponent(query)}`;
            console.log(`[Research] Trying Jina Search Fallback: ${jinaSearchUrl}`);
            
            const headers: any = { 'Accept': 'text/plain' };
            if (jinaKey) {
                headers['Authorization'] = `Bearer ${jinaKey}`;
                console.log("[Research] Using Jina API Key for authentication.");
            }

            const res = await axios.get(jinaSearchUrl, { headers });
            if (res.data) {
                console.log(`[Research] Jina Search success. Received ${res.data.length} chars.`);
                return { 
                    searchQuery: query, 
                    webResults: [{ snippet: res.data.substring(0, 5000) }],
                    placesResults: [] 
                };
            }
        } catch (jinaErr: any) {
            const status = jinaErr.response?.status;
            if (status === 401) {
                console.error("[Research] Jina Search Failed: 401 Unauthorized. Please provide a valid JINA_API_KEY in .env.");
            } else if (status === 402) {
                console.error("[Research] Jina Search Failed: 402 Payment Required. Jina quota exceeded.");
            } else {
                console.error("[Research] Jina Search Fallback Failed:", jinaErr.message);
            }
        }
        
        if (!serperKey && !jinaKey) {
             console.error("[Research] CRITICAL: Both Serper and Jina API keys are missing. Business research will return empty results.");
        }

        return { searchQuery: query, webResults: [] };
    }

    try {
        console.log(`[Research] Researching via Serper: ${query}...`);
        const apiKey = serperKey;
        const [webRes, placesRes] = await Promise.allSettled([
            axios.post('https://google.serper.dev/search', {
                q: query,
                gl: 'us',
                hl: 'en',
                autocorrect: true
            }, { headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' } }),
            axios.post('https://google.serper.dev/places', {
                q: query,
                gl: 'us',
                hl: 'en'
            }, { headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' } })
        ]);

        const webData = webRes.status === 'fulfilled' ? webRes.value.data : {};
        const placesData = placesRes.status === 'fulfilled' ? placesRes.value.data : { places: [] };

        const knowledgeGraph = webData.knowledgeGraph ? [webData.knowledgeGraph] : [];
        const specificPlaces = placesData.places || [];

        return {
            searchQuery: query,
            webResults: webData.organic || [],
            placesResults: [...knowledgeGraph, ...specificPlaces]
        };
    } catch (error) {
        console.error("Research Phase Failed:", error);
        return { searchQuery: query, webResults: [] };
    }
};
