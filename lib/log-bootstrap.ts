// Log sink bootstrap. Reads LOG_SINK from the environment and wires
// the corresponding sink. Called from instrumentation.ts at server
// startup so the choice takes effect before the first request.
//
// Env:
//   LOG_SINK=console          (default)
//   LOG_SINK=otlp             (requires LOG_OTLP_ENDPOINT)
//   LOG_SINK=otlp+console     (fanout: console + OTLP)
//   LOG_SINK=noop             (silence logs entirely)
//
// Optional OTLP config:
//   LOG_OTLP_ENDPOINT         — full URL to POST envelopes to
//   LOG_OTLP_HEADERS          — JSON object of extra headers
//   LOG_OTLP_BATCH_MS         — batch entries for N ms before flush
//   LOG_OTLP_SERVICE          — service.name attribute (default 'discipline-os')
//   LOG_OTLP_VERSION          — service.version attribute (default '1.0.0')

import { setSink, consoleSink, type LogSink } from './log'
import { otlpHttpSink, batchingSink, fanoutSink } from './log-sinks'

export type LogBootstrapEnv = {
  LOG_SINK?: string
  LOG_OTLP_ENDPOINT?: string
  LOG_OTLP_HEADERS?: string
  LOG_OTLP_BATCH_MS?: string
  LOG_OTLP_SERVICE?: string
  LOG_OTLP_VERSION?: string
}

export function bootstrapLogSink(env: LogBootstrapEnv = process.env as LogBootstrapEnv): LogSink {
  const choice = (env.LOG_SINK || 'console').toLowerCase()
  switch (choice) {
    case 'otlp+console':
    case 'console+otlp': {
      const otlp = makeOtlpSink(env)
      if (!otlp) return setSinkAndReturn(consoleSink)
      return setSinkAndReturn(fanoutSink([consoleSink, otlp]))
    }
    case 'otlp': {
      const otlp = makeOtlpSink(env)
      if (!otlp) return setSinkAndReturn(consoleSink)
      return setSinkAndReturn(otlp)
    }
    case 'noop':
      return setSinkAndReturn({ name: 'noop', emit() {} })
    case 'console':
    default:
      return setSinkAndReturn(consoleSink)
  }
}

function makeOtlpSink(env: LogBootstrapEnv): LogSink | null {
  const endpoint = env.LOG_OTLP_ENDPOINT
  if (!endpoint) {
    // eslint-disable-next-line no-console
    console.warn('[log] LOG_SINK=otlp but LOG_OTLP_ENDPOINT is not set; falling back to console')
    return null
  }
  let headers: Record<string, string> = {}
  if (env.LOG_OTLP_HEADERS) {
    try {
      headers = JSON.parse(env.LOG_OTLP_HEADERS)
    } catch {
      // eslint-disable-next-line no-console
      console.warn('[log] LOG_OTLP_HEADERS is not valid JSON; ignoring')
    }
  }
  const batchMs = Number(env.LOG_OTLP_BATCH_MS || '0')
  let sink = otlpHttpSink({
    endpoint,
    headers,
    serviceName: env.LOG_OTLP_SERVICE,
    serviceVersion: env.LOG_OTLP_VERSION
  })
  if (Number.isFinite(batchMs) && batchMs > 0) {
    sink = batchingSink(sink, batchMs)
  }
  return sink
}

function setSinkAndReturn(sink: LogSink): LogSink {
  setSink(sink)
  return sink
}
