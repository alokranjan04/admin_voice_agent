const { adminDb } = require('./src/lib/firebase-admin');

async function listAgents() {
  if (!adminDb) {
    console.error("Admin DB not initialized");
    return;
  }
  
  console.log("--- LISTING ORGANIZATIONS ---");
  const orgs = await adminDb.collection('organizations').get();
  for (const org of orgs.docs) {
    console.log(`Org: ${org.id}`);
    const agents = await org.ref.collection('agents').get();
    for (const agent of agents.docs) {
      console.log(`  Agent: ${agent.id}`, JSON.stringify(agent.data(), null, 2));
    }
  }
  
  console.log("--- LISTING TEMPORARY ASSISTANTS ---");
  const temps = await adminDb.collection('temporary_assistants').limit(5).get();
  for (const temp of temps.docs) {
    console.log(`  Temp Assistant: ${temp.id}`, temp.data().company);
  }
}

listAgents().catch(console.error);
