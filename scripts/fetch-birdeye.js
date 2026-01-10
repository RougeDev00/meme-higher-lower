/**
 * Birdeye Meme Coin Fetcher
 * 
 * Fetches tokens from Birdeye API with platform filtering:
 * - raydium_launchlab = BONK.fun
 * - pump = Pump.fun
 * 
 * Requires: BIRDEYE_API_KEY environment variable
 * 
 * Run with: BIRDEYE_API_KEY=your_key node scripts/fetch-birdeye.js
 */

const fs = require('fs');
const path = require('path');

// Get API key from environment or use placeholder
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || 'YOUR_API_KEY_HERE';
const BIRDEYE_API = 'https://public-api.birdeye.so';

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

// Tokens to exclude (utility/DeFi, not meme coins)
const EXCLUDED_SYMBOLS = new Set([
    'USDT', 'USDC', 'SOL', 'WSOL', 'ETH', 'WETH', 'WBTC', 'BTC',
    'JUP', 'RAY', 'JTO', 'JITO', 'PYTH', 'INF', 'W', 'KMNO',
    'MNGO', 'SRM', 'PORT', 'SNY', 'SLND', 'MSOL', 'BSOL', 'JSOL',
    'GRASS', 'META', 'ME', 'LST', 'TNSR', 'CLOUD', 'STEP'
]);

async function fetchBirdeyeTokens(source, platformLabel, limit = 500) {
    console.log(`📦 Fetching ${platformLabel} tokens from Birdeye...`);

    try {
        const url = `${BIRDEYE_API}/defi/v3/token/list?chain=solana&sort_by=mc&sort_type=desc&offset=0&limit=${limit}`;

        const response = await fetch(url, {
            headers: {
                'X-API-KEY': BIRDEYE_API_KEY,
                'x-chain': 'solana'
            }
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`  API Error ${response.status}: ${text.substring(0, 200)}`);
            return [];
        }

        const data = await response.json();

        if (!data.success || !data.data?.items) {
            console.log(`  No data returned for ${platformLabel}`);
            return [];
        }

        // Filter by source if specified
        let tokens = data.data.items;
        if (source) {
            tokens = tokens.filter(t => t.source === source);
        }

        // Filter valid tokens
        tokens = tokens.filter(t =>
            t.symbol &&
            t.name &&
            t.mc > 10000 &&
            t.logo_uri &&
            !EXCLUDED_SYMBOLS.has(t.symbol.toUpperCase())
        );

        const result = tokens.map(t => ({
            id: t.symbol.toLowerCase().replace(/[^a-z0-9]/g, ''),
            name: t.name,
            symbol: t.symbol,
            address: t.address,
            marketCap: t.mc || 0,
            logo: t.logo_uri,
            color: generateColor(t.symbol),
            platform: platformLabel,
            priceUsd: t.price || 0,
            liquidity: t.liquidity || 0
        }));

        console.log(`  Found ${result.length} ${platformLabel} tokens`);
        return result;
    } catch (error) {
        console.error(`  Error: ${error.message}`);
        return [];
    }
}

// Alternative: Fetch all tokens and filter by source
async function fetchAllMemeTokens() {
    console.log('📦 Fetching all meme tokens from Birdeye...\n');

    const url = `${BIRDEYE_API}/defi/v3/token/list?chain=solana&sort_by=mc&sort_type=desc&offset=0&limit=1000`;

    try {
        const response = await fetch(url, {
            headers: {
                'X-API-KEY': BIRDEYE_API_KEY,
                'x-chain': 'solana'
            }
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`API Error ${response.status}:`);
            console.error(text.substring(0, 500));
            return [];
        }

        const data = await response.json();

        if (!data.success || !data.data?.items) {
            console.log('No data returned');
            console.log('Response:', JSON.stringify(data).substring(0, 500));
            return [];
        }

        const items = data.data.items;
        console.log(`Total tokens from Birdeye: ${items.length}`);

        // Log unique sources
        const sources = [...new Set(items.map(t => t.source).filter(Boolean))];
        console.log('Available sources:', sources.join(', '));

        // Group by source
        const bySource = {};
        items.forEach(t => {
            const src = t.source || 'unknown';
            if (!bySource[src]) bySource[src] = [];
            bySource[src].push(t);
        });

        console.log('\nTokens by source:');
        Object.entries(bySource).forEach(([src, tokens]) => {
            console.log(`  ${src}: ${tokens.length}`);
        });

        // Map sources to platform names
        const platformMap = {
            'raydium_launchlab': 'BONK.fun',
            'pump': 'Pump.fun',
            'pumpfun': 'Pump.fun',
            'pump.fun': 'Pump.fun',
            'moonshot': 'Moonshot',
            'bags': 'Bags.fm',
            'bags.fm': 'Bags.fm'
        };

        // Filter and transform
        const tokens = items
            .filter(t =>
                t.symbol &&
                t.name &&
                t.mc > 30000 &&
                t.logo_uri &&
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
                logo: t.logo_uri,
                color: generateColor(t.symbol),
                platform: platformMap[t.source] || t.source || 'Unknown',
                priceUsd: t.price || 0,
                liquidity: t.liquidity || 0
            }));

        console.log(`\nFiltered tokens: ${tokens.length}`);
        return tokens;
    } catch (error) {
        console.error('Error:', error.message);
        return [];
    }
}

async function main() {
    console.log('🚀 Birdeye Meme Coin Fetcher\n');

    if (BIRDEYE_API_KEY === 'YOUR_API_KEY_HERE') {
        console.log('❌ Please set BIRDEYE_API_KEY environment variable');
        console.log('\nUsage: BIRDEYE_API_KEY=your_key node scripts/fetch-birdeye.js');
        console.log('\nGet your API key at: https://bds.birdeye.so/');
        return;
    }

    const tokens = await fetchAllMemeTokens();

    if (tokens.length === 0) {
        console.log('\n❌ No tokens found. Check your API key.');
        return;
    }

    // Sort by market cap
    tokens.sort((a, b) => b.marketCap - a.marketCap);

    // Dedupe by symbol
    const seen = new Set();
    const deduped = tokens.filter(t => {
        const key = t.symbol.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
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

    console.log('\nTop 20:');
    finalTokens.slice(0, 20).forEach((c, i) => {
        const mc = c.marketCap >= 1e9 ? `$${(c.marketCap / 1e9).toFixed(2)}B` : `$${(c.marketCap / 1e6).toFixed(2)}M`;
        console.log(`  ${i + 1}. ${c.symbol} - ${c.name} (${c.platform}) - ${mc}`);
    });
}

main().catch(console.error);
