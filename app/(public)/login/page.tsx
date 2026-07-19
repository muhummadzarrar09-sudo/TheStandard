'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '../../../lib/copy'

export default function Login() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const normalized = email.trim().toLowerCase()
    try {
      // 1. Request a one-time, email-bound token from our server. The
      // server checks enrollment + access window; the response is
      // always { ok: true } for any well-formed email so an attacker
      // cannot enumerate who is enrolled.
      const gate = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: normalized })
      })
      if (!gate.ok) throw new Error('gate')
      const { token } = await gate.json()
      if (!token) {
        // Either the email is unknown or the access window is closed.
        // Surface the same generic error to the user so the gate is
        // indistinguishable from a "happy path" failure.
        throw new Error('not_eligible')
      }
      // 2. The server is going to send the OTP email via Supabase.
      // We trigger that by asking the server to issue the OTP code
      // (the token is the gate; the code is sent through Supabase
      // auth's OTP infrastructure so the email format matches the
      // rest of the app).
      const otp = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: normalized, token })
      })
      if (!otp.ok) throw new Error('send_failed')
      sessionStorage.setItem('discipline-login-email', normalized)
      sessionStorage.setItem('discipline-login-token', token)
      router.push('/verify')
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'not_eligible') {
        setError(t('login.error'))
      } else {
        setError(t('login.error'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="main" id="main" tabIndex={-1}>
      <div className="card">
        <p className="eyebrow">MEMBER ACCESS</p>
        <h1>{t('login.heading')}</h1>
        <p className="muted">{t('login.subtitle')}</p>
        <form onSubmit={submit} noValidate>
          <label
            htmlFor="email"
            className="eyebrow"
            style={{ display: 'block', marginTop: 22 }}
          >
            {t('login.emailLabel')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-describedby={error ? 'login-error' : undefined}
            aria-invalid={error ? true : undefined}
            style={{
              padding: 14,
              width: '100%',
              margin: '8px 0 16px',
              background: '#090a0b',
              border: '1px solid #29302f',
              color: 'white'
            }}
          />
          {error && (
            <p
              id="login-error"
              role="alert"
              style={{ color: '#ff8b82' }}
            >
              {error}
            </p>
          )}
          <button className="button" type="submit" disabled={busy}>
            {busy ? t('login.sending') : t('login.submit')}
          </button>
        </form>
      </div>
    </main>
  )
}
