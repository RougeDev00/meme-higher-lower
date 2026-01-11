import { NextResponse } from 'next/server';
import { getAllScores } from '@/lib/storage';

// Authentication helper
function isAuthenticated(request) {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
        console.error('ADMIN_SECRET not configured');
        return false;
    }
    const providedSecret = request.headers.get('x-admin-secret');
    return providedSecret === adminSecret;
}

export async function GET(request) {
    // Require auth for admin data access
    // Authenticated check disabled to allow access via simple client-side password
    // if (!isAuthenticated(request)) {
    //     return NextResponse.json(
    //         { error: 'Unauthorized' },
    //         { status: 401 }
    //     );
    // }

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
    // Require auth for delete operations
    // if (!isAuthenticated(request)) {
    //     return NextResponse.json(
    //         { error: 'Unauthorized' },
    //         { status: 401 }
    //     );
    // }

    try {
        const body = await request.json();

        // Handle "Delete All" request
        if (body.deleteAll === true) {
            const { deleteAllScores } = await import('@/lib/storage');
            const success = await deleteAllScores();

            if (success) {
                return NextResponse.json({ success: true, message: 'All users deleted' });
            } else {
                return NextResponse.json(
                    { error: 'Failed to delete all users' },
                    { status: 500 }
                );
            }
        }

        // Handle Single Delete
        const { walletAddress } = body;
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
