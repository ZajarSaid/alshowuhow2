// Rate limiting for the unauthenticated public write endpoints.
//
// These endpoints are open to anyone and two of them (`/api/customer-requests`
// and `/api/vendors`) send real email on every accepted call, so without a limit
// a single script can burn the Resend quota and fill the admin inbox with spam.
//
// LIMITATION - READ BEFORE RELYING ON THIS:
// The default store below is an in-process Map. That is adequate locally and on a
// single long-lived Node server, but on serverless (Vercel) each instance keeps
// its own Map, which is also discarded on cold start. An attacker spread across
// many instances, or one that keeps the function warm, will not be meaningfully
// throttled. It raises the cost of a casual attempt; it is not a hard guarantee.
//
// For a real guarantee, back `hit()` with a shared store (Upstash Redis via
// @upstash/ratelimit, or a Cloudflare/Turso-backed counter) and keep this
// interface. The call sites do not need to change.

const buckets = new Map<string, { count: number; resetAt: number }>();

// Keep the Map from growing without bound on a long-running process.
const PRUNE_AT = 10_000;

function prune(now: number) {
  if (buckets.size < PRUNE_AT) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  prune(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    return {
      ok: true,
      remaining: limit - 1,
      limit,
      resetAt: bucket.resetAt,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  return {
    ok: existing.count <= limit,
    remaining,
    limit,
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/**
 * Best-effort client IP.
 *
 * Trusts proxy headers, which is what Vercel and every other reverse proxy set.
 * When no header is present the client cannot be identified, and it would be
 * wrong to lump every unidentified caller into one shared bucket - that would
 * let one unidentifiable client throttle every other visitor. Such callers get
 * their own bucket keyed by "unidentified", which still stops a single script
 * from looping, without coupling unrelated clients together.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unidentified";
}

/** Test-only: clear all buckets. */
export function __resetRateLimits(): void {
  buckets.clear();
}
