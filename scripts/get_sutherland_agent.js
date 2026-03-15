const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

async function run() {
    try {
        const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!saKey) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY missing");
        
        let keyString = saKey.trim();
        if (keyString.startsWith("'") && keyString.endsWith("'")) keyString = keyString.slice(1, -1);
        const sa = JSON.parse(keyString);
        
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: sa.project_id,
                    clientEmail: sa.client_email,
                    privateKey: sa.private_key.replace(/\\n/g, '\n')
                })
            });
        }
        
        const db = admin.firestore();
        const doc = await db.collection('organizations').doc('user_SgcL5RCpdS').collection('agents').doc('agent_sutherland_global_services').get();
        if (doc.exists) {
            console.log(JSON.stringify(doc.data(), null, 2));
        } else {
            console.log("Agent not found");
        }
    } catch (err) {
        console.error("ERROR:", err.message);
    }
}

run();
