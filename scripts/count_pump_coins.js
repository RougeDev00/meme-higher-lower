const fs = require('fs');
const path = require('path');

const coinsPath = path.join(__dirname, '../data/coins.json');

try {
    const data = fs.readFileSync(coinsPath, 'utf8');
    const coins = JSON.parse(data);

    let pumpCount = 0;
    let totalCount = coins.length;

    coins.forEach(coin => {
        if (coin.platform === 'Pump.fun') {
            pumpCount++;
        }
    });

    console.log(`Total coins: ${totalCount}`);
    console.log(`Pump.fun coins: ${pumpCount}`);

} catch (err) {
    console.error('Error reading or parsing coins.json:', err);
}
