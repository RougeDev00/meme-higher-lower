/**
 * Expanded Solana Meme Coin Data Fetcher
 * 
 * Fetches 600+ verified meme coins from DexScreener API
 * Prioritizes: Pump.fun, BONK, Bags.fm launchpads
 * 
 * Run with: node scripts/fetch-coins-expanded.js
 */

const fs = require('fs');
const path = require('path');

// Rate limiting helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Color generator based on string hash
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

// Normalize platform name for priority
function normalizePlatform(dexId, pairAddress) {
    const lowerDex = (dexId || '').toLowerCase();

    // Check for pump.fun indicators
    if (lowerDex.includes('pump') || (pairAddress && pairAddress.endsWith('pump'))) {
        return 'Pump.fun';
    }
    if (lowerDex.includes('bonk') || (pairAddress && pairAddress.endsWith('bonk'))) {
        return 'BONK';
    }
    if (lowerDex.includes('bags')) {
        return 'Bags.fm';
    }
    if (lowerDex.includes('moon') || (pairAddress && pairAddress.endsWith('moon'))) {
        return 'Moonshot';
    }

    // Standard DEXs
    const platformMap = {
        'raydium': 'Raydium',
        'orca': 'Orca',
        'meteora': 'Meteora',
        'jupiter': 'Jupiter',
        'pumpswap': 'Pump.fun',
        'fluxbeam': 'FluxBeam'
    };

    return platformMap[lowerDex] || dexId || 'Unknown';
}

// Priority score for launchpads (higher is better)
function getPlatformPriority(platform) {
    const priorities = {
        'Pump.fun': 100,
        'BONK': 90,
        'Bags.fm': 80,
        'Moonshot': 70,
        'Raydium': 50,
        'Orca': 40,
        'Meteora': 40,
        'Jupiter': 30
    };
    return priorities[platform] || 10;
}

// Fetch from DexScreener - search for tokens
async function fetchDexScreenerTokens(searchTerm) {
    try {
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(searchTerm)}`
        );
        const data = await response.json();
        return data.pairs || [];
    } catch (error) {
        console.error(`Error fetching ${searchTerm}:`, error.message);
        return [];
    }
}

// Fetch top boosted Solana tokens
async function fetchTopBoostedTokens() {
    try {
        const response = await fetch('https://api.dexscreener.com/token-boosts/top/v1');
        const data = await response.json();
        return (data || []).filter(token => token.chainId === 'solana');
    } catch (error) {
        console.error('Error fetching boosted tokens:', error.message);
        return [];
    }
}

// Fetch token by address
async function fetchTokenByAddress(address) {
    try {
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${address}`
        );
        const data = await response.json();
        // Find the best pair (highest liquidity for Solana)
        const solanaPairs = (data.pairs || []).filter(p => p.chainId === 'solana');
        if (solanaPairs.length === 0) return null;

        // Sort by priority platform first, then by liquidity
        solanaPairs.sort((a, b) => {
            const aPriority = getPlatformPriority(normalizePlatform(a.dexId, a.pairAddress));
            const bPriority = getPlatformPriority(normalizePlatform(b.dexId, b.pairAddress));
            if (aPriority !== bPriority) return bPriority - aPriority;
            return (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0);
        });

        return solanaPairs[0];
    } catch (error) {
        return null;
    }
}

