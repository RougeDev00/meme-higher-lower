/**
 * Update Market Caps and Remove Coins under 100k
 * 
 * Uses Birdeye API to fetch latest market cap data for all coins
 * and removes coins with market cap under $100,000
 * 
 * Run with: node scripts/update-marketcaps.js
 */

const fs = require('fs');
const path = require('path');

// API Keys
const BIRDEYE_API_KEY = 'b69bb3c2b1a14c11be2c011d2ddc1614';
const BIRDEYE_API = 'https://public-api.birdeye.so';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Minimum market cap threshold
const MIN_MARKET_CAP = 100000; // $100k

async function getTokenPrice(address) {
    try {
        const url = `${BIRDEYE_API}/defi/price?address=${address}`;
        const response = await fetch(url, {
            headers: {
                'X-API-KEY': BIRDEYE_API_KEY,
                'x-chain': 'solana'
            }
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        if (data.success && data.data) {
            return data.data;
        }
        return null;
    } catch (error) {
        return null;
    }
}

async function getTokenOverview(address) {
    try {
        const url = `${BIRDEYE_API}/defi/token_overview?address=${address}`;
        const response = await fetch(url, {
            headers: {
                'X-API-KEY': BIRDEYE_API_KEY,
                'x-chain': 'solana'
            }
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        if (data.success && data.data) {
            return data.data;
        }
        return null;
    } catch (error) {
        return null;
    }
}

async function main() {
    console.log('🚀 Market Cap Updater\n');
    console.log(`Threshold: Remove coins under $${MIN_MARKET_CAP.toLocaleString()}\n`);

    // Load existing coins
    const coinsPath = path.join(__dirname, '..', 'data', 'coins.json');
    const coins = JSON.parse(fs.readFileSync(coinsPath, 'utf8'));

    console.log(`📂 Loaded ${coins.length} coins\n`);

    const updatedCoins = [];
    const removedCoins = [];
    const failedUpdates = [];

    // Process in batches to respect rate limits
    const batchSize = 1;
    const delayMs = 500; // 500ms between requests

    for (let i = 0; i < coins.length; i++) {
        const coin = coins[i];

        try {
            // Get token overview (includes market cap)
            const overview = await getTokenOverview(coin.address);

            if (overview) {
                const newMarketCap = overview.mc || overview.marketCap || 0;
                const newPrice = overview.price || coin.priceUsd || 0;
                const newLiquidity = overview.liquidity || coin.liquidity || 0;

                // Check if market cap is above threshold
                if (newMarketCap >= MIN_MARKET_CAP) {
                    coin.marketCap = newMarketCap;
                    coin.priceUsd = newPrice;
                    coin.liquidity = newLiquidity;
                    updatedCoins.push(coin);
                    console.log(`✅ ${i + 1}/${coins.length} ${coin.symbol}: $${(newMarketCap / 1e6).toFixed(2)}M`);
                } else {
                    removedCoins.push({ ...coin, newMarketCap });
                    console.log(`❌ ${i + 1}/${coins.length} ${coin.symbol}: $${newMarketCap.toLocaleString()} (REMOVED - under 100k)`);
                }
            } else {
                // If we can't get data, try price endpoint
                const priceData = await getTokenPrice(coin.address);
                if (priceData && priceData.value) {
                    // Keep coin but mark as needing review
                    if (coin.marketCap >= MIN_MARKET_CAP) {
                        coin.priceUsd = priceData.value;
                        updatedCoins.push(coin);
                        console.log(`⚠️ ${i + 1}/${coins.length} ${coin.symbol}: Price only update - $${priceData.value}`);
                    } else {
                        removedCoins.push(coin);
                        console.log(`❌ ${i + 1}/${coins.length} ${coin.symbol}: $${coin.marketCap?.toLocaleString() || 0} (REMOVED - under 100k)`);
                    }
                } else {
                    // Keep existing market cap, check threshold
                    if (coin.marketCap >= MIN_MARKET_CAP) {
                        updatedCoins.push(coin);
                        failedUpdates.push(coin.symbol);
                        console.log(`⚠️ ${i + 1}/${coins.length} ${coin.symbol}: Kept existing MC $${(coin.marketCap / 1e6).toFixed(2)}M`);
                    } else {
                        removedCoins.push(coin);
                        console.log(`❌ ${i + 1}/${coins.length} ${coin.symbol}: $${coin.marketCap?.toLocaleString() || 0} (REMOVED - under 100k)`);
                    }
                }
            }
        } catch (error) {
            console.log(`⚠️ ${i + 1}/${coins.length} ${coin.symbol}: Error - ${error.message}`);
            if (coin.marketCap >= MIN_MARKET_CAP) {
                updatedCoins.push(coin);
            } else {
                removedCoins.push(coin);
            }
        }

        // Rate limiting
        await delay(delayMs);
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
    console.log(`✅ Updated and kept: ${updatedCoins.length} coins`);
    console.log(`❌ Removed (under $100k): ${removedCoins.length} coins`);
    console.log(`⚠️ Failed to update (kept existing): ${failedUpdates.length} coins`);

    if (removedCoins.length > 0) {
        console.log('\n🗑️ Removed coins:');
        removedCoins.forEach(c => {
            const mc = c.newMarketCap !== undefined ? c.newMarketCap : c.marketCap;
            console.log(`   - ${c.symbol}: $${mc?.toLocaleString() || 0}`);
        });
    }

    console.log('\n✅ Done! Saved to', coinsPath);
}

main().catch(console.error);
