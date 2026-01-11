import { trackPlaySession } from '@/lib/storage';

export async function POST(request) {
    try {
        const { username, walletAddress } = await request.json();

        if (!username) {
            return Response.json({ error: 'Username required' }, { status: 400 });
        }

        const success = await trackPlaySession(username, walletAddress);

        return Response.json({ success });
    } catch (error) {
        console.error('Error tracking session:', error);
        return Response.json({ error: 'Failed to track session' }, { status: 500 });
    }
}
