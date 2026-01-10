const fs = require('fs');
const path = require('path');

const coinsPath = path.join(__dirname, '../data/coins.json');
const backupPath = path.join(__dirname, '../data/coins_before_purge.json');

// Read data
const rawData = fs.readFileSync(coinsPath, 'utf8');
const coins = JSON.parse(rawData);

console.log(`Total coins before filtering: ${coins.length}`);

// Backup
fs.writeFileSync(backupPath, rawData);
console.log(`Backup saved to ${backupPath}`);

// Filter
const pumpCoins = coins.filter(coin => {
    const p = (coin.platform || '').toLowerCase();
    return p === 'pump.fun' || p === 'pumpswap';
});

console.log(`Total coins after filtering: ${pumpCoins.length}`);
console.log(`Removed ${coins.length - pumpCoins.length} coins`);

// Save
if (pumpCoins.length > 0) {
    fs.writeFileSync(coinsPath, JSON.stringify(pumpCoins, null, 2));
    console.log('Successfully updated coins.json');
} else {
    console.error('CRITICAL: Filter resulted in 0 coins! Aborting save.');
}
