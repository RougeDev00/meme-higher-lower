import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { encryptSession, deterministicShuffle } from '@/lib/gameState';

export async function POST() {
    try {
        // Load coins
        // Load coins
        const filePath = path.join(process.cwd(), 'data', 'coins.json');
        const fileContents = await readFile(filePath, 'utf8');
        const allCoins = JSON.parse(fileContents);

        // Filter valid coins
        const validCoins = allCoins.filter(c => c.marketCap >= 15000 && c.symbol && c.name);

        // Generate seed and shuffle
        // We use a numeric seed for PRNG derived from random bytes or UUID
        const seedStr = randomUUID().replace(/-/g, '');
        const seed = parseInt(seedStr.slice(0, 8), 16);

        const shuffled = deterministicShuffle(validCoins, seed);

        // Initial State
        const currentLeft = shuffled[0];
        const currentRight = shuffled[1];

        // Create session state object (minimal data)
        const sessionState = {
            seed: seed,
            score: 0,
            nextCoinIndex: 2,
            leftTurns: 0,
            rightTurns: 0,
            gameOver: false,
            // We store IDs to verify consistency if needed, but the deterministic shuffle usually suffices.
            // However, to correctly handle the specific "current" coins in the next request, 
            // we should store their IDs or just relying on "replaying" the shuffle?
            // Replaying is safer. But to know who is who:
            currentLeftId: currentLeft.id,
            currentRightId: currentRight.id,
            usedIndices: [0, 1] // Store indices instead of IDs to save space? 
            // Actually, IDs are strings. Indices are ints. Indices are better if the array is stable.
            // Re-shuffling the SAME array with SAME seed gives SAME order.
            // So we just need to track the current index in that array?
            // Wait, the logic handles "replacements".
            // Yes, tracking `nextCoinIndex` is enough to know the next new coin.
            // But we need to know who `currentLeft` and `currentRight` are.
            // We can store their indices or IDs. IDs are safer against array mutations (unlikely here).
        };

        const sessionId = encryptSession(sessionState);

        return NextResponse.json({
            sessionId,
            leftCoin: {
                id: currentLeft.id,
                name: currentLeft.name,
                symbol: currentLeft.symbol,
                logo: currentLeft.logo,
                color: currentLeft.color,
                platform: currentLeft.platform,
                marketCap: currentLeft.marketCap
            },
            rightCoin: {
                id: currentRight.id,
                name: currentRight.name,
                symbol: currentRight.symbol,
                logo: currentRight.logo,
                color: currentRight.color,
                platform: currentRight.platform
                // marketCap hidden
            },
            score: sessionState.score
        });
    } catch (error) {
        console.error('Failed to start game:', error);
        return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
    }
}
