
const { GoogleGenerativeAI } = require("@google/generative-ai");
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
console.log(`Key: ${apiKey ? 'Starts with ' + apiKey.substring(0, 4) : 'MISSING'}`);

async function run() {
    const genAI = new GoogleGenerativeAI(apiKey);

    // Test Gemini Pro (Stable 1.0)
    console.log("Testing 'gemini-pro'...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("SUCCESS with gemini-pro:", result.response.text());
    } catch (e) {
        console.log("FAILED gemini-pro:", e.message);
    }

    // Test Gemini 1.5 Flash
    console.log("Testing 'gemini-1.5-flash'...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("SUCCESS with gemini-1.5-flash:", result.response.text());
    } catch (e) {
        console.log("FAILED gemini-1.5-flash:", e.message);
    }
}
run();
