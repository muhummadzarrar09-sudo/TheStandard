// Structured logger with a pluggable sink. Routes call
// `log.info({ request_id, ... }, 'message')` and the helper formats a
// single-line JSON entry and hands it to a `LogSink`. The default sink
// is `consoleSink` (writes JSON to stdout/stderr via console methods)
// which is what Vercel and most log aggregators read.
//
// To ship to an aggregator (Datadog, Honeycomb, Sentry, OTLP), install
// a custom sink. Two ways:
//
//   1. Inline (single process):
//        import { log, setSink } from '@/lib/log'
//        setSink(myDatadogSink)
//        log.info({ ... }, 'message')
//
//   2. Env-gated (recommended in serverless): set
//        LOG_SINK=otlp LOG_OTLP_ENDPOINT=https://...
//      and the bootstrap in lib/log-bootstrap.ts (auto-imported by
//      instrumentation.ts) wires the OTLP sink for you.
//
// We never log secrets. REDACT_KEYS covers passwords, tokens,
// cookies, push subscription keys, and service-role keys.

export type LogContext = Record<string, unknown>
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogEntry = {
  t: string
  level: LogLevel
  msg: string
  ctx: LogContext
}

export type LogSink = {
  name: string
  emit(entry: LogEntry): void | Promise<void>
}

const REDACT_KEYS = new Set([
  'password', 'token', 'access_token', 'refresh_token', 'authorization',
  'cookie', 'set-cookie', 'auth', 'p256dh', 'endpoint', 'apikey',
  'service_role', 'service-role-key'
])

export function redact(value: unknown, seen: Set<unknown> = new Set()): unknown {
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

// Default sink. Writes a single JSON line per entry. Vercel log
// drain + most aggregators pick this up out of the box.
//
// The console sink flattens `ctx` into the top-level object because
// the Vercel log explorer surfaces top-level keys; nested objects
// are cumbersome to filter on. The OTLP sink (in lib/log-sinks.ts)
// keeps `ctx` nested because that's what OTLP collectors expect.
export const consoleSink: LogSink = {
  name: 'console',
  emit(entry: LogEntry) {
    const flat = { t: entry.t, level: entry.level, msg: entry.msg, ...entry.ctx }
    const line = JSON.stringify(flat)
    const level = entry.level
    const method = level === 'debug' ? 'log' : level
    try {
      // eslint-disable-next-line no-console
      ;(console as any)[method](line)
    } catch {
      // eslint-disable-next-line no-console
      console.log(line)
    }
  }
}

// A sink that drops everything. Useful in tests to silence logs.
export const noopSink: LogSink = {
  name: 'noop',
  emit() {}
}

// A sink that buffers entries into an in-memory ring buffer so tests
// (and `/api/log` if you want to expose them) can read them back. Not
// used in production; the cap prevents unbounded growth.
export function memorySink(cap = 1000): LogSink & { entries: LogEntry[] } {
  const entries: LogEntry[] = []
  return {
    name: 'memory',
    entries,
    emit(entry: LogEntry) {
      entries.push(entry)
      if (entries.length > cap) entries.shift()
    }
  }
}

let currentSink: LogSink = consoleSink

export function getSink(): LogSink {
  return currentSink
}

export function setSink(sink: LogSink): void {
  currentSink = sink
}

export function resetSink(): void {
  currentSink = consoleSink
}

function emit(level: LogLevel, ctx: LogContext | undefined, msg: string) {
  const entry: LogEntry = {
    t: new Date().toISOString(),
    level,
    msg,
    ctx: ctx ? (redact(ctx) as LogContext) : {}
  }
  // The sink is fire-and-forget; we never await a remote shipper from
  // a request handler. An async sink that throws is logged but not
  // propagated, so a misconfigured shipper cannot take down the API.
  try {
    const result = currentSink.emit(entry)
    if (result && typeof (result as Promise<void>).catch === 'function') {
      ;(result as Promise<void>).catch((e) => {
        // eslint-disable-next-line no-console
        console.error('[log] sink failed:', e instanceof Error ? e.message : String(e))
      })
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[log] sink threw:', e instanceof Error ? e.message : String(e))
  }
}

export const log = {
  debug(ctx: LogContext | undefined, msg: string) { emit('debug', ctx, msg) },
  info(ctx: LogContext | undefined, msg: string) { emit('info', ctx, msg) },
  warn(ctx: LogContext | undefined, msg: string) { emit('warn', ctx, msg) },
  error(ctx: LogContext | undefined, msg: string) { emit('error', ctx, msg) }
}

// Generate a short request id. Uses crypto.randomUUID() and slices the
// first 16 chars so logs stay scannable. The full UUID is preserved
// in a header so an ops engineer can grep the full thing if needed.
export function newRequestId(): string {
  // crypto is global in Node 22 and modern browsers.
  return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}
