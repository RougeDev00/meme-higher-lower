/**
 * MEGA Coin Fetcher - 600 Coins Target
 * 
 * Uses:
 * - Birdeye API for BONK.fun (raydium_launchlab) 
 * - Bitquery for Pump.fun
 * - Helius for on-chain logos
 * 
 * Run with: node scripts/fetch-mega-600.js
 */

const fs = require('fs');
const path = require('path');

// API Keys
const BIRDEYE_API_KEY = 'b69bb3c2b1a14c11be2c011d2ddc1614';
const HELIUS_API_KEY = 'd3622d60-e617-43aa-90e5-e175872be976';
const BITQUERY_TOKEN = 'ory_at_56LmEsNqnOWS7V7XSI-ymUTyQ_QSPNN566fpceyhNic.VleMEoz6t5TUhlQk2thrl9gAgOTpZGNbBzAIcHmO92A';

// API Endpoints
const BIRDEYE_API = 'https://public-api.birdeye.so';
const HELIUS_API = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const BITQUERY_API = 'https://streaming.bitquery.io/graphql';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function generateColor(str) {
    const colors = [
        '#9945FF', '#14F195', '#FF6B6B', '#4ECDC4', '#FFE66D',
        '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

const EXCLUDED_SYMBOLS = new Set([
    'USDT', 'USDC', 'SOL', 'WSOL', 'ETH', 'WETH', 'WBTC', 'BTC',
    'JUP', 'RAY', 'JTO', 'JITO', 'PYTH', 'INF', 'W', 'KMNO',
    'MNGO', 'SRM', 'PORT', 'SNY', 'SLND', 'MSOL', 'BSOL', 'JSOL',
    'GRASS', 'META', 'ME', 'LST', 'TNSR', 'CLOUD', 'WLFI', 'STEP'
]);

// ========== BIRDEYE - BONK.fun (raydium_launchlab) ==========
async function fetchBirdeyeBonkFun() {
    console.log('📦 Fetching BONK.fun tokens from Birdeye (raydium_launchlab)...');

    const allTokens = [];
    const limits = [50, 50, 50, 50, 50, 50]; // Fetch in batches
    let offset = 0;

    for (const limit of limits) {
        try {
            const url = `${BIRDEYE_API}/defi/v3/token/list?source=raydium_launchlab&sort_by=volume_24h_usd&sort_type=desc&offset=${offset}&limit=${limit}`;

            const response = await fetch(url, {
                headers: {
                    'X-API-KEY': BIRDEYE_API_KEY,
                    'x-chain': 'solana'
                }
            });

            if (!response.ok) {
                const text = await response.text();
                console.log(`  Birdeye error at offset ${offset}: ${response.status} - ${text}`);
                break;
            }

            const data = await response.json();

            if (!data.success || !data.data?.items?.length) {
                break;
            }

            const batch = data.data.items;
            console.log(`  Offset ${offset}: Got ${batch.length} tokens`);
            if (batch.length > 0) {
                console.log('  Sample token:', JSON.stringify(batch[0]));
            }

            allTokens.push(...batch);

            offset += limit;
            await delay(3500); // Increased rate limit delay
        } catch (error) {
            console.log(`  Error at offset ${offset}: ${error.message}`);
            break;
        }
    }

    // Filter and transform
    const tokens = allTokens
        .filter(t =>
            t.symbol &&
            t.name &&
            // Relaxed MC check: accept if MC is missing OR > 20k (since volume sort gives active coins)
            (t.mc === undefined || t.mc === null || t.mc > 20000) &&
            t.symbol.length <= 15 &&
            t.name.length <= 50 &&
            !EXCLUDED_SYMBOLS.has(t.symbol.toUpperCase())
        )
        .map(t => ({
            id: t.symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
            name: t.name,
            symbol: t.symbol,
            address: t.address,
            marketCap: t.mc || 0,
            logo: t.logo_uri || null,
            color: generateColor(t.symbol),
            platform: 'BONK.fun',
            priceUsd: t.price || 0,
            liquidity: t.liquidity || 0
        }));

    console.log(`  Total BONK.fun tokens: ${tokens.length}`);
    return tokens;
}

// ========== BIRDEYE - Pump.fun ==========
async function fetchBirdeyePumpFun() {
    console.log('\n📦 Fetching Pump.fun tokens from Birdeye...');

    const allTokens = [];
    const limits = [50, 50, 50, 50, 50, 50, 50, 50]; // Fetch more for Pump.fun
    let offset = 0;

    for (const limit of limits) {
        try {
            // Try pump source
            const url = `${BIRDEYE_API}/defi/v3/token/list?source=pump&sort_by=volume_24h_usd&sort_type=desc&offset=${offset}&limit=${limit}`;

            const response = await fetch(url, {
                headers: {
                    'X-API-KEY': BIRDEYE_API_KEY,
                    'x-chain': 'solana'
                }
            });

            if (!response.ok) {
                const text = await response.text();
                console.log(`  Birdeye pump error at offset ${offset}: ${response.status} - ${text}`);
                break;
            }

            const data = await response.json();

            if (!data.success || !data.data?.items?.length) {
                break;
            }

            const batch = data.data.items;
            console.log(`  Offset ${offset}: Got ${batch.length} tokens`);

            allTokens.push(...batch);

            offset += limit;
            await delay(3500); // Increased rate limit delay
        } catch (error) {
            console.log(`  Error: ${error.message}`);
            break;
        }
    }

    // Filter and transform
    const tokens = allTokens
        .filter(t =>
            t.symbol &&
            t.name &&
            (t.mc === undefined || t.mc === null || t.mc > 20000) &&
            t.symbol.length <= 15 &&
            t.name.length <= 50 &&
            !EXCLUDED_SYMBOLS.has(t.symbol.toUpperCase())
        )
        .map(t => ({
            id: t.symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
            name: t.name,
            symbol: t.symbol,
            address: t.address,
            marketCap: t.mc || 0,
            logo: t.logo_uri || null,
            color: generateColor(t.symbol),
            platform: 'Pump.fun',
            priceUsd: t.price || 0,
            liquidity: t.liquidity || 0
        }));

    console.log(`  Total Pump.fun tokens: ${tokens.length}`);
    return tokens;
}

// ========== HELIUS - Get logo from on-chain metadata ==========
async function getHeliusLogo(address) {
    try {
        const response = await fetch(HELIUS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'helius-logo',
                method: 'getAsset',
                params: { id: address }
            })
        });

        const data = await response.json();

        if (data.result?.content?.links?.image) {
            return data.result.content.links.image;
        }

        if (data.result?.content?.files?.[0]?.cdn_uri) {
            return data.result.content.files[0].cdn_uri;
        }

        if (data.result?.content?.files?.[0]?.uri) {
            return data.result.content.files[0].uri;
        }

        return null;
    } catch (error) {
        return null;
    }
}

