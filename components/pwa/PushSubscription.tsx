'use client'

import { useState } from 'react'
import { createSupabaseBrowser } from '../../lib/supabase/browser'

type State = 'idle' | 'working' | 'enabled' | 'unsupported' | 'denied' | 'ios-needs-install'

function keyToBytes(key: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (key.length % 4)) % 4)
  const base = (key + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base)
  // Use a fresh ArrayBuffer (not SharedArrayBuffer) so the type is
  // Uint8Array<ArrayBuffer>, which is what PushSubscriptionOptions
  // expects under TS 5.7+/7.0 with the stricter ArrayBufferLike split.
  const buf = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return view
}

// Detect iOS Safari. iPadOS reports as Mac in newer versions when
// the page is treated as desktop; check both.
function isiOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua)) return true
  if (ua.includes('Mac') && navigator.maxTouchPoints > 1) return true
  return false
}

// Detect the standalone (Home Screen) display mode. On iOS this
// means the page was launched from a Home Screen icon, not from
// a browser tab. iOS web push ONLY works in standalone mode.
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true
  return window.matchMedia?.('(display-mode: standalone)').matches ?? false
}

// Web push API support (excludes iOS Safari which only supports
// it in standalone mode + iOS 16.4+).
function pushSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (!('serviceWorker' in navigator)) return false
  if (!('PushManager' in window)) return false
  if (!('Notification' in window)) return false
  return true
}

export default function PushSubscription() {
  const [state, setState] = useState<State>('idle')

  async function enable() {
    if (!pushSupported()) {
      setState('unsupported')
      return
    }
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setState('unsupported')
      return
    }
    // iOS Safari gates web push behind two preconditions: iOS
    // 16.4+ AND a Home Screen install. The api is technically
    // present in 16.4+ but subscribe() throws unless standalone.
    if (isiOS() && !isStandalone()) {
      setState('ios-needs-install')
      return
    }
    setState('working')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState('denied')
        return
      }
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
      })
      const json = subscription.toJSON()
      const db = createSupabaseBrowser()
      const { data: { session } } = await db.auth.getSession()
      const r = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys })
      })
      setState(r.ok ? 'enabled' : 'idle')
    } catch {
      if (isiOS() && !isStandalone()) {
        setState('ios-needs-install')
        return
      }
      setState('idle')
    }
  }

  return (
    <div className="card">
      <p className="eyebrow">NOTIFICATIONS</p>
      <h3>Keep your commitments visible.</h3>
      <p className="muted">
        Receive local-time reminders and new report alerts. Permission is requested
        only when you choose.
      </p>
      <button
        className="button"
        onClick={enable}
        disabled={state === 'working' || state === 'enabled'}
        style={{ marginTop: 12 }}
      >
        {state === 'working' ? 'Enabling…'
          : state === 'enabled' ? 'Notifications enabled'
          : state === 'denied' ? 'Permission denied'
          : state === 'unsupported' ? 'Not supported here'
          : state === 'ios-needs-install' ? 'Add to Home Screen first'
          : 'Enable notifications →'}
      </button>
      {state === 'ios-needs-install' && <IOSInstallHint />}
      {state === 'denied' && (
        <p role="alert" style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
          Permission was denied. To re-enable, open Settings → Safari → Notifications.
        </p>
      )}
      {state === 'unsupported' && (
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
          Your browser does not support web push. Use the latest Chrome, Edge, or Firefox on desktop.
        </p>
      )}
    </div>
  )
}

function IOSInstallHint() {
  return (
    <div
      role="status"
      style={{
        marginTop: 14,
        padding: '12px 14px',
        border: '1px solid var(--line)',
        background: 'var(--bg)',
        borderRadius: 'var(--radius)',
        fontSize: 12,
        lineHeight: 1.5
      }}
    >
      <p style={{ margin: 0, fontWeight: 700 }}>iOS — install to Home Screen first</p>
      <p className="muted" style={{ margin: '6px 0 0' }}>
        iOS Safari only delivers web push when this app is installed as a Home Screen app
        (iOS 16.4 or later).
      </p>
      <ol style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
        <li>Tap the Share button (the square with an arrow).</li>
        <li>Choose <b>Add to Home Screen</b>.</li>
        <li>Open the app from the Home Screen icon (not Safari).</li>
        <li>Tap <b>Enable notifications</b> again.</li>
      </ol>
    </div>
  )
}
