// Log sink bootstrap. Reads LOG_SINK from the environment and wires
// the corresponding sink. Called from instrumentation.ts at server
// startup so the choice takes effect before the first request.
//
// Env:
//   LOG_SINK=console          (default)
//   LOG_SINK=otlp             (requires LOG_OTLP_ENDPOINT)
//   LOG_SINK=noop             (silence logs entirely)
//
// This file is safe to import multiple times; the second call is a
// no-op (it just resets the sink to whatever the env says).

import { setSink, consoleSink, type LogSink } from './log'
import { otlpHttpSink } from './log-sinks'

export function bootstrapLogSink(env: { LOG_SINK?: string; LOG_OTLP_ENDPOINT?: string; LOG_OTLP_HEADERS?: string } = process.env as any): LogSink {
  const choice = (env.LOG_SINK || 'console').toLowerCase()
  switch (choice) {
    case 'otlp': {
      const endpoint = env.LOG_OTLP_ENDPOINT
      if (!endpoint) {
        // eslint-disable-next-line no-console
        console.warn('[log] LOG_SINK=otlp but LOG_OTLP_ENDPOINT is not set; falling back to console')
        return setSinkAndReturn(consoleSink)
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
      return setSinkAndReturn(otlpHttpSink({ endpoint, headers }))
    }
    case 'noop':
      return setSinkAndReturn({ name: 'noop', emit() {} })
    case 'console':
    default:
      return setSinkAndReturn(consoleSink)
  }
}

function setSinkAndReturn(sink: LogSink): LogSink {
  setSink(sink)
  return sink
}
