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
