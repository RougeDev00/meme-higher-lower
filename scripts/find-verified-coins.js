/**
 * Find New Pump.fun Coins - Volume Based
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/coins.json');
const BIRDEYE_API_KEY = 'b69bb3c2b1a14c11be2c011d2ddc1614';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchBirdeyeByVolume() {
    console.log('📊 Fetching Pump.fun tokens sorted by 24h volume...\n');

    const allTokens = [];

    for (let offset = 0; offset <= 400; offset += 50) {
        try {
            // Sort by 24h volume to get active tokens
            const url = `https://public-api.birdeye.so/defi/v3/token/list?source=pump&sort_by=volume_24h_usd&sort_type=desc&offset=${offset}&limit=50`;
            const res = await fetch(url, {
                headers: {
                    'X-API-KEY': BIRDEYE_API_KEY,
                    'x-chain': 'solana'
                }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.data?.items?.length > 0) {
                    // Filter for real tokens
                    const valid = data.data.items.filter(t =>
                        t.address?.endsWith('pump') &&
                        t.volume_24h_usd > 10000 && // Min $10k volume
                        t.liquidity > 5000 && // Min $5k liquidity  
                        t.market_cap > 0 &&
                        t.market_cap < 10000000000 && // Max $10B (filter fake data)
                        t.holder > 50 // Min 50 holders
                    );
                    allTokens.push(...valid);
                    console.log(`Offset ${offset}: ${valid.length} valid tokens`);
                } else {
                    break;
                }
            }
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
        await delay(1200);
    }

    return allTokens;
}

async function verifyWithDexScreener(addresses) {
    console.log(`\n🔍 Verifying ${addresses.length} tokens with DexScreener...\n`);

    const verified = [];
    const CHUNK = 25;

    for (let i = 0; i < addresses.length; i += CHUNK) {
        const chunk = addresses.slice(i, i + CHUNK);
        const ids = chunk.join(',');

        try {
            const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ids}`);
            if (res.ok) {
                const data = await res.json();
                if (data.pairs) {
                    // Group by address, pick best pair
                    const byAddr = {};
                    data.pairs.forEach(p => {
                        if (p.chainId === 'solana' && p.liquidity?.usd > 5000) {
                            const addr = p.baseToken.address;
                            if (!byAddr[addr] || (p.liquidity?.usd || 0) > (byAddr[addr].liquidity?.usd || 0)) {
                                byAddr[addr] = p;
                            }
                        }
                    });

                    Object.entries(byAddr).forEach(([addr, p]) => {
                        if ((p.marketCap || p.fdv) >= 100000) {
                            verified.push({
                                address: addr,
                                name: p.baseToken.name,
                                symbol: p.baseToken.symbol,
                                marketCap: p.marketCap || p.fdv,
                                liquidity: p.liquidity?.usd,
                                logo: p.info?.imageUrl,
                                volume24h: p.volume?.h24,
                                dexUrl: p.url
                            });
                        }
                    });
                }
            }
        } catch (e) { }

        process.stdout.write(`Batch ${Math.floor(i / CHUNK) + 1}/${Math.ceil(addresses.length / CHUNK)} `);
        await delay(400);
    }
    console.log('\n');

    return verified;
}

async function main() {
    console.log('🚀 Finding New Pump.fun Coins (Volume-Based)\n');
    console.log('='.repeat(70) + '\n');

    // Load existing
    const existing = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const existingSet = new Set(existing.map(c => c.address.toLowerCase()));
    console.log(`📂 ${existing.length} existing coins\n`);

    // Fetch from Birdeye
    const tokens = await fetchBirdeyeByVolume();
    console.log(`\n📊 Total valid tokens: ${tokens.length}`);

    // Dedupe
    const unique = new Map();
    tokens.forEach(t => unique.set(t.address, t));

    // Filter new
    const newAddrs = [...unique.keys()].filter(a => !existingSet.has(a.toLowerCase()));
    console.log(`🆕 New tokens: ${newAddrs.length}`);

    if (newAddrs.length === 0) {
        console.log('\n✅ No new coins found!');
        return;
    }

    // Verify with DexScreener
    const verified = await verifyWithDexScreener(newAddrs);

    // Sort by MC
    verified.sort((a, b) => b.marketCap - a.marketCap);

    console.log('='.repeat(70));
    console.log(`\n🎯 VERIFIED NEW COINS: ${verified.length}\n`);
    console.log('='.repeat(70));

    verified.forEach((t, i) => {
        const mc = t.marketCap >= 1e6 ? `$${(t.marketCap / 1e6).toFixed(2)}M` : `$${(t.marketCap / 1e3).toFixed(0)}K`;
        const vol = t.volume24h >= 1e6 ? `$${(t.volume24h / 1e6).toFixed(2)}M` : `$${((t.volume24h || 0) / 1e3).toFixed(0)}K`;
        console.log(`\n${i + 1}. ${t.name} (${t.symbol})`);
        console.log(`   CA: ${t.address}`);
        console.log(`   MC: ${mc} | Vol24h: ${vol} | Liq: $${((t.liquidity || 0) / 1e3).toFixed(0)}K`);
        console.log(`   Logo: ${t.logo || 'N/A'}`);
    });

    const out = path.join(__dirname, 'new_verified_coins.json');
    fs.writeFileSync(out, JSON.stringify(verified, null, 2));
    console.log(`\n\n✅ Saved to ${out}`);
}

main().catch(console.error);
