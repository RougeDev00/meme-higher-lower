import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { decryptSession, encryptSession, deterministicShuffle, MAX_WINNER_TURNS } from '@/lib/gameState';
import { submitScore } from '@/lib/storage';

export async function POST(request) {
    try {
        const { sessionId, guess, username, walletAddress } = await request.json();

        if (!sessionId || !guess) {
            return NextResponse.json({ error: 'Missing sessionId or guess' }, { status: 400 });
        }

        let session;
        try {
            session = decryptSession(sessionId);
        } catch (e) {
            console.error('Session decryption failed:', e);
            return NextResponse.json({ error: 'Invalid or expired session' }, { status: 404 }); // Keep 404 for client compatibility
        }

        if (session.gameOver) {
            return NextResponse.json({ error: 'Game already over' }, { status: 400 });
        }

        // Load and Filter Coins (Needed to reconstruct state)
        const filePath = path.join(process.cwd(), 'data', 'coins.json');
        const fileContents = await readFile(filePath, 'utf8');
        const allCoins = JSON.parse(fileContents);
        const validCoins = allCoins.filter(c => c.marketCap >= 15000 && c.symbol && c.name);

        // Reconstruct Game State
        const shuffled = deterministicShuffle(validCoins, session.seed);

        // Find current coins by ID
        const currentLeft = shuffled.find(c => c.id === session.currentLeftId);
        const currentRight = shuffled.find(c => c.id === session.currentRightId);

        if (!currentLeft || !currentRight) {
            console.error('Coins not found in shuffled list. IDs:', session.currentLeftId, session.currentRightId);
            return NextResponse.json({ error: 'Game state corruption' }, { status: 500 });
        }

        // Validate guess
        const leftMC = Number(currentLeft.marketCap);
        const rightMC = Number(currentRight.marketCap);

        const clickedCoin = guess === 'left' ? currentLeft : currentRight;
        const otherCoin = guess === 'left' ? currentRight : currentLeft;
        const isCorrect = Number(clickedCoin.marketCap) >= Number(otherCoin.marketCap);

        if (isCorrect) {
            session.score += 1;

            // Determine which coin stays and which gets replaced
            const winnerTurns = guess === 'left' ? session.leftTurns : session.rightTurns;

            // Get next coin
            let nextCoin = null;
            let nextCoinIndex = session.nextCoinIndex;

            // Reconstruct used indices set? 
            // We just need to find the next coin from shuffled that is NOT currentLeft or currentRight.
            // Since shuffled is deterministic, we can just pick shuffled[nextCoinIndex].
            // But we need to check collision (unlikely given shuffle, but possible if index wraps? No logic before handled it).
            // Logic before: checked usedIndices.
            // With deterministic shuffle, index 0, 1 are used. Index 2 is next.
            // We can just TRUST nextCoinIndex.

            // Check if we ran out
            if (nextCoinIndex >= shuffled.length) {
                // Reshuffle logic?
                // Original logic: "If we ran out of coins, reshuffle" using random-ish filter.
                // Here, we can just increment seed?
                // Or wrap around?
                // Let's wrap around for simplicity, filtering current ones.
                nextCoinIndex = 0;
                // Simple wrap: find first coin that is not currentLeft or currentRight
                while (nextCoinIndex < shuffled.length) {
                    const candidate = shuffled[nextCoinIndex];
                    if (candidate.id !== currentLeft.id && candidate.id !== currentRight.id) {
                        nextCoin = candidate;
                        session.nextCoinIndex = nextCoinIndex + 1; // Update index to next
                        break;
                    }
                    nextCoinIndex++;
                }
            } else {
                nextCoin = shuffled[nextCoinIndex];
                session.nextCoinIndex++;
            }

            if (!nextCoin) {
                // Should not happen unless < 3 coins total
                session.gameOver = true;
                const newSessionId = encryptSession(session); // Should we even return a session? Yes, needed for timeout? No, game over.
                // Submit score logic
                if (walletAddress && walletAddress !== 'GUEST') {
                    await submitScore(username || 'Anonymous', session.score, walletAddress);
                }
                return NextResponse.json({
                    correct: true,
                    score: session.score,
                    gameOver: true,
                    leftMarketCap: leftMC,
                    rightMarketCap: rightMC,
                    sessionId: newSessionId
                });
            }

            // Update session based on winner/loser logic
            if (winnerTurns >= MAX_WINNER_TURNS) {
                // Winner leaves, loser stays
                if (guess === 'left') {
                    // Winner (Left) leaves. Loser (Right) stays.
                    // New Right becomes NextCoin? No.
                    // Left was Winner. Right was Loser.
                    // Winner leaves -> Left is replaced.
                    // Loser stays -> Right stays.
                    session.currentLeftId = nextCoin.id;
                    // Right stays as is.
                    session.leftTurns = 0;
                    session.rightTurns = 0;
                    // Wait, if Loser stays, does it keep its turns? Logic says "reset turns for safe measure"?
                    // Code said: session.rightTurns = 0; 
                } else {
                    // Winner (Right) leaves. Loser (Left) stays.
                    session.currentRightId = nextCoin.id;
                    session.rightTurns = 0;
                    session.leftTurns = 0;
                }
            } else {
                // Winner stays, loser leaves
                if (guess === 'left') {
                    // Winner (Left) stays.
                    // Loser (Right) leaves -> Replace Right.
                    session.currentRightId = nextCoin.id;
                    session.leftTurns += 1;
                    session.rightTurns = 0;
                } else {
                    // Winner (Right) stays.
                    // Loser (Left) leaves -> Replace Left.
                    session.currentLeftId = nextCoin.id;
                    session.rightTurns += 1;
                    session.leftTurns = 0;
                }
            }

            // Determine staying side for UI
            const stayingSide = winnerTurns >= MAX_WINNER_TURNS
                ? (guess === 'left' ? 'right' : 'left')  // Winner (Guess) leaves, other stays
                : guess;  // Winner stays

            // Prepare next coin data
            // We need to fetch the full object for the NEW current coins
            // currentLeft/Right IDs are updated in session state now.
            // Re-fetch them from shuffled (efficient enough)
            const nextLeftObj = shuffled.find(c => c.id === session.currentLeftId);
            const nextRightObj = shuffled.find(c => c.id === session.currentRightId);

            const sanitizeCoin = (coin, includeMarketCap = false) => ({
                id: coin.id,
                name: coin.name,
                symbol: coin.symbol,
                logo: coin.logo,
                color: coin.color,
                platform: coin.platform,
                ...(includeMarketCap ? { marketCap: coin.marketCap } : {})
            });

            const newSessionId = encryptSession(session);

            return NextResponse.json({
                correct: true,
                score: session.score,
                gameOver: false,
                leftMarketCap: leftMC, // Revealed MC of previous round
                rightMarketCap: rightMC,
                stayingSide: stayingSide,
                nextLeftCoin: sanitizeCoin(nextLeftObj, stayingSide === 'left'),
                nextRightCoin: sanitizeCoin(nextRightObj, stayingSide === 'right'),
                sessionId: newSessionId
            });

        } else {
            // Wrong guess - game over
            session.gameOver = true;

            // Submit score to leaderboard
            if (walletAddress && walletAddress !== 'GUEST') {
                await submitScore(username || 'Anonymous', session.score, walletAddress);
            }

            const newSessionId = encryptSession(session);

            return NextResponse.json({
                correct: false,
                score: session.score,
                gameOver: true,
                leftMarketCap: leftMC,
                rightMarketCap: rightMC,
                sessionId: newSessionId
            });
        }

    } catch (error) {
        console.error('Guess error:', error);
        return NextResponse.json({ error: 'Failed to process guess' }, { status: 500 });
    }
}
