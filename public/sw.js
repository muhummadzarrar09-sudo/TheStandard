// The Standard — service worker
//
// Scope: cache the static app shell + the latest N reports. Do NOT cache
// authenticated HTML or /api responses; that data is per-user and must
// not be served from a shared cache. PRD § 18.5 explicitly forbids this.
//
// Cache strategy:
//   - App shell (HTML pages the user can land on while signed-out, plus
//     static assets): cache-first with network fallback.
//   - /api/*: never cached. The browser handles these.
//   - Authenticated HTML pages: never cached. The browser handles these.
//   - Reports: stale-while-revalidate, versioned via CACHE name.
//
// Versioning: bumping CACHE invalidates everything.

const CACHE = 'discipline-os-v3'
const SHELL = ['/', '/login', '/verify', '/offline.html']
// Mirrors lib/offline/reports-cache.ts. PRD §7.6 says "Offline
// cache of the latest configurable number; default 5 reports."
// If you change the limit, change the matching lib value too.
const REPORT_CACHE = 'discipline-reports-v2'
const MAX_REPORT_ENTRIES = 5

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => k !== CACHE && k !== REPORT_CACHE)
          .map((k) => caches.delete(k))
      )
      await self.clients.claim()
    })()
  )
})

function isAuthenticatedResponse(response) {
  // The Supabase SSR client sets the supabase-auth-token cookie. Heuristic
  // by header: if the response has Set-Cookie for auth, treat as auth and
  // skip caching.
  const setCookie = response.headers.get('set-cookie') || ''
  return /sb-.*-auth-token|supabase-auth-token/i.test(setCookie)
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
}

function isAuthenticatedHtmlPath(url) {
  // Anything under the (app) route group requires auth. Cache only public
  // pages and static assets.
  const publicPrefixes = ['/login', '/verify', '/offline.html', '/_next', '/icons', '/manifest.json', '/favicon']
  return !publicPrefixes.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'))
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // API: never cache.
  if (isApiRequest(url)) return

  // Authenticated HTML: never cache.
  if (isAuthenticatedHtmlPath(url) && req.mode === 'navigate') return

  // Report detail: stale-while-revalidate against REPORT_CACHE.
  if (url.pathname.startsWith('/reports/') && url.pathname !== '/reports') {
    event.respondWith(staleWhileRevalidate(req, REPORT_CACHE, MAX_REPORT_ENTRIES))
    return
  }

  // App shell: cache-first.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req)
        .then((response) => {
          // Defense in depth: skip if response looks authenticated.
          if (isAuthenticatedResponse(response)) return response
          const copy = response.clone()
          if (response.ok) {
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
          }
          return response
        })
        .catch(() => caches.match('/offline.html'))
    })
  )
})

async function staleWhileRevalidate(req, cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(req)
  const fetchPromise = fetch(req)
    .then((response) => {
      if (response.ok && !isAuthenticatedResponse(response)) {
        cache.put(req, response.clone()).then(() => trimCache(cacheName, maxEntries)).catch(() => {})
      }
      return response
    })
    .catch(() => cached)
  return cached || fetchPromise
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  const excess = keys.length - maxEntries
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i])
  }
}

self.addEventListener('push', (event) => {
  let data = { title: 'Discipline OS', body: 'Your next commitment is waiting.', url: '/dashboard' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      data: { url: data.url }
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/dashboard'
  event.waitUntil(clients.openWindow(url))
})
