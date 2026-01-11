const fs = require('fs');
const path = require('path');

const potentialPath = path.join(__dirname, '../data/potential_pump_tokens.json');

try {
    const data = fs.readFileSync(potentialPath, 'utf8');
    // It might be a large array or line-delimited JSON. Let's try parsing as JSON first.
    // If it fails, we might need a stream or line reader, but 12MB is handleable in Node.
    const coins = JSON.parse(data);
    console.log(`Potential Pump.fun coins: ${coins.length}`);
} catch (err) {
    console.error('Error reading or parsing potential_pump_tokens.json:', err);
}
