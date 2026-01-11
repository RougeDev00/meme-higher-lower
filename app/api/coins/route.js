import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

// In-memory cache for coins data
let coinsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
    try {
        const now = Date.now();

        // Return cached data if still valid
        if (coinsCache && (now - cacheTimestamp) < CACHE_TTL) {
            return NextResponse.json(coinsCache);
        }

        // Read and cache fresh data
        const filePath = path.join(process.cwd(), 'data', 'coins.json');
        const fileContents = await readFile(filePath, 'utf8');
        coinsCache = JSON.parse(fileContents);
        cacheTimestamp = now;

        return NextResponse.json(coinsCache);
    } catch (e) {
        console.error('Failed to load coins:', e);
        return NextResponse.json({ error: 'Failed to load coins' }, { status: 500 });
    }
}
