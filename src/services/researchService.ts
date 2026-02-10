
import axios from 'axios';

const SERPER_API_URL = 'https://google.serper.dev/search';

const getSerperApiKey = () => {
    return process.env.NEXT_PUBLIC_SERPER_API_KEY || process.env.VITE_SERPER_API_KEY || null;
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
        console.warn("SERPER_API_KEY (NEXT_PUBLIC_ or VITE_) missing in .env. Falling back to AI only.");
        return { searchQuery: query, webResults: [] };
    }

    try {
        console.log(`Researching: ${query}...`);
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
