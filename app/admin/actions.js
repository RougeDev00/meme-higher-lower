'use server';

import { getSession } from '@/lib/auth';

// Helper to enforce auth
async function requireAuth() {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        throw new Error('Unauthorized');
    }
}

// Server action to fetch admin data with server-side authentication
export async function getAdminData() {
    await requireAuth();

    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
        throw new Error('ADMIN_SECRET not configured');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pumpordumpgame.fun';

    const res = await fetch(`${baseUrl}/api/admin/data`, {
        headers: {
            'x-admin-secret': adminSecret
        },
        cache: 'no-store'
    });

    if (!res.ok) {
        throw new Error('Failed to fetch admin data');
    }

    return res.json();
}

export async function deleteAdminUser(walletAddress) {
    await requireAuth();

    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
        throw new Error('ADMIN_SECRET not configured');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pumpordumpgame.fun';

    const res = await fetch(`${baseUrl}/api/admin/data`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-secret': adminSecret
        },
        body: JSON.stringify({ walletAddress })
    });

    return res.json();
}

export async function deleteAllAdminUsers() {
    await requireAuth();

    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
        throw new Error('ADMIN_SECRET not configured');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pumpordumpgame.fun';

    const res = await fetch(`${baseUrl}/api/admin/data`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-secret': adminSecret
        },
        body: JSON.stringify({ deleteAll: true })
    });

    return res.json();
}

export async function getPlaySessionsStats() {
    await requireAuth();

    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
        throw new Error('ADMIN_SECRET not configured');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pumpordumpgame.fun';

    const res = await fetch(`${baseUrl}/api/admin/sessions`, {
        headers: {
            'x-admin-secret': adminSecret
        },
        cache: 'no-store'
    });

    if (!res.ok) {
        return { stats: { total: 0, withWallet: 0, withoutWallet: 0 }, sessions: [] };
    }

    return res.json();
}

export async function rewardAdminUser(walletAddress, username, score, solAmount) {
    await requireAuth();

    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
        throw new Error('ADMIN_SECRET not configured');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pumpordumpgame.fun';

    const res = await fetch(`${baseUrl}/api/admin/data`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-secret': adminSecret
        },
        body: JSON.stringify({ action: 'reward', walletAddress, username, score, solAmount })
    });

    return res.json();
}

export async function unrewardAdminUser(walletAddress) {
    await requireAuth();

    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
        throw new Error('ADMIN_SECRET not configured');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pumpordumpgame.fun';

    const res = await fetch(`${baseUrl}/api/admin/data`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-secret': adminSecret
        },
        body: JSON.stringify({ action: 'unreward', walletAddress })
    });

    return res.json();
}

export async function getRewardedAdminUsers() {
    await requireAuth();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pumpordumpgame.fun';

    const res = await fetch(`${baseUrl}/api/rewarded`, {
        cache: 'no-store'
    });

    if (!res.ok) {
        return { rewarded: [] };
    }

    return res.json();
}
