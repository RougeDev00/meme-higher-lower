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

        // Get recent sessions (last 50)
        const { data: recentSessions } = await supabase
            .from('play_sessions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        return Response.json({
            stats: {
                total: total || 0,
                withWallet: withWallet || 0,
                withoutWallet: (total || 0) - (withWallet || 0)
            },
            recentSessions: recentSessions || []
        });
    } catch (error) {
        console.error('Error fetching session stats:', error);
        return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
