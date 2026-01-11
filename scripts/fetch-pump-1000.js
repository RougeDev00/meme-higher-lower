/**
 * Pump.fun Target 1000 Fetcher
 *
 * Expands existing dataset to 1000 coins.
 * Constraints:
 * - Platform: Pump.fun (CA ends with 'pump')
 * - Market Cap: > $50,000
 * - Target: 1000 coins
 */

const fs = require('fs');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function generateColor(str) {
    const colors = [
        '#9945FF', '#14F195', '#FF6B6B', '#4ECDC4', '#FFE66D',
        '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA',
        '#FF9F43', '#EE5A24', '#009432', '#0652DD', '#9980FA'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

// Extensive search terms
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const PUMP_COMBOS = ALPHABET.map(l => `pump ${l}`);
const ANIMAL_TERMS = ['cat', 'dog', 'pepe', 'shib', 'inu', 'monkey', 'ape', 'fish', 'bird', 'lion', 'panda', 'bear', 'bull', 'frog'];
const MEME_TERMS = ['wojak', 'chad', 'giga', 'based', 'trump', 'biden', 'obama', 'musk', 'crypto', 'moon', 'mars', 'rocket'];
const ADJECTIVES = ['super', 'mega', 'ultra', 'micro', 'happy', 'sad', 'based', 'red', 'green', 'blue', 'black', 'white', 'gold'];

const SEARCH_TERMS = [
    // High probability
    'pump', 'fun', 'solana', 'meme', 'so', 'la', 'na',
    ...PUMP_COMBOS,
    ...ANIMAL_TERMS,
    ...MEME_TERMS,
    ...ADJECTIVES
];

// Utility tokens to exclude
const EXCLUDED_SYMBOLS = new Set([
    'SOL', 'USDC', 'USDT', 'WBTC', 'ETH', 'WETH', 'JUP', 'RAY', 'ORCA',
    'JTO', 'PYTH', 'BSOL'
]);

async function fetchDexScreenerTokens(searchTerm) {
    try {
        const query = `${searchTerm} solana`; // Hint solana
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        return data.pairs || [];
    } catch (error) {
        // console.error(`Error fetching ${searchTerm}:`, error.message);
        return [];
    }
}

async function fetchTopBoostedTokens() {
    try {
        console.log('  Fetching Top Boosted Tokens...');
        const response = await fetch('https://api.dexscreener.com/token-boosts/top/v1');
        const data = await response.json();
        return (data || []).filter(token => token.chainId === 'solana');
    } catch (error) {
        return [];
    }
}

async function fetchTokenByAddress(address) {
    try {
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${address}`
        );
        const data = await response.json();
        return (data.pairs || []).find(p => p.chainId === 'solana');
    } catch (error) {
        return null;
    }
}

function isValidPumpCoin(pair, minMc) {
    if (pair.chainId !== 'solana') return false;

    // CA Check
    const tokenAddress = pair.baseToken?.address || '';
    if (!tokenAddress.endsWith('pump')) return false;

    // MC Check
    const mc = pair.marketCap || pair.fdv || 0;
    if (mc < minMc) return false;

    // Data Check
    if (!pair.baseToken?.symbol || !pair.info?.imageUrl) return false;

    // Symbol Check
    if (EXCLUDED_SYMBOLS.has(pair.baseToken.symbol.toUpperCase())) return false;

    return true;
}

async function main() {
    console.log(`🚀 Fetching Target 1000 Pump.fun Coins `);
    console.log(`Criteria: Ends with 'pump', MC > $50,000`);

    const TARGET_COUNT = 1000;
    const MIN_MARKET_CAP = 50000;
    const allCoins = new Map();

    // 1. Load Existing Data
    const coinsPath = path.join(__dirname, '../data/coins.json');
    if (fs.existsSync(coinsPath)) {
        const existing = JSON.parse(fs.readFileSync(coinsPath, 'utf8'));
        existing.forEach(c => {
            // Re-validate existing (in case policies changed)
            if (c.address.endsWith('pump') && c.marketCap >= MIN_MARKET_CAP) {
                allCoins.set(c.address, c);
            }
        });
        console.log(`Loaded ${allCoins.size} valid existing coins.`);
    }

    // 2. Fetch Boosted (High Quality)
    const boosted = await fetchTopBoostedTokens();
    for (const token of boosted) {
        if (allCoins.size >= TARGET_COUNT) break;
        if (!token.tokenAddress?.endsWith('pump')) continue;
        if (allCoins.has(token.tokenAddress)) continue;

        const pair = await fetchTokenByAddress(token.tokenAddress);
        if (pair && isValidPumpCoin(pair, MIN_MARKET_CAP)) {
            allCoins.set(token.tokenAddress, {
                id: pair.baseToken.symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
                name: pair.baseToken.name,
                symbol: pair.baseToken.symbol.toUpperCase(),
                address: token.tokenAddress,
                marketCap: pair.marketCap || pair.fdv || 0,
                logo: token.icon || pair.info?.imageUrl,
                color: generateColor(pair.baseToken.symbol),
                platform: 'Pump.fun',
                priceUsd: parseFloat(pair.priceUsd) || 0,
                liquidity: pair.liquidity?.usd || 0
            });
            process.stdout.write('+');
        }
        await delay(50);
    }
    console.log(`\nBoosted scan complete. Total: ${allCoins.size}`);

    // 3. Keyword Search
    for (const term of SEARCH_TERMS) {
        if (allCoins.size >= TARGET_COUNT + 50) break; // Small buffer

        process.stdout.write(`  Searching "${term}"... `);
        const pairs = await fetchDexScreenerTokens(term);
        let validCount = 0;

        for (const pair of pairs) {
            if (allCoins.has(pair.baseToken?.address)) continue;

            if (isValidPumpCoin(pair, MIN_MARKET_CAP)) {
                allCoins.set(pair.baseToken.address, {
                    id: pair.baseToken.symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
                    name: pair.baseToken.name,
                    symbol: pair.baseToken.symbol.toUpperCase(),
                    address: pair.baseToken.address,
                    marketCap: pair.marketCap || pair.fdv || 0,
                    logo: pair.info.imageUrl,
                    color: generateColor(pair.baseToken.symbol),
                    platform: 'Pump.fun',
                    priceUsd: parseFloat(pair.priceUsd) || 0,
                    liquidity: pair.liquidity?.usd || 0
                });
                validCount++;
            }
        }
        process.stdout.write(`found ${validCount}. Total: ${allCoins.size}\n`);
        await delay(200); // Be nice to API
    }

    // 4. Processing
    console.log('\nProcessing final list...');
    let coins = Array.from(allCoins.values());

    // Strict Filter Check (Double tap)
    coins = coins.filter(c => c.address.endsWith('pump') && c.marketCap >= MIN_MARKET_CAP && c.logo);

    // Dedupe Symbols (Keep highest MC)
    coins.sort((a, b) => b.marketCap - a.marketCap);
    const seenSymbols = new Set();
    const uniqueCoins = [];
    for (const coin of coins) {
        const s = coin.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (s.length < 2) continue;
        if (seenSymbols.has(s)) continue; // Keep only best rank of that symbol
        seenSymbols.add(s);
        uniqueCoins.push(coin);
    }

    // Assign Rank
    const ranked = uniqueCoins.map((c, i) => ({ ...c, rank: i + 1 }));

    console.log(`\nFinal Valid Count: ${ranked.length}`);

    // Save
    fs.writeFileSync(coinsPath, JSON.stringify(ranked, null, 2));
    console.log(`Saved to ${coinsPath}`);

    // Log Top 5
    console.log('\nTop 5 New Leaderboard:');
    ranked.slice(0, 5).forEach(c => console.log(`${c.rank}. ${c.symbol} ($${(c.marketCap / 1e6).toFixed(1)}M)`));
}

main();
