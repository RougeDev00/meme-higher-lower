const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '../data/pump_coins_enriched.json');
const OUTPUT_PATH = path.join(__dirname, '../data/pump_coins_fixed.json');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchTokenPairs(address) {
    try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.pairs || [];
    } catch (e) {
        console.error(`Error fetching ${address}:`, e.message);
        return [];
    }
}

async function main() {
    console.log('Reading coins...');
    const coins = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
    console.log(`Processing ${coins.length} coins...`);

    const fixedCoins = [];

    for (let i = 0; i < coins.length; i++) {
        const coin = coins[i];
        process.stdout.write(`Fixing ${i + 1}/${coins.length}: ${coin.name} (${coin.symbol})... `);

        const pairs = await fetchTokenPairs(coin.address);

        if (pairs.length === 0) {
            console.log('No pairs found.');
            fixedCoins.push(coin);
            continue;
        }

        // Filter for Solana pairs only
        const solPairs = pairs.filter(p => p.chainId === 'solana');

        // Sort by liquidity
        solPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

        // Attempt to find the "best" pair
        // 1. Must be a SOL pair (quotetoken address usually So1111...)
        // 2. High liquidity

        let bestPair = solPairs[0];

        // Refined selection: Find the pair with highest volume in last 24h if liquidity is close?
        // Actually, for MC, we usually want the most liquid pair's FDV or MarketCap.
        // DexScreener provides 'marketCap' (circulating) and 'fdv'. 
        // For meme coins, usually FDV = MC unless there's burning/vesting.
        // Let's take 'marketCap' if available and non-zero, else 'fdv'.

        if (bestPair) {
            const mc = bestPair.marketCap || bestPair.fdv || 0;
            const liquidity = bestPair.liquidity?.usd || 0;
            const price = bestPair.priceUsd;

            console.log(`Updated MC: $${Math.round(mc).toLocaleString()} (Liq: $${Math.round(liquidity).toLocaleString()})`);

            fixedCoins.push({
                ...coin,
                marketCap: mc,
                liquidity: liquidity,
                priceUsd: price,
                url: bestPair.url,
                pairAddress: bestPair.pairAddress,
                pairsFetched: pairs.length
            });
        } else {
            console.log('No valid Solana pairs.');
            fixedCoins.push(coin);
        }

        await delay(300); // Respect rate limits
    }

    // Sort again by new Market Cap
    fixedCoins.sort((a, b) => b.marketCap - a.marketCap);

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fixedCoins, null, 2));
    console.log(`\nSaved fixed data to ${OUTPUT_PATH}`);
}

main();
