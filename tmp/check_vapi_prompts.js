
const axios = require('axios');

async function checkPrompts() {
    const apiKey = '107e68ad-e993-4394-9c2a-279d551c475a';
    try {
        const res = await axios.get('https://api.vapi.ai/assistant', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const assistants = res.data;
        for (const a of assistants) {
            const prompt = a.model?.messages?.find(m => m.role === 'system')?.content || '';
            if (prompt.includes('Concentrix')) {
                console.log(`Assistant: ${a.name} (ID: ${a.id}) contains "Concentrix" in prompt.`);
                console.log('---');
            } else if (a.name.includes('Concentrix')) {
                 console.log(`Assistant: ${a.name} (ID: ${a.id}) has "Concentrix" in name.`);
                 console.log('---');
            }
        }
    } catch (err) {
        console.error(err.response?.data || err.message);
    }
}

checkPrompts();
