const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

async function run() {
    const apiKey = process.env.VITE_VAPI_PRIVATE_KEY;
    if (!apiKey) {
        console.error("VITE_VAPI_PRIVATE_KEY missing");
        return;
    }

    try {
        const response = await axios.get('https://api.vapi.ai/assistant', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        const assistants = response.data;
        console.log(`Found ${assistants.length} assistants:`);
        assistants.forEach(a => {
            console.log(`- ID: ${a.id} | Name: ${a.name}`);
        });
    } catch (err) {
        console.error("VAPI API Error:", err.response?.data || err.message);
    }
}

run();
