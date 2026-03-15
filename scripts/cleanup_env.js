const fs = require('fs');
const path = require('path');

const envPath = '.env';
let lines = fs.readFileSync(envPath, 'utf8').split('\n');

// Find the line where FIREBASE_SERVICE_ACCOUNT_KEY starts
const startIndex = lines.findIndex(line => line.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='));

if (startIndex !== -1) {
    // Look for the next line that is either empty or a comment, starting from startIndex + 1
    // We want to remove everything between the assignment and the next legitimate entry/section
    let endIndex = -1;
    for (let i = startIndex + 1; i < lines.length; i++) {
        if (lines[i].trim() === '' || lines[i].trim().startsWith('#') || lines[i].includes('=')) {
            // Found the next section or empty space
            // But wait, the "garbage" lines don't have = usually.
            // Let's look for the closing quote suffix if it's there
            if (lines[i].includes('}')) {
               // Checking if it's the loose JSON blob
            }
        }
    }
    
    // Simplier approach: If we find a line starting with '  "type": "service_account"', remove until the next empty line or comment.
    const garbageStart = lines.findIndex(line => line.includes('  "type": "service_account"'));
    if (garbageStart !== -1) {
        let garbageEnd = garbageStart;
        for (let i = garbageStart; i < lines.length; i++) {
            if (lines[i].trim() === '}' || lines[i].trim() === "}'") {
                garbageEnd = i;
                break;
            }
        }
        
        console.log(`Removing lines ${garbageStart + 1} to ${garbageEnd + 1}`);
        lines.splice(garbageStart, garbageEnd - garbageStart + 1);
        fs.writeFileSync(envPath, lines.join('\n'));
        console.log('Cleanup successful.');
    } else {
        console.log('No garbage found.');
    }
} else {
    console.log('FIREBASE_SERVICE_ACCOUNT_KEY not found.');
}
