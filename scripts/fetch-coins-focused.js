/**
 * Focused Meme Coin Fetcher - BONK.fun & Bags.fm Priority
 * 
 * Prioritizes coins from:
 * 1. Pump.fun
 * 2. BONK.fun (LetsBonk)
 * 3. Bags.fm
 * 
 * Limits Raydium coins
 * 
 * Run with: node scripts/fetch-coins-focused.js
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

function normalizePlatform(dexId, pairAddress) {
    const lowerDex = (dexId || '').toLowerCase();
    const addr = (pairAddress || '').toLowerCase();

    // Check address suffixes for launchpad identification
    if (addr.endsWith('pump')) return 'Pump.fun';
    if (addr.endsWith('bonk')) return 'BONK.fun';
    if (addr.endsWith('bags')) return 'Bags.fm';
    if (addr.endsWith('moon')) return 'Moonshot';

    // Check dex ID
    if (lowerDex.includes('pump') || lowerDex === 'pumpswap') return 'Pump.fun';
    if (lowerDex.includes('bonk') || lowerDex.includes('letsbonk')) return 'BONK.fun';
    if (lowerDex.includes('bags')) return 'Bags.fm';
    if (lowerDex.includes('moon')) return 'Moonshot';

    const map = {
        'raydium': 'Raydium',
        'orca': 'Orca',
        'meteora': 'Meteora',
        'jupiter': 'Jupiter',
        'fluxbeam': 'FluxBeam'
    };

    return map[lowerDex] || dexId || 'Unknown';
}

// Priority score (higher = better, will be included first)
function getPlatformPriority(platform) {
    const priorities = {
        'Pump.fun': 100,
        'BONK.fun': 95,
        'Bags.fm': 90,
        'Moonshot': 80,
        'Meteora': 30,
        'Orca': 20,
        'Raydium': 10 // Lower priority for Raydium
    };
    return priorities[platform] || 5;
}

// Exclude utility tokens
const EXCLUDED_SYMBOLS = new Set([
    'JUP', 'RAY', 'ORCA', 'SOL', 'USDC', 'USDT', 'WBTC', 'ETH', 'WETH',
    'SRM', 'FTT', 'STEP', 'COPE', 'MEDIA', 'MET', 'JTO', 'PYTH', 'W', 'KMNO',
    'MNGO', 'ATLAS', 'POLIS', 'GENE', 'ABR', 'SBR', 'MNDE', 'LDO', 'MSOL',
    'JSOL', 'BSOL', 'INF', 'PORT', 'SNY', 'SLND', 'COIN', 'JUPSOL', 'IO',
    'BC', 'CTM', 'VICPAY', 'AUN', 'ARC'
]);

async function fetchDexScreenerTokens(searchTerm) {
    try {
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(searchTerm)}`
        );
        const data = await response.json();
        return data.pairs || [];
    } catch (error) {
        return [];
    }
}

async function fetchTopBoostedTokens() {
    try {
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
        const solanaPairs = (data.pairs || []).filter(p => p.chainId === 'solana');
        if (solanaPairs.length === 0) return null;

        // Sort by platform priority
        solanaPairs.sort((a, b) => {
            const aPriority = getPlatformPriority(normalizePlatform(a.dexId, a.pairAddress));
            const bPriority = getPlatformPriority(normalizePlatform(b.dexId, b.pairAddress));
            return bPriority - aPriority;
        });

        return solanaPairs[0];
    } catch (error) {
        return null;
    }
}

// Search terms specifically for launchpads
const LAUNCHPAD_SEARCH_TERMS = [
    // BONK.fun specific
    'bonk token', 'bonk fun', 'letsbonk', 'bonk meme', 'bonk sol',
    'bonk solana', 'bonk coin', 'bonk dog', 'bonk cat', 'bonk pepe',

    // Bags.fm specific  
    'bags token', 'bags fm', 'bags solana', 'bags meme', 'bags coin',

    // Pump.fun specific
    'pump fun', 'pump token', 'pump meme', 'pump solana', 'pump coin',
    'pumpfun', 'pump.fun',

    // Moonshot
    'moonshot token', 'moon solana', 'moonshot meme'
];

// General meme search terms
const MEME_SEARCH_TERMS = [
    // Animals
    'cat', 'dog', 'frog', 'pepe', 'doge', 'shib', 'inu', 'bird', 'monkey',
    'ape', 'bear', 'bull', 'whale', 'fish', 'penguin', 'duck', 'chicken',
    'pig', 'cow', 'goat', 'wolf', 'fox', 'rabbit', 'hamster', 'squirrel',

    // Meme culture
    'wojak', 'chad', 'meme', 'based', 'degen', 'wagmi', 'ngmi', 'hodl',
    'rekt', 'wen', 'ser', 'anon', 'fren', 'stonk', 'moon', 'rocket',

    // People
    'trump', 'elon', 'musk', 'biden',

    // Random popular
    'baby', 'mini', 'super', 'mega', 'giga', 'king', 'queen', 'lord',
    'ai', 'bot', 'agent', 'funny', 'sad', 'happy', 'cry', 'laugh',
    'gold', 'diamond', 'gem', 'rich', 'poor', 'win', 'lose'
];

async function main() {
    console.log('🚀 Focused Meme Coin Fetcher - BONK.fun & Bags.fm Priority\n');

    const allCoins = new Map();
    const platformCounts = { 'Pump.fun': 0, 'BONK.fun': 0, 'Bags.fm': 0, 'Moonshot': 0, 'Raydium': 0, 'Other': 0 };
    const MAX_RAYDIUM = 100; // Limit Raydium coins

    // First: Search for launchpad-specific terms
    console.log('🎯 Phase 1: Searching launchpad-specific terms...');
    for (const term of LAUNCHPAD_SEARCH_TERMS) {
        const pairs = await fetchDexScreenerTokens(term);

        for (const pair of pairs) {
            if (pair.chainId !== 'solana') continue;
            if (!pair.baseToken?.symbol || !pair.info?.imageUrl) continue;
            if (pair.marketCap < 30000 || pair.liquidity?.usd < 3000) continue;

            const symbol = pair.baseToken.symbol.toUpperCase();
            if (EXCLUDED_SYMBOLS.has(symbol)) continue;
            if (allCoins.has(pair.baseToken.address)) continue;

            const platform = normalizePlatform(pair.dexId, pair.pairAddress);

            // Skip if Raydium limit reached
            if (platform === 'Raydium' && platformCounts['Raydium'] >= MAX_RAYDIUM) continue;

            allCoins.set(pair.baseToken.address, {
                id: symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
                name: pair.baseToken.name,
                symbol: symbol,
                address: pair.baseToken.address,
                marketCap: pair.marketCap || pair.fdv || 0,
                logo: pair.info?.imageUrl,
                color: generateColor(symbol),
                platform: platform,
                priceUsd: parseFloat(pair.priceUsd) || 0,
                liquidity: pair.liquidity?.usd || 0
            });

            if (platformCounts[platform] !== undefined) {
                platformCounts[platform]++;
            } else {
                platformCounts['Other']++;
            }
        }

        console.log(`  "${term}" -> Total: ${allCoins.size}`);
        await delay(200);
    }

    console.log(`\n  After launchpad search: ${allCoins.size} coins`);
    console.log(`  Pump.fun: ${platformCounts['Pump.fun']}, BONK.fun: ${platformCounts['BONK.fun']}, Bags.fm: ${platformCounts['Bags.fm']}\n`);

    // Phase 2: General meme searches with priority
    console.log('🔍 Phase 2: General meme searches...');
    for (const term of MEME_SEARCH_TERMS) {
        if (allCoins.size >= 700) break;

        const pairs = await fetchDexScreenerTokens(term + ' solana');

        for (const pair of pairs) {
            if (pair.chainId !== 'solana') continue;
            if (!pair.baseToken?.symbol || !pair.info?.imageUrl) continue;
            if (pair.marketCap < 30000 || pair.liquidity?.usd < 3000) continue;

            const symbol = pair.baseToken.symbol.toUpperCase();
            if (EXCLUDED_SYMBOLS.has(symbol)) continue;
            if (allCoins.has(pair.baseToken.address)) continue;

            const platform = normalizePlatform(pair.dexId, pair.pairAddress);

            // Skip if Raydium limit reached
            if (platform === 'Raydium' && platformCounts['Raydium'] >= MAX_RAYDIUM) continue;

            allCoins.set(pair.baseToken.address, {
                id: symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
                name: pair.baseToken.name,
                symbol: symbol,
                address: pair.baseToken.address,
                marketCap: pair.marketCap || pair.fdv || 0,
                logo: pair.info?.imageUrl,
                color: generateColor(symbol),
                platform: platform,
                priceUsd: parseFloat(pair.priceUsd) || 0,
                liquidity: pair.liquidity?.usd || 0
            });

            if (platformCounts[platform] !== undefined) {
                platformCounts[platform]++;
            } else {
                platformCounts['Other']++;
            }
        }

        await delay(180);
    }

    console.log(`  After meme search: ${allCoins.size} coins\n`);

    // Phase 3: Boosted tokens
    console.log('🔥 Phase 3: Trending/boosted tokens...');
    const boosted = await fetchTopBoostedTokens();
    for (const token of boosted) {
        if (allCoins.has(token.tokenAddress)) continue;

        const data = await fetchTokenByAddress(token.tokenAddress);
        if (!data || !data.baseToken || !data.info?.imageUrl) continue;
        if (data.marketCap < 30000) continue;

        const symbol = data.baseToken.symbol.toUpperCase();
        if (EXCLUDED_SYMBOLS.has(symbol)) continue;

        const platform = normalizePlatform(data.dexId, data.pairAddress);
        if (platform === 'Raydium' && platformCounts['Raydium'] >= MAX_RAYDIUM) continue;

        allCoins.set(token.tokenAddress, {
            id: symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
            name: data.baseToken.name,
            symbol: symbol,
            address: token.tokenAddress,
            marketCap: data.marketCap || data.fdv || 0,
            logo: token.icon || data.info?.imageUrl,
            color: generateColor(symbol),
            platform: platform,
            priceUsd: parseFloat(data.priceUsd) || 0,
            liquidity: data.liquidity?.usd || 0
        });

        if (platformCounts[platform] !== undefined) {
            platformCounts[platform]++;
        }

        await delay(150);
    }

    // Clean and sort
    console.log('\n🧹 Cleaning and sorting...');
    let coins = Array.from(allCoins.values())
        .filter(c => c.marketCap > 0 && c.logo && c.symbol && c.logo.startsWith('http'))
        .sort((a, b) => {
            // Sort by platform priority first, then by market cap
            const aPriority = getPlatformPriority(a.platform);
            const bPriority = getPlatformPriority(b.platform);
            if (aPriority !== bPriority) return bPriority - aPriority;
            return b.marketCap - a.marketCap;
        });

    // Dedupe by symbol
    const seen = new Set();
    coins = coins.filter(c => {
        const key = c.symbol.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Resort by market cap for final list
    coins.sort((a, b) => b.marketCap - a.marketCap);

    // Add rank
    coins = coins.map((c, i) => ({ ...c, rank: i + 1 }));

    // Save
    const outputPath = path.join(__dirname, '..', 'data', 'coins.json');
    fs.writeFileSync(outputPath, JSON.stringify(coins, null, 2));

    // Final stats
    const finalPlatforms = {};
    coins.forEach(c => { finalPlatforms[c.platform] = (finalPlatforms[c.platform] || 0) + 1; });

    console.log(`\n📊 Final Results: ${coins.length} unique coins`);
    console.log('\nBy platform:');
    Object.entries(finalPlatforms).sort((a, b) => b[1] - a[1]).forEach(([p, n]) => {
        console.log(`  ${p}: ${n}`);
    });

    console.log('\nTop 25:');
    coins.slice(0, 25).forEach((c, i) => {
        const mc = c.marketCap >= 1e9 ? `$${(c.marketCap / 1e9).toFixed(2)}B` : `$${(c.marketCap / 1e6).toFixed(2)}M`;
        console.log(`  ${i + 1}. ${c.symbol} - ${c.name} (${c.platform}) - ${mc}`);
    });

    console.log(`\n💾 Saved to: ${outputPath}`);
}

main().catch(console.error);
