'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '../../../lib/copy'
import { getOrCreateDeviceId, getDeviceLabel } from '../../../lib/device-id'
import DeviceRevokePicker from '../../../components/auth/DeviceRevokePicker'

type Session = {
  id: string
  label: string | null
  device_id: string
  last_seen_at: string
}

export default function Verify() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [deviceRevokeSessions, setDeviceRevokeSessions] = useState<Session[] | null>(null)
  const router = useRouter()

  useEffect(() => {
    setEmail(sessionStorage.getItem('discipline-login-email') || '')
    setToken(sessionStorage.getItem('discipline-login-token') || '')
  }, [])

  async function registerDevice(): Promise<{ ok: true } | { ok: false; error: string }> {
    const deviceId = getOrCreateDeviceId()
    if (!deviceId) return { ok: false, error: 'Could not generate device id' }
    try {
      // First-time registration: don't send x-device-id (the row
      // doesn't exist yet, so getActiveUser would 401). On
      // subsequent logins on the same device, the row exists and
      // the header will be present; the route re-registers as a
      // no-op.
      const r = await fetch('/api/devices/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ deviceId, label: getDeviceLabel() })
      })
      const x = await r.json().catch(() => ({} as any))
      if (x.needsRevoke) {
        setDeviceRevokeSessions(x.sessions || [])
        return { ok: false, error: 'device_cap' }
      }
      if (!r.ok || !x.ok) {
        return { ok: false, error: x.error || 'Could not register device' }
      }
      return { ok: true }
    } catch {
      return { ok: false, error: 'Network error' }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!/^\d{6}$/.test(code)) {
      setError(t('verify.invalidCode'))
      return
    }
    if (!token) {
      router.replace('/login')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, token, code })
      })
      const x = await r.json().catch(() => ({} as any))
      if (!r.ok || !x.ok) {
        setError(t('verify.error'))
        setBusy(false)
        return
      }
      // Verify succeeded; now register this device. The route
      // returns needsRevoke if the user is at the 2-device cap.
      const reg = await registerDevice()
      if (!reg.ok) {
        if (reg.error === 'device_cap') {
          // The DeviceRevokePicker is now visible. The user
          // picks a session to revoke; we resume from there.
          setBusy(false)
          return
        }
        setError(reg.error)
        setBusy(false)
        return
      }
      sessionStorage.removeItem('discipline-login-email')
      sessionStorage.removeItem('discipline-login-token')
      window.location.href = '/dashboard'
    } catch {
      setError(t('verify.error'))
      setBusy(false)
    }
  }

  async function resend() {
    if (!email || !token) {
      router.replace('/login')
      return
    }
    setError('')
    setInfo('')
    setBusy(true)
    try {
      const r = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, token })
      })
      if (!r.ok) {
        setError(t('verify.resendFailed'))
        setBusy(false)
        return
      }
      setInfo(t('verify.sentNew'))
    } catch {
      setError(t('verify.resendFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="main" id="main" tabIndex={-1}>
      <div className="card">
        {deviceRevokeSessions ? (
          <DeviceRevokePicker
            sessions={deviceRevokeSessions}
            onResolved={async () => {
              // After the revoke, retry register. The cap is now
              // under MAX_DEVICES, so the new device wins.
              const reg = await registerDevice()
              if (reg.ok) {
                sessionStorage.removeItem('discipline-login-email')
                sessionStorage.removeItem('discipline-login-token')
                window.location.href = '/dashboard'
              } else {
                setError(reg.error)
                setDeviceRevokeSessions(null)
              }
            }}
            onCancel={() => router.replace('/login')}
          />
        ) : (
          <>
            <p className="eyebrow">{t('public.verifyEmail')}</p>
            <h1>{t('verify.heading')}</h1>
            <p className="muted">
              {t('verify.subtitle', 'en', { email: email || 'your email' })}
            </p>
            <form onSubmit={submit} noValidate>
              <label
                htmlFor="code"
                className="eyebrow"
                style={{ display: 'block', marginTop: 22 }}
              >
                {t('verify.codeLabel')}
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                aria-describedby={error ? 'verify-error' : info ? 'verify-info' : undefined}
                aria-label={t('verify.codeInputAria')}
                aria-invalid={error ? true : undefined}
                style={{
                  padding: 14,
                  width: '100%',
                  margin: '8px 0 16px',
                  background: '#090a0b',
                  border: '1px solid #29302f',
                  color: 'white',
                  letterSpacing: '.5em'
                }}
              />
              {error && (
                <p id="verify-error" role="alert" style={{ color: '#ff8b82' }}>
                  {error}
                </p>
              )}
              {info && !error && (
                <p id="verify-info" role="status" style={{ color: 'var(--accent)' }}>
                  {info}
                </p>
              )}
              <button className="button" type="submit" disabled={busy}>
                {busy ? t('verify.verifying') : t('verify.submit')}
              </button>
            </form>
            <button
              type="button"
              onClick={resend}
              disabled={busy}
              style={{
                marginTop: 18,
                background: 'none',
                border: 0,
                color: 'var(--muted)',
                cursor: busy ? 'default' : 'pointer'
              }}
            >
              {t('verify.resend')}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
