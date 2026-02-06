
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("No API Key found");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function checkModels() {
    try {
        // Unfortunately the high-level SDK doesn't have a simple listModels() that is easy to call without the full setup
        // But we can try a few common ones
        const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-pro", "gemini-2.0-flash-exp"];

        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("Hello, answer with 1 word.");
                console.log(`Success with model: ${m} -> ${result.response.text()}`);
            } catch (e) {
                console.log(`Failed with model: ${m} -> ${e.message}`);
            }
        }
    } catch (err) {
        console.error("Critical error:", err.message);
    }
}

checkModels();
