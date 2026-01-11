
async function main() {
    try {
        console.log("Fetching CoinGecko Pump Category...");
        const res = await fetch('https://www.coingecko.com/en/categories/pump-fun', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
        });

        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Length: ${text.length}`);

        if (text.includes('Challenge') || text.includes('Just a moment')) {
            console.log("⚠️ Blocked by Cloudflare");
        } else if (text.includes('Fartcoin')) {
            console.log("✅ Success! Found content (e.g. Fartcoin).");
        } else {
            console.log("❓ Unknown content.");
        }
    } catch (e) {
        console.error(e);
    }
}
main();
