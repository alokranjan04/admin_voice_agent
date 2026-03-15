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
        const orgs = await db.collection('organizations').get();
        for (const org of orgs.docs) {
            const agents = await org.ref.collection('agents').get();
            for (const agent of agents.docs) {
                const data = agent.data();
                console.log(`Agent: ${agent.id} | AssistantID: ${data.vapi?.assistantId || 'UNDEFINED'}`);
            }
        }
        
        const temps = await db.collection('temporary_assistants').get();
        for (const temp of temps.docs) {
            console.log(`Temp Assistant: ${temp.id} | AssistantID: ${temp.data().assistantId}`);
        }
    } catch (err) { console.error(err); }
}
run();
