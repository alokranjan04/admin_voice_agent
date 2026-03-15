const admin = require('firebase-admin');

// HARDCODED FROM .env (Sanitized manually for this test)
const serviceAccount = {
  "type": "service_account",
  "project_id": "ai-voice-agent-c2a2b",
  "private_key_id": "fc8987aeab24c555a0eea2e3304c9eaf1fc8a7",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDA1Rw3ccxgo3Yj\norZ2D0iSbqqft81nDpAVAYDTXDdZY90PgjcCzP16KFb4Wzyk1m6g4ErQkqFs7Yuf\nevbnBnarw3YPFVGxzNuGeMbbshjk9BNAXy61zW2ps+kah8jSNQJPrYSKOK6GhX7U\nh2pYLlaeaCW0PnqHhb0j1Wx8ksRtlQTyxp5VHd05WvtPyGTcdLP0nDLRelSVoKUF\nKeSK70BUOyYNpRkS1ecvEB+e7f+7KQOrTdHk8aapR6aE25SnLVuEB7Se7lBv+m4k\nJTa7zDSxxZT28vF0Fb3C0wfOXD/xH5RyZKhVGjfq972UvdXiNgrvR3TtBwIM3ftZ\nASDE9pKjAgMBAAECggEAUYfpkcHCTZvfgAq0he9JWmyDJNvEc43zOoZzryn+1wND\nvOJsGvmMNOGogAKnffSSOuAKkexlZ1Z6odgOW7jeZRpUKOV1MK1ypgUb41kGcIuI\nNj/oUoMEmmuQpCCENuilzQWLFBwKIqN/8CE/RAB3rCtRwcdm7DUONv/uii9N8RyE\nU3tFnXl3wWTJ4WW1yerfiAkQM6RBz/sNQJ7wN6pfDTKyQ3ZPuEY+mwKV8U5yohbC\nNRCmc2h+sn+flxQs+VHACCelQfDmmEY44BE2HUm40KL+vIJyIv7VSxG3wHO8rtFV\nBiOA54outEXcBWJ6SPCOfmX49jZ8Pd++mWiBVhM+TQKBgQDkJ2836MN2yXjgPnUB\nSjiA3Niy4lbclYAk97bztRx2yaNdXnqWRtSSll5WnHAYRZlDVvq704dknLdo/WZ+\nJolUXrBcZc7+kzEnsKSBDrVR7d2ge6c6e47zvwZvZ5ocWqtLN57k/gcQepaRfnOK\nJ+44PnOAdkVwDSCbMHnShlHn3QKBgQDYXhHWGmVRc91dHjxqSV4y0QbQvkQjItoV\n0dRwN7TpclWaUE6SkjoFMSi759bSmQ7B+IxtFQ9sCy8UpV6u/Min+WQZdrqtdT/t\nMq224I4dcQzrla84CT6GoOv8SLy+C2grw1MystGq912ivNA2xTmrgCPoc6zuc7j9\n+iY1jIP8fwKBgDp+KbNpx4MS0Bydpp24C5huBliGUsKmyX2wzITar/t8YpezezY/\n3oveZT1LSinO3iY3jHzPFG0lCJiwLrC07Ixm4kwuBc2aqwWD8gjsXmws0Z8tVIhX\n2SSAmwPAye/vBu93yRLoVaNR6nxOsQyAhECDMlWC/PZnRy7CVNk2epU5AoGAbCiy\nL94oEcyitt7bgqJEdZCqIIVMWGgertOip6ohRKWEB0znyjtQx7GoVC5z4/jhOLO/\ntvPVLsR0d5SnPUBeKiHwGQ6SCQ3YtAEmd4nPYQZXWBkOayur1u7wqL/PogzfuSi+\nGVTsnNNlOmm6h/aVepbm3Fee9eBhdIystw4UGI8CgYEAiAjQwT1nGTll0fpMHiYW\nf4czr6oELiUjnN11U78Qna215U/R0hchvZYpHneBRMCrAknajNgTL2JOh8obsfPY\nNTpgYtpoCN6jkDlZCUBjxYQoSQNv30bW9/oBRM1wn1TZ2MBO+q/1OVKiba/OAg1B\ndUl1B3QeoEoVrGUWgi3ocRo=\\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fkxav@ai-voice-agent-c2a2b.iam.gserviceaccount.com"
};

async function run() {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    const db = admin.firestore();
    const collections = await db.listCollections();
    console.log('✅ SUCCESS! Connection established.');
  } catch (err) {
    console.error('❌ FAILED:', err.message);
  }
}

run();
