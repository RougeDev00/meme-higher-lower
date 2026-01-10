/**
 * MEGA Solana Meme Coin Fetcher
 * 
 * Fetches 600+ meme coins with aggressive search
 * 
 * Run with: node scripts/fetch-coins-mega.js
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

    if (lowerDex.includes('pump') || addr.endsWith('pump')) return 'Pump.fun';
    if (lowerDex.includes('bonk') || addr.endsWith('bonk')) return 'BONK';
    if (lowerDex.includes('bags')) return 'Bags.fm';
    if (lowerDex.includes('moon') || addr.endsWith('moon')) return 'Moonshot';

    const map = {
        'raydium': 'Raydium',
        'orca': 'Orca',
        'meteora': 'Meteora',
        'jupiter': 'Jupiter',
        'pumpswap': 'Pump.fun',
        'fluxbeam': 'FluxBeam'
    };

    return map[lowerDex] || dexId || 'Unknown';
}

// Tokens to EXCLUDE (utility tokens, not meme coins)
const EXCLUDED_SYMBOLS = new Set([
    'JUP', 'RAY', 'ORCA', 'BONK', 'SOL', 'USDC', 'USDT', 'WBTC', 'ETH', 'WETH',
    'SRM', 'FTT', 'STEP', 'COPE', 'MEDIA', 'MET', 'JTO', 'PYTH', 'W', 'KMNO',
    'MNGO', 'ATLAS', 'POLIS', 'GENE', 'ABR', 'SBR', 'MNDE', 'LDO', 'MSOL',
    'JSOL', 'BSOL', 'INF', 'PORT', 'SNY', 'SLND', 'COIN' // Exclude these utility/DeFi tokens
]);

// Tokens to INCLUDE (verified meme coins even if they look like utility tokens)
const VERIFIED_MEME = new Set([
    'BONK', 'WIF', 'POPCAT', 'MEW', 'BOME', 'SLERF', 'MYRO', 'PONKE', 'GIGA',
    'PNUT', 'GOAT', 'SPX', 'USA', 'TRUMP', 'FARTCOIN', 'SAMO', 'WEN', 'MICHI',
    'CWIF', 'MOTHER', 'DADDY', 'RETARDIO', 'BODEN', 'AI16Z'
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

async function fetchTokenByAddress(address) {
    try {
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${address}`
        );
        const data = await response.json();
        const solanaPairs = (data.pairs || []).filter(p => p.chainId === 'solana');
        if (solanaPairs.length === 0) return null;
        solanaPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
        return solanaPairs[0];
    } catch (error) {
        return null;
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

// Generate all letter combinations for searching
function generateSearchTerms() {
    const terms = new Set();

    // Animals - extensive list
    const animals = [
        'cat', 'dog', 'frog', 'bird', 'monkey', 'ape', 'bear', 'bull', 'lion', 'tiger',
        'fish', 'shark', 'whale', 'wolf', 'fox', 'rabbit', 'hamster', 'mouse', 'rat', 'bat',
        'penguin', 'duck', 'chicken', 'cow', 'pig', 'goat', 'sheep', 'horse', 'donkey', 'zebra',
        'elephant', 'giraffe', 'hippo', 'rhino', 'croc', 'snake', 'lizard', 'turtle', 'spider', 'ant',
        'bee', 'butterfly', 'moth', 'fly', 'mosquito', 'worm', 'snail', 'slug', 'crab', 'lobster',
        'octopus', 'squid', 'jellyfish', 'dolphin', 'seal', 'otter', 'beaver', 'squirrel', 'chipmunk',
        'panda', 'koala', 'kangaroo', 'platypus', 'sloth', 'armadillo', 'hedgehog', 'porcupine',
        'raccoon', 'skunk', 'badger', 'weasel', 'ferret', 'mink', 'mongoose', 'hyena', 'jackal',
        'coyote', 'dingo', 'owl', 'eagle', 'hawk', 'falcon', 'vulture', 'crow', 'raven', 'parrot',
        'flamingo', 'swan', 'goose', 'peacock', 'turkey', 'rooster', 'chick', 'kitten', 'puppy', 'bunny'
    ];

    // Meme/Internet culture
    const memes = [
        'pepe', 'wojak', 'chad', 'doge', 'shib', 'inu', 'floki', 'elon', 'meme', 'based',
        'pump', 'moon', 'rocket', 'diamond', 'hands', 'ape', 'degen', 'ai', 'gm', 'wagmi',
        'ngmi', 'lfg', 'fud', 'hodl', 'rekt', 'wen', 'ser', 'anon', 'fren', 'smol',
        'chungus', 'bonk', 'bork', 'honk', 'stonk', 'monke', 'harambe', 'grumpy', 'nyan',
        'troll', 'rage', 'derp', 'dank', 'kek', 'lol', 'rofl', 'lmao', 'bruh', 'sus',
        'pogger', 'copium', 'hopium', 'doomer', 'bloomer', 'zoomer', 'boomer', 'coomer',
        'simp', 'chad', 'virgin', 'sigma', 'alpha', 'beta', 'omega', 'gigachad', 'soyjak'
    ];

    // People/Characters
    const people = [
        'trump', 'biden', 'obama', 'elon', 'musk', 'bezos', 'gates', 'zuck', 'satoshi',
        'vitalik', 'cz', 'sbf', 'do kwon', 'putin', 'kim', 'xi', 'modi', 'boris',
        'mario', 'luigi', 'sonic', 'pikachu', 'spongebob', 'homer', 'bart', 'rick', 'morty',
        'shrek', 'donkey', 'goku', 'naruto', 'luffy', 'batman', 'joker', 'thanos', 'hulk',
        'iron man', 'spiderman', 'deadpool', 'wolverine', 'thor', 'loki', 'yoda', 'vader',
        'baby', 'kid', 'boy', 'girl', 'man', 'woman', 'king', 'queen', 'prince', 'princess'
    ];

    // Food
    const food = [
        'pizza', 'burger', 'taco', 'sushi', 'coffee', 'beer', 'wine', 'whiskey', 'vodka',
        'cookie', 'cake', 'donut', 'ice cream', 'candy', 'chocolate', 'cheese', 'bacon',
        'egg', 'bread', 'butter', 'milk', 'apple', 'banana', 'orange', 'grape', 'melon',
        'peach', 'cherry', 'strawberry', 'blueberry', 'avocado', 'tomato', 'potato', 'corn'
    ];

    // Objects
    const objects = [
        'hat', 'coin', 'gem', 'gold', 'cash', 'money', 'dollar', 'bag', 'box', 'ball',
        'car', 'truck', 'plane', 'boat', 'rocket', 'ufo', 'alien', 'robot', 'laser',
        'sword', 'gun', 'bomb', 'fire', 'water', 'earth', 'wind', 'ice', 'thunder',
        'star', 'moon', 'sun', 'planet', 'galaxy', 'universe', 'space', 'time', 'clock',
        'phone', 'computer', 'game', 'music', 'art', 'book', 'pen', 'paper', 'flag'
    ];

    // Emotions/States
    const emotions = [
        'happy', 'sad', 'angry', 'cry', 'laugh', 'love', 'hate', 'fear', 'hope', 'dream',
        'sleep', 'wake', 'run', 'walk', 'fly', 'swim', 'dance', 'sing', 'fight', 'win',
        'lose', 'rich', 'poor', 'big', 'small', 'fast', 'slow', 'hot', 'cold', 'dark',
        'light', 'good', 'bad', 'evil', 'holy', 'dead', 'alive', 'zombie', 'ghost', 'demon'
    ];

    // Colors
    const colors = [
        'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white',
        'gold', 'silver', 'bronze', 'rainbow', 'neon', 'dark', 'light', 'bright', 'glow'
    ];

    // Crypto specific
    const crypto = [
        'sol', 'solana', 'pump', 'fun', 'bonk', 'bags', 'jupiter', 'raydium', 'orca',
        'meteora', 'dex', 'swap', 'trade', 'token', 'nft', 'dao', 'defi', 'web3',
        'blockchain', 'crypto', 'coin', 'memecoin', 'shitcoin', '100x', '1000x', 'gem'
    ];

    // Numbers/Special
    const numbers = [
        '69', '420', '666', '777', '888', '999', '100', '1000', 'million', 'billion',
        'trillion', 'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'
    ];

    // Add all terms with "solana" suffix
    [...animals, ...memes, ...people, ...food, ...objects, ...emotions, ...colors, ...numbers].forEach(term => {
        terms.add(term);
        terms.add(`${term} solana`);
        terms.add(`${term} sol`);
    });

    // Add crypto terms without suffix
    crypto.forEach(term => terms.add(term));

    // Add some direct searches
    ['pump fun', 'bonk token', 'pump token', 'meme token', 'dog token', 'cat token',
        'frog token', 'ai agent', 'trump coin', 'elon coin', 'pepe coin', 'doge coin'].forEach(t => terms.add(t));

    return Array.from(terms);
}

async function main() {
    console.log('🚀 MEGA Solana Meme Coin Fetcher\n');
    console.log('Target: 600+ meme coins\n');

    const allCoins = new Map();
    const searchTerms = generateSearchTerms();
    console.log(`Generated ${searchTerms.length} search terms\n`);

    // Shuffle search terms for variety
    for (let i = searchTerms.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [searchTerms[i], searchTerms[j]] = [searchTerms[j], searchTerms[i]];
    }

    // Search phase
    console.log('🔍 Searching for coins...');
    let searchIndex = 0;

    while (allCoins.size < 700 && searchIndex < searchTerms.length) {
        const term = searchTerms[searchIndex];
        searchIndex++;

        const pairs = await fetchDexScreenerTokens(term);

        const validPairs = pairs.filter(p =>
            p.chainId === 'solana' &&
            p.liquidity?.usd > 3000 &&
            p.marketCap > 30000 &&
            p.baseToken?.symbol &&
            p.baseToken?.name &&
            p.baseToken?.name.length < 40 &&
            p.baseToken?.symbol.length <= 12 &&
            p.info?.imageUrl?.startsWith('http')
        );

        let added = 0;
        for (const pair of validPairs) {
            const symbol = pair.baseToken.symbol.toUpperCase();

            // Skip excluded utility tokens (unless they're verified meme coins)
            if (EXCLUDED_SYMBOLS.has(symbol) && !VERIFIED_MEME.has(symbol)) {
                continue;
            }

            if (!allCoins.has(pair.baseToken.address)) {
                const platform = normalizePlatform(pair.dexId, pair.pairAddress);
                allCoins.set(pair.baseToken.address, {
                    id: symbol.toLowerCase().replace(/[^a-z0-9]/g, '') || 'unknown',
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
                added++;
            }
        }

        if (searchIndex % 20 === 0 || added > 0) {
            console.log(`  [${searchIndex}/${searchTerms.length}] "${term}" +${added} (total: ${allCoins.size})`);
        }

        await delay(180);

        // Check if we hit the target
        if (allCoins.size >= 700) {
            console.log(`\n  ✅ Reached target with ${allCoins.size} coins!`);
            break;
        }
    }

    // Fetch boosted tokens
    console.log('\n🔥 Fetching trending tokens...');
    const boosted = await fetchTopBoostedTokens();
    for (const token of boosted) {
        if (!allCoins.has(token.tokenAddress)) {
            const data = await fetchTokenByAddress(token.tokenAddress);
            if (data && data.baseToken && data.info?.imageUrl && data.marketCap > 30000) {
                const symbol = data.baseToken.symbol.toUpperCase();
                if (!EXCLUDED_SYMBOLS.has(symbol) || VERIFIED_MEME.has(symbol)) {
                    allCoins.set(token.tokenAddress, {
                        id: symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
                        name: data.baseToken.name,
                        symbol: symbol,
                        address: token.tokenAddress,
                        marketCap: data.marketCap || data.fdv || 0,
                        logo: token.icon || data.info?.imageUrl,
                        color: generateColor(symbol),
                        platform: normalizePlatform(data.dexId, data.pairAddress),
                        priceUsd: parseFloat(data.priceUsd) || 0,
                        liquidity: data.liquidity?.usd || 0
                    });
                }
            }
            await delay(150);
        }
    }

    // Clean and dedupe
    console.log('\n🧹 Cleaning data...');
    let coins = Array.from(allCoins.values())
        .filter(c => c.marketCap > 0 && c.logo && c.symbol)
        .sort((a, b) => b.marketCap - a.marketCap);

    // Dedupe by symbol (keep highest market cap)
    const seen = new Set();
    coins = coins.filter(c => {
        const key = c.symbol.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Add rank
    coins = coins.map((c, i) => ({ ...c, rank: i + 1 }));

    // Save
    const outputPath = path.join(__dirname, '..', 'data', 'coins.json');
    fs.writeFileSync(outputPath, JSON.stringify(coins, null, 2));

    console.log(`\n📊 Final: ${coins.length} unique coins saved`);

    // Platform breakdown
    const platforms = {};
    coins.forEach(c => { platforms[c.platform] = (platforms[c.platform] || 0) + 1; });
    console.log('\nBy platform:');
    Object.entries(platforms).sort((a, b) => b[1] - a[1]).forEach(([p, n]) => console.log(`  ${p}: ${n}`));

    // Top 20
    console.log('\nTop 20:');
    coins.slice(0, 20).forEach((c, i) => {
        const mc = c.marketCap >= 1e9 ? `$${(c.marketCap / 1e9).toFixed(2)}B` : `$${(c.marketCap / 1e6).toFixed(2)}M`;
        console.log(`  ${i + 1}. ${c.symbol} - ${c.name} (${c.platform}) - ${mc}`);
    });
}

main().catch(console.error);
