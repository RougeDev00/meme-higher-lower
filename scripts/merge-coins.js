
const fs = require('fs');
const path = require('path');

const EXISTING_COINS_PATH = path.join(__dirname, '../data/coins.json');
const NEW_COINS_PATH = path.join(__dirname, '../data/pump_coins_enriched.json');
const COINGECKO_RESOLVED_PATH = path.join(__dirname, '../data/coingecko_resolved.json');
const OUTPUT_PATH = path.join(__dirname, '../data/coins.json');
const BACKUP_PATH = path.join(__dirname, '../data/coins.backup.json');

// DexScreener API for enrichment of CG resolved coins
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens';

function generatePastelColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 80%)`;
}

async function fetchDexScreener(addresses) {
    if (addresses.length === 0) return [];
    const url = `${DEXSCREENER_API}/${addresses.join(',')}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Error fetching batch: ${response.status}`);
            return [];
        }
        const data = await response.json();
        return data.pairs || [];
    } catch (e) {
        console.error('Fetch error:', e);
        return [];
    }
}

async function main() {
    console.log('Reading files...');
    let existingCoins = [];
    try {
        existingCoins = JSON.parse(fs.readFileSync(EXISTING_COINS_PATH, 'utf8'));
        // Backup
        fs.writeFileSync(BACKUP_PATH, JSON.stringify(existingCoins, null, 2));
    } catch (e) {
        console.warn('No existing coins file found or error reading it.');
    }

    let newCoins = [];
    try {
        if (fs.existsSync(NEW_COINS_PATH))
            newCoins = JSON.parse(fs.readFileSync(NEW_COINS_PATH, 'utf8'));
    } catch (e) {
        console.error('Error reading enriched coins:', e);
    }

    let cgCoins = [];
    try {
        if (fs.existsSync(COINGECKO_RESOLVED_PATH))
            cgCoins = JSON.parse(fs.readFileSync(COINGECKO_RESOLVED_PATH, 'utf8'));
    } catch (e) {
        console.error('Error reading resolved CG coins:', e);
    }

    console.log(`Existing coins: ${existingCoins.length}`);
    console.log(`Pump Enriched coins: ${newCoins.length}`);
    console.log(`CoinGecko Resolved coins: ${cgCoins.length}`);

    // Map existing by address for easy lookup
    const mergedCoinsMap = new Map();

    // Add existing coins first
    existingCoins.forEach(c => {
        mergedCoinsMap.set(c.address, c);
    });

    // --- Helper function to merge ---
    function mergeCoin(address, name, symbol, marketCap, liquidity, priceUsd, volume, logo, source) {
        if (mergedCoinsMap.has(address)) {
            // Update existing
            const existing = mergedCoinsMap.get(address);
            if (marketCap) existing.marketCap = marketCap;
            if (liquidity) existing.liquidity = liquidity;
            if (priceUsd) existing.priceUsd = priceUsd;
            if (volume) existing.volumeUsd = volume;
            if (!existing.logo && logo) existing.logo = logo;
            // console.log(`Updated ${existing.name} with data from ${source}`);
            return 'updated';
        } else {
            // Add new
            const id = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
            const newCoin = {
                id: id,
                name: name,
                symbol: symbol,
                address: address,
                marketCap: marketCap || 0,
                logo: logo || '',
                color: generatePastelColor(),
                platform: "Pump.fun",
                priceUsd: priceUsd || 0,
                liquidity: liquidity || 0,
                volumeUsd: volume || 0,
                rank: 0
            };
            mergedCoinsMap.set(address, newCoin);
            // console.log(`Added ${name} from ${source}`);
            return 'added';
        }
    }

    // Process Pump Enriched Coins
    let pumpAdded = 0;
    let pumpUpdated = 0;
    newCoins.forEach(nc => {
        const res = mergeCoin(nc.address, nc.name, nc.symbol, nc.marketCap, nc.liquidity, nc.priceUsd, nc.volume24h, nc.image, 'PumpEnriched');
        if (res === 'added') pumpAdded++;
        if (res === 'updated') pumpUpdated++;
    });

    // Process CoinGecko Resolved Coins
    // We need to fetch market data for them first because resolved json only has address and name
    // Process CoinGecko Resolved Coins
    console.log('Merging CoinGecko coins...');
    let cgAdded = 0;
    let cgUpdated = 0;

    cgCoins.forEach(c => {
        if (c.address) {
            const res = mergeCoin(
                c.address,
                c.name,
                c.symbol,
                c.marketCap,
                c.liquidity,
                c.priceUsd,
                c.volume24h,
                c.image,
                'CoinGecko'
            );
            if (res === 'added') cgAdded++;
            if (res === 'updated') cgUpdated++;
        }
    });

    console.log(`Pump Enriched: Added ${pumpAdded}, Updated ${pumpUpdated}`);
    console.log(`CoinGecko: Added ${cgAdded}, Updated ${cgUpdated}`);


    // Convert map to array
    let finalCoins = Array.from(mergedCoinsMap.values());

    // Fix ID collisions and Ranks
    finalCoins.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

    const usedIds = new Set();

    finalCoins = finalCoins.map((c, index) => {
        c.rank = index + 1;

        let id = c.id || c.symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!id) id = 'unknown';

        let uniqueId = id;
        let counter = 1;
        while (usedIds.has(uniqueId)) {
            uniqueId = `${id}-${counter}`;
            counter++;
        }
        c.id = uniqueId;
        usedIds.add(uniqueId);

        return c;
    });

    console.log(`Total coins after merge: ${finalCoins.length}`);

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalCoins, null, 2));
    console.log(`Saved merged list to ${OUTPUT_PATH}`);
}

main();
