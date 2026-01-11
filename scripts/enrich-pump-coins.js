
const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '../data/potential_pump_tokens.json');
const OUTPUT_PATH = path.join(__dirname, '../data/pump_coins_enriched.json');
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens';

const TARGET_COUNT = 10000; // Try to enrich top X tokens
const BATCH_SIZE = 30; // Max 30 per request
const DELAY_MS = 300; // Rate limit protection (approx 200 req/min)

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchDexScreener(addresses) {
    if (addresses.length === 0) return [];
    const url = `${DEXSCREENER_API}/${addresses.join(',')}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Error fetching batch: ${response.status}`);
            return [];
        }
        const data = await response.json();
        return data.pairs || [];
    } catch (e) {
        console.error('Fetch error:', e);
        return [];
    }
}

async function main() {
    console.log('Reading potential tokens...');
    const rawData = fs.readFileSync(INPUT_PATH, 'utf8');
    const tokens = JSON.parse(rawData);

    // Filter/Sort strategy:
    // Take tokens with higher pool counts first.
    // However, if we only have 140k and most are 1, we just take the first X.
    // The previous script already sorted them by poolCount (desc).

    // Let's take the top N tokens to enrich.
    const tokensToProcess = tokens.slice(0, TARGET_COUNT);
    console.log(`Processing top ${tokensToProcess.length} tokens...`);

    let enrichedCoins = [];
    const chunks = [];

    for (let i = 0; i < tokensToProcess.length; i += BATCH_SIZE) {
        chunks.push(tokensToProcess.slice(i, i + BATCH_SIZE).map(t => t.address));
    }

    console.log(`Split into ${chunks.length} chunks.`);

    for (let i = 0; i < chunks.length; i++) {
        const batch = chunks[i];
        process.stdout.write(`Processing chunk ${i + 1}/${chunks.length}...\r`);

        const pairs = await fetchDexScreener(batch);

        if (pairs && pairs.length > 0) {
            // Process pairs to find the best one for each token
            const pairsByToken = new Map();

            pairs.forEach(pair => {
                const tokenAddr = batch.includes(pair.baseToken.address) ? pair.baseToken.address : pair.quoteToken.address;
                // Only consider if it's a pump pool or valid enough
                // DexScreener returns pairs. We want the main pair.
                // We'll trust DexScreener's data.

                if (!pairsByToken.has(tokenAddr) || (pairsByToken.get(tokenAddr).liquidity?.usd || 0) < (pair.liquidity?.usd || 0)) {
                    pairsByToken.set(tokenAddr, pair);
                }
            });

            for (const [addr, pair] of pairsByToken) {
                enrichedCoins.push({
                    address: addr,
                    name: pair.baseToken.name,
                    symbol: pair.baseToken.symbol,
                    marketCap: pair.marketCap,
                    liquidity: pair.liquidity?.usd,
                    priceUsd: pair.priceUsd,
                    volume24h: pair.volume?.h24,
                    pairAddress: pair.pairAddress,
                    url: pair.url,
                    image: pair.info?.imageUrl, // DexScreener sometimes has info.imageUrl
                    poolCount: tokens.find(t => t.address === addr)?.poolCount
                });
            }
        }

        await sleep(DELAY_MS);
    }

    console.log('\nFinished fetching.');
    console.log(`Enriched ${enrichedCoins.length} coins.`);

    // Filter for quality
    // MC > 100k
    const validCoins = enrichedCoins.filter(c => c.marketCap > 100000);
    console.log(`Filtered to ${validCoins.length} valid coins (MC > 100k).`);

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(validCoins, null, 2));
    console.log(`Saved to ${OUTPUT_PATH}`);
}

main();
