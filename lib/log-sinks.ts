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
export function otlpHttpSink(options: { endpoint: string; headers?: Record<string, string> }): LogSink {
  return {
    name: 'otlp-http',
    emit(entry: LogEntry) {
      const envelope = {
        // The shape is intentionally close to OTLP's
        // ExportLogsServiceRequest so a collector can ingest with
        // minimal mapping. This is not strict OTLP protobuf; it's
        // JSON-with-OTLP-fields, which most collectors accept.
        resourceLogs: [
          {
            resource: { attributes: { 'service.name': 'discipline-os' } },
            scopeLogs: [
              {
                scope: { name: 'discipline-os', version: '1.0.0' },
                logRecords: [
                  {
                    timeUnixNano: String(BigInt(Date.parse(entry.t)) * 1000000n),
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
      // Best-effort, non-blocking. Failures are swallowed because a
      // request handler must not be allowed to throw because of a
      // logging hiccup.
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
    // Hand each entry to the inner sink. If the inner sink is async
    // (a fetch-based shipper), we let the runtime queue them.
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
