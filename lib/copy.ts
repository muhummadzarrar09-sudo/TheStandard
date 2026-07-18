// Copy table. Every user-visible string in the app comes from here so
// future translation is mechanical: add a `de` (or `es`, `fr`, ...)
// block alongside the `en` block and a thin t(key, locale) helper
// returns the right string.
//
// For now, all locales other than `en` fall back to English. The
// structure is in place; the translations land as a follow-up.

export type Locale = 'en'

export type CopyKey =
  | 'app.brand'
  | 'app.brandSub'
  | 'rail.today'
  | 'rail.schedule'
  | 'rail.tracker'
  | 'rail.team'
  | 'rail.teamChat'
  | 'rail.leaderboard'
  | 'rail.reports'
  | 'rail.community'
  | 'rail.settings'
  | 'rail.profile'
  | 'rail.admin.members'
  | 'rail.admin.enrollment'
  | 'rail.admin.analytics'
  | 'rail.admin.reports'
  | 'skipToContent'
  | 'today.heading'
  | 'today.completionEyebrow'
  | 'today.upNextEyebrow'
  | 'today.allCompleteTitle'
  | 'today.allCompleteDetail'
  | 'today.dayLabel'
  | 'tracker.heading'
  | 'tracker.currentStreak'
  | 'tracker.bestStreak'
  | 'tracker.weeklyReview'
  | 'tracker.daysOf'
  | 'team.heading'
  | 'team.emptyTitle'
  | 'team.emptyDetail'
  | 'team.objective'
  | 'team.cadence'
  | 'team.openChat'
  | 'chat.heading'
  | 'chat.empty'
  | 'chat.send'
  | 'chat.sending'
  | 'chat.failed'
  | 'chat.retry'
  | 'chat.offline'
  | 'chat.connected'
  | 'chat.connecting'
  | 'settings.heading'
  | 'settings.themeEyebrow'
  | 'settings.themeDescription'
  | 'settings.notificationsEyebrow'
  | 'settings.securityEyebrow'
  | 'settings.devicesLink'
  | 'login.heading'
  | 'login.subtitle'
  | 'login.emailLabel'
  | 'login.submit'
  | 'login.sending'
  | 'login.error'
  | 'verify.heading'
  | 'verify.subtitle'
  | 'verify.codeLabel'
  | 'verify.submit'
  | 'verify.verifying'
  | 'verify.error'
  | 'verify.resend'
  | 'verify.invalidCode'
  | 'verify.sentNew'
  | 'verify.resendFailed'

type CopyTable = Record<Locale, Record<CopyKey, string>>

const en: Record<CopyKey, string> = {
  'app.brand': 'DISCIPLINE',
  'app.brandSub': 'EXECUTION SYSTEM',
  'rail.today': 'Today',
  'rail.schedule': 'Schedule',
  'rail.tracker': 'Tracker',
  'rail.team': 'Team room',
  'rail.teamChat': 'Chat',
  'rail.leaderboard': 'Leaderboard',
  'rail.reports': 'Reports',
  'rail.community': 'Community',
  'rail.settings': 'Settings',
  'rail.profile': 'Profile',
  'rail.admin.members': 'Members',
  'rail.admin.enrollment': 'Enrollment',
  'rail.admin.analytics': 'Analytics',
  'rail.admin.reports': 'Reports',
  'skipToContent': 'Skip to content',
  'today.heading': 'Your standard for today.',
  'today.completionEyebrow': "TODAY'S COMPLETION",
  'today.upNextEyebrow': 'UP NEXT',
  'today.allCompleteTitle': 'All required blocks complete',
  'today.allCompleteDetail': 'Day {day} locked in. Streak extends tomorrow.',
  'today.dayLabel': 'DAY {day}',
  'tracker.heading': 'See the pattern.',
  'tracker.currentStreak': 'CURRENT STREAK',
  'tracker.bestStreak': 'BEST STREAK',
  'tracker.weeklyReview': 'WEEKLY REVIEW',
  'tracker.daysOf': '{done} of 30 days complete. Review the pattern, then choose the next standard.',
  'team.heading': 'Build together.',
  'team.emptyTitle': 'Your team is being assembled.',
  'team.emptyDetail': "The team room opens once the cohort lead finalizes team assignments. You'll see your team, its idea, and the team's execution chat here.",
  'team.objective': 'CURRENT OBJECTIVE',
  'team.cadence': 'WEEKLY CADENCE',
  'team.openChat': 'Open execution chat →',
  'chat.heading': 'Team chat.',
  'chat.empty': 'No messages yet. Be the first to start the room.',
  'chat.send': 'Send →',
  'chat.sending': 'sending…',
  'chat.failed': 'failed · tap to retry',
  'chat.retry': 'failed',
  'chat.offline': 'Offline',
  'chat.connected': 'Live',
  'chat.connecting': 'Connecting…',
  'settings.heading': 'Set your environment.',
  'settings.themeEyebrow': 'STYLE PRESET',
  'settings.themeDescription': 'The structure stays the same. The way it feels is yours.',
  'settings.notificationsEyebrow': 'NOTIFICATIONS',
  'settings.securityEyebrow': 'SECURITY',
  'settings.devicesLink': 'Manage active devices →',
  'login.heading': 'Enter your email.',
  'login.subtitle': "We'll send a six-digit code. No password. No magic link.",
  'login.emailLabel': 'EMAIL ADDRESS',
  'login.submit': 'Send access code →',
  'login.sending': 'Sending…',
  'login.error': 'We could not send a code. Confirm your enrollment email and try again.',
  'verify.heading': 'Enter your code.',
  'verify.subtitle': 'Code sent to {email} · expires shortly · one use only.',
  'verify.codeLabel': 'SIX-DIGIT CODE',
  'verify.submit': 'Continue →',
  'verify.verifying': 'Verifying…',
  'verify.error': 'That code is invalid or expired. Request a new one and try again.',
  'verify.resend': 'Resend code',
  'verify.invalidCode': 'Enter the six-digit code.',
  'verify.sentNew': 'A new code was sent.',
  'verify.resendFailed': 'Unable to resend right now. Please wait and try again.'
}

const table: CopyTable = { en }

// Resolve a copy string. `{name}` placeholders are replaced with the
// value from `vars`. Missing placeholders are left as-is. Missing
// keys fall back to the key itself (so the missing copy is obvious in
// the rendered UI).
export function t(key: CopyKey, locale: Locale = 'en', vars: Record<string, string | number> = {}): string {
  const raw = table[locale]?.[key] ?? key
  return raw.replace(/\{(\w+)\}/g, (_, name) => {
    return name in vars ? String(vars[name]) : `{${name}}`
  })
}

export const supportedLocales: Locale[] = ['en']
export const defaultLocale: Locale = 'en'
