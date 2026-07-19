// Built-in log sinks. Importable directly, or selected by env var via
// `lib/log-bootstrap.ts`. Each sink is small and self-contained; the
// public surface matches `LogSink` from `lib/log.ts`.

import type { LogEntry, LogSink } from './log'

// OTLPLogs-shaped HTTP sink. Sends one JSON envelope per emit() to
// the configured endpoint. In serverless, this is fire-and-forget
// (the LogSink contract doesn't await); the function returns before
// the HTTP request resolves. Use a real collector (Datadog Agent,
// Vector, Fluent Bit) on the Vercel host if you need durability.
//
// Env:
//   LOG_OTLP_ENDPOINT  — full URL to POST envelopes to
//   LOG_OTLP_HEADERS   — optional JSON object of extra headers
//   LOG_OTLP_BATCH_MS  — optional; batch entries for N ms before flush
//                        (default 0 = no batching)
//   LOG_OTLP_SERVICE   — optional; service.name attribute (default
//                        'discipline-os')
//   LOG_OTLP_VERSION   — optional; service.version attribute (default
//                        '1.0.0')

export function otlpHttpSink(options: {
  endpoint: string
  headers?: Record<string, string>
  serviceName?: string
  serviceVersion?: string
}): LogSink {
  const serviceName = options.serviceName || 'discipline-os'
  const serviceVersion = options.serviceVersion || '1.0.0'
  const start = typeof performance !== 'undefined' ? performance.timeOrigin : Date.now()
  return {
    name: 'otlp-http',
    emit(entry: LogEntry) {
      const envelope = {
        resourceLogs: [
          {
            resource: {
              attributes: {
                'service.name': serviceName,
                'service.version': serviceVersion
              }
            },
            scopeLogs: [
              {
                scope: { name: serviceName, version: serviceVersion },
                logRecords: [
                  {
                    // The entry's t is ms-precise. The
                    // observedTimeUnixNano (added Phase 9e)
                    // gives the collector a sub-ms view of
                    // when this shipper actually fired.
                    timeUnixNano: timestampNanos(entry.t),
                    observedTimeUnixNano: timestampNowNanos(start),
                    severityText: entry.level.toUpperCase(),
                    body: { stringValue: entry.msg },
                    attributes: flatAttributes(entry.ctx)
                  }
                ]
              }
            ]
          }
        ]
      }
      fetch(options.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(options.headers || {}) },
        body: JSON.stringify(envelope),
        keepalive: true
      }).catch(() => {})
    }
  }
}

// A sink that batches entries and ships them on a timer. Useful for
// amortizing HTTP cost when the same process handles many requests.
// (For serverless deployments, prefer the unbatched otlpHttpSink.)
export function batchingSink(inner: LogSink, batchMs = 250): LogSink {
  let buffer: LogEntry[] = []
  let timer: ReturnType<typeof setTimeout> | null = null
  function flush() {
    if (buffer.length === 0) return
    const batch = buffer
    buffer = []
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    for (const entry of batch) {
      try {
        const r = inner.emit(entry)
        if (r && typeof (r as Promise<void>).catch === 'function') {
          ;(r as Promise<void>).catch(() => {})
        }
      } catch {
        // swallow
      }
    }
  }
  return {
    name: inner.name + '+batch',
    emit(entry: LogEntry) {
      buffer.push(entry)
      if (timer) return
      timer = setTimeout(flush, batchMs)
    }
  }
}

// A sink that runs two sinks in parallel. Useful for dual-piping
// (e.g. console in dev + OTLP to prod, or Datadog + Sentry during
// a migration). Failures in either sink are isolated.
export function fanoutSink(sinks: LogSink[]): LogSink {
  return {
    name: 'fanout(' + sinks.map(s => s.name).join('+') + ')',
    emit(entry: LogEntry) {
      for (const s of sinks) {
        try {
          const r = s.emit(entry)
          if (r && typeof (r as Promise<void>).catch === 'function') {
            ;(r as Promise<void>).catch(() => {})
          }
        } catch {
          // swallow
        }
      }
    }
  }
}

function flatAttributes(ctx: Record<string, unknown>): Array<{ key: string; value: { stringValue: string } }> {
  const out: Array<{ key: string; value: { stringValue: string } }> = []
  for (const [k, v] of Object.entries(ctx)) {
    if (v === undefined || v === null) continue
    if (typeof v === 'object') {
      out.push({ key: k, value: { stringValue: JSON.stringify(v) } })
    } else {
      out.push({ key: k, value: { stringValue: String(v) } })
    }
  }
  return out
}

// Convert an ISO timestamp to nanoseconds. The entry's `t` was
// produced by `new Date().toISOString()` at log-call time and is
// millisecond-precise; we can recover ms but not sub-ms.
function timestampNanos(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return '0'
  return String(ms * 1_000_000)
}

// "Now" in nanoseconds, with sub-ms precision via performance.now().
// Used for observedTimeUnixNano so the collector can compute
// log-then-ship latency.
function timestampNowNanos(timeOrigin: number): string {
  let now = Date.now()
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    now = timeOrigin + performance.now()
  }
  return String(Math.round(now * 1_000_000))
}
