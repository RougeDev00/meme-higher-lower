const fs = require('fs');
const path = require('path');

const FIXED_PUMP_PATH = path.join(__dirname, '../data/pump_coins_fixed.json');
const COINS_PATH = path.join(__dirname, '../data/coins.json');

try {
    const fixedCoins = JSON.parse(fs.readFileSync(FIXED_PUMP_PATH, 'utf8'));
    const allCoins = JSON.parse(fs.readFileSync(COINS_PATH, 'utf8'));

    console.log(`Loaded ${fixedCoins.length} fixed pump coins.`);
    console.log(`Loaded ${allCoins.length} existing coins.`);

    // Map existing coins by ID or address to avoid duplicates
    const coinsMap = new Map();
    allCoins.forEach(c => coinsMap.set(c.address, c));

    // Update or Add fixed coins
    let updatedCount = 0;
    let addedCount = 0;

    fixedCoins.forEach(fc => {
        // Normalize fields
        const normalizedCoin = {
            id: fc.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
            name: fc.name,
            symbol: fc.symbol,
            address: fc.address,
            marketCap: fc.marketCap,
            logo: fc.image, // Ensure consistent field name (some use logo, some image)
            color: fc.color || '#F38181', // Default color if missing
            platform: 'Pump.fun',
            priceUsd: parseFloat(fc.priceUsd) || 0,
            liquidity: fc.liquidity,
            volumeUsd: fc.volume24h,
            // Keep rank for sorting later
        };

        // Fix logo field if it was mapped to 'image' in enrichment
        if (!normalizedCoin.logo && fc.image) {
            normalizedCoin.logo = fc.image;
        }

        if (coinsMap.has(fc.address)) {
            // Update existing
            coinsMap.set(fc.address, { ...coinsMap.get(fc.address), ...normalizedCoin });
            updatedCount++;
        } else {
            // Add new
            coinsMap.set(fc.address, normalizedCoin);
            addedCount++;
        }
    });

    const finalCoins = Array.from(coinsMap.values());

    // Re-rank based on Market Cap
    finalCoins.sort((a, b) => b.marketCap - a.marketCap);
    finalCoins.forEach((c, i) => c.rank = i + 1);

    fs.writeFileSync(COINS_PATH, JSON.stringify(finalCoins, null, 2));

    console.log(`merged: ${updatedCount} updated, ${addedCount} added.`);
    console.log(`Total coins now: ${finalCoins.length}`);

} catch (e) {
    console.error('Error merging coins:', e);
}
