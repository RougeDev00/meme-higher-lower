import { NextResponse } from 'next/server';
import { getUserProfile, updateUsername } from '@/lib/storage';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
        return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    try {
        const profile = await getUserProfile(walletAddress);

        if (!profile) {
            // If user doesn't exist yet, return null or a default structure
            // But usually this is called when wallet is connected, so they might not be in DB yet if they haven't played.
            // In that case, we return an empty profile structure.
            return NextResponse.json({
                username: '',
                topScore: 0,
                lastScore: null,
                walletAddress
            });
        }

        return NextResponse.json(profile);
    } catch (error) {
        console.error('API Error fetching profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request) {
    try {
        // Rate limit check
        const clientIP = getClientIP(request);
        const rateLimit = checkRateLimit(clientIP, 'user_update', RATE_LIMITS.USER_UPDATE.maxRequests, RATE_LIMITS.USER_UPDATE.windowMs);

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: `Too many updates. Try again in ${rateLimit.resetIn} seconds.` },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { walletAddress, username } = body;

        if (!walletAddress || !username) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Basic validation
        if (username.length > 20) {
            return NextResponse.json({ error: 'Username too long' }, { status: 400 });
        }

        const success = await updateUsername(walletAddress, username);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to update username' }, { status: 500 });
        }

    } catch (error) {
        console.error('API Error updating profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
