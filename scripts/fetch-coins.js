/**
 * Solana Meme Coin Data Fetcher
 * 
 * This script fetches meme coin data from multiple free APIs:
 * - DexScreener: Real-time market cap, logo, token info
 * - CoinGecko: Historical ATH data for major coins
 * 
 * Run with: node scripts/fetch-coins.js
 */

const fs = require('fs');
const path = require('path');

// Rate limiting helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Format market cap for display
function formatMarketCap(num) {
    if (!num) return 'N/A';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toString();
}

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

// Fetch from DexScreener - search for Solana meme coins
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

// Fetch top Solana tokens from DexScreener
async function fetchTopSolanaTokens() {
    try {
        // Get trending/boosted tokens
        const response = await fetch('https://api.dexscreener.com/token-boosts/top/v1');
        const data = await response.json();

        // Filter for Solana
        return (data || []).filter(token => token.chainId === 'solana');
    } catch (error) {
        console.error('Error fetching top tokens:', error.message);
        return [];
    }
}

// Fetch token details by address
async function fetchTokenByAddress(address) {
    try {
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${address}`
        );
        const data = await response.json();
        return data.pairs?.[0] || null;
    } catch (error) {
        console.error(`Error fetching token ${address}:`, error.message);
        return null;
    }
}

// Known popular Solana meme coins with their contract addresses
const KNOWN_MEME_COINS = [
    // Major meme coins
    { name: 'dogwifhat', symbol: 'WIF', address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
    { name: 'BONK', symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
    { name: 'Popcat', symbol: 'POPCAT', address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr' },
    { name: 'BOOK OF MEME', symbol: 'BOME', address: 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82' },
    { name: 'cat in a dogs world', symbol: 'MEW', address: 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5' },
    { name: 'Samoyedcoin', symbol: 'SAMO', address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' },
    { name: 'SLERF', symbol: 'SLERF', address: '7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3' },
    { name: 'Wen', symbol: 'WEN', address: 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk' },
    { name: 'Myro', symbol: 'MYRO', address: 'HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4' },
    { name: 'PONKE', symbol: 'PONKE', address: '5z3EqYQo9HiCEs3R84RCDMu2n4anFxLLhwzkjf8bLxNe' },
    { name: 'Jeo Boden', symbol: 'BODEN', address: '3psH1Mj1f7yUfaD5gh6Zj7epE8hhrMkMETgv5TshQA4o' },
    { name: 'MICHI', symbol: 'MICHI', address: '5mbK36SZ7J19An8jFochhQS4of8g6BwUjbeCSxBSoWdp' },
    { name: 'Catwifhat', symbol: 'CWIF', address: '7atgF8KQo4wJrD5ATGX7t1V2zVvykPJbFfNeVf1icFv1' },
    { name: 'MOTHER IGGY', symbol: 'MOTHER', address: '3S8qX1MsMqRbiwKg2cQyx7nis1oHMgaCuc9c4VfvVdPN' },
    { name: 'GIGACHAD', symbol: 'GIGA', address: '63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9' },
    { name: 'Dogecoin (Solana)', symbol: 'DOGE', address: '8Cg5MUKnxYhVr9cAcmWj8rB4wzqJtfDoGwWL5q89W5T8' },
    { name: 'Peanut the Squirrel', symbol: 'PNUT', address: '2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump' },
    { name: 'FARTCOIN', symbol: 'FARTCOIN', address: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump' },
    { name: 'ai16z', symbol: 'AI16Z', address: 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC' },
    { name: 'GOAT', symbol: 'GOAT', address: 'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump' },
    { name: 'SPX6900', symbol: 'SPX', address: 'J3NKxxXZcnNiMjKw9hYb2K4LUxgwB6t1FtPtQVsv3KFr' },
    { name: 'Hawk Tuah', symbol: 'HAWK', address: 'HAWKtuah68Cpi8ZeEKJ4bQotVtHpjJNRFxPB1QiVpump' },
    { name: 'DADDY', symbol: 'DADDY', address: '4Cnk9EPnW5ixfLZatCPJjDB1PUtcRpVVgTQukm9epump' },
    { name: 'Neiro', symbol: 'NEIRO', address: 'Neiro8VKxHtmUGcsMfVV2zD3HbTCQw4WfnJbcSppump' },
    { name: 'BRETT', symbol: 'BRETT', address: 'BRETTqYdKBfmKp5gzcPJkz4TFKqPLtwYnMKnruX5pump' },
    { name: 'Retardio', symbol: 'RETARDIO', address: '6ogzHhzdrQr9Pgv6hZ2MNze7UrzBMAFyBBWUYp1Fhitx' },
    { name: 'TRUMP', symbol: 'TRUMP', address: 'HaP8r3ksG76PhQLTqR8FYBeNiQpejcFbQmiHbg787Ut' },
    { name: 'USA', symbol: 'USA', address: '69kdRLyP5DTRkpHraaSZAQbWmAwzF9guKjZfzMXzcbAs' },
    { name: 'LUIGI', symbol: 'LUIGI', address: 'AUfZEC8ULhokMpwE2HjguxngvxAQbcx8iTTpump' },
    { name: 'Ansem', symbol: 'ANSEM', address: '3h5xmv2fxPfKTP1dDqxHGSMjAKWCSoA8j1qZxGxGpump' },
];

// Search terms to find more meme coins
const SEARCH_TERMS = [
    'meme solana',
    'doge solana',
    'pepe solana',
    'cat solana',
    'dog solana',
    'pump fun',
    'wojak',
    'chad',
    'inu solana',
    'moon solana',
    'elon solana',
    'trump solana',
    'ai solana',
    'frog solana'
];

async function main() {
    console.log('🚀 Starting Solana Meme Coin Data Fetcher...\n');

    const allCoins = new Map(); // Use Map to avoid duplicates

    // Step 1: Fetch known meme coins by address
    console.log('📍 Fetching known meme coins by address...');
    for (const coin of KNOWN_MEME_COINS) {
        const data = await fetchTokenByAddress(coin.address);
        if (data) {
            const tokenData = {
                id: coin.symbol.toLowerCase(),
                name: coin.name,
                symbol: coin.symbol,
                address: coin.address,
                marketCap: data.marketCap || data.fdv || 0,
                logo: data.info?.imageUrl || null,
                color: generateColor(coin.symbol),
                platform: 'various',
                priceUsd: parseFloat(data.priceUsd) || 0
            };
            allCoins.set(coin.address, tokenData);
            console.log(`  ✅ ${coin.name}: $${formatMarketCap(tokenData.marketCap)}`);
        }
        await delay(200); // Rate limit
    }

    // Step 2: Search for more meme coins
    console.log('\n🔍 Searching for more meme coins...');
    for (const term of SEARCH_TERMS) {
        console.log(`  Searching: "${term}"...`);
        const pairs = await fetchDexScreenerTokens(term);

        // Filter for Solana and good liquidity
        const solanaPairs = pairs.filter(p =>
            p.chainId === 'solana' &&
            p.liquidity?.usd > 10000 &&
            p.marketCap > 100000
        );

        for (const pair of solanaPairs.slice(0, 20)) { // Limit per search
            if (!allCoins.has(pair.baseToken.address)) {
                const tokenData = {
                    id: pair.baseToken.symbol.toLowerCase(),
                    name: pair.baseToken.name,
                    symbol: pair.baseToken.symbol,
                    address: pair.baseToken.address,
                    marketCap: pair.marketCap || pair.fdv || 0,
                    logo: pair.info?.imageUrl || null,
                    color: generateColor(pair.baseToken.symbol),
                    platform: pair.dexId || 'unknown',
                    priceUsd: parseFloat(pair.priceUsd) || 0
                };
                allCoins.set(pair.baseToken.address, tokenData);
            }
        }

        await delay(300); // Rate limit
    }

    // Step 3: Fetch top boosted tokens
    console.log('\n🔥 Fetching top boosted tokens...');
    const topTokens = await fetchTopSolanaTokens();
    for (const token of topTokens.slice(0, 50)) {
        const data = await fetchTokenByAddress(token.tokenAddress);
        if (data && !allCoins.has(token.tokenAddress)) {
            const tokenData = {
                id: data.baseToken?.symbol?.toLowerCase() || 'unknown',
                name: data.baseToken?.name || 'Unknown',
                symbol: data.baseToken?.symbol || 'UNK',
                address: token.tokenAddress,
                marketCap: data.marketCap || data.fdv || 0,
                logo: token.icon || data.info?.imageUrl || null,
                color: generateColor(data.baseToken?.symbol || 'UNK'),
                platform: data.dexId || 'unknown',
                priceUsd: parseFloat(data.priceUsd) || 0
            };
            allCoins.set(token.tokenAddress, tokenData);
        }
        await delay(200);
    }

    // Convert to array and sort by market cap
    let coinsArray = Array.from(allCoins.values())
        .filter(c => c.marketCap > 0)
        .sort((a, b) => b.marketCap - a.marketCap);

    // Add rank
    coinsArray = coinsArray.map((coin, index) => ({
        ...coin,
        rank: index + 1
    }));

    console.log(`\n✅ Total coins fetched: ${coinsArray.length}`);

    // Save to file
    const outputPath = path.join(__dirname, '..', 'data', 'coins.json');
    fs.writeFileSync(outputPath, JSON.stringify(coinsArray, null, 2));
    console.log(`💾 Saved to: ${outputPath}`);

    // Print summary
    console.log('\n📊 Top 20 coins by market cap:');
    coinsArray.slice(0, 20).forEach((coin, i) => {
        console.log(`  ${i + 1}. ${coin.name} (${coin.symbol}): $${formatMarketCap(coin.marketCap)}`);
    });

    // Print stats
    const withLogos = coinsArray.filter(c => c.logo).length;
    console.log(`\n📈 Stats:`);
    console.log(`  - Total coins: ${coinsArray.length}`);
    console.log(`  - With logos: ${withLogos}`);
    console.log(`  - Without logos: ${coinsArray.length - withLogos}`);
}

main().catch(console.error);
