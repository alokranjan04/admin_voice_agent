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
        const targetId = "20e0943f-96f0-4380-9ae7-234071830cbb";
        
        console.log(`Searching for ID: ${targetId}`);
        
        // 1. Check temporary_assistants
        const tempDoc = await db.collection('temporary_assistants').doc(targetId).get();
        if (tempDoc.exists) {
            console.log("FOUND in temporary_assistants!");
            console.log(JSON.stringify(tempDoc.data(), null, 2));
        } else {
            console.log("Not found in temporary_assistants");
        }
        
        // 2. Check organizations
        const orgs = await db.collection('organizations').get();
        for (const org of orgs.docs) {
            const agentDoc = await org.ref.collection('agents').doc(targetId).get();
            if (agentDoc.exists) {
                console.log(`FOUND in organizations/${org.id}/agents/`);
                console.log(JSON.stringify(agentDoc.data(), null, 2));
            }
        }

        // 3. Search for the ID as a field value (vapi.assistantId)
        const vapiMatch = await db.collectionGroup('agents').where('vapi.assistantId', '==', targetId).get();
        vapiMatch.forEach(doc => {
            console.log(`FOUND as vapi.assistantId in: ${doc.ref.path}`);
        });

    } catch (err) { console.error(err); }
}
run();
