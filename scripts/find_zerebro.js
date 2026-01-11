const fs = require('fs');
const path = require('path');

const coins = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/pump_coins_enriched.json'), 'utf8'));
const zerebro = coins.find(c => c.name.toLowerCase().includes('zerebro') || c.symbol.toLowerCase().includes('zerebro'));

if (zerebro) {
    console.log('Zerebro found:');
    console.log(JSON.stringify(zerebro, null, 2));
} else {
    console.log('Zerebro not found.');
}
