const fetch = require('node-fetch');

const tokens = [
    '5fA3Gepc3Xqzd1GBddXigUEjY5LSb4k6HkZb3jeHtwvh', // 1SOL
    'B2Ns15i265nCN4Sb2Xr866F3NafdDAPQairAo93spump'  // DREAM
];

async function check() {
    try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokens.join(',')}`);
        const data = await res.json();
        const pairs = data.pairs || [];

        const summary = {};

        pairs.forEach(p => {
            const base = p.baseToken.address;
            if (!summary[base]) {
                summary[base] = {
                    name: p.baseToken.name,
                    symbol: p.baseToken.symbol,
                    mc: p.marketCap || p.fdv || 0,
                    liq: p.liquidity?.usd || 0,
                    image: p.info?.imageUrl,
                    header: p.info?.header,
                    openGraph: p.info?.openGraph,
                    websites: p.info?.websites || [],
                    socials: p.info?.socials || []
                };
            }
            // Update if this pair has better liquidity
            if ((p.liquidity?.usd || 0) > summary[base].liq) {
                summary[base].mc = p.marketCap || p.fdv || 0;
                summary[base].liq = p.liquidity?.usd || 0;
                // keep possibly earlier image if new one is null, but usually main pair has image
                if (p.info?.imageUrl) summary[base].image = p.info.imageUrl;
            }
        });

        console.log(JSON.stringify(summary, null, 2));

    } catch (e) {
        console.error(e);
    }
}

check();
