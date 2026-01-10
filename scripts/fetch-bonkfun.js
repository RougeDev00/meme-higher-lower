/**
 * BONK.fun Token Fetcher via Program ID
 * 
 * BONK.fun (LetsBonk) uses Raydium LaunchLab
 * Program ID: LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj
 * 
 * Run with: node scripts/fetch-bonkfun.js
 */

const fs = require('fs');
const path = require('path');

const BITQUERY_API = 'https://streaming.bitquery.io/graphql';
const BITQUERY_TOKEN = 'ory_at_56LmEsNqnOWS7V7XSI-ymUTyQ_QSPNN566fpceyhNic.VleMEoz6t5TUhlQk2thrl9gAgOTpZGNbBzAIcHmO92A';

// BONK.fun (LetsBonk/Raydium LaunchLab) Program ID
const BONKFUN_PROGRAM = 'LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj';

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
    'JUP', 'RAY', 'JTO', 'JITO', 'PYTH', 'INF', 'W', 'KMNO'
]);

async function queryBitquery(query) {
    try {
        const response = await fetch(BITQUERY_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BITQUERY_TOKEN}`
            },
            body: JSON.stringify({ query })
        });
        const data = await response.json();
        if (data.errors) {
            console.error('GraphQL errors:', JSON.stringify(data.errors, null, 2));
        }
        return data;
    } catch (error) {
        console.error('Request error:', error.message);
        return null;
    }
}

// Fetch tokens created by BONK.fun program
async function fetchBonkFunTokens() {
    console.log('📦 Fetching BONK.fun tokens via Program ID...');
    console.log(`   Program: ${BONKFUN_PROGRAM}\n`);

    // Query for tokens traded on pools created by the LaunchLab program
    const query = `
    query {
      Solana {
        DEXTradeByTokens(
          limit: {count: 500}
          orderBy: {descendingByField: "volume"}
          where: {
            Trade: {
              Dex: {
                ProgramAddress: {is: "${BONKFUN_PROGRAM}"}
              }
            }
            Block: {
              Time: {after: "2024-01-01T00:00:00Z"}
            }
          }
        ) {
          Trade {
            Currency {
              Symbol
              Name
              MintAddress
              Uri
            }
            Dex {
              ProtocolName
              ProgramAddress
            }
          }
          volume: sum(of: Trade_AmountInUSD)
          trades: count
        }
      }
    }
  `;

    const result = await queryBitquery(query);

    if (!result?.data?.Solana?.DEXTradeByTokens) {
        console.log('  No tokens found via program address');

        // Try alternative query using protocol name
        console.log('  Trying alternative query with raydium_launchpad...');
        const altQuery = `
      query {
        Solana {
          DEXTradeByTokens(
            limit: {count: 500}
            orderBy: {descendingByField: "volume"}
            where: {
              Trade: {
                Dex: {
                  ProtocolName: {in: ["raydium_launchpad", "letsbonk", "bonkswap"]}
                }
              }
              Block: {
                Time: {after: "2024-01-01T00:00:00Z"}
              }
            }
          ) {
            Trade {
              Currency {
                Symbol
                Name
                MintAddress
                Uri
              }
              Dex {
                ProtocolName
              }
            }
            volume: sum(of: Trade_AmountInUSD)
            trades: count
          }
        }
      }
    `;

        const altResult = await queryBitquery(altQuery);
        if (altResult?.data?.Solana?.DEXTradeByTokens) {
            return processTokens(altResult.data.Solana.DEXTradeByTokens, 'BONK.fun');
        }
        return [];
    }

    return processTokens(result.data.Solana.DEXTradeByTokens, 'BONK.fun');
}

// Fetch Pump.fun tokens
async function fetchPumpFunTokens() {
    console.log('📦 Fetching Pump.fun tokens...');

    const query = `
    query {
      Solana {
        DEXTradeByTokens(
          limit: {count: 500}
          orderBy: {descendingByField: "volume"}
          where: {
            Trade: {
              Dex: {
                ProtocolName: {in: ["pump", "pump_amm", "pumpfun"]}
              }
            }
            Block: {
              Time: {after: "2024-06-01T00:00:00Z"}
            }
          }
        ) {
          Trade {
            Currency {
              Symbol
              Name
              MintAddress
              Uri
            }
          }
          volume: sum(of: Trade_AmountInUSD)
          trades: count
        }
      }
    }
  `;

    const result = await queryBitquery(query);

    if (!result?.data?.Solana?.DEXTradeByTokens) {
        console.log('  No Pump.fun tokens found');
        return [];
    }

    return processTokens(result.data.Solana.DEXTradeByTokens, 'Pump.fun');
}

function processTokens(rawTokens, platform) {
    const tokens = rawTokens
        .filter(t =>
            t.Trade?.Currency?.Symbol &&
            t.Trade?.Currency?.Name &&
            t.Trade?.Currency?.Symbol.length <= 15 &&
            t.Trade?.Currency?.Name.length <= 50 &&
            !EXCLUDED_SYMBOLS.has(t.Trade.Currency.Symbol.toUpperCase())
        )
        .map(t => ({
            symbol: t.Trade.Currency.Symbol,
            name: t.Trade.Currency.Name,
            address: t.Trade.Currency.MintAddress,
            uri: t.Trade.Currency.Uri,
            platform: platform,
            volumeUsd: t.volume || 0,
            trades: t.trades || 0
        }));

    console.log(`  Found ${tokens.length} ${platform} tokens`);
    return tokens;
}

// Enrich with DexScreener
async function enrichWithDexScreener(tokens) {
    console.log('\n🔍 Enriching with DexScreener data...');

    const enriched = [];
    let processed = 0;

    for (const token of tokens) {
        try {
            const response = await fetch(
                `https://api.dexscreener.com/latest/dex/tokens/${token.address}`
            );
            const data = await response.json();

            const pair = (data.pairs || []).find(p =>
                p.chainId === 'solana' &&
                p.marketCap > 30000 &&
                p.info?.imageUrl
            );

            if (pair) {
                enriched.push({
                    id: token.symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
                    name: token.name,
                    symbol: token.symbol,
                    address: token.address,
                    marketCap: pair.marketCap || pair.fdv || 0,
                    logo: pair.info?.imageUrl,
                    color: generateColor(token.symbol),
                    platform: token.platform,
                    priceUsd: parseFloat(pair.priceUsd) || 0,
                    liquidity: pair.liquidity?.usd || 0
                });
            }

            processed++;
            if (processed % 50 === 0) {
                console.log(`  ${processed}/${tokens.length} processed, ${enriched.length} valid`);
            }

            await delay(80);
        } catch (err) {
            // Skip
        }
    }

    console.log(`  Total enriched: ${enriched.length}`);
    return enriched;
}

