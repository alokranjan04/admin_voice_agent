const fs = require('fs');
const content = fs.readFileSync('.env', 'utf8');
const lines = content.split('\n');
const newKeyData = {
  "type": "service_account",
  "project_id": "YOUR_PROJECT_ID",
  "private_key_id": "YOUR_PRIVATE_KEY_ID",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
  "client_email": "YOUR_CLIENT_EMAIL",
  "client_id": "YOUR_CLIENT_ID",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account",
  "universe_domain": "googleapis.com"
};
const newKeyLine = `FIREBASE_SERVICE_ACCOUNT_KEY='${JSON.stringify(newKeyData)}'`;
const newLines = lines.map(line => line.trim().startsWith('FIREBASE_SERVICE_ACCOUNT_KEY=') ? newKeyLine : line);
fs.writeFileSync('.env', newLines.join('\n'));
console.log('Successfully updated .env');
