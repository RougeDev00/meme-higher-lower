import { NextResponse } from 'next/server';
import { gameSessions } from '../start/route';
import { submitScore } from '@/lib/storage';

const MAX_WINNER_TURNS = 2;

export async function POST(request) {
    try {
        const { sessionId, guess, username, walletAddress } = await request.json();

        if (!sessionId || !guess) {
            return NextResponse.json({ error: 'Missing sessionId or guess' }, { status: 400 });
        }

        const session = gameSessions.get(sessionId);

        if (!session) {
            return NextResponse.json({ error: 'Invalid or expired session' }, { status: 404 });
        }

        if (session.gameOver) {
            return NextResponse.json({ error: 'Game already over' }, { status: 400 });
        }

        // Validate guess
        const leftMC = Number(session.currentLeft.marketCap);
        const rightMC = Number(session.currentRight.marketCap);

        const clickedCoin = guess === 'left' ? session.currentLeft : session.currentRight;
        const otherCoin = guess === 'left' ? session.currentRight : session.currentLeft;
        const isCorrect = Number(clickedCoin.marketCap) >= Number(otherCoin.marketCap);

        if (isCorrect) {
            session.score += 1;

            // Determine which coin stays and which gets replaced
            const winnerTurns = guess === 'left' ? session.leftTurns : session.rightTurns;

            // Get next coin
            let nextCoin = null;
            while (session.nextCoinIndex < session.coins.length) {
                const candidate = session.coins[session.nextCoinIndex];
                session.nextCoinIndex++;
                if (!session.usedIndices.has(candidate.id)) {
                    nextCoin = candidate;
                    session.usedIndices.add(candidate.id);
                    break;
                }
            }

            // If we ran out of coins, reshuffle
            if (!nextCoin) {
                const validCoins = session.coins.filter(c =>
                    c.id !== session.currentLeft.id && c.id !== session.currentRight.id
                );
                session.coins = validCoins.sort(() => Math.random() - 0.5);
                session.nextCoinIndex = 1;
                session.usedIndices = new Set([session.currentLeft.id, session.currentRight.id]);
                nextCoin = session.coins[0];
                if (nextCoin) session.usedIndices.add(nextCoin.id);
            }

            if (!nextCoin) {
                // Fallback: no more coins, end game
                session.gameOver = true;
                if (walletAddress && walletAddress !== 'GUEST') {
                    await submitScore(username || 'Anonymous', session.score, walletAddress);
                }
                gameSessions.delete(sessionId);
                return NextResponse.json({
                    correct: true,
                    score: session.score,
                    gameOver: true,
                    leftMarketCap: leftMC,
                    rightMarketCap: rightMC
                });
            }

            // Update session based on winner/loser logic
            if (winnerTurns >= MAX_WINNER_TURNS) {
                // Winner leaves, loser stays
                if (guess === 'left') {
                    session.currentLeft = nextCoin;
                    session.leftTurns = 0;
                    session.rightTurns = 0;
                } else {
                    session.currentRight = nextCoin;
                    session.rightTurns = 0;
                    session.leftTurns = 0;
                }
            } else {
                // Winner stays, loser leaves
                if (guess === 'left') {
                    session.currentRight = nextCoin;
                    session.leftTurns += 1;
                    session.rightTurns = 0;
                } else {
                    session.currentLeft = nextCoin;
                    session.rightTurns += 1;
                    session.leftTurns = 0;
                }
            }

            // Prepare coin data for client - include marketCap for the staying coin
            const sanitizeCoin = (coin, includeMarketCap = false) => ({
                id: coin.id,
                name: coin.name,
                symbol: coin.symbol,
                logo: coin.logo,
                color: coin.color,
                platform: coin.platform,
                ...(includeMarketCap ? { marketCap: coin.marketCap } : {})
            });

            // Determine which side the winner stays on
            const winnerStaysOnSide = winnerTurns >= MAX_WINNER_TURNS
                ? (guess === 'left' ? 'right' : 'left')  // Winner leaves, loser stays
                : guess;  // Winner stays

            return NextResponse.json({
                correct: true,
                score: session.score,
                gameOver: false,
                leftMarketCap: leftMC,
                rightMarketCap: rightMC,
                winnerSide: winnerStaysOnSide,
                nextLeftCoin: sanitizeCoin(session.currentLeft, winnerStaysOnSide === 'left'),
                nextRightCoin: sanitizeCoin(session.currentRight, winnerStaysOnSide === 'right')
            });

        } else {
            // Wrong guess - game over
            session.gameOver = true;

            // Submit score to leaderboard
            if (walletAddress && walletAddress !== 'GUEST') {
                await submitScore(username || 'Anonymous', session.score, walletAddress);
            }

            // Clean up session
            gameSessions.delete(sessionId);

            return NextResponse.json({
                correct: false,
                score: session.score,
                gameOver: true,
                leftMarketCap: leftMC,
                rightMarketCap: rightMC
            });
        }

    } catch (error) {
        console.error('Guess error:', error);
        return NextResponse.json({ error: 'Failed to process guess' }, { status: 500 });
    }
}
