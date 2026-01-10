
const fs = require('fs');
const path = require('path');

const RAW_POOLS_PATH = path.join(__dirname, '../data/raydium_pump_raw.json');
const OUTPUT_PATH = path.join(__dirname, '../data/potential_pump_tokens.json');

function main() {
    console.log('Reading raw pools...');
    const rawData = fs.readFileSync(RAW_POOLS_PATH, 'utf8');
    const pools = JSON.parse(rawData);

    console.log(`Processing ${pools.length} pools...`);

    const tokenCounts = new Map();

    pools.forEach(pool => {
        const base = pool.baseMint;
        const quote = pool.quoteMint;

        if (base && base.endsWith('pump')) {
            tokenCounts.set(base, (tokenCounts.get(base) || 0) + 1);
        }
        if (quote && quote.endsWith('pump')) {
            tokenCounts.set(quote, (tokenCounts.get(quote) || 0) + 1);
        }
    });

    const uniqueTokens = Array.from(tokenCounts.keys());
    console.log(`Found ${uniqueTokens.length} unique pump tokens.`);

    // Sort by Number of Pools (heuristic for popularity/activity)
    const sortedTokens = uniqueTokens.sort((a, b) => tokenCounts.get(b) - tokenCounts.get(a));

    const outputData = sortedTokens.map(addr => ({
        address: addr,
        poolCount: tokenCounts.get(addr)
    }));

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2));
    console.log(`Saved unique tokens to ${OUTPUT_PATH}`);
}

main();
