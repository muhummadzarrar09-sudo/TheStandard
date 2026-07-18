'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTheme, presets } from '../../../themes/theme-provider'
import { themes } from '../../../themes'
import PushSubscription from '../../../components/pwa/PushSubscription'
import AppShellClient from '../../../components/ui/AppShellClient'
import { t } from '../../../lib/copy'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const RAIL = [
  { href: '/dashboard', key: 'rail.today' as const },
  { href: '/schedule', key: 'rail.schedule' as const },
  { href: '/tracker', key: 'rail.tracker' as const },
  { href: '/team', key: 'rail.team' as const },
  { href: '/team/chat', key: 'rail.teamChat' as const },
  { href: '/leaderboard', key: 'rail.leaderboard' as const },
  { href: '/reports', key: 'rail.reports' as const },
  { href: '/settings', key: 'rail.settings' as const }
]

type Prefs = {
  daily_reminder: boolean
  report_alerts: boolean
  team_messages: boolean
  critical_block_reminder: boolean
  quiet_start: string | null
  quiet_end: string | null
}

const defaultPrefs: Prefs = {
  daily_reminder: true,
  report_alerts: true,
  team_messages: true,
  critical_block_reminder: true,
  quiet_start: null,
  quiet_end: null
}

export default function Settings() {
  const { preset, setPreset, syncState, lastSyncedPreset } = useTheme()
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsMsg, setPrefsMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/notifications/preferences')
      .then(r => r.json())
      .then(x => {
        if (x.preferences) {
          setPrefs({
            daily_reminder: !!x.preferences.daily_reminder,
            report_alerts: !!x.preferences.report_alerts,
            team_messages: !!x.preferences.team_messages,
            critical_block_reminder: x.preferences.critical_block_reminder !== false,
            quiet_start: x.preferences.quiet_start || null,
            quiet_end: x.preferences.quiet_end || null
          })
        }
        setPrefsLoaded(true)
      })
      .catch(() => setPrefsLoaded(true))
  }, [])

  async function savePrefs(patch: Partial<Prefs>) {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    setPrefsSaving(true)
    setPrefsMsg(null)
    try {
      const r = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          dailyReminder: next.daily_reminder,
          reportAlerts: next.report_alerts,
          teamMessages: next.team_messages,
          criticalBlockReminder: next.critical_block_reminder,
          quietStart: next.quiet_start,
          quietEnd: next.quiet_end
        })
      })
      const x = await r.json().catch(() => ({} as any))
      if (!r.ok) {
        setPrefsMsg({ kind: 'err', text: x.error || 'Could not save preferences.' })
        return
      }
      setPrefsMsg({ kind: 'ok', text: 'Preferences saved.' })
    } catch {
      setPrefsMsg({ kind: 'err', text: 'Network error.' })
    } finally {
      setPrefsSaving(false)
    }
  }

  function setQuietTime(field: 'quiet_start' | 'quiet_end', value: string) {
    if (value === '') {
      savePrefs({ [field]: null } as Partial<Prefs>)
      return
    }
    if (!TIME_RE.test(value)) return
    savePrefs({ [field]: value } as Partial<Prefs>)
  }

  return (
    <AppShellClient items={RAIL}>
      <p className="eyebrow">ACCOUNT · APPEARANCE</p>
      <h1>{t('settings.heading')}</h1>

      <section
        className="card"
        style={{ marginTop: 32 }}
        aria-labelledby="style-preset-heading"
      >
        <p className="eyebrow" id="style-preset-heading">{t('settings.themeEyebrow')}</p>
        <p className="muted">{t('settings.themeDescription')}</p>
        <div
          role="radiogroup"
          aria-labelledby="style-preset-heading"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
            gap: 10,
            marginTop: 24
          }}
        >
          {presets.map(key => {
            const theme = themes[key]
            const isActive = preset === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPreset(key)}
                role="radio"
                aria-checked={isActive}
                aria-label={`Theme preset ${theme.name}`}
                style={{
                  textAlign: 'left',
                  padding: 16,
                  border: isActive ? '1px solid var(--accent)' : '1px solid var(--line)',
                  background: theme.background,
                  color: theme.text,
                  borderRadius: theme.radius,
                  cursor: 'pointer',
                  minHeight: 120,
                  position: 'relative'
                }}
              >
                {isActive && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: theme.accent,
                      color: theme.background,
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 13,
                      fontWeight: 700
                    }}
                  >
                    ✓
                  </span>
                )}
                <b>{theme.name}</b>
                <small style={{ display: 'block', color: theme.muted, marginTop: 8 }}>
                  {theme.density} · {theme.font}
                </small>
                <i
                  aria-hidden
                  style={{ display: 'block', background: theme.accent, width: 24, height: 4, marginTop: 22 }}
                />
              </button>
            )
          })}
        </div>
        <p
          className="muted"
          style={{ marginTop: 12, fontSize: 12 }}
          aria-live="polite"
          aria-atomic="true"
        >
          {syncState === 'syncing' && 'Saving your selection…'}
          {syncState === 'synced' && `Saved${lastSyncedPreset ? ` (${lastSyncedPreset})` : ''}.`}
          {syncState === 'error' && 'Could not sync to your account. Will retry on next change.'}
        </p>
      </section>

      <section
        className="card"
        style={{ marginTop: 15 }}
        aria-labelledby="notifications-heading"
      >
        <p className="eyebrow" id="notifications-heading">{t('settings.notificationsEyebrow')}</p>
        {!prefsLoaded ? (
          <p className="muted">Loading preferences…</p>
        ) : (
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={prefs.daily_reminder}
                onChange={e => savePrefs({ daily_reminder: e.target.checked })}
              />
              Daily reminder before the reflection block
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={prefs.critical_block_reminder}
                onChange={e => savePrefs({ critical_block_reminder: e.target.checked })}
              />
              Reminder before critical blocks
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={prefs.report_alerts}
                onChange={e => savePrefs({ report_alerts: e.target.checked })}
              />
              New report / interview notification
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={prefs.team_messages}
                onChange={e => savePrefs({ team_messages: e.target.checked })}
              />
              Team update notifications
            </label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label>
                <span className="muted" style={{ display: 'block', fontSize: 11 }}>QUIET HOURS START</span>
                <input
                  type="time"
                  value={prefs.quiet_start || ''}
                  onChange={e => setQuietTime('quiet_start', e.target.value)}
                  style={{ padding: 8, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)' }}
                />
              </label>
              <label>
                <span className="muted" style={{ display: 'block', fontSize: 11 }}>QUIET HOURS END</span>
                <input
                  type="time"
                  value={prefs.quiet_end || ''}
                  onChange={e => setQuietTime('quiet_end', e.target.value)}
                  style={{ padding: 8, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)' }}
                />
              </label>
              <span className="muted" style={{ fontSize: 11 }} aria-live="polite">
                {prefs.quiet_start && prefs.quiet_end
                  ? `No notifications between ${prefs.quiet_start} and ${prefs.quiet_end}.`
                  : 'No quiet hours set.'}
              </span>
            </div>
            {prefsMsg && (
              <p
                className="muted"
                role="status"
                style={{ color: prefsMsg.kind === 'err' ? '#ff8b82' : 'var(--accent)', fontSize: 12 }}
              >
                {prefsMsg.text}
              </p>
            )}
            {prefsSaving && <p className="muted" style={{ fontSize: 12 }} role="status">Saving…</p>}
          </div>
        )}
      </section>

      <section className="grid" style={{ marginTop: 15 }}>
        <PushSubscription />
        <div className="card">
          <p className="eyebrow">{t('settings.securityEyebrow')}</p>
          <Link href="/settings/devices">{t('settings.devicesLink')}</Link>
        </div>
      </section>
    </AppShellClient>
  )
}
