const fs = require('fs');
const path = require('path');

const COINS_PATH = path.join(__dirname, '../data/coins.json');

try {
    const coins = JSON.parse(fs.readFileSync(COINS_PATH, 'utf8'));

    // Filter for Pump.fun or just take from the pool
    const pumpCoins = coins.filter(c => c.platform === 'Pump.fun');

    // Shuffle
    const shuffled = pumpCoins.sort(() => 0.5 - Math.random());

    // Take 20
    const sample = shuffled.slice(0, 20);

    console.log(`Sampling 20 random coins out of ${pumpCoins.length} Pump.fun coins:\n`);

    sample.forEach((c, i) => {
        console.log(`${i + 1}. ${c.name} (${c.symbol})`);
        console.log(`   Address: ${c.address}`);
        console.log(`   MC: $${Math.round(c.marketCap).toLocaleString()}`);
        console.log(`   Logo: ${c.logo}`);
        // If we have a stored URL or pairAddress, verify link. 
        // If not, construct DexScreener link.
        const url = c.url || `https://dexscreener.com/solana/${c.address}`;
        console.log(`   Link: ${url}`);
        console.log('---');
    });

} catch (e) {
    console.error(e);
}
