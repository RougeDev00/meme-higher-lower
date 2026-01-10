/**
 * Improved Bitquery Coin Fetcher
 * 
 * Uses correct protocol names found:
 * - bonkswap for BONK.fun
 * - pump, pump_amm for Pump.fun
 * 
 * Run with: node scripts/fetch-bitquery-v2.js
 */

const fs = require('fs');
const path = require('path');

const BITQUERY_API = 'https://streaming.bitquery.io/graphql';
const BITQUERY_TOKEN = 'ory_at_56LmEsNqnOWS7V7XSI-ymUTyQ_QSPNN566fpceyhNic.VleMEoz6t5TUhlQk2thrl9gAgOTpZGNbBzAIcHmO92A';

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
            console.error('GraphQL errors:', data.errors);
        }
        return data;
    } catch (error) {
        console.error('Request error:', error.message);
        return null;
    }
}

// Fetch top tokens by trading volume from a specific protocol
async function fetchProtocolTokens(protocols, platformLabel, limit = 300) {
    console.log(`📦 Fetching ${platformLabel} tokens (protocols: ${protocols.join(', ')})...`);

    const protocolFilter = protocols.length === 1
        ? `{is: "${protocols[0]}"}`
        : `{in: [${protocols.map(p => `"${p}"`).join(', ')}]}`;

    const query = `
    query {
      Solana {
        DEXTradeByTokens(
          limit: {count: ${limit}}
          orderBy: {descendingByField: "usd"}
          where: {
            Trade: {
              Dex: {
                ProtocolName: ${protocolFilter}
              }
              Currency: {
                MintAddress: {notIn: ["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"]}
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
          usd: sum(of: Trade_AmountInUSD)
          trades: count
        }
      }
    }
  `;

    const result = await queryBitquery(query);

    if (!result?.data?.Solana?.DEXTradeByTokens) {
        console.log(`  No tokens found for ${platformLabel}`);
        return [];
    }

    const tokens = result.data.Solana.DEXTradeByTokens
        .filter(t =>
            t.Trade?.Currency?.Symbol &&
            t.Trade?.Currency?.Name &&
            t.Trade?.Currency?.Symbol.length <= 15 &&
            t.Trade?.Currency?.Name.length <= 50
        )
        .map(t => ({
            symbol: t.Trade.Currency.Symbol,
            name: t.Trade.Currency.Name,
            address: t.Trade.Currency.MintAddress,
            platform: platformLabel,
            volumeUsd: t.usd || 0,
            trades: t.trades || 0
        }));

    console.log(`  Found ${tokens.length} ${platformLabel} tokens`);
    return tokens;
}

// Enrich tokens with DexScreener data (market cap, logo, price)
async function enrichWithDexScreener(tokens) {
    console.log('\n🔍 Enriching tokens with DexScreener data...');

    const enrichedTokens = [];
    let processed = 0;

    // Process in batches
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
                enrichedTokens.push({
                    id: token.symbol.toLowerCase().replace(/[^a-z0-9]/g, '') || 'unknown',
                    name: token.name,
                    symbol: token.symbol,
                    address: token.address,
                    marketCap: pair.marketCap || pair.fdv || 0,
                    logo: pair.info?.imageUrl,
                    color: generateColor(token.symbol),
                    platform: token.platform,
                    priceUsd: parseFloat(pair.priceUsd) || 0,
                    liquidity: pair.liquidity?.usd || 0,
                    volumeUsd: token.volumeUsd
                });
            }

            processed++;
            if (processed % 30 === 0) {
                console.log(`  Processed ${processed}/${tokens.length} tokens, ${enrichedTokens.length} valid`);
            }

            await delay(80);
        } catch (err) {
            // Skip
        }
    }

    console.log(`  Total enriched: ${enrichedTokens.length} tokens`);
    return enrichedTokens;
}

async function main() {
    console.log('🚀 Improved Bitquery Coin Fetcher\n');
    console.log('Protocols: bonkswap (BONK.fun), pump/pump_amm (Pump.fun)\n');

    // Fetch BONK.fun tokens
    const bonkTokens = await fetchProtocolTokens(['bonkswap'], 'BONK.fun', 400);
    await delay(1000);

    // Fetch Pump.fun tokens
    const pumpTokens = await fetchProtocolTokens(['pump', 'pump_amm'], 'Pump.fun', 500);
    await delay(1000);

    // Also get some Raydium/Meteora top meme coins for variety
    const rayTokens = await fetchProtocolTokens(['raydium_cp_swap', 'cp_amm'], 'Raydium/Meteora', 200);

    // Combine
    const allTokens = [...bonkTokens, ...pumpTokens, ...rayTokens];
    console.log(`\n📊 Total tokens: ${allTokens.length}`);

    // Dedupe by address
    const uniqueMap = new Map();
    for (const token of allTokens) {
        if (!uniqueMap.has(token.address)) {
            uniqueMap.set(token.address, token);
        }
    }
    const uniqueTokens = Array.from(uniqueMap.values());
    console.log(`  Unique tokens: ${uniqueTokens.length}`);

    // Enrich with DexScreener
    const enrichedTokens = await enrichWithDexScreener(uniqueTokens);

    if (enrichedTokens.length === 0) {
        console.log('\n❌ No valid tokens found.');
        return;
    }

    // Sort by market cap
    enrichedTokens.sort((a, b) => b.marketCap - a.marketCap);

    // Dedupe by symbol
    const seenSymbols = new Set();
    const deduped = enrichedTokens.filter(t => {
        const key = t.symbol.toLowerCase();
        if (seenSymbols.has(key)) return false;
        seenSymbols.add(key);
        return true;
    });

    // Add rank
    const finalTokens = deduped.map((t, i) => ({ ...t, rank: i + 1 }));

    // Save
    const outputPath = path.join(__dirname, '..', 'data', 'coins.json');
    fs.writeFileSync(outputPath, JSON.stringify(finalTokens, null, 2));

    // Stats
    const platforms = {};
    finalTokens.forEach(t => { platforms[t.platform] = (platforms[t.platform] || 0) + 1; });

    console.log(`\n✅ Saved ${finalTokens.length} coins`);
    console.log('\nBy platform:');
    Object.entries(platforms).sort((a, b) => b[1] - a[1]).forEach(([p, n]) => {
        console.log(`  ${p}: ${n}`);
    });

    console.log('\nTop 25:');
    finalTokens.slice(0, 25).forEach((c, i) => {
        const mc = c.marketCap >= 1e9 ? `$${(c.marketCap / 1e9).toFixed(2)}B` : `$${(c.marketCap / 1e6).toFixed(2)}M`;
        console.log(`  ${i + 1}. ${c.symbol} - ${c.name} (${c.platform}) - ${mc}`);
    });
}

main().catch(console.error);
