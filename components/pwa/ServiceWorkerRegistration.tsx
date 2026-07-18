'use client'
import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) {
      // Surface this so QA can see the device doesn't support SW.
      console.info('[pwa] Service workers not supported on this device.')
      return
    }
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        // If a new SW is waiting, surface it so the user can refresh.
        if (reg.waiting && navigator.serviceWorker.controller) {
          console.info('[pwa] Updated service worker is waiting.')
        }
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              console.info('[pwa] New content available; refresh to update.')
            }
          })
        })
      })
      .catch(err => {
        // Don't fail silently. Telemetry is not wired; surface to console and
        // store the most recent error so a future instrumentation call can
        // report it.
        console.warn('[pwa] Service worker registration failed:', err)
        try {
          window.localStorage.setItem('discipline-sw-error', String(err?.message || err))
        } catch {}
      })
  }, [])
  return null
}
