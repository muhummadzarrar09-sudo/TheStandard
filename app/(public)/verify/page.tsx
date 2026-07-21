'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '../../../lib/supabase/browser'

export default function Verify() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'checking' | 'waiting' | 'success' | 'error'>('checking')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('discipline-login-email') || ''
    setEmail(storedEmail)
    let cancelled = false

    async function complete() {
      try {
        const supabase = createSupabaseBrowser()
        // Supabase SSR client consumes the access-token hash from the
        // magic-link URL and restores the browser session.
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!data.session) {
          if (!cancelled) setState('waiting')
          return
        }
        const response = await fetch('/api/auth/complete-magic-link', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          })
        })
        if (!response.ok) throw new Error('session_failed')
        if (!cancelled) {
          setState('success')
          sessionStorage.removeItem('discipline-login-email')
          sessionStorage.removeItem('discipline-login-token')
          sessionStorage.removeItem('discipline-login-token-at')
          window.setTimeout(() => router.replace('/dashboard'), 350)
        }
      } catch {
        if (!cancelled) {
          setState('error')
          setMessage('This verification link is invalid or expired. Request a new link.')
        }
      }
    }
    complete()
    return () => { cancelled = true }
  }, [router])

  function goBack() {
    sessionStorage.removeItem('discipline-login-email')
    sessionStorage.removeItem('discipline-login-token')
    sessionStorage.removeItem('discipline-login-token-at')
    router.replace('/login')
  }

  return (
    <main className="main" id="main" tabIndex={-1}>
      <div className="card" style={{ maxWidth: 560, margin: '0 auto' }}>
        <p className="eyebrow">SECURE EMAIL SIGN-IN</p>
        <h1>{state === 'success' ? 'Verified.' : 'Check your email.'}</h1>
        {state === 'checking' && <p className="muted" role="status" aria-live="polite">Completing your secure sign-in…</p>}
        {state === 'success' && <p className="muted" role="status" aria-live="polite">You are signed in. Opening your dashboard…</p>}
        {state === 'waiting' && (
          <>
            <p className="muted" role="status" aria-live="polite">
              We sent a secure sign-in link to <strong>{email || 'your email address'}</strong>. Open it on this device to continue.
            </p>
            <p className="status-msg ok">Six-digit code verification is coming soon. For now, use the secure link in the email.</p>
            <button type="button" className="link-button" onClick={goBack}>Use a different email</button>
          </>
        )}
        {state === 'error' && (
          <>
            <p className="status-msg err" role="alert">{message}</p>
            <button type="button" className="button" onClick={goBack}>Request a new link</button>
          </>
        )}
      </div>
    </main>
  )
}
