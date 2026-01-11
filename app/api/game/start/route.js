import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// In-memory session store (would use Redis in production)
// Exported so guess route can access it
export const gameSessions = new Map();

// Session expiry time (10 minutes)
const SESSION_EXPIRY = 10 * 60 * 1000;

// Cleanup old sessions periodically
function cleanupSessions() {
    const now = Date.now();
    for (const [id, session] of gameSessions.entries()) {
        if (now - session.createdAt > SESSION_EXPIRY) {
            gameSessions.delete(id);
        }
    }
}

// Run cleanup every minute
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupSessions, 60 * 1000);
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export async function POST() {
    try {
        // Load coins
        const filePath = path.join(process.cwd(), 'data', 'coins.json');
        const fileContents = await readFile(filePath, 'utf8');
        const allCoins = JSON.parse(fileContents);

        // Filter valid coins
        const validCoins = allCoins.filter(c => c.marketCap >= 15000 && c.symbol && c.name);
        const shuffled = shuffleArray(validCoins);

        // Create session
        const sessionId = randomUUID();
        const session = {
            id: sessionId,
            createdAt: Date.now(),
            score: 0,
            coins: shuffled, // All shuffled coins for this session
            usedIndices: new Set([0, 1]),
            currentLeft: shuffled[0],
            currentRight: shuffled[1],
            nextCoinIndex: 2,
            leftTurns: 0,
            rightTurns: 0,
            gameOver: false
        };

        gameSessions.set(sessionId, session);

        return NextResponse.json({
            sessionId,
            leftCoin: {
                id: session.currentLeft.id,
                name: session.currentLeft.name,
                symbol: session.currentLeft.symbol,
                logo: session.currentLeft.logo,
                color: session.currentLeft.color,
                platform: session.currentLeft.platform
                // Note: marketCap is NOT sent to client
            },
            rightCoin: {
                id: session.currentRight.id,
                name: session.currentRight.name,
                symbol: session.currentRight.symbol,
                logo: session.currentRight.logo,
                color: session.currentRight.color,
                platform: session.currentRight.platform
            }
        });
    } catch (error) {
        console.error('Failed to start game:', error);
        return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
    }
}
