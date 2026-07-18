// Structured logger. Routes call `log.info({ request_id, ... }, 'message')`
// and the helper formats it for either console output (dev) or for an
// aggregator (prod). Vercel + most log shippers read JSON from stdout, so
// the default output is single-line JSON. We never log secrets (no auth
// tokens, no user passwords, no raw push subscription keys).

export type LogContext = Record<string, unknown>
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const REDACT_KEYS = new Set([
  'password', 'token', 'access_token', 'refresh_token', 'authorization',
  'cookie', 'set-cookie', 'auth', 'p256dh', 'endpoint', 'apikey',
  'service_role', 'service-role-key'
])

function redact(value: unknown, seen: Set<unknown> = new Set()): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value
  if (seen.has(value)) return '[Circular]'
  seen.add(value)
  if (Array.isArray(value)) {
    return value.map(v => redact(v, seen))
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACT_KEYS.has(k.toLowerCase()) ? '[Redacted]' : redact(v, seen)
  }
  return out
}

function emit(level: LogLevel, ctx: LogContext | undefined, msg: string) {
  const entry = {
    t: new Date().toISOString(),
    level,
    msg,
    ...(ctx ? redact(ctx) as LogContext : {})
  }
  // Single-line JSON. The Next.js / Vercel log shippers pick this up.
  try {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](JSON.stringify(entry))
  } catch {
    // Fallback for environments where console methods are weird.
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ...entry, ctx: String(entry.ctx) }))
  }
}

export const log = {
  debug(ctx: LogContext | undefined, msg: string) { emit('debug', ctx, msg) },
  info(ctx: LogContext | undefined, msg: string) { emit('info', ctx, msg) },
  warn(ctx: LogContext | undefined, msg: string) { emit('warn', ctx, msg) },
  error(ctx: LogContext | undefined, msg: string) { emit('error', ctx, msg) }
}

// Generate a short request id. Uses crypto.randomUUID() and slices the
// first 8 chars so logs stay scannable. The full UUID is preserved
// in a header so an ops engineer can grep the full thing if needed.
export function newRequestId(): string {
  // crypto is global in Node 22 and modern browsers.
  return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}
