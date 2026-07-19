'use client'

import { useState } from 'react'

type Session = {
  id: string
  label: string | null
  device_id: string
  last_seen_at: string
}

type Props = {
  sessions: Session[]
  onResolved: () => void
  onCancel: () => void
}

// The 3-device revoke picker. The user sees their active sessions
// and picks one to revoke so the new device can register.
export default function DeviceRevokePicker({ sessions, onResolved, onCancel }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function revoke(id: string) {
    setBusy(id)
    setError(null)
    try {
      const r = await fetch('/api/auth/device-revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: id })
      })
      if (!r.ok) {
        const x = await r.json().catch(() => ({} as any))
        setError(x.error || 'Could not revoke device.')
        setBusy(null)
        return
      }
      onResolved()
    } catch {
      setError('Network error.')
      setBusy(null)
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Device limit reached</h3>
      <p className="muted" style={{ margin: '0 0 14px' }}>
        You're signed in on two devices. To add this one, sign out one of the devices below.
        The other sessions stay signed in.
      </p>
      {error && (
        <p role="alert" style={{ color: '#ff8b82', margin: '0 0 10px', fontSize: 13 }}>
          {error}
        </p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {sessions.map(s => (
          <li
            key={s.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 0',
              borderBottom: '1px solid var(--line)'
            }}
          >
            <div>
              <b>{s.label || 'Unknown device'}</b>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 11 }}>
                Last active {new Date(s.last_seen_at).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              className="button"
              disabled={busy !== null}
              onClick={() => revoke(s.id)}
              aria-busy={busy === s.id}
              style={{
                background: 'transparent',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                padding: '8px 14px',
                fontSize: 12
              }}
            >
              {busy === s.id ? 'Signing out…' : 'Sign out this device'}
            </button>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'none',
            border: 0,
            color: 'var(--muted)',
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
