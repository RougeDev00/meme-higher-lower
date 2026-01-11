const fs = require('fs');
const path = require('path');

const TRACKER_FILE = path.join(__dirname, '../pumpfun_tracker/marketcap_updates/mc_update_20260111_031453.json');
const DEST_PATH = path.join(__dirname, '../data/coins.json');

// Helper to format ID same as before
function formatId(name) {
    if (!name) return 'unknown-' + Math.random().toString(36).substr(2, 5);
    return name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'coin-' + Math.random().toString(36).substr(2, 5);
}

function main() {
    console.log(`Loading tracker data from: ${TRACKER_FILE}`);

    if (!fs.existsSync(TRACKER_FILE)) {
        console.error("Tracker file not found!");
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
    // Expected format: array of objects { mint, name, symbol, market_cap, ... }
    // Or object with timestamp and data array?
    // Let's assume array based on python script output "Saved..."
    // Inspecting file via node in next step if this fails, but usually these scripts dump list.

    // Actually, let's verify structure blindly.
    const tokens = Array.isArray(rawData) ? rawData : (rawData.tokens || rawData.data || []);

    const newCoins = tokens.map(t => {
        // Tracker has 'ca'
        const address = t.ca || t.mint || t.address;
        const mc = parseFloat(t.market_cap || t.mc || 0);

        return {
            id: formatId(t.name) + '-' + address.substr(0, 4),
            name: t.name || 'Unknown',
            symbol: t.symbol || '???',
            address: address,
            marketCap: mc,
            logo: t.image_uri || t.logo || t.icon || '', // Tracker might have image_uri
            platform: 'Pump.fun',
            priceUsd: parseFloat(t.price || 0),
            liquidity: parseFloat(t.liquidity || 0),
            volumeUsd: 0,
            rank: 999
        };
    }).filter(c => c.marketCap > 0); // Remove zeros

    // Sort by MC
    newCoins.sort((a, b) => b.marketCap - a.marketCap);
    newCoins.forEach((c, i) => c.rank = i + 1);

    // Save
    fs.writeFileSync(DEST_PATH, JSON.stringify(newCoins, null, 2));

    console.log(`Successfully imported ${newCoins.length} coins from tracker.`);
    console.log(`Top 1: ${newCoins[0].name} ($${newCoins[0].marketCap.toLocaleString()})`);
}

main();
