const fs = require('fs');
const path = require('path');

const coinsPath = path.join(__dirname, '../data/coins.json');

try {
    const rawData = fs.readFileSync(coinsPath, 'utf8');
    const coins = JSON.parse(rawData);

    const missingLogos = coins.filter(coin => !coin.logo || coin.logo.trim() === '');

    console.log(`Total coins scanned: ${coins.length}`);
    console.log(`Coins without logo: ${missingLogos.length}`);

    if (missingLogos.length > 0) {
        console.log('\nList of coins without logo:');
        missingLogos.forEach(coin => {
            console.log(`- ${coin.name} (${coin.symbol}) [ID: ${coin.id}]`);
        });
    } else {
        console.log('All coins have a logo.');
    }

} catch (err) {
    console.error('Error reading coins.json:', err);
}
