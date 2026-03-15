const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

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
        const targetId = process.argv[2] || "20e0943f-96f0-4380-9ae7-234071830cbb";
        
        console.log(`Searching for ID: ${targetId}`);
        
        const tempDoc = await db.collection('temporary_assistants').doc(targetId).get();
        if (tempDoc.exists) {
            console.log("FOUND in temporary_assistants:");
            console.log(JSON.stringify(tempDoc.data(), null, 2));
            return;
        }

        const orgs = await db.collection('organizations').get();
        for (const org of orgs.docs) {
            const agentDoc = await org.ref.collection('agents').doc(targetId).get();
            if (agentDoc.exists) {
                console.log(`FOUND in organizations/${org.id}/agents/`);
                return;
            }
        }
        
        console.log("ID NOT FOUND in standard paths.");
        
        // Final broad search: list all agents in all orgs
        console.log("Listing ALL agents to see what IDs are active...");
        for (const org of orgs.docs) {
            const agents = await org.ref.collection('agents').get();
            agents.forEach(a => console.log(` - ${a.id}`));
        }
        
    } catch (err) { console.error(err); }
}
run();
