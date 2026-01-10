const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'data', 'coins.json');

try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const coins = JSON.parse(fileContent);

    console.log(`Total Coins in file: ${coins.length}`);

    let labeledPump = 0;
    let addressEndsWithPump = 0;
    let mismatched = 0;

    coins.forEach(coin => {
        const isLabeledPump = coin.platform === 'Pump.fun';
        const hasPumpAddress = coin.address && coin.address.toLowerCase().endsWith('pump');

        if (isLabeledPump) labeledPump++;
        if (hasPumpAddress) addressEndsWithPump++;

        if (hasPumpAddress && !isLabeledPump) {
            mismatched++;
            // console.log(`Found unlabelled Pump coin: ${coin.name} (${coin.address}) - Current Platform: ${coin.platform}`);
        }
    });

    console.log(`Labeled 'Pump.fun': ${labeledPump}`);
    console.log(`Address ends with 'pump': ${addressEndsWithPump}`);
    console.log(`Mismatched (address is 'pump' but platform is not): ${mismatched}`);

} catch (error) {
    console.error('Error:', error);
}
