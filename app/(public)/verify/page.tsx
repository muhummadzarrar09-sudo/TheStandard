'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { t } from '../../../lib/copy'

export default function Verify() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('discipline-login-email') || ''
    setEmail(storedEmail)
  }, [])

  function goBack() {
    sessionStorage.removeItem('discipline-login-email')
    sessionStorage.removeItem('discipline-login-token')
    sessionStorage.removeItem('discipline-login-token-at')
    router.replace('/login')
  }

  return (
    <div className={`auth-shell ${mounted ? 'auth-mounted' : ''}`}>
      {/* ── Left: Brand Panel ─────────────────────────────── */}
      <div className="auth-brand-panel">
        <div className="auth-mesh" aria-hidden="true">
          <div className="auth-mesh-orb auth-mesh-orb-1"/>
          <div className="auth-mesh-orb auth-mesh-orb-2"/>
          <div className="auth-mesh-orb auth-mesh-orb-3"/>
        </div>
        <div className="auth-noise" aria-hidden="true"/>
        <div className="auth-grid-lines" aria-hidden="true"/>

        <div className="auth-brand-content">
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

          <div className="auth-hero auth-stagger-2">
            <div className="auth-hero-badge">✦ SECURE SIGN-IN</div>
            <h1 className="auth-hero-title">
              One click away from your dashboard.
            </h1>
            <p className="auth-hero-subtitle">
              Open the sign-in email and tap the link to continue. It takes less than a second.
            </p>
          </div>

          {/* Steps timeline */}
          <div className="auth-timeline auth-stagger-3">
            <div className="auth-timeline-step auth-timeline-done">
              <div className="auth-timeline-dot">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="auth-timeline-content">
                <span className="auth-timeline-title">Request link</span>
                <span className="auth-timeline-desc">Email entered and verified</span>
              </div>
            </div>
            <div className="auth-timeline-line auth-timeline-line-active"/>
            <div className="auth-timeline-step auth-timeline-active">
              <div className="auth-timeline-dot">
                <div className="auth-timeline-dot-pulse"/>
              </div>
              <div className="auth-timeline-content">
                <span className="auth-timeline-title">Click magic link</span>
                <span className="auth-timeline-desc">Open the email from Supabase</span>
              </div>
            </div>
            <div className="auth-timeline-line"/>
            <div className="auth-timeline-step">
              <div className="auth-timeline-dot"/>
              <div className="auth-timeline-content">
                <span className="auth-timeline-title">Dashboard</span>
                <span className="auth-timeline-desc">Start your execution day</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-brand-footer auth-stagger-5">
          <div className="auth-footer-badges">
            <span className="auth-badge-pill">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1L10.5 3V5.5C10.5 8.5 8 11 6 11C4 11 1.5 8.5 1.5 5.5V3L6 1Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>
              One-time use
            </span>
            <span className="auth-badge-pill">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.1"/><path d="M6 3.5V6L7.5 7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
              5-minute expiry
            </span>
          </div>
        </div>
      </div>

      {/* ── Right: Status Panel ───────────────────────────── */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-corner-accent" aria-hidden="true"/>

          <div className="auth-state-center">
            {/* Email preview mockup */}
            <div className="auth-email-preview">
              <div className="auth-email-preview-header">
                <div className="auth-email-preview-dots">
                  <span/><span/><span/>
                </div>
                <span className="auth-email-preview-label">INBOX</span>
              </div>
              <div className="auth-email-preview-body">
                <div className="auth-email-preview-row">
                  <span className="auth-email-preview-from">From:</span>
                  <span className="auth-email-preview-value">noreply@supabase.io</span>
                </div>
                <div className="auth-email-preview-row">
                  <span className="auth-email-preview-from">To:</span>
                  <span className="auth-email-preview-value">{email || 'you'}</span>
                </div>
                <div className="auth-email-preview-row">
                  <span className="auth-email-preview-from">Subject:</span>
                  <span className="auth-email-preview-value auth-email-preview-subject">Sign in to Discipline OS</span>
                </div>
                <div className="auth-email-preview-divider"/>
                <div className="auth-email-preview-content">
                  <p className="auth-email-preview-greeting">Hi there,</p>
                  <p className="auth-email-preview-body-text">Click the button below to sign in to your account.</p>
                  <div className="auth-email-preview-cta">Sign in →</div>
                  <p className="auth-email-preview-note">This link expires in 5 minutes.</p>
                </div>
              </div>
            </div>

            <h2 className="auth-form-title" style={{ textAlign: 'center', marginTop: 28 }}>Check your inbox</h2>
            <p className="auth-form-subtitle" style={{ textAlign: 'center' }}>
              We sent a sign-in link to your email. Look for the message from <strong style={{ color: 'var(--text)' }}>noreply@supabase.io</strong> with the subject <strong style={{ color: 'var(--text)' }}>&ldquo;Sign in to Discipline OS&rdquo;</strong>.
            </p>

            <div className="auth-email-pill" style={{ marginTop: 16 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M1 5L8 9.5L15 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              <span>{email || 'your email address'}</span>
            </div>

            <div className="auth-tips" style={{ marginTop: 24 }}>
              <div className="auth-tip">
                <div className="auth-tip-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M8 5V8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <circle cx="8" cy="11" r="0.6" fill="currentColor"/>
                  </svg>
                </div>
                <span>Don't see it? Check <strong>Spam</strong> or <strong>Promotions</strong> folder.</span>
              </div>
              <div className="auth-tip">
                <div className="auth-tip-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="2" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M6 12h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span>Open the link on <strong>this same device</strong> for instant sign-in.</span>
              </div>
            </div>

            <button type="button" className="auth-button-secondary" onClick={goBack}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Use a different email
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
