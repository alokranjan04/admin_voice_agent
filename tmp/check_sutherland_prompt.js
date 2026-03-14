
const axios = require('axios');

async function checkSutherlandPrompt() {
    const apiKey = '107e68ad-e993-4394-9c2a-279d551c475a';
    const assistantId = '0cd3241d-f905-461a-b831-526a1405b4d5';
    try {
        const res = await axios.get(`https://api.vapi.ai/assistant/${assistantId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        console.log(JSON.stringify(res.data.model?.messages, null, 2));
    } catch (err) {
        console.error(err.response?.data || err.message);
    }
}

checkSutherlandPrompt();
