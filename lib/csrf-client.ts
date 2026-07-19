// Client-side CSRF helper. Wraps the global fetch() so every
// state-changing request from the app carries the CSRF header
// automatically. Pages still call fetch() as before; the shim
// injects the header on /api/* POST/PUT/PATCH/DELETE.
//
// This file is imported by the app root layout (a client
// component) and installs the wrapper exactly once.

export const CSRF_COOKIE = 'csrf'
export const CSRF_HEADER = 'x-csrf-token'

export function readCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(?:^|; )' + CSRF_COOKIE + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : ''
}

const STATE_KEY = '__discipline_csrf_installed__'

// Install the global fetch shim. Idempotent: calling this
// twice from different layouts is a no-op.
export function installCsrfFetchShim(): void {
  if (typeof window === 'undefined') return
  if ((window as any)[STATE_KEY]) return
  ;(window as any)[STATE_KEY] = true

  const original = window.fetch.bind(window)
  window.fetch = function csrfFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const method = (
      (init?.method as string | undefined) ||
      (typeof input === 'object' && 'method' in input ? (input as Request).method : '') ||
      'GET'
    ).toUpperCase()

    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return original(input, init)
    }
    const url = typeof input === 'string' || input instanceof URL
      ? new URL(typeof input === 'string' ? input : input.toString(), window.location.href)
      : null
    if (!url || !url.pathname.startsWith('/api/')) {
      return original(input, init)
    }
    if (
      url.pathname.startsWith('/api/auth/') ||
      url.pathname === '/api/log' ||
      url.pathname === '/api/health' ||
      url.pathname.startsWith('/api/push/subscribe')
    ) {
      return original(input, init)
    }

    const headers = new Headers(
      init?.headers || (typeof input === 'object' && 'headers' in input ? (input as Request).headers : undefined)
    )
    if (!headers.has(CSRF_HEADER)) {
      const token = readCsrfToken()
      if (token) headers.set(CSRF_HEADER, token)
    }
    return original(input, { ...init, headers })
  }
}
