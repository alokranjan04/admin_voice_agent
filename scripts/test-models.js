
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.VITE_API_KEY;

if (!apiKey) {
    console.error("No API KEY found in .env");
    process.exit(1);
}

console.log(`Using API Key starting with: ${apiKey.substring(0, 5)}...`);

const ai = new GoogleGenAI({ apiKey: apiKey });

async function listModels() {
    try {
        // The new SDK syntax might differ, but let's try the standard listing method 
        // or a simple generation to test a known model.
        // Since ListModels might not be directly exposed in the high-level helper, 
        // we'll try to generate with a very standard model first.

        console.log("Attempting to generate with 'gemini-1.5-flash'...");
        const model = "gemini-1.5-flash";
        const result = await ai.models.generateContent({
            model: model,
            contents: "Hello, answer in 1 word."
        });
        console.log("Success with gemini-1.5-flash:", result.text());
    } catch (error) {
        console.error("Error with gemini-1.5-flash:", error.message);

        console.log("\nAttempting to generate with 'gemini-pro'...");
        try {
            const result2 = await ai.models.generateContent({
                model: 'gemini-pro',
                contents: "Hello"
            });
            console.log("Success with gemini-pro:", result2.text());
        } catch (err2) {
            console.error("Error with gemini-pro:", err2.message);
        }

        console.log("\nAttempting to generate with 'gemini-2.0-flash-exp'...");
        try {
            const result3 = await ai.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: "Hello"
            });
            console.log("Success with gemini-2.0-flash-exp:", result3.text());
        } catch (err3) {
            console.error("Error with gemini-2.0-flash-exp:", err3.message);
        }
    }
}

listModels();
