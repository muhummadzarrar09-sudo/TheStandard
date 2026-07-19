'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '../../../lib/copy'

export default function Verify() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const router = useRouter()

  useEffect(() => {
    setEmail(sessionStorage.getItem('discipline-login-email') || '')
    setToken(sessionStorage.getItem('discipline-login-token') || '')
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!/^\d{6}$/.test(code)) {
      setError(t('verify.invalidCode'))
      return
    }
    if (!token) {
      // The user landed here without a token (e.g. they refreshed
      // the page and sessionStorage was empty). Send them back.
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
        return
      }
      // The server has now set the Supabase auth cookies on the
      // response. A hard navigation (not router.push) ensures the
      // new cookies are picked up on the next request.
      sessionStorage.removeItem('discipline-login-email')
      sessionStorage.removeItem('discipline-login-token')
      window.location.href = '/dashboard'
    } catch {
      setError(t('verify.error'))
    } finally {
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
        <p className="eyebrow">VERIFY EMAIL</p>
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
      </div>
    </main>
  )
}
