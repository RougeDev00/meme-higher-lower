import { NextResponse } from 'next/server';
import { getLeaderboard, submitScore, getUserHighScore } from '@/lib/storage';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (walletAddress) {
        const highScore = await getUserHighScore(walletAddress);
        return NextResponse.json({ highScore });
    }

    const leaderboard = await getLeaderboard();
    return NextResponse.json({ leaderboard });
}

export async function POST() {
    // Direct score submissions are disabled for security
    // All scores must be submitted via /api/game/guess or /api/game/timeout
    return NextResponse.json(
        { error: 'Direct score submission is disabled. Play the game to submit scores.' },
        { status: 403 }
    );
}
