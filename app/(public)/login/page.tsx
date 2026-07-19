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
      const gate = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: normalized })
      })
      if (!gate.ok) throw new Error('gate')
      const { token } = await gate.json()
      if (!token) throw new Error('not_eligible')
      const otp = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: normalized, token })
      })
      if (!otp.ok) throw new Error('send_failed')
      sessionStorage.setItem('discipline-login-email', normalized)
      sessionStorage.setItem('discipline-login-token', token)
      router.push('/verify')
    } catch {
      setError(t('login.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="main" id="main" tabIndex={-1}>
      <div className="card">
        <p className="eyebrow">{t('public.memberAccess')}</p>
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
            className="input"
          />
          {error && (
            <p
              id="login-error"
              role="alert"
              style={{ color: 'var(--danger)' }}
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
