/**
 * Update Market Caps and Remove Coins under 100k using DexScreener
 * 
 * Uses DexScreener API to fetch latest market cap data for all coins
 * and removes coins with market cap under $100,000.
 * 
 * Run with: node scripts/update-marketcaps.js
 */

const fs = require('fs');
const path = require('path');

// DexScreener API
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Minimum market cap threshold
const MIN_MARKET_CAP = 100000; // $100k

async function getTokensData(addresses) {
    try {
        // DexScreener accepts up to 30 addresses comma-separated
        const addressesString = addresses.join(',');
        const url = `${DEXSCREENER_API}/${addressesString}`;

        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Error fetching data: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        // Create a map for easier lookup
        const pairsMap = {};

        if (data.pairs && Array.isArray(data.pairs)) {
            data.pairs.forEach(pair => {
                // We want the pair with the highest liquidity/volume usually
                // DexScreener returns pairs, checking baseToken address
                const baseTokenAddress = pair.baseToken.address;

                // If we already have a pair for this token, check if this one is better (higher liquidity)
                if (pairsMap[baseTokenAddress]) {
                    if (pair.liquidity && pair.liquidity.usd > pairsMap[baseTokenAddress].liquidity.usd) {
                        pairsMap[baseTokenAddress] = pair;
                    }
                } else {
                    pairsMap[baseTokenAddress] = pair;
                }
            });
        }

        return pairsMap;
    } catch (error) {
        console.error('Error in getTokensData:', error.message);
        return null;
    }
}

async function main() {
    console.log('🚀 Market Cap Updater (DexScreener)\n');
    console.log(`Threshold: Remove coins under $${MIN_MARKET_CAP.toLocaleString()}\n`);

    // Load existing coins
    const coinsPath = path.join(__dirname, '..', 'data', 'coins.json');

    if (!fs.existsSync(coinsPath)) {
        console.error('❌ coins.json not found!');
        process.exit(1);
    }

    const coins = JSON.parse(fs.readFileSync(coinsPath, 'utf8'));

    console.log(`📂 Loaded ${coins.length} coins\n`);

    const updatedCoins = [];
    const removedCoins = [];

    // Chunk size for DexScreener (max 30 addresses)
    const CHUNK_SIZE = 30;
    const chunks = [];

    for (let i = 0; i < coins.length; i += CHUNK_SIZE) {
        chunks.push(coins.slice(i, i + CHUNK_SIZE));
    }

    console.log(`Processing ${chunks.length} batches...\n`);

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const addresses = chunk.map(c => c.ca || c.address); // Support both 'ca' and 'address' keys

        console.log(`Processing batch ${i + 1}/${chunks.length}...`);

        const tokensData = await getTokensData(addresses);

        if (tokensData) {
            chunk.forEach(coin => {
                const address = coin.ca || coin.address;
                const pairData = tokensData[address];

                if (pairData) {
                    const marketCap = pairData.fdv || pairData.marketCap || 0;
                    const priceUsd = pairData.priceUsd;
                    const liquidity = pairData.liquidity ? pairData.liquidity.usd : 0;

                    if (marketCap >= MIN_MARKET_CAP) {
                        // Update coin data
                        coin.marketCap = marketCap;
                        if (priceUsd) coin.priceUsd = parseFloat(priceUsd);
                        coin.liquidity = liquidity;

                        updatedCoins.push(coin);
                    } else {
                        // Mark for removal
                        removedCoins.push({ ...coin, currentMarketCap: marketCap });
                        console.log(`  ❌ ${coin.symbol || coin.name}: $${marketCap.toLocaleString()} (Under ${MIN_MARKET_CAP / 1000}k)`);
                    }
                } else {
                    // Fallback logic: if DexScreener returns no data, we REMOVE the coin as requested.
                    console.log(`  ❌ ${coin.symbol || coin.name}: No data found on DexScreener. Removing.`);
                    removedCoins.push({ ...coin, reason: 'No data found' });
                }
            });
        } else {
            // If whole batch fails (API error), keep all coins in that batch to avoid accidental deletion
            console.log(`  ⚠️ Batch failed, keeping existing data for ${chunk.length} coins`);
            updatedCoins.push(...chunk);
        }

        // Rate limiting
        await delay(300);
    }

    // Sort by market cap (highest first)
    updatedCoins.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

    // Update ranks
    updatedCoins.forEach((coin, index) => {
        coin.rank = index + 1;
    });

    // Save updated coins
    fs.writeFileSync(coinsPath, JSON.stringify(updatedCoins, null, 2));

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY\n');
    console.log(`✅ Total Coins Remaining: ${updatedCoins.length}`);
    console.log(`❌ Removed Coins (Under $100k): ${removedCoins.length}`);

    if (removedCoins.length > 0) {
        console.log('\nExamples of removed coins:');
        removedCoins.slice(0, 5).forEach(c => {
            console.log(`   - ${c.symbol}: $${c.currentMarketCap?.toLocaleString() || c.marketCap?.toLocaleString() || 0}`);
        });
    }

    console.log(`\n✅ Database updated: ${coinsPath}`);
}

main().catch(console.error);
