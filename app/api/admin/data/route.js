import { NextResponse } from 'next/server';
import { getAllScores } from '@/lib/storage';

export async function GET() {
    try {
        const data = await getAllScores();
        return NextResponse.json({ data });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch admin data' },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
    try {
        const { walletAddress } = await request.json();
        if (!walletAddress) {
            return NextResponse.json(
                { error: 'Wallet address required' },
                { status: 400 }
            );
        }

        const { deleteScore } = await import('@/lib/storage');
        const success = await deleteScore(walletAddress);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json(
                { error: 'Failed to delete record' },
                { status: 500 }
            );
        }

    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to process delete request' },
            { status: 500 }
        );
    }
}
