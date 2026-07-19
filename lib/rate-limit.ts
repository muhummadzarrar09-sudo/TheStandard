// Per-IP rate limiter. Lightweight in-memory token bucket, designed for
// the small handful of public endpoints (currently /api/log) that have
// no auth and would otherwise be unbounded.
//
// Implementation notes:
// - Process-local Map. On Vercel serverless this means each cold start
//   gets its own counter, which is fine for the goal (bounding the
//   blast radius of a misbehaving client) and avoids needing a Redis
//   round-trip. If we ever federate across multiple regions, swap the
//   Map for an Upstash/Redis-backed store; the public surface stays
//   identical.
// - Sliding-window approximation. We track the timestamp of the first
//   request in the current window. If a request arrives more than
//   `windowMs` after that timestamp, we open a new window. This is
//   stricter than a true sliding window (a client that paces itself
//   for `windowMs` ms can fire the full `max` in the first instant
//   and then again the next instant), but it's O(1) and is plenty
//   for the abuse case.
// - Pruning. A Set tracks the order of bucket insertions; when the
//   map size exceeds `MAX_BUCKETS`, the oldest entry is evicted. This
//   prevents the Map from growing unboundedly under attack.
//
// Caller pattern:
//   const limited = await rateLimit(req, { key: 'log', max: 30, windowMs: 60_000 })
//   if (limited) return toResponse(limited)

export type RateLimitConfig = {
  // Logical bucket name, e.g. 'log' or 'otp'. Each gets its own Map.
  key: string
  // Max requests allowed per IP per window.
  max: number
  // Window size in milliseconds.
  windowMs: number
}

export type RateLimitResult = {
  ok: true
  remaining: number
} | {
  ok: false
  retryAfterSeconds: number
  response: { status: 429; body: { error: string; retry_after: number } }
}

const MAX_BUCKETS = 10_000

type Bucket = {
  // The first-request timestamp of the current window.
  windowStart: number
  // The current count of requests in this window.
  count: number
}

const stores: Map<string, Map<string, Bucket>> = new Map()
const insertionOrder: Map<string, Set<string>> = new Map()

function storeFor(key: string): Map<string, Bucket> {
  let s = stores.get(key)
  if (!s) {
    s = new Map()
    stores.set(key, s)
    insertionOrder.set(key, new Set())
  }
  return s
}

function evictIfNeeded(key: string, store: Map<string, Bucket>): void {
  if (store.size <= MAX_BUCKETS) return
  const order = insertionOrder.get(key)
  if (!order) return
  // Evict the oldest-inserted key. Sets preserve insertion order, so
  // the first iterated value is the oldest.
  const oldest = order.values().next().value
  if (oldest) {
    store.delete(oldest)
    order.delete(oldest)
  }
}

// Extract a best-effort client IP. We trust x-forwarded-for first
// because Vercel sets it; the right-most address is the original
// client when the header is a chain.
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length > 0) return parts[0]
  }
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}

export function rateLimit(
  req: { headers: { get(name: string): string | null } },
  cfg: RateLimitConfig
): RateLimitResult {
  const ip = clientIp(req)
  const now = Date.now()
  const store = storeFor(cfg.key)
  const existing = store.get(ip)
  if (!existing || now - existing.windowStart >= cfg.windowMs) {
    store.set(ip, { windowStart: now, count: 1 })
    const order = insertionOrder.get(cfg.key)!
    if (!order.has(ip)) order.add(ip)
    evictIfNeeded(cfg.key, store)
    return { ok: true, remaining: cfg.max - 1 }
  }
  existing.count += 1
  if (existing.count > cfg.max) {
    const retryAfterMs = cfg.windowMs - (now - existing.windowStart)
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000))
    return {
      ok: false,
      retryAfterSeconds,
      response: {
        status: 429,
        body: {
          error: 'Too many requests',
          retry_after: retryAfterSeconds
        }
      }
    }
  }
  return { ok: true, remaining: cfg.max - existing.count }
}

// Exposed for tests so we can clear state between cases.
export function _resetRateLimitForTests(): void {
  stores.clear()
  insertionOrder.clear()
}
