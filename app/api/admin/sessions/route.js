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

        // Enrich sessions with scores
        const sessionsWithScores = (allSessions || []).map(session => ({
            ...session,
            score: session.wallet_address ? (scoreMap[session.wallet_address] || null) : null
        }));

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
