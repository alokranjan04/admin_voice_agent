
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Manually parse .env because dotenv might not be working/installed perfectly or I want to be 100% sure
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

if (!apiKey) {
    console.error("Could not find API Key in .env");
    process.exit(1);
}

console.log(`Checking models with key: ${apiKey.substring(0, 6)}...`);

async function run() {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Accessing the model directly to test if it works, since ListModels might be restricted differently
        const modelNames = ['gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro'];

        console.log("Testing generation with various models to find a working one...");

        for (const name of modelNames) {
            console.log(`\n--- Testing ${name} ---`);
            try {
                const model = genAI.getGenerativeModel({ model: name });
                const result = await model.generateContent("Hi, are you working?");
                const response = await result.response;
                console.log(`SUCCESS! Model '${name}' works. Response: ${response.text()}`);
                process.exit(0); // Found a working one!
            } catch (e) {
                console.error(`Failed ${name}: ${e.message}`);
            }
        }

    } catch (e) {
        console.error("Fatal error:", e);
    }
}

run();
