const admin = require('firebase-admin');
const fs = require('fs');
const dotenv = require('dotenv');

// Load .env
if (fs.existsSync('.env')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

async function run() {
    try {
        const fullKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        let keyString = fullKey.trim();
        if (keyString.startsWith("'") && keyString.endsWith("'")) keyString = keyString.slice(1, -1);
        
        const sa = JSON.parse(keyString);
        
        console.log("Testing with service account email:", sa.client_email);
        
        // MANUALLY BUILD CERT FROM JSON FIELDS
        const cert = {
            projectId: sa.project_id,
            clientEmail: sa.client_email,
            privateKey: sa.private_key.replace(/\\n/g, '\n')
        };
        
        admin.initializeApp({
            credential: admin.credential.cert(cert)
        });
        
        const db = admin.firestore();
        console.log("Attempting Firestore read...");
        const collections = await db.listCollections();
        console.log("✅ SUCCESS! Connectivity verified.");
        
    } catch (err) {
        console.error("❌ FAILED:", err.message);
    }
}

run();
