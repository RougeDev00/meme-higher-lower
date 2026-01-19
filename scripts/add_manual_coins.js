const fs = require('fs');
const path = require('path');

const manualCoins = [
    '3yr17ZEE6wvCG7e3qD51XsfeSoSSKuCKptVissoopump',
    '2nP9yKQNSGQy851iyawDvBkzkK2R2aqKArQCKc2gpump',
    'AGBegePeNtnBy1xLGBDcBDjxaVHaDhvebSNMduLapump',
    'AD8ra3bPosVujHQDofATvPciT1Q9xY4DLEgXbGzopump',
    'a3W4qutoEJA4232T2gwZUfgYJTetr96pU4SJMwppump',
    'jk1T35eWK41MBMM8AWoYVaNbjHEEQzMDetTsfnqpump',
    '7iX4yQ4zTraFSRXEGpF89emA9xGrhgv6jX57dMENpump'
];

const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens';

async function fetchCoinData(addresses) {
    const url = `${DEXSCREENER_API}/${addresses.join(',')}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.pairs || [];
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

async function main() {
    console.log('🚀 Adding Manual Coins...\n');

    const coinsPath = path.join(__dirname, '..', 'data', 'coins.json');
    let existingCoins = [];

    if (fs.existsSync(coinsPath)) {
        existingCoins = JSON.parse(fs.readFileSync(coinsPath, 'utf8'));
    }

    const pairs = await fetchCoinData(manualCoins);

    // Group pairs by base token address to find the best one (highest liquidity)
    const bestPairs = {};
    pairs.forEach(pair => {
        const address = pair.baseToken.address;
        if (!bestPairs[address] || (pair.liquidity && pair.liquidity.usd > bestPairs[address].liquidity.usd)) {
            bestPairs[address] = pair;
        }
    });

    let addedCount = 0;
    let skippedCount = 0;

    for (const address of manualCoins) {
        const pair = bestPairs[address];

        if (!pair) {
            console.log(`❌ No data found for address: ${address}`);
            continue;
        }

        // Check if already exists
        if (existingCoins.some(c => (c.ca === address || c.address === address))) {
            console.log(`⚠️  Already exists: ${pair.baseToken.name} (${pair.baseToken.symbol})`);
            skippedCount++;
            continue;
        }

        const newCoin = {
            name: pair.baseToken.name,
            symbol: pair.baseToken.symbol,
            image: pair.info?.imageUrl || 'https://via.placeholder.com/200', // Fallback if no image, though DexScreener usually provides one if available
            marketCap: pair.fdv || pair.marketCap || 0,
            priceUsd: parseFloat(pair.priceUsd),
            liquidity: pair.liquidity?.usd || 0,
            ca: address, // Standardize on 'ca'
            volume24h: pair.volume?.h24 || 0,
            addedAt: new Date().toISOString()
        };

        // Try to get image from simple URL construction if API didn't provide info.imageUrl but we know it's pump.fun (optional enhancement)
        // DexScreener usually puts it in info.imageUrl.

        // Add to list
        existingCoins.push(newCoin);
        console.log(`✅ Added: ${newCoin.name} ($${newCoin.symbol}) - MC: $${newCoin.marketCap.toLocaleString()}`);
        addedCount++;
    }

    // Sort by Market Cap
    existingCoins.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

    // Re-assign ranks
    existingCoins.forEach((c, i) => c.rank = i + 1);

    // Save
    fs.writeFileSync(coinsPath, JSON.stringify(existingCoins, null, 2));

    console.log(`\n🎉 Process Complete. Added ${addedCount} new coins. Skipped ${skippedCount}. Total: ${existingCoins.length}`);
}

main().catch(console.error);
