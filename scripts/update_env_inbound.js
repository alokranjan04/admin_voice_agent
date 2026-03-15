const fs = require('fs');
const path = require('path');

const envPath = '.env';
let content = fs.readFileSync(envPath, 'utf8');

if (!content.includes('DEFAULT_INBOUND_ASSISTANT_ID')) {
    content = content.replace('VITE_VAPI_PRIVATE_KEY=107e68ad-e993-4394-9c2a-279d551c475a', 
    'VITE_VAPI_PRIVATE_KEY=107e68ad-e993-4394-9c2a-279d551c475a\nDEFAULT_INBOUND_ASSISTANT_ID=0cd3241d-f905-461a-b831-526a1405b4d5');
    fs.writeFileSync(envPath, content);
    console.log('Updated .env with DEFAULT_INBOUND_ASSISTANT_ID');
} else {
    console.log('DEFAULT_INBOUND_ASSISTANT_ID already exists in .env');
}
