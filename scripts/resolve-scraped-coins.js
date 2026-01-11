/**
 * Resolve Scraped Coins to Pump.fun Addresses
 * 
 * Reads scripts/scraped_pump_names.json and queries DexScreener to find 
 * the corresponding Solana token address ending in 'pump'.
 */

const fs = require('fs');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function generateColor(str) {
    const colors = [
        '#9945FF', '#14F195', '#FF6B6B', '#4ECDC4', '#FFE66D',
        '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

async function fetchTokenPairs(searchTerm) {
    try {
        const query = `${searchTerm} solana`;
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        return data.pairs || [];
    } catch (error) {
        return [];
    }
}

async function main() {
    console.log('🚀 Resolving Scraped Coins to Pump.fun Addresses...');

    // 1. Load Scraped Names
    const scrapedPath = path.join(__dirname, 'scraped_pump_names.json');
    if (!fs.existsSync(scrapedPath)) {
        console.error('Scraped list not found!');
        return;
    }
    const scrapedCoins = JSON.parse(fs.readFileSync(scrapedPath, 'utf8'));
    console.log(`Loaded ${scrapedCoins.length} names to resolve.`);

    // 2. Load Existing Coins (to dedup)
    const coinsPath = path.join(__dirname, '../data/coins.json');
    let existingCoins = [];
    if (fs.existsSync(coinsPath)) {
        existingCoins = JSON.parse(fs.readFileSync(coinsPath, 'utf8'));
    }
    const existingMap = new Map();
    existingCoins.forEach(c => existingMap.set(c.address, c));
    console.log(`Loaded ${existingCoins.length} existing coins.`);

    const newCoins = [];
    let resolvedCount = 0;

    // 3. Resolve Loop
    for (const item of scrapedCoins) {
        // Try searching by Symbol first, then Name
        // "symbol solana" is often most accurate for DexScreener

        process.stdout.write(`  Resolving ${item.name} (${item.symbol})... `);

        // Search
        let pairs = await fetchTokenPairs(item.symbol);

        // If no good match, try name
        if (pairs.length === 0) {
            pairs = await fetchTokenPairs(item.name);
        }

        // Find best match
        const match = pairs.find(p => {
            return p.chainId === 'solana' &&
                p.baseToken?.address?.endsWith('pump') &&
                p.info?.imageUrl &&
                (p.marketCap || p.fdv || 0) > 20000; // Lower threshold to find them, then precise later
        });

        if (match) {
            const address = match.baseToken.address;

            if (existingMap.has(address)) {
                process.stdout.write('Exists.\n');
            } else {
                process.stdout.write('FOUND!\n');

                const coin = {
                    id: match.baseToken.symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
                    name: match.baseToken.name,
                    symbol: match.baseToken.symbol.toUpperCase(),
                    address: address,
                    marketCap: match.marketCap || match.fdv || 0,
                    logo: match.info.imageUrl,
                    color: generateColor(match.baseToken.symbol),
                    platform: 'Pump.fun',
                    priceUsd: parseFloat(match.priceUsd) || 0,
                    liquidity: match.liquidity?.usd || 0
                };

                newCoins.push(coin);
                existingMap.set(address, coin); // Prevent dupes in this run
                resolvedCount++;
            }
        } else {
            process.stdout.write('No pump match.\n');
        }

        await delay(150); // Respect API limits
    }

    console.log(`\nResolution complete. Found ${newCoins.length} NEW coins.`);

    if (newCoins.length > 0) {
        // Merge and Save
        const allCoins = [...existingCoins, ...newCoins];

        // Final Sort by MC
        allCoins.sort((a, b) => b.marketCap - a.marketCap);

        // Rank
        const ranked = allCoins.map((c, i) => ({ ...c, rank: i + 1 }));

        fs.writeFileSync(coinsPath, JSON.stringify(ranked, null, 2));
        console.log(`Saved updated list with ${ranked.length} total coins to ${coinsPath}`);
    } else {
        console.log('No new coins to save.');
    }
}

main();
