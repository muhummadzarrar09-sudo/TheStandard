// Request-scoped context. The middleware assigns a request_id to every
// incoming request and writes it to the `x-request-id` header (and the
// response header, so the client can echo it in support requests).
// Route handlers can read it via `getRequestId(req)` and pass it to
// log helpers or include it in error responses.

import type { NextRequest } from 'next/server'
import { newRequestId } from './log'

export const REQUEST_ID_HEADER = 'x-request-id'

const REQUEST_ID_RE = /^[A-Za-z0-9_-]{1,64}$/

// Validate an incoming x-request-id header. If absent or malformed, we
// generate a new one. Caller should write the result back to the
// response so the client can correlate.
export function resolveRequestId(req: NextRequest): string {
  const incoming = req.headers.get(REQUEST_ID_HEADER)
  if (incoming && REQUEST_ID_RE.test(incoming)) return incoming
  return newRequestId()
}

export function getRequestId(req: NextRequest): string {
  return req.headers.get(REQUEST_ID_HEADER) || newRequestId()
}
