/**
 * Pump.fun Only Token Fetcher - Bitquery Edition
 * 
 * Strategy:
 * 1. Fetch top 1000 tokens by volume from Pump.fun protocol via Bitquery
 * 2. Enrich with DexScreener to get Logo, Market Cap, and Price
 * 3. Filter for valid data and image
 * 4. Save top 600
 * 
 * Run with: node scripts/fetch-pump-bitquery.js
 */

const fs = require('fs');
const path = require('path');

const BITQUERY_API = 'https://streaming.bitquery.io/graphql';
const BITQUERY_TOKEN = 'ory_at_56LmEsNqnOWS7V7XSI-ymUTyQ_QSPNN566fpceyhNic.VleMEoz6t5TUhlQk2thrl9gAgOTpZGNbBzAIcHmO92A';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function generateColor(str) {
    const colors = [
        '#9945FF', '#14F195', '#FF6B6B', '#4ECDC4', '#FFE66D',
        '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA',
        '#FF9F43', '#EE5A24', '#009432', '#0652DD', '#9980FA'
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
            console.error('GraphQL errors:', JSON.stringify(data.errors));
        }
        return data;
    } catch (error) {
        console.error('Request error:', error.message);
        return null;
    }
}

async function fetchPumpFunTokens(limit = 4500) {
    console.log(`📦 Fetching ${limit} tokens (Pump.fun + Graduated on Raydium) via Bitquery...`);

    // We fetch from both Pump protocol (bonding curve) and Raydium (graduated)
    // We will filter for "pump" suffix in JS
    const query = `
    query {
      Solana {
        DEXTradeByTokens(
          limit: {count: ${limit}}
          orderBy: {descendingByField: "usd"}
          where: {
            Trade: {
              Dex: {
                ProtocolName: {in: ["pump", "pump_amm", "pumpfun", "raydium", "raydium_clmm", "raydium_cp"]}
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
        console.log('  No tokens found');
        return [];
    }

    // Transform and Strict Filter for "pump" suffix
    const tokens = result.data.Solana.DEXTradeByTokens
        .filter(t => t.Trade.Currency.MintAddress.endsWith('pump')) // THE CRITICAL FILTER
        .map(t => ({
            symbol: t.Trade.Currency.Symbol,
            name: t.Trade.Currency.Name,
            address: t.Trade.Currency.MintAddress,
            platform: 'Pump.fun',
            volumeUsd: t.usd || 0
        }));

    console.log(`  Found ${tokens.length} tokens ending in 'pump' (from Pump & Raydium)`);
    return tokens;
}

// Enrich tokens with DexScreener data
async function enrichWithDexScreener(tokens) {
    console.log('\n🔍 Enriching tokens with DexScreener data...');

    const enrichedTokens = [];
    let processed = 0;


    // Process in batches of 20
    const BATCH_SIZE = 20;
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (token) => {
            try {
                const response = await fetch(
                    `https://api.dexscreener.com/latest/dex/tokens/${token.address}`
                );
                const data = await response.json();

                // Find best pair (Solana, highest liquidity, has image)
                const pair = (data.pairs || []).find(p =>
                    p.chainId === 'solana' &&
                    (p.info?.imageUrl || token.uri) &&
                    p.marketCap > 50000 // Strict 50k limit as requested
                );

                if (pair && pair.info?.imageUrl) {
                    const mc = pair.marketCap || pair.fdv || 0;

                    enrichedTokens.push({
                        id: token.symbol.toLowerCase().replace(/[^a-z0-9]/g, '') || 'unknown',
                        name: token.name,
                        symbol: token.symbol,
                        address: token.address,
                        marketCap: mc,
                        logo: pair.info.imageUrl,
                        color: generateColor(token.symbol),
                        platform: 'Pump.fun',
                        priceUsd: parseFloat(pair.priceUsd) || 0,
                        liquidity: pair.liquidity?.usd || 0,
                        volumeUsd: token.volumeUsd
                    });
                }
            } catch (err) {
                // Skip
            }
        }));

        processed += batch.length;
        if (processed % 200 === 0) {
            process.stdout.write(`  Processed ${processed}/${tokens.length}, Valid: ${enrichedTokens.length}\n`);
        }

        // Slight delay between batches to respect rate limits (300 req/min usually safe)
        await delay(300);

        if (enrichedTokens.length >= 800) {
            console.log(`\n  Hit target of 800 valid coins. Stopping enrichment.`);
            break;
        }
    }

    console.log(`\n  Total enriched: ${enrichedTokens.length} tokens`);
    return enrichedTokens;
}

async function main() {
    console.log('🚀 Pump.fun Ultimate Fetcher (Bitquery -> DexScreener)\n');

    // 1. Fetch raw list from Bitquery (high volume first)
    // Fetch 4500 to ensure we find 600 with >50k MC
    const rawTokens = await fetchPumpFunTokens(4500);

    if (rawTokens.length === 0) {
        console.error('Failed to get tokens from Bitquery.');
        return;
    }

    // 2. Enrich
    const enriched = await enrichWithDexScreener(rawTokens);

    // 3. Sort by Market Cap
    enriched.sort((a, b) => b.marketCap - a.marketCap);

    // 4. Clean & Dedupe
    const seenSymbols = new Set();
    const finalTokens = [];

    const EXCLUDED = new Set(['SOL', 'USDC', 'USDT', 'WETH']);

    for (const t of enriched) {
        let s = t.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (s.length < 2 || EXCLUDED.has(s)) continue;

        if (seenSymbols.has(s)) continue; // Keep highest MC
        seenSymbols.add(s);

        finalTokens.push(t);
    }

    // 5. Cut to top 600
    const top600 = finalTokens.slice(0, 600).map((t, i) => ({ ...t, rank: i + 1 }));

    // 6. Save
    const outputPath = path.join(__dirname, '..', 'data', 'coins.json');
    fs.writeFileSync(outputPath, JSON.stringify(top600, null, 2));

    console.log(`\n✅ Saved ${top600.length} coins to ${outputPath}`);

    // Stats
    console.log('\nTop 5:');
    top600.slice(0, 5).forEach(c => {
        console.log(`  ${c.rank}. ${c.symbol} - $${(c.marketCap / 1000).toFixed(0)}k`);
    });
}

main().catch(console.error);
