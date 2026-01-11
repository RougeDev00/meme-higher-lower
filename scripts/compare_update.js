const fs = require('fs');
const path = require('path');

const OLD_DB_PATH = path.join(__dirname, '../data/coins.json');
const TRACKER_DIR = path.join(__dirname, '../pumpfun_tracker/marketcap_updates');

// Get latest tracker file
const files = fs.readdirSync(TRACKER_DIR).filter(f => f.startsWith('mc_update_') && f.endsWith('.json'));
const latestFile = files.sort().reverse()[0];
const NEW_TRACKER_PATH = path.join(TRACKER_DIR, latestFile);

console.log(`Comparing:\nOLD: data/coins.json\nNEW: ${latestFile}\n`);

const oldCoins = JSON.parse(fs.readFileSync(OLD_DB_PATH, 'utf8'));
const newTrackerData = JSON.parse(fs.readFileSync(NEW_TRACKER_PATH, 'utf8'));
const newTokens = Array.isArray(newTrackerData) ? newTrackerData : (newTrackerData.tokens || []);

// Map new data by address for easy lookup
const newMap = new Map();
newTokens.forEach(t => {
    const addr = t.ca || t.mint || t.address;
    if (addr) newMap.set(addr, parseFloat(t.market_cap || t.mc || 0));
});

let changes = [];
let totalOldMC = 0;
let totalNewMC = 0;

oldCoins.forEach(c => {
    const oldMC = c.marketCap;
    const newMC = newMap.get(c.address);

    if (newMC !== undefined) {
        totalOldMC += oldMC;
        totalNewMC += newMC;
        const diff = newMC - oldMC;
        const percent = oldMC > 0 ? ((diff / oldMC) * 100).toFixed(2) : '0.00';

        if (Math.abs(diff) > 1000) { // Only log significant changes > $1k
            changes.push({
                name: c.name,
                oldMC,
                newMC,
                diff,
                percent
            });
        }
    }
});

// Sort by absolute change
changes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

// Generate Report
let report = `# Market Cap Update Report\n\n`;
report += `**Time**: ${new Date().toISOString()}\n`;
report += `**Total Market Cap**: $${totalOldMC.toLocaleString()} -> $${totalNewMC.toLocaleString()} (${((totalNewMC - totalOldMC) / totalOldMC * 100).toFixed(2)}%)\n\n`;

report += `## Top Gainers/Losers (Changes > $1k)\n`;
report += `| Coin | Old MC | New MC | Change ($) | Change (%) |\n`;
report += `|---|---|---|---|---|\n`;

changes.slice(0, 20).forEach(c => {
    const sign = c.diff > 0 ? '+' : '';
    report += `| ${c.name} | $${c.oldMC.toLocaleString()} | $${c.newMC.toLocaleString()} | ${sign}$${Math.round(c.diff).toLocaleString()} | ${sign}${c.percent}% |\n`;
});

console.log(report);
fs.writeFileSync(path.join(__dirname, '../analysis_docs/last_update_report.md'), report);
