'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '../../../../components/ui/AppShell'
import { MEMBER_RAIL } from '../../../../lib/nav'

type Device = {
  id: string
  label: string | null
  last_seen_at: string
  revoked_at: string | null
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch('/api/devices')
        const x = await r.json()
        if (cancelled) return
        if (!r.ok) throw new Error(x.error || 'Could not load devices')
        setDevices(x.sessions || [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load devices')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function revoke(id: string) {
    try {
      const r = await fetch(`/api/devices?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (r.ok) {
        setDevices(devices => devices.filter(d => d.id !== id))
      } else {
        const x = await r.json().catch(() => ({} as any))
        setError(x.error || 'Could not revoke device')
      }
    } catch {
      setError('Network error.')
    }
  }

  return (
    <AppShell items={MEMBER_RAIL}>
      <p className="eyebrow">SETTINGS · SECURITY</p>
      <h1>Active devices.</h1>
      <p className="muted">Two devices maximum. Revoke a session before signing in somewhere new.</p>
      {error && (
        <p role="alert" className="muted" style={{ color: 'var(--danger)', marginTop: 12 }}>
          {error}
        </p>
      )}
      <section className="card" style={{ marginTop: 30 }} aria-labelledby="active-devices">
        <h2 id="active-devices" className="eyebrow" style={{ marginTop: 0 }}>ACTIVE SESSIONS</h2>
        {loading ? (
          <p className="muted" role="status">Loading sessions…</p>
        ) : devices.length === 0 ? (
          <p className="muted">No active device sessions found.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {devices.map(d => (
              <li
                key={d.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '18px 0',
                  borderBottom: '1px solid var(--line)'
                }}
              >
                <div>
                  <b>{d.label || 'Unknown device'}</b>
                  <p className="muted" style={{ margin: '5px 0 0' }}>
                    Last active · {new Date(d.last_seen_at).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  className="button"
                  style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                  onClick={() => revoke(d.id)}
                >
                  Sign out
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  )
}
