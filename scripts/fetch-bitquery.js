/**
 * Bitquery Coin Fetcher - BONK.fun & Bags.fm
 * 
 * Uses Bitquery API to fetch coins from specific launchpads
 * 
 * Run with: node scripts/fetch-bitquery.js
 */

const fs = require('fs');
const path = require('path');

// Bitquery API configuration
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

        if (!response.ok) {
            const text = await response.text();
            console.error('API Error:', response.status, text);
            return null;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Request error:', error.message);
        return null;
    }
}

// Query for LetsBonk (BONK.fun) tokens
async function fetchBonkFunTokens() {
    console.log('📦 Fetching BONK.fun (LetsBonk) tokens...');

    const query = `
    query {
      Solana {
        DEXTradeByTokens(
          limit: {count: 300}
          orderBy: {descendingByField: "volume"}
          where: {
            Trade: {
              Dex: {
                ProtocolName: {is: "letsbonk"}
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
              Decimals
              Fungible
              Uri
            }
            Market {
              MarketAddress
            }
          }
          volume: sum(of: Trade_Amount)
          trades: count
        }
      }
    }
  `;

    const result = await queryBitquery(query);

    if (!result?.data?.Solana?.DEXTradeByTokens) {
        console.log('  No BONK.fun tokens found or API error');
        return [];
    }

    const tokens = result.data.Solana.DEXTradeByTokens
        .filter(t => t.Trade?.Currency?.Symbol && t.Trade?.Currency?.Name)
        .map(t => ({
            symbol: t.Trade.Currency.Symbol,
            name: t.Trade.Currency.Name,
            address: t.Trade.Currency.MintAddress,
            platform: 'BONK.fun',
            volume: t.volume || 0,
            trades: t.trades || 0
        }));

    console.log(`  Found ${tokens.length} BONK.fun tokens`);
    return tokens;
}

// Query for Bags.fm tokens
async function fetchBagsFmTokens() {
    console.log('📦 Fetching Bags.fm tokens...');

    const query = `
    query {
      Solana {
        DEXTradeByTokens(
          limit: {count: 300}
          orderBy: {descendingByField: "volume"}
          where: {
            Trade: {
              Dex: {
                ProtocolName: {is: "bags"}
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
              Decimals
              Fungible
              Uri
            }
            Market {
              MarketAddress
            }
          }
          volume: sum(of: Trade_Amount)
          trades: count
        }
      }
    }
  `;

    const result = await queryBitquery(query);

    if (!result?.data?.Solana?.DEXTradeByTokens) {
        console.log('  No Bags.fm tokens found or API error');
        return [];
    }

    const tokens = result.data.Solana.DEXTradeByTokens
        .filter(t => t.Trade?.Currency?.Symbol && t.Trade?.Currency?.Name)
        .map(t => ({
            symbol: t.Trade.Currency.Symbol,
            name: t.Trade.Currency.Name,
            address: t.Trade.Currency.MintAddress,
            platform: 'Bags.fm',
            volume: t.volume || 0,
            trades: t.trades || 0
        }));

    console.log(`  Found ${tokens.length} Bags.fm tokens`);
    return tokens;
}

