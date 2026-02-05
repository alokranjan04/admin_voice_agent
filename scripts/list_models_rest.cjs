
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^["'](.*)["']$/, '$1');
        envVars[key] = val;
    }
});

const apiKey = envVars.VITE_GEMINI_API_KEY || envVars.VITE_API_KEY;

async function listModels() {
    console.log("Fetching models list from REST API...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.error) {
            console.error("API Error:", data.error);
        } else if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("No models returned?", data);
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

listModels();
