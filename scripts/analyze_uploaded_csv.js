const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../analysis_docs/top_200_pumpfun_memecoins_marketcap_large_logos (1).csv');
const DB_PATH = path.join(__dirname, '../data/coins.json');

function parseCSV(content) {
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const headers = lines[0].split(',').map(h => h.trim());

    // Indices
    const iName = headers.findIndex(h => h === 'Name');
    const iTicker = headers.findIndex(h => h === 'Ticker');
    const iMC = headers.findIndex(h => h.includes('Market Cap'));
    const iLogoBg = headers.findIndex(h => h.includes('Large')); // Take large logo

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        // csv parsing is tricky with commas in quotes, but these names look simple.
        // Assuming simple split for now based on file view earlier.
        // The file viewer showed: pippin,PIPPIN,376416072,...
        // No quotes seen.

        // Handle potential commas in fields roughly if needed, but let's try simple split first.
        const cols = lines[i].split(',');
        if (cols.length < 4) continue;

        data.push({
            name: cols[iName].trim(),
            symbol: cols[iTicker].trim(),
            mc: parseFloat(cols[iMC]),
            logo: cols[iLogoBg].trim()
        });
    }
    return data;
}

function main() {
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const csvCoins = parseCSV(csvContent);
    const dbCoins = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

    // Index DB by symbol (uppercase for matching)
    // There might be dupes in DB?
    const dbMap = new Map();
    dbCoins.forEach(c => {
        const key = c.symbol.toUpperCase();
        if (!dbMap.has(key)) dbMap.set(key, []);
        dbMap.get(key).push(c);
    });

    const toUpdate = [];
    const missing = [];
    const discrepancies = [];

    csvCoins.forEach(csvC => {
        const key = csvC.symbol.toUpperCase();
        const matches = dbMap.get(key);

        if (!matches) {
            missing.push(csvC);
            return;
        }

        // Find best match by Name similiarity if multiple symbols
        // Simple case: just take the one with closest MC if multiple?
        // Or if only one, take it.

        let bestMatch = null;
        if (matches.length === 1) {
            bestMatch = matches[0];
        } else {
            // Filter by name containment?
            // "Fartcoin" vs "Fartcoin "
            bestMatch = matches.find(m => m.name.toLowerCase().includes(csvC.name.toLowerCase()) || csvC.name.toLowerCase().includes(m.name.toLowerCase()));
            if (!bestMatch) {
                // If fuzzy name fail, take closest MC
                bestMatch = matches.sort((a, b) => Math.abs(a.marketCap - csvC.mc) - Math.abs(b.marketCap - csvC.mc))[0];
            }
        }

        if (bestMatch) {
            // Check MC
            const diff = Math.abs(bestMatch.marketCap - csvC.mc);
            if (diff > 20000) {
                discrepancies.push({
                    symbol: csvC.symbol,
                    dbMC: bestMatch.marketCap,
                    csvMC: csvC.mc,
                    diff: diff,
                    dbName: bestMatch.name,
                    csvName: csvC.name
                });
            }

            // Mark for update (Logo)
            // Save address so we can update distinct record
            toUpdate.push({
                address: bestMatch.address,
                logo: csvC.logo, // Overwrite with large logo
                csvMC: csvC.mc // Store for potential usage
            });
        }
    });

    console.log(`Total CSV coins: ${csvCoins.length}`);
    console.log(`Matches found: ${toUpdate.length}`);
    console.log(`Missing coins: ${missing.length}`);
    console.log(`Discrepancies > 20k: ${discrepancies.length}`);

    // Print some discrepancies
    if (discrepancies.length > 0) {
        console.log('\nTop 5 Discrepancies (DB vs CSV):');
        discrepancies.sort((a, b) => b.diff - a.diff).slice(0, 5).forEach(d => {
            console.log(`${d.symbol}: $${d.dbMC.toLocaleString()} vs $${d.csvMC.toLocaleString()} (Diff: $${d.diff.toLocaleString()})`);
        });
    }

    // Save outputs for next steps
    fs.writeFileSync(path.join(__dirname, 'missing_from_csv.json'), JSON.stringify(missing, null, 2));
    fs.writeFileSync(path.join(__dirname, 'updates_from_csv.json'), JSON.stringify(toUpdate, null, 2));
    console.log('\nSaved missing_from_csv.json and updates_from_csv.json');
}

main();
