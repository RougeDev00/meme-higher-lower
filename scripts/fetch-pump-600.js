/**
 * Pump.fun Only Token Fetcher - v3 (Mega Search)
 * 
 * Fetches 600+ coins exclusively from Pump.fun using DexScreener
 * 
 * Improvements:
 * - Adds specific "pump [letter]" searches
 * - Adds "top boosted" tokens
 * - Massive list of common nouns/names
 * 
 * Run with: node scripts/fetch-pump-600.js
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

// Generate expanded search terms
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const PUMP_COMBOS = ALPHABET.map(l => `pump ${l}`); // "pump a", "pump b"...

const COMMON_NOUNS = [
    'time', 'year', 'people', 'way', 'day', 'man', 'thing', 'woman', 'life', 'child',
    'world', 'school', 'state', 'family', 'student', 'group', 'country', 'problem',
    'hand', 'part', 'place', 'case', 'week', 'company', 'system', 'program', 'question',
    'work', 'gov', 'run', 'number', 'night', 'point', 'home', 'water', 'room',
    'mother', 'area', 'money', 'story', 'fact', 'month', 'lot', 'right', 'study',
    'book', 'eye', 'job', 'word', 'business', 'issue', 'side', 'kind', 'head',
    'house', 'service', 'friend', 'father', 'power', 'hour', 'game', 'line', 'end',
    'member', 'law', 'car', 'city', 'community', 'name', 'president', 'team', 'minute',
    'idea', 'kid', 'body', 'info', 'back', 'parent', 'face', 'others', 'level',
    'office', 'door', 'health', 'person', 'art', 'war', 'history', 'party', 'result',
    'change', 'morning', 'reason', 'research', 'girl', 'guy', 'food', 'moment', 'air'
];

const CRYPTO_TERMS = [
    'inu', 'swap', 'defi', 'nft', 'meta', 'dao', 'chain', 'block', 'bit', 'coin',
    'token', 'safe', 'moon', 'rocket', 'hodl', 'rekt', 'gem', 'alpha', 'beta',
    'gamma', 'delta', 'omega', 'sigma', 'chad', 'gigachad', 'pepe', 'doge', 'shib',
    'floki', 'bonk', 'wojak', 'fud', 'fomo', 'ath', 'atl', 'ngmi', 'wagmi', 'dyor',
    'based', 'red', 'blue', 'pill', 'matrix', 'neo', 'agent', 'smith', 'oracle'
];

const SEARCH_TERMS = [
    ...PUMP_COMBOS,
    ...CRYPTO_TERMS,
    ...COMMON_NOUNS,
    // Original high yield terms
    'cat', 'dog', 'pump', 'fun', 'solana', 'meme', 'chill'
];

// Utility tokens to exclude
const EXCLUDED_SYMBOLS = new Set([
    'SOL', 'USDC', 'USDT', 'WBTC', 'ETH', 'WETH', 'JUP', 'RAY', 'ORCA',
    'JTO', 'PYTH', 'BSOL', 'MSOL', 'LDO', 'KMNO', 'DRIFT', 'ZETA',
    'HNT', 'MOBILE', 'RON', 'SAMO', 'LFGM', 'SLND'
]);

async function fetchDexScreenerTokens(searchTerm) {
    try {
        // Append ' solana' to help DexScreener prioritize Solana pairs
        const query = `${searchTerm} solana`;
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        return data.pairs || [];
    } catch (error) {
        console.error(`Error fetching ${searchTerm}:`, error.message);
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
        console.error('Error fetching boosted tokens:', error.message);
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

function isPumpFun(pair) {
    if (pair.chainId !== 'solana') return false;
    const tokenAddress = pair.baseToken?.address || '';
    if (tokenAddress.endsWith('pump')) return true;
    return false;
}

async function main() {
    console.log(`🚀 Fetching 600 Pump.fun Coins (Mega Mode)...`);
    console.log(`  Terms count: ${SEARCH_TERMS.length}`);

    const allCoins = new Map();
    // Lower MC even more to fill the list, we sort by MC later anyway
    const MIN_MARKET_CAP = 2000;

    // 1. Fetch Boosted (often high quality pump coins)
    const boosted = await fetchTopBoostedTokens();
    let boostedCount = 0;

    for (const token of boosted) {
        if (token.tokenAddress?.endsWith('pump')) {
            // We need full pair data
            const pair = await fetchTokenByAddress(token.tokenAddress);
            if (pair && pair.baseToken) {
                const mc = pair.marketCap || pair.fdv || 0;
                if (mc >= MIN_MARKET_CAP) {
                    allCoins.set(token.tokenAddress, {
                        id: pair.baseToken.symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
                        name: pair.baseToken.name,
                        symbol: pair.baseToken.symbol.toUpperCase(),
                        address: token.tokenAddress,
                        marketCap: mc,
                        logo: token.icon || pair.info?.imageUrl,
                        color: generateColor(pair.baseToken.symbol),
                        platform: 'Pump.fun',
                        priceUsd: parseFloat(pair.priceUsd) || 0,
                        liquidity: pair.liquidity?.usd || 0
                    });
                    boostedCount++;
                }
            }
            await delay(100);
        }
    }
    console.log(`  Found ${boostedCount} boosted Pump.fun coins. Total: ${allCoins.size}`);

    // 2. Systematic Search
    for (const term of SEARCH_TERMS) {
        if (allCoins.size >= 800) break; // Buffer

        process.stdout.write(`  Searching "${term}"... `);
        const pairs = await fetchDexScreenerTokens(term);
        let validCount = 0;

        for (const pair of pairs) {
            if (!pair.baseToken?.symbol || !pair.info?.imageUrl) continue;

            if (isPumpFun(pair)) {

                const mc = pair.marketCap || pair.fdv || 0;
                if (mc < MIN_MARKET_CAP) continue;

                // Deduplicate by address
                if (allCoins.has(pair.baseToken.address)) continue;

                const symbol = pair.baseToken.symbol.toUpperCase();
                if (EXCLUDED_SYMBOLS.has(symbol)) continue;

                allCoins.set(pair.baseToken.address, {
                    id: symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
                    name: pair.baseToken.name,
                    symbol: symbol,
                    address: pair.baseToken.address,
                    marketCap: mc,
                    logo: pair.info.imageUrl,
                    color: generateColor(symbol),
                    platform: 'Pump.fun',
                    priceUsd: parseFloat(pair.priceUsd) || 0,
                    liquidity: pair.liquidity?.usd || 0
                });
                validCount++;
            }
        }
        process.stdout.write(`Found ${validCount} new. Total unique: ${allCoins.size}\n`);

        await delay(100);
    }

    // Sort and Cut
    console.log('\nProcessing list...');
    let coins = Array.from(allCoins.values());

    // Sort by Market Cap DESC
    coins.sort((a, b) => b.marketCap - a.marketCap);

    // Dedupe by Symbol (keep highest MC)
    const seenSymbols = new Set();
    const uniqueSymbolCoins = [];

    for (const coin of coins) {
        let s = coin.symbol.toUpperCase();
        s = s.replace(/[^A-Z0-9]/g, ''); // strict clean

        if (seenSymbols.has(s) || s.length < 2) continue;
        seenSymbols.add(s);
        uniqueSymbolCoins.push(coin);
    }

    // Final Selection
    const TARGET_COUNT = 600;
    const finalSelection = uniqueSymbolCoins.slice(0, TARGET_COUNT);

    // Add Rank
    const ranked = finalSelection.map((c, i) => ({ ...c, rank: i + 1 }));

    // Check results
    console.log(`\nFinal Count: ${ranked.length}`);

    // Save
    const outputPath = path.join(__dirname, '..', 'data', 'coins.json');
    fs.writeFileSync(outputPath, JSON.stringify(ranked, null, 2));
    console.log(`\n💾 Saved to ${outputPath}`);

    if (ranked.length < TARGET_COUNT) {
        console.warn(`⚠️ Warning: Only found ${ranked.length} coins.`);
        process.exit(1); // Signal failure? No, just warn.
    }
}

main().catch(console.error);
