# Observability

The app ships with a structured logger (`lib/log.ts`) whose default
sink is `consoleSink` — single-line JSON to stdout, picked up by
Vercel's log explorer. To ship to a real aggregator, set two env
vars and the bootstrap picks the OTLP HTTP sink on next boot.

## Datadog

```
LOG_SINK=otlp
# Datadog's OTLP endpoint accepts the standard OTLP/HTTP shape.
LOG_OTLP_ENDPOINT=https://http-intake.logs.datadoghq.com/api/v2/logs
# The Datadog Logs intake expects an API key header.
LOG_OTLP_HEADERS={"DD-API-KEY":"<your-datadog-api-key>"}
```

The Datadog agent (or the Datadog serverless forwarder) parses the
OTLP-shaped envelope and routes the entries to your log index. Use
Datadog's index facets to filter by `level`, `request_id`, or the
custom fields your routes add (e.g. `user_id`, `cohort_id`).

## Honeycomb

```
LOG_SINK=otlp
LOG_OTLP_ENDPOINT=https://api.honeycomb.io/v1/logs
LOG_OTLP_HEADERS={"x-honeycomb-team":"<your-team-key>"}
```

Honeycomb picks up the entries and lets you query by any field. The
`service.name` is set to `discipline-os` in the envelope; configure
your dataset to allow that service.

## Sentry (for errors only)

The current logger doesn't have a Sentry sink, but the API surface
(`LogSink`) makes it trivial to add one. Pseudocode:

```ts
// lib/log-sentry.ts
import * as Sentry from '@sentry/nextjs'
import type { LogEntry, LogSink } from './log'

export function sentrySink(dsn: string): LogSink {
  return {
    name: 'sentry',
    emit(entry: LogEntry) {
      if (entry.level === 'error' || entry.level === 'warn') {
        Sentry.captureMessage(entry.msg, {
          level: entry.level === 'error' ? 'error' : 'warning',
          extra: entry.ctx
        })
      }
    }
  }
}
```

Wire it in `lib/log-bootstrap.ts` like the OTLP case:
```
LOG_SINK=sentry
SENTRY_DSN=https://...
```

## Aggregation pattern: dual sink

For most production setups you'll want both — Vercel's log explorer
for ops dashboards (always on) and Datadog/Sentry for the heavy
queries. Wrap the two in a composite sink:

```ts
export function compositeSink(...sinks: LogSink[]): LogSink {
  return {
    name: 'composite',
    emit(entry) {
      for (const s of sinks) s.emit(entry)
    }
  }
}
```

Then in `log-bootstrap.ts`, return a composite of `consoleSink` and
the aggregator sink when `LOG_SINK=both`.

## Request correlation

Every request gets a `request_id` (see `lib/request-context.ts`).
The middleware writes it to the `x-request-id` response header; the
client mirrors it back in the request header on every fetch
(implemented in `lib/api-handler.ts`'s `withRequestIdHeader` wrapper).
So a single user action produces a chain of log lines all tagged
with the same id, and the client can quote that id in a support
ticket.

The `x-request-id` header is also returned on every error response
(including 4xx), so a member reporting a bug can paste the id from
the network tab and ops can grep for it.

## What to log (and what not to)

The redaction list in `lib/log.ts` already covers the dangerous keys:
password, token, access_token, refresh_token, authorization, cookie,
auth, p256dh, endpoint, apikey, service_role. Any field whose key
matches one of these is replaced with `[Redacted]` recursively.

**Do log:** user_id (after authentication), cohort_id, request_id,
method, path, status, duration_ms, error message, custom action
labels.

**Do not log:** raw request bodies, raw push subscription keys, raw
auth tokens, anything that would let an attacker impersonate a user
from the log stream alone.
