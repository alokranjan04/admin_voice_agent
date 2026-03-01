const axios = require('axios');
const VAPI_PRIVATE_KEY = "107e68ad-e993-4394-9c2a-279d551c475a"; // from .env

async function listAssistants() {
    try {
        const getRes = await axios.get(`https://api.vapi.ai/assistant`, {
            headers: {
                'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`
            }
        });

        console.log("Available Assistants:");
        getRes.data.forEach(a => {
            console.log(`- Name: ${a.name}, ID: ${a.id}`);
            // Let's print the tools to see which one has findAvailableSlots
            if (a.model && a.model.tools) {
                const hasTools = a.model.tools.map(t => t.function?.name).join(', ');
                console.log(`  Tools: ${hasTools}`);
            }
        });

    } catch (err) {
        console.error(err.response ? err.response.data : err);
    }
}

listAssistants();
