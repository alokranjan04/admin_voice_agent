const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Diagnostic script for Gemini API
async function diagnose() {
    console.log("--- Gemini API Diagnostic Tool ---");

    // 1. Find API Key
    const envPath = path.resolve(process.cwd(), '.env');
    let apiKey = "";

    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/NEXT_PUBLIC_GEMINI_API_KEY\s*=\s*(.*)/);
        if (match) apiKey = match[1].trim().replace(/^["']|["']$/g, "");
    }

    if (!apiKey) {
        console.error("вЬМ Error: could not find NEXT_PUBLIC_GEMINI_API_KEY in .env");
        return;
    }

    console.log(`вЬФ Found API Key in .env (starts with: ${apiKey.substring(0, 6)}...)`);

    // 2. Test Connection
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    console.log("вОґ Testing request to gemini-2.0-flash...");

    try {
        const result = await model.generateContent("diagnose");
        console.log("вЬФ SUCCESS: API Key is working correctly!");
        console.log("Response length:", result.response.text().length);
    } catch (e) {
        console.error("вЬМ ERROR DETECTED:");
        console.error(e.message);

        if (e.message.includes("429") && e.message.includes("free_tier")) {
            console.log("\n--- ANALYSIS ---");
            console.log("The error explicitly mentions 'free_tier', which means the API Key is NOT being recognized as a Pro Plan (Pay-as-you-go).");
            console.log("\n--- STEPS TO FIX ---");
            console.log("1. Visit https://aistudio.google.com/app/apikey");
            console.log("2. Check which project your API key belongs to.");
            console.log("3. Click 'Enable billing' or 'Pay-as-you-go' for THAT SPECIFIC PROJECT.");
            console.log("   NOTE: If you have billing enabled on ONE project but your key is from ANOTHER, you will still hit Free limits.");
            console.log("4. After enabling billing, it can take 10-15 minutes to take effect.");
        }
    }
}

diagnose();
