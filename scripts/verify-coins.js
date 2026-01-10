/**
 * Coin Data Verification Script
 * 
 * Verifies the accuracy of all coins in the database:
 * - Market cap accuracy
 * - Logo URL accessibility
 * - Name and symbol correctness
 * - Platform information
 * 
 * Run with: node scripts/verify-coins.js
 */

const fs = require('fs');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Stats tracking
const stats = {
    total: 0,
    verified: 0,
    warnings: [],
    errors: [],
    fixedCoins: []
};

async function verifyLogo(url, coinName) {
    if (!url || !url.startsWith('http')) {
        return { valid: false, error: 'Invalid logo URL' };
    }

    try {
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok) {
            return { valid: false, error: `Logo returns ${response.status}` };
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            return { valid: false, error: `Logo is not an image (${contentType})` };
        }
        return { valid: true };
    } catch (error) {
        return { valid: false, error: `Logo fetch failed: ${error.message}` };
    }
}

async function verifyMarketCapFromDexScreener(address) {
    try {
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${address}`
        );
        const data = await response.json();
        const solanaPairs = (data.pairs || []).filter(p => p.chainId === 'solana');

        if (solanaPairs.length === 0) {
            return { valid: false, error: 'No Solana pairs found' };
        }

        // Get pair with highest liquidity
        solanaPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
        const bestPair = solanaPairs[0];

        return {
            valid: true,
            marketCap: bestPair.marketCap || bestPair.fdv || 0,
            name: bestPair.baseToken?.name,
            symbol: bestPair.baseToken?.symbol,
            logo: bestPair.info?.imageUrl,
            priceUsd: parseFloat(bestPair.priceUsd) || 0,
            liquidity: bestPair.liquidity?.usd || 0,
            volumeUsd: bestPair.volume?.h24 || 0,
            dexId: bestPair.dexId,
            pairAddress: bestPair.pairAddress
        };
    } catch (error) {
        return { valid: false, error: `DexScreener API error: ${error.message}` };
    }
}

function normalizePlatform(dexId, pairAddress, tokenAddress) {
    // IMPORTANT: Check token address FIRST to identify origin launchpad
    // Many tokens born on Pump.fun migrate to Raydium but should still be classified as Pump.fun
    const tokenAddr = (tokenAddress || '').toLowerCase();

    // Priority 1: Token address pattern (identifies origin launchpad)
    if (tokenAddr.endsWith('pump')) return 'Pump.fun';
    if (tokenAddr.endsWith('bonk')) return 'BONK.fun';
    if (tokenAddr.endsWith('moon')) return 'Moonshot';

    // Priority 2: DEX ID / Pair address (for tokens not from known launchpads)
    const lowerDex = (dexId || '').toLowerCase();
    const pairAddr = (pairAddress || '').toLowerCase();

    if (lowerDex.includes('pump') || pairAddr.endsWith('pump')) return 'Pump.fun';
    if (lowerDex.includes('bonk') || pairAddr.endsWith('bonk')) return 'BONK.fun';
    if (lowerDex.includes('bags')) return 'Bags.fm';
    if (lowerDex.includes('moon') || pairAddr.endsWith('moon')) return 'Moonshot';

    const map = {
        'raydium': 'Raydium',
        'orca': 'Orca',
        'meteora': 'Meteora',
        'jupiter': 'Jupiter',
        'pumpswap': 'Pump.fun',
        'fluxbeam': 'FluxBeam'
    };

    return map[lowerDex] || dexId || 'Unknown';
}

async function verifyCoin(coin, index) {
    stats.total++;

    const issues = [];
    let updatedCoin = { ...coin };

    // 1. Verify logo
    const logoCheck = await verifyLogo(coin.logo, coin.name);
    if (!logoCheck.valid) {
        issues.push(`Logo issue: ${logoCheck.error}`);
    }

    await delay(250); // Rate limiting

    // 2. Verify market cap and other data from DexScreener
    const dexData = await verifyMarketCapFromDexScreener(coin.address);

    if (!dexData.valid) {
        stats.errors.push({
            rank: coin.rank,
            name: coin.name,
            symbol: coin.symbol,
            address: coin.address,
            error: dexData.error
        });
        console.log(`  ❌ [${index + 1}/${stats.total}] ${coin.symbol} - ${dexData.error}`);
        return coin; // Return original if we can't verify
    }

    // Check for discrepancies
    const mcDiff = Math.abs(coin.marketCap - dexData.marketCap) / coin.marketCap;

    if (mcDiff > 0.1) { // More than 10% difference
        issues.push(`Market cap mismatch: stored=$${(coin.marketCap / 1e6).toFixed(2)}M, actual=$${(dexData.marketCap / 1e6).toFixed(2)}M (${(mcDiff * 100).toFixed(1)}% diff)`);
        updatedCoin.marketCap = dexData.marketCap;
    }

    // Check name
    if (dexData.name && dexData.name !== coin.name) {
        issues.push(`Name mismatch: stored="${coin.name}", actual="${dexData.name}"`);
        updatedCoin.name = dexData.name;
    }

    // Check symbol
    if (dexData.symbol && dexData.symbol !== coin.symbol) {
        issues.push(`Symbol mismatch: stored="${coin.symbol}", actual="${dexData.symbol}"`);
        updatedCoin.symbol = dexData.symbol;
    }

    // Check platform - use TOKEN ADDRESS first to identify origin launchpad
    const actualPlatform = normalizePlatform(dexData.dexId, dexData.pairAddress, coin.address);
    if (actualPlatform !== coin.platform) {
        issues.push(`Platform mismatch: stored="${coin.platform}", actual="${actualPlatform}"`);
        updatedCoin.platform = actualPlatform;
    }

    // Update current data
    updatedCoin.priceUsd = dexData.priceUsd;
    updatedCoin.liquidity = dexData.liquidity;
    if (dexData.volumeUsd) {
        updatedCoin.volumeUsd = dexData.volumeUsd;
    }

    // Update logo if different
    if (dexData.logo && dexData.logo !== coin.logo) {
        updatedCoin.logo = dexData.logo;
    }

    if (issues.length > 0) {
        const warningEntry = {
            rank: coin.rank,
            name: coin.name,
            symbol: coin.symbol,
            address: coin.address,
            issues: issues
        };
        stats.warnings.push(warningEntry);
        console.log(`  ⚠️  [${index + 1}/${stats.total}] ${coin.symbol} - ${issues.length} issue(s)`);
        stats.fixedCoins.push(updatedCoin);
    } else {
        console.log(`  ✅ [${index + 1}/${stats.total}] ${coin.symbol} - OK`);
        stats.verified++;
    }

    return updatedCoin;
}

async function main() {
    console.log('🔍 Coin Database Verification\n');
    console.log('This will verify all coins in the database...\n');

    // Load coins
    const coinsPath = path.join(__dirname, '..', 'data', 'coins.json');
    const coins = JSON.parse(fs.readFileSync(coinsPath, 'utf8'));

    console.log(`Loaded ${coins.length} coins\n`);
    stats.total = coins.length;

    console.log('Starting verification...\n');

    const verifiedCoins = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < coins.length; i += BATCH_SIZE) {
        const batch = coins.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map((coin, idx) => verifyCoin(coin, i + idx)));
        verifiedCoins.push(...results);

        // Progress update
        const currentCount = Math.min(i + BATCH_SIZE, coins.length);
        if (currentCount % 50 === 0 || currentCount === coins.length) {
            console.log(`\n  Progress: ${currentCount}/${coins.length} (${(currentCount / coins.length * 100).toFixed(1)}%)\n`);
        }

        await delay(500); // Wait between batches to be nice to API
    }

    // Generate report
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 VERIFICATION REPORT');
    console.log('='.repeat(60) + '\n');

    console.log(`Total coins: ${stats.total}`);
    console.log(`Verified OK: ${stats.verified} (${(stats.verified / stats.total * 100).toFixed(1)}%)`);
    console.log(`Warnings: ${stats.warnings.length} (${(stats.warnings.length / stats.total * 100).toFixed(1)}%)`);
    console.log(`Errors: ${stats.errors.length} (${(stats.errors.length / stats.total * 100).toFixed(1)}%)\n`);

    // Save detailed report
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            total: stats.total,
            verified: stats.verified,
            warnings: stats.warnings.length,
            errors: stats.errors.length
        },
        warnings: stats.warnings,
        errors: stats.errors
    };

    const reportPath = path.join(__dirname, '..', 'data', 'verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Detailed report saved to: ${reportPath}\n`);

    // Save updated coins if there were fixes
    if (stats.fixedCoins.length > 0) {
        // Re-sort by market cap and update ranks
        verifiedCoins.sort((a, b) => b.marketCap - a.marketCap);
        verifiedCoins.forEach((coin, i) => coin.rank = i + 1);

        const backupPath = path.join(__dirname, '..', 'data', 'coins-backup.json');
        fs.writeFileSync(backupPath, JSON.stringify(coins, null, 2));
        console.log(`Backup created: ${backupPath}`);

        fs.writeFileSync(coinsPath, JSON.stringify(verifiedCoins, null, 2));
        console.log(`Updated coins saved with fixes applied\n`);
    }

    // Show top issues
    if (stats.warnings.length > 0) {
        console.log('\n⚠️  Top 10 Warnings:');
        stats.warnings.slice(0, 10).forEach((w, i) => {
            console.log(`\n${i + 1}. ${w.symbol} (Rank #${w.rank})`);
            w.issues.forEach(issue => console.log(`   - ${issue}`));
        });
    }

    if (stats.errors.length > 0) {
        console.log('\n\n❌ Errors:');
        stats.errors.forEach((e, i) => {
            console.log(`${i + 1}. ${e.symbol} (Rank #${e.rank}) - ${e.error}`);
        });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification complete!');
    console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
