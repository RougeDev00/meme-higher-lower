const fs = require('fs');
const path = require('path');

const coinsPath = path.join(__dirname, '..', 'data', 'coins.json');

function normalize() {
    if (!fs.existsSync(coinsPath)) {
        console.error('coins.json not found');
        return;
    }

    const coins = JSON.parse(fs.readFileSync(coinsPath, 'utf8'));
    let modified = false;
    const seenIds = new Set();

    // specific fix for the newly added coins
    coins.forEach(coin => {
        // Fix Address field
        if (!coin.address && coin.ca) {
            coin.address = coin.ca;
            delete coin.ca;
            modified = true;
        }

        // Fix ID field
        if (!coin.id) {
            let baseId = coin.symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
            let newId = baseId;
            let counter = 1;

            // Ensure uniqueness against existing IDs (and ones we just assigned)
            while (coins.some(c => c.id === newId) || seenIds.has(newId)) {
                newId = `${baseId}-${counter}`;
                counter++;
            }

            coin.id = newId;
            console.log(`Generated ID for ${coin.name}: ${coin.id}`);
            modified = true;
        }

        // Fix missing logo/image field consistency
        if (coin.image && !coin.logo) {
            coin.logo = coin.image;
            delete coin.image;
            modified = true;
        }

        seenIds.add(coin.id);
    });

    if (modified) {
        fs.writeFileSync(coinsPath, JSON.stringify(coins, null, 2));
        console.log('✅ Normalized coins.json (IDs and Addresses fixed).');
    } else {
        console.log('No changes needed.');
    }
}

normalize();
