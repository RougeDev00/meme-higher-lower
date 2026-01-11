const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // Ensure fetch available

const DB_PATH = path.join(__dirname, '../data/coins.json');

// DexScreener allows multiple addresses per request (up to 30 usually standard for these APIs)
const CHUNK_SIZE = 25;
const DELAY_MS = 300; // Rate limit safety

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchChunk(addresses) {
    const ids = addresses.join(',');
    const url = `https://api.dexscreener.com/latest/dex/tokens/${ids}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data.pairs || [];
    } catch (e) {
        console.error('Error fetching chunk:', e.message);
        return [];
    }
}

async function main() {
    console.log('--- STARTING LIVE UPDATE ---');
    const coins = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const total = coins.length;
    console.log(`Loaded ${total} coins.`);

    // Map for easy updates: Address -> Coin Object
    const coinsMap = new Map();
    coins.forEach(c => coinsMap.set(c.address, c));

    // Create chunks of addresses
    const addresses = coins.map(c => c.address);
    const chunks = [];
    for (let i = 0; i < addresses.length; i += CHUNK_SIZE) {
        chunks.push(addresses.slice(i, i + CHUNK_SIZE));
    }

    console.log(`Processing ${chunks.length} batches...`);

    let updatedCount = 0;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        process.stdout.write(`Batch ${i + 1}/${chunks.length}... `);

        const pairs = await fetchChunk(chunk);

        // DexScreener returns all pairs for these tokens.
        // We need to group them by baseToken.address and pick the best one for each token.

        const pairsByToken = {};
        pairs.forEach(p => {
            const addr = p.baseToken.address;
            if (!pairsByToken[addr]) pairsByToken[addr] = [];
            pairsByToken[addr].push(p);
        });

        // Update coins in this chunk
        chunk.forEach(addr => {
            const tokenPairs = pairsByToken[addr];
            if (tokenPairs && tokenPairs.length > 0) {
                // Find best pair (Solana + highest Liquidity)
                const solPairs = tokenPairs.filter(p => p.chainId === 'solana');
                if (solPairs.length > 0) {
                    solPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
                    const best = solPairs[0];

                    const newMC = best.marketCap || best.fdv || 0;

                    if (newMC > 0) {
                        const c = coinsMap.get(addr);
                        c.marketCap = newMC;
                        c.priceUsd = parseFloat(best.priceUsd);
                        c.liquidity = best.liquidity?.usd || 0;
                        updatedCount++;
                    }
                }
            }
        });

        console.log(`Done.`);
        await delay(DELAY_MS);
    }

    // Sort by Market Cap Desc
    const updatedCoins = Array.from(coinsMap.values());
    updatedCoins.sort((a, b) => b.marketCap - a.marketCap);

    // Re-rank
    updatedCoins.forEach((c, i) => c.rank = i + 1);

    fs.writeFileSync(DB_PATH, JSON.stringify(updatedCoins, null, 2));

    console.log(`\n--- UPDATE COMPLETE ---`);
    console.log(`Successfully updated ${updatedCount}/${total} coins.`);
    console.log(`Data saved to ${DB_PATH}`);
}

main();
