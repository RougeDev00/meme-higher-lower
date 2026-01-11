const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/coins.json');
const OUT_PATH = path.join(__dirname, '../analysis_docs/all_coins_list.md');

const coins = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

let content = `# Full List of Pump.fun Coins (${coins.length})\n\n`;
content += `| Rank | Name | Symbol | Market Cap | Address | Logo |\n`;
content += `|---|---|---|---|---|---|\n`;

coins.forEach((c, i) => {
    const mc = Math.round(c.marketCap).toLocaleString();
    const logoDisplay = c.logo ? `[Image](${c.logo})` : 'N/A';
    content += `| ${i + 1} | ${c.name} | ${c.symbol} | $${mc} | \`${c.address}\` | ${logoDisplay} |\n`;
});

fs.writeFileSync(OUT_PATH, content);
console.log(`Exported ${coins.length} coins to ${OUT_PATH}`);
