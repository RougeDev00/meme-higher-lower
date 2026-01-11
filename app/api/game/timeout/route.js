import { NextResponse } from 'next/server';
import { decryptSession } from '@/lib/gameState';
import { submitScore } from '@/lib/storage';

export async function POST(request) {
    try {
        const { sessionId, username, walletAddress } = await request.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
        }

        let session;
        try {
            session = decryptSession(sessionId);
        } catch (e) {
            console.error('Session decryption failed:', e);
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

        return NextResponse.json({
            success: true,
            score: session.score
        });

    } catch (error) {
        console.error('Timeout error:', error);
        return NextResponse.json({ error: 'Failed to process timeout' }, { status: 500 });
    }
}
