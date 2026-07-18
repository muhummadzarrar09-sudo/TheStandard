'use client'
import { useEffect } from 'react'

function reportClient(level: 'info' | 'warn' | 'error', msg: string, ctx: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  try {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entries: [{ level, msg, ctx, ts: new Date().toISOString() }] }),
      keepalive: true
    }).catch(() => {})
  } catch {
    // never throw from a registration handler
  }
}

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) {
      // Surface this so QA can see the device doesn't support SW.
      console.info('[pwa] Service workers not supported on this device.')
      reportClient('info', 'pwa: service workers not supported')
      return
    }
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        // If a new SW is waiting, surface it so the user can refresh.
        if (reg.waiting && navigator.serviceWorker.controller) {
          console.info('[pwa] Updated service worker is waiting.')
          reportClient('info', 'pwa: update available', { scope: reg.scope })
        }
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              console.info('[pwa] New content available; refresh to update.')
              reportClient('info', 'pwa: new content installed')
            }
          })
        })
      })
      .catch(err => {
        // Don't fail silently. Surface to console, persist for support,
        // and report to the server-side log endpoint.
        const message = err instanceof Error ? err.message : String(err)
        console.warn('[pwa] Service worker registration failed:', err)
        try {
          window.localStorage.setItem('discipline-sw-error', message)
        } catch {}
        reportClient('error', 'pwa: registration failed', { message })
      })
  }, [])
  return null
}
