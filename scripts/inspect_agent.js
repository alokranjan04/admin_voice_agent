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
        const sa = JSON.parse(saKey.trim().replace(/^'|'$/g, ''));
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
            const data = doc.data();
            console.log("Keys in doc:", Object.keys(data));
            console.log("Vapi property:", JSON.stringify(data.vapi, null, 2));
            console.log("AssistantId property:", data.vapi?.assistantId || data.vapi?.id || data.assistantId || "NOT FOUND");
        }
    } catch (err) { console.error(err); }
}
run();
