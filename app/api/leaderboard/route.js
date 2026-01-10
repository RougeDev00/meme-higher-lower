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

export async function POST(request) {
    try {
        const { username, score, walletAddress } = await request.json();

        if (!walletAddress || typeof score !== 'number') {
            return NextResponse.json(
                { error: 'Invalid wallet address or score' },
                { status: 400 }
            );
        }

        const leaderboard = await submitScore(username, score, walletAddress);
        const highScore = await getUserHighScore(walletAddress);

        return NextResponse.json({
            success: true,
            leaderboard,
            highScore
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Failed to submit score' },
            { status: 500 }
        );
    }
}
