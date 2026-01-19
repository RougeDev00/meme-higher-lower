// Shuffle array using Fisher-Yates algorithm
export function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Format market cap number
export function formatMarketCap(num) {
    if (num == null || isNaN(num)) {
        return '$?';
    }
    if (num >= 1e9) {
        return '$' + (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
        return '$' + (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
        return '$' + (num / 1e3).toFixed(2) + 'K';
    }
    return '$' + num.toLocaleString();
}

// Get launchpad display name
export function getLaunchpadName(platform) {
    const platformMap = {
        'pump.fun': 'Pump.fun',
        'pumpswap': 'Pump.fun',
        'raydium': 'Raydium',
        'meteora': 'Meteora',
        'orca': 'Orca',
        'bonk.fun': 'BONK.fun',
        'moonshot': 'Moonshot',
        'various': 'Multiple DEXs',
        'unknown': 'Unknown'
    };
    return platformMap[platform?.toLowerCase()] || platform || 'Unknown';
}

// Format time as SS:MS 
export function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(2, '0')}`;
}

import { GAME_CONFIG } from './gameConfig';

// Prepare coins for game (filter + boost)
export function prepareGameCoins(allCoins) {
    // Filter valid coins first
    const validCoins = allCoins.filter(c => c.marketCap >= 15000 && c.symbol && c.name);

    // Identify boosted coins
    const boostedCAs = new Set(GAME_CONFIG.BOOSTED_COINS || []);
    const boostFactor = GAME_CONFIG.BOOST_FACTOR || 1;

    const finalList = [...validCoins];

    if (boostedCAs.size > 0 && boostFactor > 1) {
        const boostedCoins = validCoins.filter(c =>
            boostedCAs.has(c.ca) || boostedCAs.has(c.address)
        );

        // Add duplicates to increase frequency
        for (let i = 0; i < boostFactor - 1; i++) {
            finalList.push(...boostedCoins);
        }
    }

    return finalList;
}

import { deterministicShuffle } from './gameState';

// Get shuffled, UNIQUE coins for a session (handling boosted frequency logic)
// We add duplicates -> Shuffle -> Deduplicate (keep first instance)
// This makes boosted coins appear earlier on average, but ensures they never repeat in the session.
export function getSessionCoins(allCoins, seed) {
    const validCoins = prepareGameCoins(allCoins);
    const shuffledRaw = deterministicShuffle(validCoins, seed);

    // Deduplicate
    const seenIds = new Set();
    const uniqueShuffled = [];

    for (const coin of shuffledRaw) {
        if (!coin.id) continue; // Skip invalid
        if (!seenIds.has(coin.id)) {
            seenIds.add(coin.id);
            uniqueShuffled.push(coin);
        }
    }

    return uniqueShuffled;
}
