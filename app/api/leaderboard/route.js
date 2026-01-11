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
        const signature = request.headers.get('x-score-signature');

        // Simple obfuscation check (matches client logic)
        // In production this should be robust server-side validation or signed by a wallet
        const expectedSignature = btoa(`${score}-${walletAddress}-MEME_SECRET`);

        if (!signature || signature !== expectedSignature) {
            console.warn(`Invalid score signature for user ${walletAddress} (Expected: ${expectedSignature}, Got: ${signature})`);
            // Permissive mode for debugging - proceed anyway
        }

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
