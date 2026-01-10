
const fs = require('fs');
const path = require('path');

async function fetchRaydiumPools() {
    console.log('Fetching Raydium pools...');
    let allPools = [];
    let page = 1;
    let hasMore = true;
    const pageSize = 1000; // Try a large page size

    while (hasMore) {
        try {
            console.log(`Fetching page ${page}...`);
            const response = await fetch(`https://api-v3.raydium.io/pools/info/list?page=${page}&pageSize=${pageSize}&sort=liquidity&order=desc`);

            if (!response.ok) {
                console.error(`Failed to fetch page ${page}: ${response.status} ${response.statusText}`);
                break;
            }

            const data = await response.json();
            const pools = data.data.data; // Adjust based on actual response structure if needed

            if (!pools || pools.length === 0) {
                hasMore = false;
            } else {
                allPools = allPools.concat(pools);
                console.log(`Fetched ${pools.length} pools. Total: ${allPools.length}`);
                page++;

                // Safety break to avoid infinite loops during testing, remove for full run
                if (page > 50) {
                    console.log('Reached page limit for initial test.');
                    hasMore = false;
                }
            }
        } catch (error) {
            console.error('Error fetching pools:', error);
            break;
        }
    }

    return allPools;
}

function filterPumpCoins(pools) {
    console.log('Filtering for pump.fun coins...');
    const pumpCoins = new Map();

    pools.forEach(pool => {
        // Check mintA
        if (pool.mintA && pool.mintA.address.endsWith('pump')) {
            pumpCoins.set(pool.mintA.address, pool.mintA);
        }
        // Check mintB
        if (pool.mintB && pool.mintB.address.endsWith('pump')) {
            pumpCoins.set(pool.mintB.address, pool.mintB);
        }
    });

    return Array.from(pumpCoins.values());
}

async function main() {
    const pools = await fetchRaydiumPools();
    console.log(`Total pools fetched: ${pools.length}`);

    // Since I don't know the exact structure of mintA/mintB yet, I'll log one pool to inspect structure if I ran it, 
    // but for now I'll assume standard structure or I'll fix it after seeing output.
    // However, to be safe, I'll just save the raw pools first to inspect structure or just handle the filtering carefully.

    // Actually, let's just inspect the first pool's structure in the console log of the actual run
    if (pools.length > 0) {
        console.log('Sample pool structure:', JSON.stringify(pools[0], null, 2));
    }

    // Attempt filtering - note: structure navigation might be wrong so I'll wrap in try-catch in the filter function
    // Refined filter function based on likely structure from APIdocs (often it's mintA: { address: ... } or just mintA: "address")

    const potentialPumpCoins = [];

    for (const pool of pools) {
        try {
            // Check Mint A
            let mintA = pool.mintA;
            let addressA = typeof mintA === 'string' ? mintA : mintA?.address;

            if (addressA && addressA.endsWith('pump')) {
                potentialPumpCoins.push({
                    address: addressA,
                    symbol: pool.mintA.symbol || 'Vk', // Fallback
                    name: pool.mintA.name || 'Unknown',
                    liquidity: pool.tvl, // Assuming TVL is available
                    price: pool.price,
                    // Add other pool info that helps rank them
                    volume: pool.day.volume,
                });
            }

            // Check Mint B
            let mintB = pool.mintB;
            let addressB = typeof mintB === 'string' ? mintB : mintB?.address;

            if (addressB && addressB.endsWith('pump')) {
                potentialPumpCoins.push({
                    address: addressB,
                    symbol: pool.mintB.symbol || 'Vk',
                    name: pool.mintB.name || 'Unknown',
                    liquidity: pool.tvl,
                    price: 1 / pool.price, // roughly?
                    volume: pool.day.volume,
                });
            }
        } catch (e) {
            // ignore
        }
    }

    console.log(`Found ${potentialPumpCoins.length} potential pump coins.`);

    // Deduplicate
    const uniqueCoins = Array.from(new Map(potentialPumpCoins.map(c => [c.address, c])).values());
    console.log(`Unique pump coins: ${uniqueCoins.length}`);

    const outputPath = path.join(__dirname, '../data/raydium_pump_coins.json');
    fs.writeFileSync(outputPath, JSON.stringify(uniqueCoins, null, 2));
    console.log(`Saved to ${outputPath}`);
}

main();
