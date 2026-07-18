'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '../../../lib/supabase/browser'
import { t } from '../../../lib/copy'

export default function Verify() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const router = useRouter()

  useEffect(() => setEmail(sessionStorage.getItem('discipline-login-email') || ''), [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!/^\d{6}$/.test(token)) {
      setError(t('verify.invalidCode'))
      return
    }
    setBusy(true)
    const db = createSupabaseBrowser()
    const { error: verifyError } = await db.auth.verifyOtp({ email, token, type: 'email' })
    setBusy(false)
    if (verifyError) {
      setError(t('verify.error'))
      return
    }
    sessionStorage.removeItem('discipline-login-email')
    router.replace('/dashboard')
  }

  async function resend() {
    if (!email) return
    setError('')
    setInfo('')
    const db = createSupabaseBrowser()
    const { error: resendError } = await db.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    })
    if (resendError) {
      setError(t('verify.resendFailed'))
    } else {
      setInfo(t('verify.sentNew'))
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
            htmlFor="token"
            className="eyebrow"
            style={{ display: 'block', marginTop: 22 }}
          >
            {t('verify.codeLabel')}
          </label>
          <input
            id="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={token}
            onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            aria-describedby={error ? 'verify-error' : info ? 'verify-info' : undefined}
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
          style={{
            marginTop: 18,
            background: 'none',
            border: 0,
            color: 'var(--muted)',
            cursor: 'pointer'
          }}
        >
          {t('verify.resend')}
        </button>
      </div>
    </main>
  )
}
