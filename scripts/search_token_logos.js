const fetch = require('node-fetch'); // Expecting node environment with fetch or node-fetch

const param = process.argv[2] || '1 SOL and a Dream';

async function search() {
    console.log(`Searching for "${param}"...`);
    const res = await fetch(`https://api.dexscreener.com/latest/dex/search/?q=${encodeURIComponent(param)}`);
    const data = await res.json();
    const pairs = data.pairs || [];

    if (pairs.length === 0) {
        console.log("No pairs found.");
        return;
    }

    // Group by base token address
    const tokens = {};

    pairs.forEach(p => {
        const addr = p.baseToken.address;
        if (!tokens[addr]) {
            tokens[addr] = {
                name: p.baseToken.name,
                symbol: p.baseToken.symbol,
                address: addr,
                liquidity: 0,
                logos: new Set(),
                pairs: 0
            };
        }
        tokens[addr].liquidity += (p.liquidity?.usd || 0);
        tokens[addr].pairs += 1;
        if (p.info?.imageUrl) {
            tokens[addr].logos.add(p.info.imageUrl);
        }
    });

    console.log(`\nFound ${Object.keys(tokens).length} distinct tokens:\n`);

    Object.values(tokens)
        .sort((a, b) => b.liquidity - a.liquidity)
        .forEach(t => {
            console.log(`Name: ${t.name} (${t.symbol})`);
            console.log(`Address: ${t.address}`);
            console.log(`Total Liquidity: $${Math.round(t.liquidity).toLocaleString()}`);
            console.log(`Logos found: ${t.logos.size}`);
            t.logos.forEach(l => console.log(` - ${l}`));
            console.log('---');
        });
}

search();
