import { NextResponse } from 'next/server';
import { gameSessions } from '../start/route';
import { submitScore } from '@/lib/storage';

export async function POST(request) {
    try {
        const { sessionId, username, walletAddress } = await request.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
        }

        const session = gameSessions.get(sessionId);

        if (!session) {
            return NextResponse.json({ error: 'Invalid or expired session' }, { status: 404 });
        }

        if (session.gameOver) {
            return NextResponse.json({ error: 'Game already over' }, { status: 400 });
        }

        // Mark game as over
        session.gameOver = true;

        // Submit score to leaderboard
        if (walletAddress && walletAddress !== 'GUEST') {
            await submitScore(username || 'Anonymous', session.score, walletAddress);
        }

        // Clean up session
        gameSessions.delete(sessionId);

        return NextResponse.json({
            success: true,
            score: session.score
        });

    } catch (error) {
        console.error('Timeout error:', error);
        return NextResponse.json({ error: 'Failed to process timeout' }, { status: 500 });
    }
}
