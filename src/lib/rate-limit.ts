/**
 * In-memory sliding-window rate limiter.
 *
 * Intended for development and single-instance deploys. In Wave 4 we swap
 * this for Upstash Redis via the Vercel Marketplace so limits are enforced
 * across all function instances. The interface stays identical.
 */

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }
  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return {
    success: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}
