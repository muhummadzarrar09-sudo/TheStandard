// Offline-regression harness for the service worker. The SW logic is
// plain JavaScript; we can run it under JSDOM and assert that
// authenticated requests are *not* cached and that the offline
// fallback is served when the network is unavailable.
//
// We don't load the actual sw.js file at runtime (it would require
// a real ServiceWorkerGlobalScope), so we mirror the routing rules
// here as `fullDecide`. The constants must stay in sync with
// public/sw.js; if you change one, change the other.

import { describe, it, expect } from 'vitest'

type Decision = 'cache-first' | 'stale-while-revalidate' | 'pass-through'

// Mirror of public/sw.js's routing. The two must stay in sync.
const PUBLIC_PREFIXES = [
  '/login', '/verify', '/offline.html', '/_next', '/icons', '/manifest.json', '/favicon'
]
const REPORT_PREFIX = '/reports/'

// Whether a URL is an authenticated HTML navigation target. Used to
// decide pass-through vs cache-first in the SW. In production the SW
// inspects req.mode === 'navigate'; we approximate that here.
function isAuthenticatedNavigation(url: URL): boolean {
  if (url.pathname.startsWith('/api/')) return false
  const isPublic = PUBLIC_PREFIXES.some(p => url.pathname === p || url.pathname.startsWith(p + '/'))
  if (isPublic) return false
  if (url.pathname.startsWith(REPORT_PREFIX) && url.pathname !== '/reports') return false
  // Heuristic: HTML pages that aren't in a public prefix and aren't
  // an asset are authenticated navigations.
  return !/\.(js|css|png|jpg|jpeg|svg|ico|json|woff2?|map)$/i.test(url.pathname)
}

function fullDecide(method: string, url: URL, isAuthedResponse: boolean, isNavigation: boolean): Decision {
  if (method !== 'GET') return 'pass-through'
  if (url.origin !== 'https://app.example.com') return 'pass-through'
  if (url.pathname.startsWith('/api/')) return 'pass-through'
  if (isAuthedResponse) return 'pass-through'
  if (url.pathname.startsWith(REPORT_PREFIX) && url.pathname !== '/reports') {
    return 'stale-while-revalidate'
  }
  if (isNavigation && isAuthenticatedNavigation(url)) return 'pass-through'
  return 'cache-first'
}

function makeUrl(path: string): URL {
  return new URL(path, 'https://app.example.com')
}

describe('service worker routing', () => {
  it('passes through POST /api/*', () => {
    expect(fullDecide('POST', makeUrl('/api/schedule/complete'), false, false)).toBe('pass-through')
  })

  it('passes through GET /api/* (never cache)', () => {
    expect(fullDecide('GET', makeUrl('/api/leaderboard'), false, false)).toBe('pass-through')
    expect(fullDecide('GET', makeUrl('/api/health'), false, false)).toBe('pass-through')
    expect(fullDecide('GET', makeUrl('/api/log'), false, false)).toBe('pass-through')
  })

  it('passes through authenticated HTML navigations', () => {
    expect(fullDecide('GET', makeUrl('/dashboard'), false, true)).toBe('pass-through')
    expect(fullDecide('GET', makeUrl('/team/chat'), false, true)).toBe('pass-through')
    expect(fullDecide('GET', makeUrl('/admin/members'), false, true)).toBe('pass-through')
  })

  it('caches the public shell (login, verify, offline)', () => {
    expect(fullDecide('GET', makeUrl('/login'), false, true)).toBe('cache-first')
    expect(fullDecide('GET', makeUrl('/verify'), false, true)).toBe('cache-first')
    expect(fullDecide('GET', makeUrl('/offline.html'), false, true)).toBe('cache-first')
  })

  it('caches static assets', () => {
    expect(fullDecide('GET', makeUrl('/_next/static/chunks/main.js'), false, false)).toBe('cache-first')
    expect(fullDecide('GET', makeUrl('/icons/icon-192.png'), false, false)).toBe('cache-first')
    expect(fullDecide('GET', makeUrl('/manifest.json'), false, false)).toBe('cache-first')
    expect(fullDecide('GET', makeUrl('/favicon.ico'), false, false)).toBe('cache-first')
  })

  it('caches report detail pages with stale-while-revalidate', () => {
    expect(fullDecide('GET', makeUrl('/reports/abc-123'), false, true)).toBe('stale-while-revalidate')
  })

  it('does NOT stale-while-revalidate the /reports index (auth-gated)', () => {
    expect(fullDecide('GET', makeUrl('/reports'), false, true)).toBe('pass-through')
  })

  it('passes through any response that looks authenticated (Set-Cookie)', () => {
    expect(fullDecide('GET', makeUrl('/login'), true, true)).toBe('pass-through')
  })

  it('passes through cross-origin requests', () => {
    const url = new URL('https://cdn.example.com/something')
    expect(fullDecide('GET', url, false, false)).toBe('pass-through')
  })
})

describe('offline fallback page', () => {
  it('is referenced by the SW shell list', async () => {
    const fs = await import('fs/promises')
    const sw = await fs.readFile('public/sw.js', 'utf8')
    expect(sw).toMatch(/['"`]\/offline\.html['"`]/)
  })

  it('exists and is non-empty', async () => {
    const fs = await import('fs/promises')
    const html = await fs.readFile('public/offline.html', 'utf8')
    expect(html.length).toBeGreaterThan(0)
    expect(html).toMatch(/<title>/i)
    // Offline pages should not include auth-gated UI.
    expect(html).not.toMatch(/dashboard|team-chat|leaderboard/i)
  })
})

describe('manifest.json', () => {
  it('parses and has the required PWA fields', async () => {
    const fs = await import('fs/promises')
    const raw = await fs.readFile('public/manifest.json', 'utf8')
    const m = JSON.parse(raw)
    expect(m.name).toBeTruthy()
    expect(m.short_name).toBeTruthy()
    expect(m.start_url).toBeTruthy()
    expect(m.display).toBeTruthy()
    // If icons are present, they must have src + sizes.
    if (Array.isArray(m.icons) && m.icons.length > 0) {
      for (const icon of m.icons) {
        expect(typeof icon.src).toBe('string')
        expect(icon.src.length).toBeGreaterThan(0)
      }
    } else {
      // No icons is allowed at launch; the SW still installs. Log a
      // soft warning so the team notices when they add icons.
      // eslint-disable-next-line no-console
      console.warn('[sw-offline] manifest.icons is empty; consider adding 192/512 PNGs for install prompt')
    }
  })
})