// Query for Pump.fun tokens
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
                ProtocolName: {in: ["pump", "pumpfun"]}
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
              Decimals
              Fungible
              Uri
            }
          }
          volume: sum(of: Trade_Amount)
          trades: count
        }
      }
    }
  `;

    const result = await queryBitquery(query);

    if (!result?.data?.Solana?.DEXTradeByTokens) {
        console.log('  No Pump.fun tokens found or API error');
        return [];
    }

    const tokens = result.data.Solana.DEXTradeByTokens
        .filter(t => t.Trade?.Currency?.Symbol && t.Trade?.Currency?.Name)
        .map(t => ({
            symbol: t.Trade.Currency.Symbol,
            name: t.Trade.Currency.Name,
            address: t.Trade.Currency.MintAddress,
            platform: 'Pump.fun',
            volume: t.volume || 0,
            trades: t.trades || 0
        }));

    console.log(`  Found ${tokens.length} Pump.fun tokens`);
    return tokens;
}

// Fetch token details from DexScreener (for market cap, logo, price)
async function enrichWithDexScreener(tokens) {
    console.log('\n🔍 Enriching tokens with DexScreener data...');

    const enrichedTokens = [];
    let processed = 0;

    for (const token of tokens) {
        try {
            const response = await fetch(
                `https://api.dexscreener.com/latest/dex/tokens/${token.address}`
            );
            const data = await response.json();

            const pair = (data.pairs || []).find(p => p.chainId === 'solana');

            if (pair && pair.marketCap > 10000 && pair.info?.imageUrl) {
                enrichedTokens.push({
                    id: token.symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
                    name: token.name,
                    symbol: token.symbol,
                    address: token.address,
                    marketCap: pair.marketCap || pair.fdv || 0,
                    logo: pair.info?.imageUrl,
                    color: generateColor(token.symbol),
                    platform: token.platform,
                    priceUsd: parseFloat(pair.priceUsd) || 0,
                    liquidity: pair.liquidity?.usd || 0,
                    volume24h: token.volume
                });
            }

            processed++;
            if (processed % 50 === 0) {
                console.log(`  Processed ${processed}/${tokens.length} tokens, ${enrichedTokens.length} valid`);
            }

            await delay(100); // Rate limit
        } catch (err) {
            // Skip failed tokens
        }
    }

    console.log(`  Enriched ${enrichedTokens.length} tokens with full data`);
    return enrichedTokens;
}

async function main() {
    console.log('🚀 Bitquery Coin Fetcher - BONK.fun & Bags.fm\n');

    // Fetch from all launchpads
    const bonkTokens = await fetchBonkFunTokens();
    await delay(1000);

    const bagsTokens = await fetchBagsFmTokens();
    await delay(1000);

    const pumpTokens = await fetchPumpFunTokens();

    // Combine all tokens
    const allTokens = [...bonkTokens, ...bagsTokens, ...pumpTokens];
    console.log(`\n📊 Total tokens from launchpads: ${allTokens.length}`);

    if (allTokens.length === 0) {
        console.log('\n❌ No tokens found. Check if the API token is valid.');
        return;
    }

    // Dedupe by address
    const uniqueTokens = [];
    const seen = new Set();
    for (const token of allTokens) {
        if (!seen.has(token.address)) {
            seen.add(token.address);
            uniqueTokens.push(token);
        }
    }
    console.log(`  Unique tokens: ${uniqueTokens.length}`);

    // Enrich with DexScreener
    const enrichedTokens = await enrichWithDexScreener(uniqueTokens);

    // Sort by market cap
    enrichedTokens.sort((a, b) => b.marketCap - a.marketCap);

    // Add rank
    const finalTokens = enrichedTokens.map((t, i) => ({ ...t, rank: i + 1 }));

    // Save
    const outputPath = path.join(__dirname, '..', 'data', 'coins.json');
    fs.writeFileSync(outputPath, JSON.stringify(finalTokens, null, 2));

    // Stats
    const platforms = {};
    finalTokens.forEach(t => { platforms[t.platform] = (platforms[t.platform] || 0) + 1; });

    console.log(`\n✅ Saved ${finalTokens.length} coins to coins.json`);
    console.log('\nBy platform:');
    Object.entries(platforms).sort((a, b) => b[1] - a[1]).forEach(([p, n]) => {
        console.log(`  ${p}: ${n}`);
    });

    console.log('\nTop 20:');
    finalTokens.slice(0, 20).forEach((c, i) => {
        const mc = c.marketCap >= 1e9 ? `$${(c.marketCap / 1e9).toFixed(2)}B` : `$${(c.marketCap / 1e6).toFixed(2)}M`;
        console.log(`  ${i + 1}. ${c.symbol} - ${c.name} (${c.platform}) - ${mc}`);
    });
}

main().catch(console.error);
