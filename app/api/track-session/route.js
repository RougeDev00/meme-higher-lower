import { trackPlaySession } from '@/lib/storage';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request) {
    try {
        // Rate limit check
        const clientIP = getClientIP(request);
        const rateLimit = checkRateLimit(clientIP, 'track_session', RATE_LIMITS.TRACK_SESSION.maxRequests, RATE_LIMITS.TRACK_SESSION.windowMs);

        if (!rateLimit.allowed) {
            return Response.json({ error: 'Too many requests' }, { status: 429 });
        }

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
