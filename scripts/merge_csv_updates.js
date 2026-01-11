const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/coins.json');
const UPDATES_PATH = path.join(__dirname, 'updates_from_csv.json');
const RESOLVED_PATH = path.join(__dirname, 'resolved_csv_coins.json');

function main() {
    const coins = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    // Map for fast lookup
    const coinsMap = new Map();
    coins.forEach(c => coinsMap.set(c.address, c));

    let updatedCount = 0;
    let addedCount = 0;
    let skippedCount = 0;

    // 1. Apply Updates (Logos)
    if (fs.existsSync(UPDATES_PATH)) {
        const updates = JSON.parse(fs.readFileSync(UPDATES_PATH, 'utf8'));
        updates.forEach(u => {
            const c = coinsMap.get(u.address);
            if (c) {
                // Update Logo
                c.logo = u.logo;
                // We keep our live MC, but maybe trust CSV if our MC is zero?
                // Nah, stick to live logic for MC.
                updatedCount++;
            }
        });
    }

    // 2. Add New Resolved Coins
    if (fs.existsSync(RESOLVED_PATH)) {
        const resolved = JSON.parse(fs.readFileSync(RESOLVED_PATH, 'utf8'));

        resolved.forEach(r => {
            // Safety Check: Market Cap
            // If CSV says 100k and we found 1k, it's fake.
            // If CSV says 100k and we found 50k, it's probably price drop, acceptable.
            // If CSV says 100k and we found 200k, it's pump, acceptable.

            // Factor: matched MC must be at least 10% of CSV MC?
            // Fartcoin case: CSV 372M. If we found 371M, good.
            // PNUT case: CSV 84M. Found 29k. Ratio ~ 0.0003. BAD.

            const ratio = r.marketCap / r.csvMC;

            if (ratio < 0.1 || ratio > 10) {
                console.log(`Skipping ${r.name} (${r.symbol}): MC mismatch (CSV: $${r.csvMC.toLocaleString()} vs Found: $${Math.round(r.marketCap).toLocaleString()})`);
                skippedCount++;
                return;
            }

            // Check if already exists by address (unlikely if missing list was correct, but safety first)
            if (coinsMap.has(r.address)) {
                // Update existing if found
                const c = coinsMap.get(r.address);
                c.logo = r.logo;
                updatedCount++;
            } else {
                // Add new
                const newCoin = {
                    id: r.symbol.toLowerCase() + '-' + r.address.substring(0, 4), // simple ID
                    name: r.name,
                    symbol: r.symbol,
                    address: r.address,
                    marketCap: r.marketCap,
                    liquidity: r.liquidity || 0,
                    priceUsd: parseFloat(r.priceUsd) || 0,
                    logo: r.logo,
                    platform: 'Pump.fun',
                    color: '#F38181', // Default
                    volumeUsd: 0, // No vol data from search usually
                    rank: 9999
                };
                coinsMap.set(r.address, newCoin);
                addedCount++;
                console.log(`Adding ${r.name} ($${Math.round(r.marketCap).toLocaleString()})`);
            }
        });
    }

    // Convert back to array
    const finalCoins = Array.from(coinsMap.values());

    // Re-rank
    finalCoins.sort((a, b) => b.marketCap - a.marketCap);
    finalCoins.forEach((c, i) => c.rank = i + 1);

    fs.writeFileSync(DB_PATH, JSON.stringify(finalCoins, null, 2));

    console.log(`\nMerge Complete.`);
    console.log(`Total Coins: ${finalCoins.length}`);
    console.log(`Updated logos: ${updatedCount}`);
    console.log(`Added new coins: ${addedCount}`);
    console.log(`Skipped suspicious matches: ${skippedCount}`);
}

main();
