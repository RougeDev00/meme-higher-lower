import { supabase } from '@/lib/supabase';

export async function GET(request) {
    // Check admin secret
    const adminSecret = request.headers.get('x-admin-secret');
    if (adminSecret !== process.env.ADMIN_SECRET) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabase) {
        return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    try {
        // Get total count
        const { count: total } = await supabase
            .from('play_sessions')
            .select('*', { count: 'exact', head: true });

        // Get count with wallet
        const { count: withWallet } = await supabase
            .from('play_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('has_wallet', true);

        // Get all sessions ordered by most recent first
        const { data: allSessions } = await supabase
            .from('play_sessions')
            .select('*')
            .order('created_at', { ascending: false });

        // Get all leaderboard scores to map to sessions
        const { data: leaderboardData } = await supabase
            .from('leaderboard')
            .select('wallet_address, score');

        // Create a map of wallet_address -> score
        const scoreMap = {};
        if (leaderboardData) {
            leaderboardData.forEach(entry => {
                scoreMap[entry.wallet_address] = entry.score;
            });
        }

        // Track which wallets we've seen (to show score only for newest session)
        const seenWallets = new Set();

        // Enrich sessions with scores - only show actual score for the most recent session
        // For older sessions, show "< Record" to indicate they didn't beat their best
        const sessionsWithScores = (allSessions || []).map(session => {
            if (!session.wallet_address) {
                return { ...session, score: null };
            }

            const walletScore = scoreMap[session.wallet_address];

            if (!seenWallets.has(session.wallet_address)) {
                // First (most recent) session for this wallet - show actual score
                seenWallets.add(session.wallet_address);
                return { ...session, score: walletScore || null };
            } else {
                // Older session - we don't know the exact score, mark as "less than record"
                return { ...session, score: '< Record' };
            }
        });

        return Response.json({
            stats: {
                total: total || 0,
                withWallet: withWallet || 0,
                withoutWallet: (total || 0) - (withWallet || 0)
            },
            sessions: sessionsWithScores
        });
    } catch (error) {
        console.error('Error fetching session stats:', error);
        return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
