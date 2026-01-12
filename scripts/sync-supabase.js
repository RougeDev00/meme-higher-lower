const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const DB_PATH = path.join(__dirname, '../data/coins.json');

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('ERROR: Missing env vars. Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('--- STARTING SYNC TO SUPABASE ---');

    // Read local coins
    const rawData = fs.readFileSync(DB_PATH, 'utf8');
    const coins = JSON.parse(rawData);

    console.log(`Loaded ${coins.length} coins from local file.`);

    // Map to table structure
    const records = coins.map(c => ({
        id: c.address,
        name: c.name,
        symbol: c.symbol,
        image: c.image,
        market_cap: c.marketCap,
        price_usd: c.priceUsd,
        liquidity: c.liquidity,
        rank: c.rank,
        data: c // Store full object just in case we miss something
    }));

    // Upsert in chunks to avoid payload limits
    const CHUNK_SIZE = 100;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);
        console.log(`Upserting batch ${i} - ${i + chunk.length}...`);

        const { error } = await supabase
            .from('coins')
            .upsert(chunk, { onConflict: 'id' });

        if (error) {
            console.error('Error inserting batch:', error);
        }
    }

    console.log('--- SYNC COMPLETE ---');
}

main();
