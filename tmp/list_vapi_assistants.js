
const axios = require('axios');

async function listAssistants() {
    const apiKey = '107e68ad-e993-4394-9c2a-279d551c475a';
    try {
        const res = await axios.get('https://api.vapi.ai/assistant', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const assistants = res.data.map(a => ({ name: a.name, id: a.id }));
        console.log(JSON.stringify(assistants, null, 2));
    } catch (err) {
        console.error(err.response?.data || err.message);
    }
}

listAssistants();
