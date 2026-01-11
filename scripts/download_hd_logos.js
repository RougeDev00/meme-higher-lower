const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // Ensure fetch available
// If node-fetch is not installed relative to here, might fail. 
// We installed 'requests' for python but node-fetch usually needs npm install.
// We'll check if global fetch exists (Node 18+) or use 'https'.
// Node 18+ has native fetch.

const DB_PATH = path.join(__dirname, '../data/coins.json');
const PUBLIC_COINS_DIR = path.join(__dirname, '../public/coins');

if (!fs.existsSync(PUBLIC_COINS_DIR)) {
    fs.mkdirSync(PUBLIC_COINS_DIR, { recursive: true });
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function downloadImage(url, destPath) {
    try {
        // Strip query params for DexScreener to get max res
        let cleanUrl = url;
        if (url.includes('dexscreener')) {
            cleanUrl = url.split('?')[0];
        }

        const res = await fetch(cleanUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const buffer = await res.arrayBuffer();
        fs.writeFileSync(destPath, Buffer.from(buffer));
        return true;
    } catch (e) {
        console.error(`Failed to download ${url}:`, e.message);
        return false;
    }
}

async function main() {
    const coins = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    console.log(`Downloading logos for ${coins.length} coins...`);

    let successCount = 0;

    // Process in chunks to be nice
    for (let i = 0; i < coins.length; i++) {
        const coin = coins[i];
        const originalLogo = coin.logo;

        if (!originalLogo || !originalLogo.startsWith('http')) {
            continue;
        }

        // Use ID for filename
        const filename = `${coin.id}.png`;
        const destPath = path.join(PUBLIC_COINS_DIR, filename);
        const publicPath = `/coins/${filename}`;

        process.stdout.write(`[${i + 1}/${coins.length}] Downloading for ${coin.name}... `);

        const success = await downloadImage(originalLogo, destPath);

        if (success) {
            coin.logo = publicPath;
            successCount++;
            console.log('OK');
        } else {
            console.log('FAIL');
        }

        // Small delay
        await delay(50);
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(coins, null, 2));
    console.log(`\nDownload Complete. Updated ${successCount}/${coins.length} logos.`);
}

main();
