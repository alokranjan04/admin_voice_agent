/**
 * Simple in-memory rate limiter for API routes.
 * Tracks requests per IP address with a sliding window.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });
 *   // In your route:
 *   const blocked = limiter.check(ip);
 *   if (blocked) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

interface RateLimiterOptions {
    /** Time window in milliseconds */
    windowMs: number;
    /** Max requests allowed per window */
    maxRequests: number;
}

export function createRateLimiter(opts: RateLimiterOptions) {
    const store = new Map<string, RateLimitEntry>();

    // Periodic cleanup every 5 minutes to prevent memory leak
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store) {
            if (now > entry.resetAt) {
                store.delete(key);
            }
        }
    }, 5 * 60 * 1000);

    return {
        /**
         * Returns true if the request should be BLOCKED (rate limited).
         */
        check(ip: string): boolean {
            const now = Date.now();
            const entry = store.get(ip);

            if (!entry || now > entry.resetAt) {
                store.set(ip, { count: 1, resetAt: now + opts.windowMs });
                return false;
            }

            entry.count++;
            if (entry.count > opts.maxRequests) {
                return true; // BLOCKED
            }
            return false;
        },

        /** Returns remaining requests for an IP */
        remaining(ip: string): number {
            const now = Date.now();
            const entry = store.get(ip);
            if (!entry || now > entry.resetAt) return opts.maxRequests;
            return Math.max(0, opts.maxRequests - entry.count);
        }
    };
}