// ========== Enrich tokens without logos using Helius ==========
async function enrichLogosWithHelius(tokens) {
    console.log('\n🖼️ Enriching logos with Helius...');

    const tokensNeedingLogos = tokens.filter(t => !t.logo);
    console.log(`  ${tokensNeedingLogos.length} tokens need logos`);

    let enriched = 0;

    for (const token of tokensNeedingLogos) {
        const logo = await getHeliusLogo(token.address);
        if (logo) {
            token.logo = logo;
            enriched++;
        }

        enriched++; // Count progress
        if (enriched % 20 === 0) {
            console.log(`  Checked ${enriched}/${tokensNeedingLogos.length} logos`);
        }

        await delay(100); // Rate limit
    }

    console.log(`  Finished Helius enrichment`);
    return tokens;
}

// ========== Fallback to DexScreener for missing logos ==========
async function enrichLogosWithDexScreener(tokens) {
    console.log('\n🔍 Completing with DexScreener logos...');

    const tokensNeedingLogos = tokens.filter(t => !t.logo);
    console.log(`  ${tokensNeedingLogos.length} tokens still need logos`);

    let enriched = 0;

    for (const token of tokensNeedingLogos) {
        try {
            const response = await fetch(
                `https://api.dexscreener.com/latest/dex/tokens/${token.address}`
            );
            const data = await response.json();

            const pair = (data.pairs || []).find(p =>
                p.chainId === 'solana' && p.info?.imageUrl
            );

            if (pair?.info?.imageUrl) {
                token.logo = pair.info.imageUrl;
            }

            enriched++;
            if (enriched % 30 === 0) {
                console.log(`  DexScreener checked ${enriched}`);
            }

            await delay(80);
        } catch (error) {
            // Skip
        }
    }

    return tokens;
}

