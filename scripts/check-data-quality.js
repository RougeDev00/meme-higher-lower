const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/coins.json'), 'utf8'));

console.log('=== ANALISI QUALITÀ DATI ===\n');
console.log('Totale monete:', data.length);

let missing = {
    name: [],
    ticker: [],
    marketCap: [],
    logo: [],
    platform: []
};

let invalidMarketCap = [];
let invalidLogo = [];
let samples = [];

data.forEach((coin, idx) => {
    // Collect first 3 samples
    if (idx < 3) {
        samples.push({
            name: coin.name,
            ticker: coin.ticker,
            marketCap: coin.marketCap,
            logo: coin.logo,
            platform: coin.platform
        });
    }

    // Check missing fields
    if (!coin.name || coin.name.trim() === '') missing.name.push(idx);
    if (!coin.ticker || coin.ticker.trim() === '') missing.ticker.push(idx);
    if (!coin.platform || coin.platform.trim() === '') missing.platform.push(idx);

    // Check market cap
    if (coin.marketCap === undefined || coin.marketCap === null) {
        missing.marketCap.push(idx);
    } else if (typeof coin.marketCap !== 'number' || coin.marketCap <= 0 || isNaN(coin.marketCap)) {
        invalidMarketCap.push({ idx, value: coin.marketCap, name: coin.name });
    }

    // Check logo
    if (!coin.logo || coin.logo.trim() === '') {
        missing.logo.push(idx);
    } else if (!coin.logo.startsWith('http')) {
        invalidLogo.push({ idx, logo: coin.logo, name: coin.name });
    }
});

console.log('\n📊 ESEMPI DI DATI (prime 3 monete):');
samples.forEach((s, i) => {
    console.log(`\n${i + 1}. ${s.name} (${s.ticker})`);
    console.log(`   Platform: ${s.platform}`);
    console.log(`   Market Cap: $${s.marketCap?.toLocaleString() || 'N/A'}`);
    console.log(`   Logo: ${s.logo?.substring(0, 60)}...`);
});

console.log('\n\n📊 CAMPI MANCANTI:');
console.log('Nome mancante:', missing.name.length);
console.log('Ticker mancante:', missing.ticker.length);
console.log('Platform mancante:', missing.platform.length);
console.log('Market Cap mancante:', missing.marketCap.length);
console.log('Logo mancante:', missing.logo.length);

console.log('\n⚠️  DATI INVALIDI:');
console.log('Market Cap invalido:', invalidMarketCap.length);
console.log('Logo URL invalido:', invalidLogo.length);

const complete = data.filter((c, i) =>
    !missing.name.includes(i) &&
    !missing.ticker.includes(i) &&
    !missing.marketCap.includes(i) &&
    !missing.logo.includes(i) &&
    !invalidMarketCap.find(x => x.idx === i) &&
    !invalidLogo.find(x => x.idx === i)
).length;

console.log('\n✅ MONETE COMPLETE:');
console.log(`Monete con tutti i dati validi: ${complete}/${data.length} (${(complete / data.length * 100).toFixed(1)}%)`);

if (invalidMarketCap.length > 0) {
    console.log('\n❌ Esempi Market Cap invalidi (primi 10):');
    invalidMarketCap.slice(0, 10).forEach(x =>
        console.log(`  - [${x.idx}] ${x.name}: ${JSON.stringify(x.value)} (${typeof x.value})`)
    );
}

if (invalidLogo.length > 0) {
    console.log('\n❌ Esempi Logo invalidi (primi 10):');
    invalidLogo.slice(0, 10).forEach(x =>
        console.log(`  - [${x.idx}] ${x.name}: "${x.logo}"`)
    );
}

if (missing.name.length > 0) {
    console.log(`\n❌ Monete con nome mancante: ${missing.name.slice(0, 10).join(', ')}`);
}

if (missing.ticker.length > 0) {
    console.log(`\n❌ Monete con ticker mancante: ${missing.ticker.slice(0, 10).join(', ')}`);
}

if (missing.marketCap.length > 0) {
    console.log(`\n❌ Monete con market cap mancante: ${missing.marketCap.slice(0, 10).join(', ')}`);
}

if (missing.logo.length > 0) {
    console.log(`\n❌ Monete con logo mancante: ${missing.logo.slice(0, 10).join(', ')}`);
}

// Market cap statistics
const validMarketCaps = data
    .filter(c => typeof c.marketCap === 'number' && !isNaN(c.marketCap) && c.marketCap > 0)
    .map(c => c.marketCap)
    .sort((a, b) => a - b);

if (validMarketCaps.length > 0) {
    console.log('\n📈 STATISTICHE MARKET CAP:');
    console.log(`Min: $${validMarketCaps[0].toLocaleString()}`);
    console.log(`Max: $${validMarketCaps[validMarketCaps.length - 1].toLocaleString()}`);
    console.log(`Median: $${validMarketCaps[Math.floor(validMarketCaps.length / 2)].toLocaleString()}`);
    console.log(`Mean: $${(validMarketCaps.reduce((a, b) => a + b, 0) / validMarketCaps.length).toLocaleString()}`);
}

console.log('\n' + '='.repeat(60));
