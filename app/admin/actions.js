'use server';

// Server action to fetch admin data with server-side authentication
export async function getAdminData() {
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
        return { stats: { total: 0, withWallet: 0, withoutWallet: 0 }, recentSessions: [] };
    }

    return res.json();
}