async function main() {
    console.log('🚀 MEGA Coin Fetcher - Target: 600 Coins\n');
    console.log('Sources: Birdeye (BONK.fun + Pump.fun), Helius (logos), DexScreener (fallback)\n');

    // Load existing coins to preserve them
    const existingCoinsPath = path.join(__dirname, '..', 'data', 'coins.json');
    let existingCoins = [];
    if (fs.existsSync(existingCoinsPath)) {
        existingCoins = JSON.parse(fs.readFileSync(existingCoinsPath, 'utf8'));
        console.log(`📂 Loaded ${existingCoins.length} existing coins.`);
    }

    // Fetch from Birdeye
    const bonkTokens = await fetchBirdeyeBonkFun();
    await delay(1000);

    const pumpTokens = await fetchBirdeyePumpFun();

    // Combine
    const fetchedTokens = [...bonkTokens, ...pumpTokens];
    console.log(`\n📊 Total fetched tokens: ${fetchedTokens.length}`);

    // Create a map of existing coins for preserving data
    const coinsMap = new Map();
    existingCoins.forEach(c => coinsMap.set(c.address, c));

    // Merge fetched tokens
    let newCount = 0;
    let updatedCount = 0;

    fetchedTokens.forEach(t => {
        if (coinsMap.has(t.address)) {
            // Update logic: keep existing static data (id, color), update market data
            const existing = coinsMap.get(t.address);
            existing.marketCap = t.marketCap || existing.marketCap;
            existing.liquidity = t.liquidity || existing.liquidity;
            existing.priceUsd = t.priceUsd || existing.priceUsd;
            if (!existing.logo && t.logo) existing.logo = t.logo; // Only add logo if missing
            updatedCount++;
        } else {
            // Add new token
            coinsMap.set(t.address, t);
            newCount++;
        }
    });

    console.log(`\nNew tokens added: ${newCount}`);
    console.log(`Existing tokens updated: ${updatedCount}`);

    let allUniqueTokens = Array.from(coinsMap.values());
    console.log(`  Total Unique Tokens: ${allUniqueTokens.length}`);

    // Enrich logos for NEW tokens only (to save API calls) or those missing logos
    const tokensNeedingLogos = allUniqueTokens.filter(t => !t.logo);
    if (tokensNeedingLogos.length > 0) {
        // We can re-use the enrich functions but passing only the subset
        // Note: The original functions took the whole array and filtered inside.
        // Let's just run it on the whole unique set, the functions already filter.
        allUniqueTokens = await enrichLogosWithHelius(allUniqueTokens);
        allUniqueTokens = await enrichLogosWithDexScreener(allUniqueTokens);
    }

    // Filter tokens with logos (or minimal valid)
    // Relax logic: if it's an existing coin, keep it even without logo if it was there before
    // But generally we want logos.
    const withLogos = allUniqueTokens.filter(t => t.logo);
    const withoutLogos = allUniqueTokens.filter(t => !t.logo);

    console.log(`\n📊 Tokens with logos: ${withLogos.length}`);
    console.log(`  Tokens without logos: ${withoutLogos.length}`);

    // Sort by market cap
    allUniqueTokens.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

    // Dedupe by symbol (prefer higher market cap which is already sorted)
    const seenSymbol = new Set();
    const final = [];

    // We might want to keep *all* existing coins regardless of symbol overlap if they were there?
    // But usually symbol overlap means same coin different address or copycat.
    // Let's stick to symbol uniqueness for the game.

    allUniqueTokens.forEach(t => {
        const key = t.symbol.toLowerCase();
        if (!seenSymbol.has(key)) {
            seenSymbol.add(key);
            final.push(t);
        }
    });

    // Re-rank
    final.forEach((t, i) => t.rank = i + 1);

    // Save
    fs.writeFileSync(existingCoinsPath, JSON.stringify(final, null, 2));

    // Stats
    const platforms = {};
    const withLogoCount = { total: 0, withLogo: 0 };
    final.forEach(t => {
        platforms[t.platform] = (platforms[t.platform] || 0) + 1;
        withLogoCount.total++;
        if (t.logo) withLogoCount.withLogo++;
    });

    console.log(`\n✅ Saved ${final.length} coins to ${existingCoinsPath}`);
    console.log(`   With logos: ${withLogoCount.withLogo}`);
    console.log(`   Without logos: ${withLogoCount.total - withLogoCount.withLogo}`);

    console.log('\nBy platform:');
    Object.entries(platforms).sort((a, b) => b[1] - a[1]).forEach(([p, n]) => {
        console.log(`  ${p}: ${n}`);
    });

    console.log('\nTop 25:');
    final.slice(0, 25).forEach((c, i) => {
        const mc = c.marketCap >= 1e9 ? `$${(c.marketCap / 1e9).toFixed(2)}B` : `$${(c.marketCap / 1e6).toFixed(2)}M`;
        const logo = c.logo ? '✅' : '❌';
        console.log(`  ${i + 1}. ${c.symbol} (${c.platform}) - ${mc} ${logo}`);
    });
}

main().catch(console.error);
