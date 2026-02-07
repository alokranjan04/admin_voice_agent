
import axios from 'axios';

const SERPER_API_URL = 'https://google.serper.dev/search';

const getSerperApiKey = () => {
    // Check process.env (Next.js/Node)
    if (typeof process !== 'undefined' && process.env && process.env.VITE_SERPER_API_KEY) {
        return process.env.VITE_SERPER_API_KEY;
    }
    // Check import.meta.env (Vite)
    // @ts-ignore
    return (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SERPER_API_KEY) || null;
};

export interface ResearchContext {
    searchQuery: string;
    webResults: any[];
    placesResults?: any[];
}

/**
 * Searches for real-world business details using Serper.dev (Google Search API)
 */
export const researchBusiness = async (query: string): Promise<ResearchContext> => {
    const apiKey = getSerperApiKey();

    if (!apiKey) {
        console.warn("VITE_SERPER_API_KEY missing in .env. Falling back to AI only.");
        return { searchQuery: query, webResults: [] };
    }

    try {
        console.log(`Researching: ${query}...`);
        const response = await axios.post(SERPER_API_URL, {
            q: query,
            gl: 'us', // Geography: US (can be tuned)
            hl: 'en', // Language: English
            autocorrect: true
        }, {
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            }
        });

        // Serper returns organic results, knowledge graph, and sometimes places
        const data = response.data;

        return {
            searchQuery: query,
            webResults: data.organic || [],
            placesResults: data.knowledgeGraph ? [data.knowledgeGraph] : []
        };
    } catch (error) {
        console.error("Research Phase Failed:", error);
        return { searchQuery: query, webResults: [] };
    }
};
