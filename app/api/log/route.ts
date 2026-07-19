import { NextRequest, NextResponse } from 'next/server'
import { log } from '../../../lib/log'
import { badRequest, toResponse, serverError } from '../../../lib/api-errors'
import { withErrorHandling, withRequestIdHeader } from '../../../lib/api-handler'
import { rateLimit } from '../../../lib/rate-limit'

export const dynamic = 'force-dynamic'

// Max body size. Client error payloads are small; cap at 4 KB to keep
// the endpoint cheap and to prevent abuse.
const MAX_BODY = 4 * 1024
const MAX_FIELD = 500

// Per-IP rate limit. 60 entries per minute is plenty for a real client
// (a single error boundary firing is well under 5 entries) and stops
// a misbehaving tab from filling the structured log stream.
const RATE_MAX = 60
const RATE_WINDOW_MS = 60_000

function trimField(v: unknown): unknown {
  if (typeof v === 'string') {
    return v.length > MAX_FIELD ? v.slice(0, MAX_FIELD) + '…' : v
  }
  if (Array.isArray(v)) {
    return v.slice(0, 50).map(trimField)
  }
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v)) {
      out[k] = trimField(val)
    }
    return out
  }
  return v
}

// Client-side error reporting. Used by:
//   * Service worker registration failure (component)
//   * Team chat send failure (component)
//   * SaveOfflineButton (component)
//   * app/error.tsx (route error boundary)
//
// The endpoint accepts an array of { level, msg, ctx, ts } entries and
// emits one structured log line per entry. It is intentionally cheap —
// no auth check, no DB write — so a degraded client can always report.
export const POST = withErrorHandling(
  withRequestIdHeader(async (req: NextRequest): Promise<Response> => {
    const limited = rateLimit(req, { key: 'log', max: RATE_MAX, windowMs: RATE_WINDOW_MS })
    if (!limited.ok) {
      return new Response(JSON.stringify(limited.response.body), {
        status: limited.response.status,
        headers: {
          'content-type': 'application/json',
          'retry-after': String(limited.retryAfterSeconds)
        }
      })
    }
    const text = await req.text()
    if (text.length > MAX_BODY) {
      return toResponse(badRequest('Body too large'))
    }
    let body: any
    try {
      body = JSON.parse(text)
    } catch {
      return toResponse(badRequest('Invalid JSON'))
    }
    const entries = Array.isArray(body?.entries) ? body.entries : null
    if (!entries) {
      return toResponse(badRequest('entries array is required', { field: 'entries' }))
    }
    for (const e of entries) {
      if (!e || typeof e !== 'object') continue
      const level = ['debug', 'info', 'warn', 'error'].includes(e.level) ? e.level : 'info'
      const msg = typeof e.msg === 'string' ? e.msg.slice(0, MAX_FIELD) : 'client log'
      const ctx = trimField(e.ctx) || {}
      log[level as 'info' | 'warn' | 'error'](
        { source: 'client', ...(typeof ctx === 'object' ? ctx as Record<string, unknown> : { value: ctx }) },
        msg
      )
    }
    return NextResponse.json({ accepted: entries.length })
  })
)
