/**
 * Simple in-memory rate limiter for API endpoints
 * Note: This won't persist across serverless function instances,
 * but provides good protection against single-source spam.
 */

const rateLimitStore = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now - data.windowStart > 60000 * 5) {
            rateLimitStore.delete(key);
        }
    }
}, 60000 * 5);

/**
 * Check rate limit for a given identifier
 * @param {string} identifier - Unique identifier (e.g., IP address)
 * @param {string} endpoint - Endpoint name for separate limits
 * @param {number} maxRequests - Maximum requests allowed in window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 */
export function checkRateLimit(identifier, endpoint, maxRequests = 10, windowMs = 60000) {
    const key = `${endpoint}:${identifier}`;
    const now = Date.now();

    let data = rateLimitStore.get(key);

    if (!data || now - data.windowStart > windowMs) {
        // New window
        data = {
            count: 1,
            windowStart: now
        };
        rateLimitStore.set(key, data);
        return {
            allowed: true,
            remaining: maxRequests - 1,
            resetIn: Math.ceil(windowMs / 1000)
        };
    }

    if (data.count >= maxRequests) {
        const resetIn = Math.ceil((data.windowStart + windowMs - now) / 1000);
        return {
            allowed: false,
            remaining: 0,
            resetIn
        };
    }

    data.count++;
    return {
        allowed: true,
        remaining: maxRequests - data.count,
        resetIn: Math.ceil((data.windowStart + windowMs - now) / 1000)
    };
}

/**
 * Get client IP from request headers (works with Vercel)
 * @param {Request} request 
 * @returns {string}
 */
export function getClientIP(request) {
    // Vercel/Cloudflare headers
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    // Vercel specific
    const vercelIP = request.headers.get('x-real-ip');
    if (vercelIP) {
        return vercelIP;
    }

    // Fallback
    return 'unknown';
}

/**
 * Rate limit configuration for different endpoints
 */
export const RATE_LIMITS = {
    POD: {
        maxRequests: 15,      // 15 requests per minute
        windowMs: 60000       // 1 minute
    },
    GAME_START: {
        maxRequests: 10,      // 10 game starts per minute
        windowMs: 60000       // 1 minute
    },
    TRACK_SESSION: {
        maxRequests: 10,      // 10 session tracks per minute
        windowMs: 60000       // 1 minute
    },
    GAME_GUESS: {
        maxRequests: 60,      // 60 guesses per minute (1 per second max)
        windowMs: 60000       // 1 minute
    }
};
