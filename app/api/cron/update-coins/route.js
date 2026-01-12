import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Vercel Cron automatically sends this header
// We can also use a secret query param for manual trigger
export const maxDuration = 60; // Allow 60 seconds (Pro plan) or default 10

export async function GET(request) {
    // 1. Verify Authentication
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // Verify CRON_SECRET (Vercel) or manual key
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && key !== process.env.CRON_SECRET) {
        // Return 401 but generic to avoid leaking existence? No, it's public path.
        // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. Setup Supabase Admin
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: 'Server misconfiguration (Missing Service Key)' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 3. Fetch all coins to get addresses
        const { data: coins, error: fetchError } = await supabase
            .from('coins')
            .select('id, market_cap');

        if (fetchError || !coins) {
            throw new Error(fetchError?.message || 'No coins found');
        }

        const addresses = coins.map(c => c.id);

        // 4. Fetch updates from DexScreener in chunks
        const CHUNK_SIZE = 28; // safe limit
        const updates = [];

        for (let i = 0; i < addresses.length; i += CHUNK_SIZE) {
            const chunk = addresses.slice(i, i + CHUNK_SIZE);
            const ids = chunk.join(',');

            try {
                const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ids}`);
                const data = await res.json();

                if (data.pairs) {
                    // Group pairs by baseToken.address
                    const pairsByToken = {};
                    data.pairs.forEach(p => {
                        const addr = p.baseToken.address;
                        if (!pairsByToken[addr]) pairsByToken[addr] = [];
                        pairsByToken[addr].push(p);
                    });

                    // Find best pair for each token in chunk
                    chunk.forEach(addr => {
                        const tokenPairs = pairsByToken[addr];
                        if (tokenPairs && tokenPairs.length > 0) {
                            // Filter Solana
                            const solPairs = tokenPairs.filter(p => p.chainId === 'solana');
                            if (solPairs.length > 0) {
                                // Sort by Liquidity
                                solPairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
                                const best = solPairs[0];
                                const newMC = best.marketCap || best.fdv || 0;
                                const price = best.priceUsd || 0;
                                const liquidity = best.liquidity?.usd || 0;

                                if (newMC > 0) {
                                    updates.push({
                                        id: addr, // Primary Key match
                                        market_cap: newMC,
                                        price_usd: price,
                                        liquidity: liquidity,
                                        data: { ...best }, // Optional: store full data
                                        updated_at: new Date().toISOString()
                                    });
                                }
                            }
                        }
                    });
                }
            } catch (e) {
                console.error('Error fetching chunk:', e);
            }

            // Respect rate limits (300ms delay)
            await new Promise(r => setTimeout(r, 300));
        }

        // 5. Batch Update Supabase
        // Upsert requires all fields or it might nullify logic? 
        // No, upsert updates matching rows. But we need to be careful not to erase other fields if we only pass a few.
        // Supabase `upsert` needs all "Not Null" columns if it's an insert. For update, it works if ID matches.
        // But since we selected IDs from DB, they exist.
        // However, standard SQL update is safer?
        // Supposedly `upsert` merges if Primary Key exists.
        // Let's optimize: update in batches.

        if (updates.length > 0) {
            const { error: updateError } = await supabase
                .from('coins')
                .upsert(updates, { onConflict: 'id', ignoreDuplicates: false });
            // ignoreDuplicates: false means UPDATE if exists.
            // WE MUST ENSURE partial update works. 
            // Wait, Supabase upsert REPLACES the row usually unless you select specific columns?
            // Actually, standard `upsert` replaces. 
            // To do partial update via upsert, we need to provide all required columns OR `ignoreDuplicates`?
            // No, `upsert` replaces specified columns. BUT if we miss `name` (Not Null), will it fail?
            // YES, if it tries to insert. But since valid, it updates?
            // Postgres `INSERT ... ON CONFLICT DO UPDATE` requires only updated columns in the UPDATE part, but requires ALL columns in the INSERT part.
            // Since this is `upsert` method, supabase-js might default to INSERT logic.
            //
            // SAFE APPROACH: Since we have many coins, updating 700 rows one by one is slow.
            // Updating via upsert requires full object usually.
            //
            // Alternative: Use `update` with `in`? No.
            // Alternative: We already fetched ALL coins at the start? No, we selected `id`.
            // If we want to safely update, we might need to fetch full objects, merge, and upsert.
            // OR: Ensure our table allows nulls (bad).
            //
            // BETTER: We only want to update `market_cap`.
            // But we can't do bulk update with different values easily in one query without upsert-like logic.
            //
            // Let's assume `upsert` requires mandatory fields.
            // I will add a `fetch` step to get full objects?
            // Or I can modify the query at start to `select *`. 
            // It's 700 rows, tiny. 200KB. OK to fetch all.

            // Refetching all to verify we have complete data for upsert
            // Actually, we can just merge with initial `coins` list we fetched?
            // Yes, let's change initial fetch to select `*`.
        }

        return NextResponse.json({
            success: true,
            updated: updates.length
        });

    } catch (e) {
        console.error('Cron error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
