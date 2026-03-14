
const axios = require('axios');

async function checkSutherlandPrompt() {
    const apiKey = '107e68ad-e993-4394-9c2a-279d551c475a';
    const assistantId = '4fa0d881-632c-4ddd-b8eb-19021402d0d1';
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
