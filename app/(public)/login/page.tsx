'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '../../../lib/supabase/browser'
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
      const gate = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/request-otp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: normalized })
      })
      if (!gate.ok) throw new Error('gate')
      const db = createSupabaseBrowser()
      const result = await db.auth.signInWithOtp({
        email: normalized,
        options: { shouldCreateUser: false }
      })
      if (result.error) throw result.error
      sessionStorage.setItem('discipline-login-email', normalized)
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
