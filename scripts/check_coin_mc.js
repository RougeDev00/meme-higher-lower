const fetch = require('node-fetch'); // Ensure node-fetch is available or use native fetch in newer node
// If node-fetch is not available, remove the require line as Node 18+ has native fetch.
// We'll rely on native fetch.

const query = process.argv[2];

if (!query) {
    console.log('Usage: node scripts/check_coin_mc.js <symbol_or_address>');
    process.exit(1);
}

async function checkCoin(q) {
    console.log(`Searching for "${q}" on DexScreener...`);

    let url = `https://api.dexscreener.com/latest/dex/search/?q=${q}`;
    // If it looks like an address, use the tokens endpoint directly for better precision
    if (q.length > 30) {
        url = `https://api.dexscreener.com/latest/dex/tokens/${q}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        let pairs = data.pairs || [];

        if (pairs.length === 0) {
            console.log('No pairs found.');
            return;
        }

        // Apply our logic: Solana only + sort by liquidity
        const solPairs = pairs.filter(p => p.chainId === 'solana');

        if (solPairs.length === 0) {
            console.log(`Found ${pairs.length} pairs, but none on Solana.`);
            return;
        }

        solPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

        const bestPair = solPairs[0];
        const mc = bestPair.marketCap || bestPair.fdv || 0;

        console.log('\n--- Result using our Logic ---');
        console.log(`Name: ${bestPair.baseToken.name} (${bestPair.baseToken.symbol})`);
        console.log(`Address: ${bestPair.baseToken.address}`);
        console.log(`Market Cap (Best Pair): $${Math.round(mc).toLocaleString()}`);
        console.log(`Liquidity: $${Math.round(bestPair.liquidity?.usd || 0).toLocaleString()}`);
        console.log(`Price: $${bestPair.priceUsd}`);
        console.log(`Pair: ${bestPair.pairAddress} (${bestPair.dexId})`);

        if (solPairs.length > 1) {
            console.log(`\n(Alternative pairs found: ${solPairs.length - 1} more)`);
            const p2 = solPairs[1];
            console.log(`2nd Best: MC $${Math.round(p2.marketCap || p2.fdv || 0).toLocaleString()} - Liq $${Math.round(p2.liquidity?.usd || 0).toLocaleString()}`);
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkCoin(query);
