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

async function testInit() {
    console.log('--- STARTING LOCAL FIREBASE INIT TEST ---');
    
    // Exact logic from firebase-admin.ts
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    console.log('Detected Env Vars:', {
        projectId: !!projectId,
        clientEmail: !!clientEmail,
        privateKey: !!privateKey,
        serviceAccountKey: !!serviceAccountKey
    });

    let credential;

    if (projectId && clientEmail && privateKey) {
        console.log('[Test] Path A: Individual Vars');
        credential = admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
        });
    } else if (serviceAccountKey) {
        console.log('[Test] Path B: JSON Blob');
        try {
            let keyString = serviceAccountKey.trim();
            if ((keyString.startsWith("'") && keyString.endsWith("'")) || 
                (keyString.startsWith('"') && keyString.endsWith('"'))) {
                keyString = keyString.slice(1, -1);
            }
            const serviceAccount = JSON.parse(keyString);
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            credential = admin.credential.cert(serviceAccount);
        } catch (e) {
            console.error("[Test] JSON Parse Failed:", e.message);
        }
    }

    if (credential) {
        try {
            if (!admin.apps.length) {
                admin.initializeApp({
                    projectId: projectId,
                    credential: credential
                });
            }
            const db = admin.firestore();
            console.log('✅ SUCCESS: adminDb initialized');
            
            // Try a light read to confirm connectivity
            const collections = await db.listCollections();
            console.log(`✅ CONNECTIVITY: Found ${collections.length} top-level collections`);
        } catch (err) {
            console.error('❌ INITIALIZATION ERROR:', err.message);
        }
    } else {
        console.error('❌ FAILED: No credential formed');
    }
}

testInit();
