// The Next.js-coupled CSRF helper. Imports next/server so it
// can't be unit-tested in the sandbox; the pure logic lives
// in lib/csrf.ts (csrfDecide) and is covered by tests/csrf.test.ts.

import { NextRequest, NextResponse } from 'next/server'
import { csrfDecide, getCsrfCookie, CSRF_COOKIE } from './csrf'
import { log } from './log'

// Middleware-style check. Returns either a NextResponse (when
// the request should be rejected) or null (when it should
// proceed). On safe methods, when the cookie is missing, this
// function returns a NextResponse that sets a fresh token so
// the next POST from the same client has something to send.
export function csrfProtect(req: NextRequest): NextResponse | null {
  const url = req.nextUrl
  const cookie = getCsrfCookie(req.cookies)
  const header = req.headers.get('x-csrf-token')
  const decision = csrfDecide(req.method, url.pathname, cookie, header)
  if (decision.kind === 'pass') return null
  if (decision.kind === 'set') {
    const res = NextResponse.next()
    res.cookies.set({
      name: CSRF_COOKIE,
      value: decision.token,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false
    })
    return res
  }
  log.warn({
    request_id: req.headers.get('x-request-id') || 'no-request',
    method: req.method,
    path: url.pathname,
    reason: decision.reason
  }, 'csrf reject')
  return NextResponse.json(
    { error: 'CSRF token required' },
    { status: 403, headers: { 'cache-control': 'no-store' } }
  )
}
