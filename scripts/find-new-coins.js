/**
 * Find New Trending Pump.fun Coins
 * Fetches trending coins from DexScreener and filters out existing ones
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/coins.json');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchDexScreenerTrending() {
    console.log('📊 Fetching trending Solana tokens from DexScreener...\n');

    const allPairs = [];

    // Fetch top gainers and trending
    const endpoints = [
        'https://api.dexscreener.com/token-boosts/top/v1',
        'https://api.dexscreener.com/token-profiles/latest/v1'
    ];

    for (const url of endpoints) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    // Filter Solana only
                    const solanaPairs = data.filter(p => p.chainId === 'solana');
                    allPairs.push(...solanaPairs);
                    console.log(`Got ${solanaPairs.length} Solana tokens from ${url.split('/').pop()}`);
                }
            }
        } catch (e) {
            console.log(`Error fetching ${url}: ${e.message}`);
        }
        await delay(500);
    }

    // Also search for pump.fun tokens specifically
    try {
        const searchUrl = 'https://api.dexscreener.com/latest/dex/search?q=pump';
        const res = await fetch(searchUrl);
        if (res.ok) {
            const data = await res.json();
            if (data.pairs) {
                const pumpPairs = data.pairs.filter(p =>
                    p.chainId === 'solana' &&
                    p.baseToken?.address?.endsWith('pump')
                );
                console.log(`Got ${pumpPairs.length} Pump.fun tokens from search`);

                // Convert to token format
                pumpPairs.forEach(p => {
                    allPairs.push({
                        tokenAddress: p.baseToken.address,
                        chainId: 'solana',
                        ...p.baseToken,
                        marketCap: p.marketCap || p.fdv,
                        liquidity: p.liquidity?.usd,
                        icon: p.info?.imageUrl
                    });
                });
            }
        }
    } catch (e) {
        console.log(`Error in search: ${e.message}`);
    }

    return allPairs;
}

async function fetchBirdeyePumpTokens() {
    console.log('\n📊 Fetching Pump.fun tokens from Birdeye...\n');

    const BIRDEYE_API_KEY = 'b69bb3c2b1a14c11be2c011d2ddc1614';
    const allTokens = [];

    // Fetch multiple pages
    for (let offset = 0; offset <= 200; offset += 50) {
        try {
            const url = `https://public-api.birdeye.so/defi/v3/token/list?source=pump&sort_by=volume_24h_usd&sort_type=desc&offset=${offset}&limit=50`;
            const res = await fetch(url, {
                headers: {
                    'X-API-KEY': BIRDEYE_API_KEY,
                    'x-chain': 'solana'
                }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.data?.items) {
                    allTokens.push(...data.data.items);
                    console.log(`Offset ${offset}: Got ${data.data.items.length} tokens`);
                }
            }
        } catch (e) {
            console.log(`Error at offset ${offset}: ${e.message}`);
        }
        await delay(1000);
    }

    return allTokens;
}

async function getTokenDetails(addresses) {
    console.log(`\n🔍 Getting details for ${addresses.length} tokens...\n`);

    const results = [];
    const CHUNK_SIZE = 25;

    for (let i = 0; i < addresses.length; i += CHUNK_SIZE) {
        const chunk = addresses.slice(i, i + CHUNK_SIZE);
        const ids = chunk.join(',');

        try {
            const url = `https://api.dexscreener.com/latest/dex/tokens/${ids}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.pairs) {
                    // Group by token address
                    const byAddress = {};
                    data.pairs.forEach(p => {
                        if (p.chainId === 'solana') {
                            const addr = p.baseToken.address;
                            if (!byAddress[addr] || (p.liquidity?.usd || 0) > (byAddress[addr].liquidity?.usd || 0)) {
                                byAddress[addr] = p;
                            }
                        }
                    });

                    Object.values(byAddress).forEach(p => {
                        results.push({
                            name: p.baseToken.name,
                            symbol: p.baseToken.symbol,
                            address: p.baseToken.address,
                            marketCap: p.marketCap || p.fdv || 0,
                            logo: p.info?.imageUrl || null,
                            liquidity: p.liquidity?.usd || 0,
                            priceUsd: parseFloat(p.priceUsd) || 0,
                            volume24h: p.volume?.h24 || 0
                        });
                    });
                }
            }
        } catch (e) {
            console.log(`Error fetching chunk: ${e.message}`);
        }

        await delay(400);
    }

    return results;
}

async function main() {
    console.log('🚀 Finding New Pump.fun Coins\n');
    console.log('='.repeat(50) + '\n');

    // Load existing coins
    const existingCoins = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const existingAddresses = new Set(existingCoins.map(c => c.address.toLowerCase()));
    console.log(`📂 Loaded ${existingCoins.length} existing coins\n`);

    // Fetch from multiple sources
    const dexTokens = await fetchDexScreenerTrending();
    const birdeyeTokens = await fetchBirdeyePumpTokens();

    // Combine unique addresses
    const allAddresses = new Set();

    dexTokens.forEach(t => {
        const addr = t.tokenAddress || t.address;
        if (addr && addr.endsWith('pump')) {
            allAddresses.add(addr);
        }
    });

    birdeyeTokens.forEach(t => {
        if (t.address && t.address.endsWith('pump')) {
            allAddresses.add(t.address);
        }
    });

    console.log(`\n📊 Total unique Pump.fun addresses found: ${allAddresses.size}`);

    // Filter out existing coins
    const newAddresses = [...allAddresses].filter(addr =>
        !existingAddresses.has(addr.toLowerCase())
    );

    console.log(`🆕 New addresses (not in database): ${newAddresses.length}`);

    if (newAddresses.length === 0) {
        console.log('\n✅ No new coins found! Your database is up to date.');
        return;
    }

    // Get full details for new tokens
    const newTokens = await getTokenDetails(newAddresses);

    // Filter by market cap >= 100k and sort by market cap
    const validTokens = newTokens
        .filter(t => t.marketCap >= 100000)
        .sort((a, b) => b.marketCap - a.marketCap);

    console.log(`\n${'='.repeat(50)}`);
    console.log(`\n🎯 NEW COINS FOUND: ${validTokens.length} (with MC >= $100k)\n`);
    console.log('='.repeat(50));

    // Display results
    validTokens.forEach((t, i) => {
        const mcStr = t.marketCap >= 1e6
            ? `$${(t.marketCap / 1e6).toFixed(2)}M`
            : `$${(t.marketCap / 1e3).toFixed(0)}K`;

        console.log(`\n${i + 1}. ${t.name} (${t.symbol})`);
        console.log(`   CA: ${t.address}`);
        console.log(`   Market Cap: ${mcStr}`);
        console.log(`   Logo: ${t.logo || 'N/A'}`);
    });

    // Save to file for easy copy
    const outputPath = path.join(__dirname, 'new_coins_found.json');
    fs.writeFileSync(outputPath, JSON.stringify(validTokens, null, 2));
    console.log(`\n\n✅ Saved ${validTokens.length} new coins to ${outputPath}`);
}

main().catch(console.error);
