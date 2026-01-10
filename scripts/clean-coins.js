/**
 * Clean utility tokens from coins.json
 */

const fs = require('fs');
const coins = JSON.parse(fs.readFileSync('data/coins.json', 'utf-8'));

// Tokens to exclude (utility/DeFi, not meme coins)
const excluded = new Set([
    'USDT', 'USDC', 'SOL', 'WSOL', 'ETH', 'WETH', 'WBTC', 'BTC',
    'JUP', 'RAY', 'JTO', 'JITO', 'PYTH', 'INF', 'JUPUSOL',
    'GRASS', 'META', 'JUPUSD', 'ALCH', 'ME', 'DBR', 'JITOSOL',
    'W', 'KMNO', 'MNGO', 'SRM', 'PORT', 'SNY', 'SLND', 'MSOL',
    'BSOL', 'JSOL', 'CLOUD', 'TNSR', 'WLFI', 'LST', 'STEP'
]);

const filtered = coins.filter(c => !excluded.has(c.symbol.toUpperCase()));
const reranked = filtered.map((c, i) => ({ ...c, rank: i + 1 }));

fs.writeFileSync('data/coins.json', JSON.stringify(reranked, null, 2));
console.log('Before:', coins.length, 'coins');
console.log('After:', reranked.length, 'coins');

// Platform breakdown
const platforms = {};
reranked.forEach(c => { platforms[c.platform] = (platforms[c.platform] || 0) + 1; });
console.log('\nPlatforms:');
Object.entries(platforms).forEach(([p, n]) => console.log('  ' + p + ': ' + n));

// Top 15
console.log('\nTop 15:');
reranked.slice(0, 15).forEach((c, i) => {
    const mc = c.marketCap >= 1e9 ? (c.marketCap / 1e9).toFixed(2) + 'B' : (c.marketCap / 1e6).toFixed(2) + 'M';
    console.log(`  ${i + 1}. ${c.symbol} (${c.platform}) - $${mc}`);
});
