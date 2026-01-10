/**
 * Bitquery Protocol Explorer
 * Find available DEX protocol names on Solana
 */

const BITQUERY_API = 'https://streaming.bitquery.io/graphql';
const BITQUERY_TOKEN = 'ory_at_56LmEsNqnOWS7V7XSI-ymUTyQ_QSPNN566fpceyhNic.VleMEoz6t5TUhlQk2thrl9gAgOTpZGNbBzAIcHmO92A';

async function queryBitquery(query) {
    const response = await fetch(BITQUERY_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${BITQUERY_TOKEN}`
        },
        body: JSON.stringify({ query })
    });
    return response.json();
}

async function main() {
    console.log('🔍 Exploring Solana DEX protocols on Bitquery...\n');

    // Query to find all available protocols
    const query = `
    query {
      Solana {
        DEXTrades(
          limit: {count: 100}
          where: {
            Block: {
              Time: {after: "2024-12-01T00:00:00Z"}
            }
          }
        ) {
          Trade {
            Dex {
              ProtocolName
              ProtocolFamily
              ProgramAddress
            }
          }
        }
      }
    }
  `;

    const result = await queryBitquery(query);

    if (result.errors) {
        console.error('API Errors:', result.errors);
        return;
    }

    // Extract unique protocols
    const protocols = new Map();
    for (const trade of (result.data?.Solana?.DEXTrades || [])) {
        const name = trade.Trade?.Dex?.ProtocolName;
        const family = trade.Trade?.Dex?.ProtocolFamily;
        const program = trade.Trade?.Dex?.ProgramAddress;
        if (name && !protocols.has(name)) {
            protocols.set(name, { name, family, program });
        }
    }

    console.log('Found protocols:\n');
    [...protocols.values()].sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
        console.log(`  ${p.name} (${p.family || 'unknown family'})`);
    });

    // Also try to find bonk and bags specifically
    console.log('\n\nSearching for "bonk" in protocol names...');
    const bonkQuery = `
    query {
      Solana {
        DEXTrades(
          limit: {count: 10}
          where: {
            Trade: {
              Dex: {
                ProtocolName: {includes: "bonk"}
              }
            }
          }
        ) {
          Trade {
            Dex {
              ProtocolName
              ProtocolFamily
            }
          }
        }
      }
    }
  `;

    const bonkResult = await queryBitquery(bonkQuery);
    if (bonkResult.data?.Solana?.DEXTrades?.length > 0) {
        console.log('  Found bonk protocols:');
        bonkResult.data.Solana.DEXTrades.forEach(t => {
            console.log(`    - ${t.Trade.Dex.ProtocolName}`);
        });
    } else {
        console.log('  No protocols with "bonk" found');
    }

    console.log('\nSearching for "bags" in protocol names...');
    const bagsQuery = `
    query {
      Solana {
        DEXTrades(
          limit: {count: 10}
          where: {
            Trade: {
              Dex: {
                ProtocolName: {includes: "bags"}
              }
            }
          }
        ) {
          Trade {
            Dex {
              ProtocolName
              ProtocolFamily
            }
          }
        }
      }
    }
  `;

    const bagsResult = await queryBitquery(bagsQuery);
    if (bagsResult.data?.Solana?.DEXTrades?.length > 0) {
        console.log('  Found bags protocols:');
        bagsResult.data.Solana.DEXTrades.forEach(t => {
            console.log(`    - ${t.Trade.Dex.ProtocolName}`);
        });
    } else {
        console.log('  No protocols with "bags" found');
    }
}

main().catch(console.error);