// Load existing coins and merge
async function mergeWithExisting(newCoins) {
    const existingPath = path.join(__dirname, '..', 'data', 'coins.json');
    let existing = [];

    try {
        existing = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
        console.log(`\n📂 Loaded ${existing.length} existing coins`);
    } catch (e) {
        console.log('\n📂 No existing coins file, starting fresh');
    }

    // Merge by address
    const byAddress = new Map();

    // Add existing
    existing.forEach(c => byAddress.set(c.address, c));

    // Add/update new (prefer new data)
    newCoins.forEach(c => byAddress.set(c.address, c));

    const merged = Array.from(byAddress.values());
    console.log(`  Merged total: ${merged.length}`);

    return merged;
}

async function main() {
    console.log('🚀 BONK.fun + Pump.fun Token Fetcher\n');

    // Fetch from both platforms
    const bonkTokens = await fetchBonkFunTokens();
    await delay(1000);

    const pumpTokens = await fetchPumpFunTokens();

    // Combine and dedupe
    const allTokens = [...bonkTokens, ...pumpTokens];
    console.log(`\n📊 Total raw tokens: ${allTokens.length}`);

    const uniqueMap = new Map();
    allTokens.forEach(t => {
        if (!uniqueMap.has(t.address)) uniqueMap.set(t.address, t);
    });
    const uniqueTokens = Array.from(uniqueMap.values());
    console.log(`  Unique: ${uniqueTokens.length}`);

    // Enrich
    const enriched = await enrichWithDexScreener(uniqueTokens);

    // Merge with existing
    const merged = await mergeWithExisting(enriched);

    // Sort and dedupe by symbol
    merged.sort((a, b) => b.marketCap - a.marketCap);
    const seen = new Set();
    const final = merged.filter(c => {
        const key = c.symbol.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).map((c, i) => ({ ...c, rank: i + 1 }));

    // Save
    const outputPath = path.join(__dirname, '..', 'data', 'coins.json');
    fs.writeFileSync(outputPath, JSON.stringify(final, null, 2));

    // Stats
    const platforms = {};
    final.forEach(c => { platforms[c.platform] = (platforms[c.platform] || 0) + 1; });

    console.log(`\n✅ Saved ${final.length} coins`);
    console.log('\nBy platform:');
    Object.entries(platforms).sort((a, b) => b[1] - a[1]).forEach(([p, n]) => {
        console.log(`  ${p}: ${n}`);
    });

    console.log('\nTop 20:');
    final.slice(0, 20).forEach((c, i) => {
        const mc = c.marketCap >= 1e9 ? `$${(c.marketCap / 1e9).toFixed(2)}B` : `$${(c.marketCap / 1e6).toFixed(2)}M`;
        console.log(`  ${i + 1}. ${c.symbol} (${c.platform}) - ${mc}`);
    });
}

main().catch(console.error);
