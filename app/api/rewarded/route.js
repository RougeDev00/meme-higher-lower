import { NextResponse } from 'next/server';
import { getRewardedUsers } from '@/lib/storage';

export async function GET() {
    try {
        const rewarded = await getRewardedUsers();
        return NextResponse.json({ rewarded });
    } catch (error) {
        console.error('Error fetching rewarded users:', error);
        return NextResponse.json({ rewarded: [] });
    }
}
