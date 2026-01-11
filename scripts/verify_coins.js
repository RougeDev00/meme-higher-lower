const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const DB_PATH = path.join(__dirname, '../data/coins.json');
const REPORT_PATH = path.join(__dirname, '../analysis_docs/verification_report.md');

const CHUNK_SIZE = 25;
const DELAY_MS = 300;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchChunk(addresses) {
    const ids = addresses.join(',');
    const url = `https://api.dexscreener.com/latest/dex/tokens/${ids}`;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return data.pairs || [];
    } catch (e) {
        console.error(`Fetch error: ${e.message}`);
        return null;
    }
}

async function main() {
    const coins = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    console.log(`Verifying ${coins.length} coins against DexScreener...\n`);

    const addresses = coins.map(c => c.address).filter(Boolean);
    const chunks = [];
    for (let i = 0; i < addresses.length; i += CHUNK_SIZE) {
        chunks.push(addresses.slice(i, i + CHUNK_SIZE));
    }

    // Collect all pairs
    const allPairs = [];
    for (let i = 0; i < chunks.length; i++) {
        process.stdout.write(`Batch ${i + 1}/${chunks.length}... `);
        const pairs = await fetchChunk(chunks[i]);
        if (pairs) {
            allPairs.push(...pairs);
            console.log(`${pairs.length} pairs`);
        } else {
            console.log('FAILED');
        }
        await delay(DELAY_MS);
    }

    // Create map: address -> best pair (highest liquidity SOL pair)
    const pairMap = new Map();
    allPairs.forEach(p => {
        if (p.chainId !== 'solana') return;
        const addr = p.baseToken?.address;
        if (!addr) return;
        const existing = pairMap.get(addr);
        const liq = p.liquidity?.usd || 0;
        if (!existing || liq > (existing.liquidity?.usd || 0)) {
            pairMap.set(addr, p);
        }
    });

    // Verification
    let report = `# Coin Verification Report\n\n`;
    report += `**Time**: ${new Date().toISOString()}\n`;
    report += `**Coins in DB**: ${coins.length}\n`;
    report += `**Pairs Found on DexScreener**: ${pairMap.size}\n\n`;

    const issues = [];
    const notFound = [];
    let okCount = 0;

    coins.forEach(c => {
        const pair = pairMap.get(c.address);
        if (!pair) {
            notFound.push(c);
            return;
        }

        const liveMC = pair.fdv || pair.marketCap || 0;
        const dbMC = c.marketCap || 0;
        const diff = Math.abs(liveMC - dbMC);
        const pct = dbMC > 0 ? (diff / dbMC) * 100 : 0;

        // Flag if difference > 20%
        if (pct > 20) {
            issues.push({
                name: c.name,
                symbol: c.symbol,
                address: c.address,
                dbMC,
                liveMC,
                diff,
                pct: pct.toFixed(1)
            });
        } else {
            okCount++;
        }
    });

    report += `## Summary\n`;
    report += `- ✅ **OK** (within 20%): ${okCount}\n`;
    report += `- ⚠️ **Discrepancies** (>20% diff): ${issues.length}\n`;
    report += `- ❌ **Not Found on DexScreener**: ${notFound.length}\n\n`;

    if (issues.length > 0) {
        report += `## Discrepancies (>20% Difference)\n`;
        report += `| Coin | Symbol | DB MC | Live MC | Diff % |\n`;
        report += `|---|---|---|---|---|\n`;
        issues.slice(0, 30).forEach(i => {
            report += `| ${i.name} | ${i.symbol} | $${Math.round(i.dbMC).toLocaleString()} | $${Math.round(i.liveMC).toLocaleString()} | ${i.pct}% |\n`;
        });
        report += `\n`;
    }

    if (notFound.length > 0) {
        report += `## Not Found on DexScreener\n`;
        report += `| Coin | Symbol | Address |\n`;
        report += `|---|---|---|\n`;
        notFound.slice(0, 20).forEach(c => {
            report += `| ${c.name} | ${c.symbol} | ${c.address?.substring(0, 10)}... |\n`;
        });
        report += `\n`;
    }

    console.log(`\n--- VERIFICATION COMPLETE ---`);
    console.log(`OK: ${okCount} | Issues: ${issues.length} | Not Found: ${notFound.length}`);

    fs.writeFileSync(REPORT_PATH, report);
    console.log(`Report saved to: analysis_docs/verification_report.md`);
}

main();
