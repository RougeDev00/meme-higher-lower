const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/coins.json');
const TRACKER_DIR = path.join(__dirname, '../pumpfun_tracker/marketcap_updates');

// Get latest tracker file
const files = fs.readdirSync(TRACKER_DIR).filter(f => f.startsWith('mc_update_') && f.endsWith('.json'));
const latestFile = files.sort().reverse()[0];
const TRACKER_PATH = path.join(TRACKER_DIR, latestFile);

console.log(`Updating from: ${latestFile}`);

const coins = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const trackerData = JSON.parse(fs.readFileSync(TRACKER_PATH, 'utf8'));
const trackerTokens = Array.isArray(trackerData) ? trackerData : (trackerData.tokens || []);

// Create map of tracker data by Address (CA)
const trackerMap = new Map();
trackerTokens.forEach(t => {
    const addr = t.ca || t.mint || t.address;
    if (addr) {
        trackerMap.set(addr, {
            mc: parseFloat(t.market_cap || t.mc || 0),
            price: parseFloat(t.price || 0),
            liquidity: parseFloat(t.liquidity || 0)
        });
    }
});

let updatedCount = 0;

coins.forEach(c => {
    const update = trackerMap.get(c.address);
    if (update && update.mc > 0) {
        c.marketCap = update.mc;
        if (update.price) c.priceUsd = update.price;
        if (update.liquidity) c.liquidity = update.liquidity;
        updatedCount++;
    }
});

// Sort by Market Cap
coins.sort((a, b) => b.marketCap - a.marketCap);

// Update Ranks
coins.forEach((c, i) => c.rank = i + 1);

fs.writeFileSync(DB_PATH, JSON.stringify(coins, null, 2));

console.log(`Updated ${updatedCount}/${coins.length} coins.`);
console.log(`Top 1: ${coins[0].name} ($${coins[0].marketCap.toLocaleString()})`);
