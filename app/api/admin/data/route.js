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