// List of VERIFIED top Solana meme coins with their addresses
const VERIFIED_COINS = [
    // Top Tier (verified major coins)
    { address: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN', expectedName: 'TRUMP' },
    { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', expectedName: 'BONK' },
    { address: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump', expectedName: 'FARTCOIN' },
    { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', expectedName: 'WIF' },
    { address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', expectedName: 'POPCAT' },
    { address: 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82', expectedName: 'BOME' },
    { address: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5', expectedName: 'MEW' },
    { address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', expectedName: 'SAMO' },
    { address: '7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3', expectedName: 'SLERF' },
    { address: 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk', expectedName: 'WEN' },
    { address: 'HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4', expectedName: 'MYRO' },
    { address: '5z3EqYQo9HiCEs3R84RCDMu2n4anFxLLhwzkjf8bLxNe', expectedName: 'PONKE' },
    { address: '3psH1Mj1f7yUfaD5gh6Zj7epE8hhrMkMETgv5TshQA4o', expectedName: 'BODEN' },
    { address: '5mbK36SZ7J19An8jFochhQS4of8g6BwUjbeCSxBSoWdp', expectedName: 'MICHI' },
    { address: '7atgF8KQo4wJrD5ATGX7t1V2zVvykPJbFfNeVf1icFv1', expectedName: 'CWIF' },
    { address: '3S8qX1MsMqRbiwKg2cQyx7nis1oHMgaCuc9c4VfvVdPN', expectedName: 'MOTHER' },
    { address: '63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9', expectedName: 'GIGA' },
    { address: '2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump', expectedName: 'PNUT' },
    { address: 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC', expectedName: 'AI16Z' },
    { address: 'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump', expectedName: 'GOAT' },
    { address: 'J3NKxxXZcnNiMjKw9hYb2K4LUxgwB6t1FtPtQVsv3KFr', expectedName: 'SPX' },
    { address: '4Cnk9EPnW5ixfLZatCPJjDB1PUtcRpVVgTQukm9epump', expectedName: 'DADDY' },
    { address: '6ogzHhzdrQr9Pgv6hZ2MNze7UrzBMAFyBBWUYp1Fhitx', expectedName: 'RETARDIO' },
    { address: '69kdRLyP5DTRkpHraaSZAQbWmAwzF9guKjZfzMXzcbAs', expectedName: 'USA' },
];

// Expanded search terms to find more coins
const SEARCH_TERMS = [
    // Animals
    'cat solana', 'dog solana', 'frog solana', 'bird solana', 'monkey solana',
    'ape solana', 'bear solana', 'bull solana', 'lion solana', 'tiger solana',
    'fish solana', 'shark solana', 'whale solana', 'wolf solana', 'fox solana',
    'rabbit solana', 'hamster solana', 'mouse solana', 'rat solana', 'bat solana',
    'penguin solana', 'duck solana', 'chicken solana', 'cow solana', 'pig solana',

    // Meme/Internet culture
    'pepe solana', 'wojak solana', 'chad solana', 'doge solana', 'shib solana',
    'meme solana', 'based solana', 'pump fun', 'moon solana', 'rocket solana',
    'diamond solana', 'hands solana', 'ape solana', 'degen solana', 'ai solana',
    'gm solana', 'wagmi solana', 'ngmi solana', 'lfg solana', 'fud solana',

    // Politics/People
    'trump', 'elon', 'biden', 'obama', 'musk solana',

    // Food
    'pizza solana', 'burger solana', 'taco solana', 'sushi solana', 'coffee solana',

    // Objects
    'hat solana', 'coin solana', 'gem solana', 'gold solana', 'cash solana',

    // Emotions
    'happy solana', 'sad solana', 'angry solana', 'cry solana', 'laugh solana',

    // Colors
    'blue solana', 'red solana', 'green solana', 'purple solana', 'pink solana',

    // Numbers/Symbols
    '420 solana', '69 solana', '1000x solana', '100x solana',

    // Crypto specific
    'sol meme', 'bonk token', 'pump token', 'bags token', 'jupiter token',
    'raydium meme', 'orca meme', 'meteora token', 'solana meme',

    // Random popular terms
    'baby solana', 'mini solana', 'super solana', 'mega solana', 'giga solana',
    'king solana', 'queen solana', 'lord solana', 'sir solana', 'mr solana',
    'cult solana', 'gang solana', 'army solana', 'squad solana', 'crew solana'
];

async function main() {
    console.log('🚀 Solana Meme Coin Fetcher - Expanded Edition\n');
    console.log('Target: 600+ verified coins with accurate data\n');

    const allCoins = new Map(); // Use Map keyed by address to avoid duplicates

    // Step 1: Fetch verified coins
    console.log('📍 Step 1: Fetching verified top coins...');
    let verified = 0;
    for (const coin of VERIFIED_COINS) {
        const data = await fetchTokenByAddress(coin.address);
        if (data && data.baseToken) {
            const platform = normalizePlatform(data.dexId, data.pairAddress);
            const tokenData = {
                id: data.baseToken.symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
                name: data.baseToken.name,
                symbol: data.baseToken.symbol,
                address: coin.address,
                marketCap: data.marketCap || data.fdv || 0,
                logo: data.info?.imageUrl || null,
                color: generateColor(data.baseToken.symbol),
                platform: platform,
                priceUsd: parseFloat(data.priceUsd) || 0,
                liquidity: data.liquidity?.usd || 0,
                verified: true
            };
            allCoins.set(coin.address, tokenData);
            verified++;
            console.log(`  ✅ ${data.baseToken.symbol} (${platform})`);
        }
        await delay(150);
    }
    console.log(`  Verified: ${verified}/${VERIFIED_COINS.length}\n`);

    // Step 2: Search for more coins
    console.log('🔍 Step 2: Searching for additional coins...');
    let searchCount = 0;
    for (const term of SEARCH_TERMS) {
        process.stdout.write(`  Searching "${term}"... `);
        const pairs = await fetchDexScreenerTokens(term);

        // Filter for Solana, good liquidity, and valid market cap
        const validPairs = pairs.filter(p =>
            p.chainId === 'solana' &&
            p.liquidity?.usd > 5000 &&
            p.marketCap > 50000 &&
            p.baseToken?.symbol &&
            p.baseToken?.name &&
            p.info?.imageUrl // Only coins with logos
        );

        let added = 0;
        for (const pair of validPairs) {
            if (!allCoins.has(pair.baseToken.address)) {
                const platform = normalizePlatform(pair.dexId, pair.pairAddress);
                const tokenData = {
                    id: pair.baseToken.symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
                    name: pair.baseToken.name,
                    symbol: pair.baseToken.symbol,
                    address: pair.baseToken.address,
                    marketCap: pair.marketCap || pair.fdv || 0,
                    logo: pair.info?.imageUrl,
                    color: generateColor(pair.baseToken.symbol),
                    platform: platform,
                    priceUsd: parseFloat(pair.priceUsd) || 0,
                    liquidity: pair.liquidity?.usd || 0,
                    verified: false
                };
                allCoins.set(pair.baseToken.address, tokenData);
                added++;
                searchCount++;
            }
        }
        console.log(`+${added} (total: ${allCoins.size})`);
        await delay(250);

        // Check if we have enough
        if (allCoins.size >= 800) {
            console.log('  Reached target, stopping search...');
            break;
        }
    }
    console.log(`  Found via search: ${searchCount}\n`);

    // Step 3: Fetch boosted tokens
    console.log('🔥 Step 3: Fetching trending/boosted tokens...');
    const boostedTokens = await fetchTopBoostedTokens();
    let boostedCount = 0;
    for (const token of boostedTokens.slice(0, 100)) {
        if (!allCoins.has(token.tokenAddress)) {
            const data = await fetchTokenByAddress(token.tokenAddress);
            if (data && data.baseToken && data.info?.imageUrl && data.marketCap > 50000) {
                const platform = normalizePlatform(data.dexId, data.pairAddress);
                const tokenData = {
                    id: data.baseToken.symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
                    name: data.baseToken.name,
                    symbol: data.baseToken.symbol,
                    address: token.tokenAddress,
                    marketCap: data.marketCap || data.fdv || 0,
                    logo: token.icon || data.info?.imageUrl,
                    color: generateColor(data.baseToken.symbol),
                    platform: platform,
                    priceUsd: parseFloat(data.priceUsd) || 0,
                    liquidity: data.liquidity?.usd || 0,
                    verified: false
                };
                allCoins.set(token.tokenAddress, tokenData);
                boostedCount++;
            }
            await delay(150);
        }
    }
    console.log(`  Added from boosted: ${boostedCount}\n`);

    // Step 4: Clean and validate data
    console.log('🧹 Step 4: Validating and cleaning data...');
    let coinsArray = Array.from(allCoins.values())
        .filter(c =>
            c.marketCap > 0 &&
            c.symbol &&
            c.name &&
            c.logo && c.logo.startsWith('http') && // Must have valid logo
            c.address &&
            c.name.length < 50 && // Filter out tokens with very long names
            c.symbol.length <= 10 // Filter out tokens with very long symbols
        )
        .sort((a, b) => b.marketCap - a.marketCap);

    // Remove duplicates by symbol (keep highest market cap)
    const seenSymbols = new Set();
    coinsArray = coinsArray.filter(coin => {
        const normalizedSymbol = coin.symbol.toLowerCase();
        if (seenSymbols.has(normalizedSymbol)) {
            return false;
        }
        seenSymbols.add(normalizedSymbol);
        return true;
    });

    // Add rank
    coinsArray = coinsArray.map((coin, index) => ({
        ...coin,
        rank: index + 1
    }));

    console.log(`  After validation: ${coinsArray.length} unique coins\n`);

    // Save to file
    const outputPath = path.join(__dirname, '..', 'data', 'coins.json');
    fs.writeFileSync(outputPath, JSON.stringify(coinsArray, null, 2));
    console.log(`💾 Saved to: ${outputPath}`);

    // Print summary
    console.log('\n📊 Summary:');
    console.log(`  Total unique coins: ${coinsArray.length}`);

    // Count by platform
    const platformCounts = {};
    coinsArray.forEach(coin => {
        platformCounts[coin.platform] = (platformCounts[coin.platform] || 0) + 1;
    });
    console.log('\n  By platform:');
    Object.entries(platformCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([platform, count]) => {
            console.log(`    ${platform}: ${count}`);
        });

    // Top 20
    console.log('\n  Top 20 by market cap:');
    coinsArray.slice(0, 20).forEach((coin, i) => {
        const mcap = coin.marketCap >= 1e9
            ? `$${(coin.marketCap / 1e9).toFixed(2)}B`
            : `$${(coin.marketCap / 1e6).toFixed(2)}M`;
        console.log(`    ${i + 1}. ${coin.symbol} - ${coin.name} (${coin.platform}) - ${mcap}`);
    });

    if (coinsArray.length < 600) {
        console.log(`\n⚠️  Note: Only ${coinsArray.length} coins found. Run again or add more search terms for 600+.`);
    }
}

main().catch(console.error);
