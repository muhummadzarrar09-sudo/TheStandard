'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '../../../lib/copy'

export default function Login() {
  const [email, setEmail] = useState('')
  const [focused, setFocused] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

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
      sessionStorage.setItem('discipline-login-token-at', String(Date.now()))
      router.push('/verify')
    } catch {
      setError(t('login.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`auth-shell ${mounted ? 'auth-mounted' : ''}`}>

      {/* ── Left: Brand Panel ─────────────────────────────── */}
      <div className="auth-brand-panel">
        {/* Animated mesh gradient bg */}
        <div className="auth-mesh" aria-hidden="true">
          <div className="auth-mesh-orb auth-mesh-orb-1"/>
          <div className="auth-mesh-orb auth-mesh-orb-2"/>
          <div className="auth-mesh-orb auth-mesh-orb-3"/>
        </div>
        <div className="auth-noise" aria-hidden="true"/>
        <div className="auth-grid-lines" aria-hidden="true"/>

        <div className="auth-brand-content">
          {/* Logo */}
          <div className="auth-logo auth-stagger-1">
            <div className="auth-logo-mark">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M6 14L12 20L22 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="auth-logo-text">{t('app.brand')}</div>
              <div className="auth-logo-sub">{t('app.brandSub')}</div>
            </div>
          </div>

          {/* Hero */}
          <div className="auth-hero auth-stagger-2">
            <div className="auth-hero-badge">✦ PRIVATE COHORT SYSTEM</div>
            <h1 className="auth-hero-title">
              Execute at the<br/>
              <span className="auth-hero-accent">highest standard.</span>
            </h1>
            <p className="auth-hero-subtitle">{t('app.tagline')}</p>
          </div>

          {/* Stats */}
          <div className="auth-stats auth-stagger-3">
            <div className="auth-stat">
              <div className="auth-stat-value">30</div>
              <div className="auth-stat-label">Day sprints</div>
            </div>
            <div className="auth-stat-divider"/>
            <div className="auth-stat">
              <div className="auth-stat-value">3–4</div>
              <div className="auth-stat-label">Per team</div>
            </div>
            <div className="auth-stat-divider"/>
            <div className="auth-stat">
              <div className="auth-stat-value">05:00</div>
              <div className="auth-stat-label">Wake standard</div>
            </div>
          </div>

          {/* Features */}
          <div className="auth-features auth-stagger-4">
            <div className="auth-feature-card">
              <div className="auth-feature-glow" aria-hidden="true"/>
              <div className="auth-feature-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2V10L14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
              </div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">One Standard Schedule</span>
                <span className="auth-feature-desc">Deep work, lunch, team sync, reflection — every single day</span>
              </div>
            </div>
            <div className="auth-feature-card">
              <div className="auth-feature-glow" aria-hidden="true"/>
              <div className="auth-feature-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 16V6a2 2 0 012-2h8a2 2 0 012 2v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M2 16h16M7 8h2M7 11h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Team Accountability</span>
                <span className="auth-feature-desc">Private chat, streak tracking, shared execution goals</span>
              </div>
            </div>
            <div className="auth-feature-card">
              <div className="auth-feature-glow" aria-hidden="true"/>
              <div className="auth-feature-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 17V7l4-4 4 4v10M11 11h6v6h-6V11z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Live Leaderboard</span>
                <span className="auth-feature-desc">Ranked by streak, completion %, and consistency</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-brand-footer auth-stagger-5">
          <div className="auth-footer-badges">
            <span className="auth-badge-pill">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 3V5.5C10.5 8.5 8 11 6 11C4 11 1.5 8.5 1.5 5.5V3L6 1Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>
              End-to-end encrypted
            </span>
            <span className="auth-badge-pill">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.1"/><path d="M4 6L5.5 7.5L8 4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Private cohort only
            </span>
          </div>
        </div>
      </div>

      {/* ── Right: Form Panel ─────────────────────────────── */}
      <div className="auth-form-panel">
        <div className="auth-form-container auth-stagger-r1">
          {/* Decorative corner accent */}
          <div className="auth-corner-accent" aria-hidden="true"/>

          <div className="auth-form-header">
            <p className="auth-eyebrow">{t('public.memberAccess')}</p>
            <h2 className="auth-form-title">{t('login.heading')}</h2>
            <p className="auth-form-subtitle">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={submit} noValidate className="auth-form">
            {/* Floating label input */}
            <div className={`auth-field-group ${focused || email ? 'auth-field-active' : ''} ${error ? 'auth-field-error' : ''}`}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder=" "
                aria-describedby={error ? 'login-error' : undefined}
                aria-invalid={error ? true : undefined}
                className="auth-input"
              />
              <label htmlFor="email" className="auth-floating-label">
                {t('login.emailLabel')}
              </label>
              <div className="auth-field-bar"/>
              {/* Email icon */}
              <div className="auth-field-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M2 6L9 10.5L16 6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {error && (
              <div id="login-error" role="alert" className="auth-error">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M8 5V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <circle cx="8" cy="11.5" r="0.75" fill="currentColor"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button className="auth-button" type="submit" disabled={busy}>
              <span className="auth-button-bg" aria-hidden="true"/>
              {busy ? (
                <span className="auth-button-content">
                  <svg className="auth-spinner" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5"/>
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="28" strokeLinecap="round"/>
                  </svg>
                  {t('login.sending')}
                </span>
              ) : (
                <span className="auth-button-content">
                  {t('login.submit')}
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4 9H14M10 5L14 9L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* Security row */}
          <div className="auth-security-row">
            <div className="auth-security-item">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L12 3V6.5C12 9.5 9.5 12 7 12C4.5 12 2 9.5 2 6.5V3L7 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M5 7L6.5 8.5L9 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Magic link · No password</span>
            </div>
            <div className="auth-security-dot" aria-hidden="true"/>
            <div className="auth-security-item">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Expires in 5 min</span>
            </div>
          </div>

          {/* Divider */}
          <div className="auth-divider">
            <div className="auth-divider-line"/>
            <span className="auth-divider-text">MEMBERS ONLY</span>
            <div className="auth-divider-line"/>
          </div>

          <p className="auth-footer-text">
            New members are provisioned by the cohort lead. Contact your administrator if you need access.
          </p>

          {/* Keyboard hint */}
          <div className="auth-kbd-hint" aria-hidden="true">
            <span>Press</span>
            <kbd>Enter</kbd>
            <span>to continue</span>
          </div>
        </div>
      </div>
    </div>
  )
}
