import { NextResponse } from 'next/server';
import { getUserByWallet } from '@/lib/storage';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
        return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const username = await getUserByWallet(walletAddress);

    if (username) {
        return NextResponse.json({ exists: true, username });
    } else {
        return NextResponse.json({ exists: false });
    }
}
