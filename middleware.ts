import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { resolveRequestId, REQUEST_ID_HEADER } from './lib/request-context'
import { generateNonce, CSP_NONCE_HEADER } from './lib/csp-nonce'
import { csrfProtect } from './lib/csrf-middleware'

export async function middleware(request: NextRequest) {
  // Resolve (or generate) a request id and stamp it on the response so
  // every protected page, every API call, and every static asset gets
  // a correlation id.
  const requestId = resolveRequestId(request)
  // Per-request CSP nonce. Forwarded to downstream server components
  // via a request header (next/headers reads it from there) and
  // embedded in the CSP that this middleware sets on the response.
  const nonce = generateNonce()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(CSP_NONCE_HEADER, nonce)

  // CSRF: check the state-changing request before doing anything
  // else. A 403 here short-circuits the rest of the pipeline. On
  // safe methods, the helper also sets a fresh `csrf` cookie
  // when one is missing, so the next POST from the same client
  // has a token to send.
  const csrfResponse = csrfProtect(request)
  if (csrfResponse) {
    csrfResponse.headers.set(REQUEST_ID_HEADER, requestId)
    csrfResponse.headers.set(CSP_NONCE_HEADER, nonce)
    return csrfResponse
  }

  const isDev = process.env.NODE_ENV !== 'production'
  // In dev, allow inline scripts so Next.js's HMR + boot scripts run.
  // In production, the nonce is the only escape hatch; without it
  // inline scripts are blocked.
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : `'self' 'nonce-${nonce}'`
  const csp = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc}`,
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.vercel.app",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'"
  ].join('; ')

  let response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set(REQUEST_ID_HEADER, requestId)
  response.headers.set(CSP_NONCE_HEADER, nonce)
  response.headers.set('Content-Security-Policy', csp)

  // Build a Supabase client bound to the request/response cookie jars.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value)
          })
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const protectedPath =
    path.startsWith('/dashboard') ||
    path.startsWith('/schedule') ||
    path.startsWith('/tracker') ||
    path.startsWith('/leaderboard') ||
    path.startsWith('/team') ||
    path.startsWith('/community') ||
    path.startsWith('/reports') ||
    path.startsWith('/settings') ||
    path.startsWith('/profile')

  if (protectedPath && !user) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', path)
    const r = NextResponse.redirect(url)
    r.headers.set(REQUEST_ID_HEADER, requestId)
    r.headers.set(CSP_NONCE_HEADER, nonce)
    r.headers.set('Content-Security-Policy', csp)
    return r
  }
  if (path.startsWith('/admin') && !user) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', path)
    const r = NextResponse.redirect(url)
    r.headers.set(REQUEST_ID_HEADER, requestId)
    r.headers.set(CSP_NONCE_HEADER, nonce)
    r.headers.set('Content-Security-Policy', csp)
    return r
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health|api/auth|manifest.json|sw.js|offline.html|icon-192.png|icon-512.png|icon.svg|login-preview.html).*)']
}
