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
        
        console.log("--- SEARCHING ORGANIZATIONS ---");
        const orgs = await db.collection('organizations').get();
        for (const org of orgs.docs) {
            console.log(`Org: ${org.id}`);
            const agents = await org.ref.collection('agents').get();
            for (const agent of agents.docs) {
                const data = agent.data();
                console.log(`  Agent: ${agent.id} | Name: ${data.metadata?.businessName || data.name} | Created: ${data.createdAt}`);
            }
        }
    } catch (err) {
        console.error("ERROR:", err.message);
    }
}

run();
