const fs = require('fs');
const path = require('path');

const MISSING_PATH = path.join(__dirname, 'missing_from_csv.json');
const RESOLVED_PATH = path.join(__dirname, 'resolved_csv_coins.json');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function searchCoin(name, symbol) {
    // Search by Symbol first as it's more unique usually, or Name + Symbol
    // DexScreener search by query "Symbol" might return many.
    const query = `${symbol}`; // search query
    const url = `https://api.dexscreener.com/latest/dex/search/?q=${encodeURIComponent(query)}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        const pairs = data.pairs || [];

        if (pairs.length === 0) return null;

        // Filter for Solana
        const solPairs = pairs.filter(p => p.chainId === 'solana');
        if (solPairs.length === 0) return null;

        // Find best match
        // 1. Symbol match
        // 2. Name match (fuzzy)
        // 3. Highest Liquidity

        const candidates = solPairs.filter(p =>
            p.baseToken.symbol.toUpperCase() === symbol.toUpperCase()
        );

        if (candidates.length === 0) return null; // No symbol match on Solana

        // Sort by liquidity
        candidates.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

        return candidates[0]; // Take the most liquid pair with matching symbol
    } catch (e) {
        console.error(`Error searching ${symbol}:`, e.message);
        return null;
    }
}

async function main() {
    if (!fs.existsSync(MISSING_PATH)) {
        console.log('missing_from_csv.json not found.');
        return;
    }

    const missing = JSON.parse(fs.readFileSync(MISSING_PATH, 'utf8'));
    console.log(`Resolving ${missing.length} missing coins...`);

    const resolved = [];

    for (let i = 0; i < missing.length; i++) {
        const coin = missing[i];
        process.stdout.write(`Resolving ${i + 1}/${missing.length}: ${coin.name} (${coin.symbol})... `);

        // Search
        const pair = await searchCoin(coin.name, coin.symbol);

        if (pair) {
            // Verify MC is somewhat close? Or just take it?
            // User said "margin of error 20k". 
            // If CSV says 1M and DexScreener says 10k, it's likely wrong token.
            const dexMC = pair.marketCap || pair.fdv || 0;
            const csvMC = coin.mc;

            // Allow 50% deviation or fixed amount? 
            // Let's be lenient but flag weird ones.
            // Actually, just save it and we filter later.

            console.log(`Found: ${pair.baseToken.address} (MC: $${Math.round(dexMC).toLocaleString()})`);

            resolved.push({
                name: coin.name, // Use CSV name as it's clean
                symbol: coin.symbol, // CSV symbol
                address: pair.baseToken.address,
                marketCap: dexMC, // Use LIVE metric
                logo: coin.logo, // Use CSV logo (High Quality)
                platform: 'Pump.fun', // Assumption or check pair? 
                // DexScreener pair usually has 'labels' or 'dexId'.
                // If dexId is 'raydium' it might be pump.fun origin.
                // We'll trust user classification "pumpfun memecoins".
                liquidity: pair.liquidity?.usd,
                priceUsd: pair.priceUsd,
                url: pair.url,
                csvMC: coin.mc // Debug info
            });
        } else {
            console.log('Not found.');
        }

        await delay(300);
    }

    fs.writeFileSync(RESOLVED_PATH, JSON.stringify(resolved, null, 2));
    console.log(`\nResolved ${resolved.length} coins. Saved to ${RESOLVED_PATH}`);
}

main();
