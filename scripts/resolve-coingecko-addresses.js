
const fs = require('fs');
const path = require('path');

const COINGECKO_PATH = path.join(__dirname, '../data/coingecko_mass_scraped.json');
const OUTPUT_PATH = path.join(__dirname, '../data/coingecko_resolved.json');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function parseMarketCap(mcStr) {
    if (!mcStr) return 0;
    const clean = mcStr.replace(/[^0-9.]/g, '');
    return parseFloat(clean) || 0;
}

async function searchDexScreener(query) {
    try {
        const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        clearTimeout(timeoutId);

        if (!response.ok) return null;
        const data = await response.json();
        return data.pairs || [];
    } catch (e) {
        // console.error(`Error searching DexScreener for ${query}:`, e.message);
        return null;
    }
}

async function main() {
    const cgCoins = JSON.parse(fs.readFileSync(COINGECKO_PATH, 'utf8'));
    console.log(`Loaded ${cgCoins.length} coins from CoinGecko scrape.`);

    // Optimization settings
    // DexScreener allows ~300 requests/min.
    // 10 concurrent requests every 2s = 300 req/min.
    // To be safe: 10 concurrent, 2500ms delay => ~240 req/min.
    const BATCH_SIZE = 12;
    const DELAY_MS = 2200;

    const resolvedCoins = [];
    let processedCount = 0;

    console.log(`Starting optimized resolution (Batch Size: ${BATCH_SIZE}, Delay: ${DELAY_MS}ms)...`);

    for (let i = 0; i < cgCoins.length; i += BATCH_SIZE) {
        const batch = cgCoins.slice(i, i + BATCH_SIZE);

        const promises = batch.map(async (coin) => {
            const targetMC = parseMarketCap(coin.marketCap);
            const query = coin.symbol;

            const pairs = await searchDexScreener(query);

            let match = null;
            if (pairs && pairs.length > 0) {
                // Prioritize Pump.fun pairs (address ends with 'pump')
                const candidates = pairs.filter(p => p.baseToken.address.toLowerCase().endsWith('pump'));
                candidates.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

                for (const p of candidates) {
                    // Symbol check
                    const baseSymbol = p.baseToken.symbol.toUpperCase();
                    const targetSymbol = coin.symbol.toUpperCase();

                    if (!baseSymbol.includes(targetSymbol) && !targetSymbol.includes(baseSymbol)) continue;

                    const mc = p.marketCap || p.fdv || 0;

                    // Relaxed MC matching
                    if (mc >= targetMC * 0.2 && mc <= targetMC * 5.0) {
                        match = p;
                        break;
                    }
                    if (targetMC === 0 && mc > 1000) {
                        match = p;
                        break;
                    }
                }
            }

            if (match) {
                return {
                    name: coin.name,
                    symbol: coin.symbol,
                    address: match.baseToken.address,
                    cgRank: coin.rank,
                    method: 'dexscreener_search',
                    marketCap: match.marketCap,
                    liquidity: match.liquidity?.usd,
                    priceUsd: match.priceUsd,
                    volume24h: match.volume?.h24,
                    image: match.info?.imageUrl
                };
            }
            return null;
        });

        const results = await Promise.all(promises);

        results.forEach(res => {
            if (res) resolvedCoins.push(res);
        });

        processedCount += batch.length;
        console.log(`Processed ${processedCount}/${cgCoins.length} - Resolved: ${resolvedCoins.length}`);

        await sleep(DELAY_MS);
    }

    console.log(`Total Scraped: ${cgCoins.length}`);
    console.log(`Total Resolved: ${resolvedCoins.length}`);

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(resolvedCoins, null, 2));
    console.log(`Saved resolved list to ${OUTPUT_PATH}`);
}

main();
