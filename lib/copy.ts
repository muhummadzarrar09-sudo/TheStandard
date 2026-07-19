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
  | 'app.tagline'
  | 'app.howItWorksEyebrow'
  | 'app.howItWorks1'
  | 'app.howItWorks2'
  | 'app.howItWorks3'
  | 'app.howItWorks4'
  | 'app.memberSignin'
  | 'app.landingCta'
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
  | 'notFound.eyebrow'
  | 'notFound.title'
  | 'notFound.body'
  | 'notFound.cta'
  | 'notFound.signin'
  | 'loading.eyebrow'
  | 'loading.title'
  | 'loading.body'
  | 'public.memberAccess'
  | 'public.verifyEmail'
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
  | 'team.progressCategoryUpdate'
  | 'team.progressCategoryBlocker'
  | 'team.progressCategoryMilestone'
  | 'team.progressCategoryIdea'
  | 'team.progressCategory'
  | 'team.chatEyebrow'
  | 'team.chatNotAssigned'
  | 'team.chatPendingEyebrow'
  | 'team.chatPendingTitle'
  | 'team.chatPendingBody'
  | 'chat.heading'
  | 'chat.eyebrow'
  | 'chat.empty'
  | 'chat.send'
  | 'chat.sending'
  | 'chat.failed'
  | 'chat.retry'
  | 'chat.offline'
  | 'chat.connected'
  | 'chat.connecting'
  | 'chat.loadOlder'
  | 'chat.loadingMore'
  | 'chat.inputPlaceholder'
  | 'chat.inputLabel'
  | 'chat.sendLabel'
  | 'chat.retryAria'
  | 'chat.errorNotSignedIn'
  | 'chat.errorSendFailed'
  | 'chat.ariaYouAt'
  | 'chat.ariaTeammateAt'
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
  | 'verify.codeInputAria'

type CopyTable = Record<Locale, Record<CopyKey, string>>

const en: Record<CopyKey, string> = {
  'app.brand': 'DISCIPLINE',
  'app.brandSub': 'EXECUTION SYSTEM',
  'app.tagline': 'A 30-day execution system for disciplined daily work, team accountability, and startup progress.',
  'app.howItWorksEyebrow': 'HOW IT WORKS',
  'app.howItWorks1': 'One standard schedule. Wake at 05:00. Deep work, lunch, team, reflection. The same structure every day so execution becomes automatic.',
  'app.howItWorks2': 'One cohort. 3–4 people per team. Daily check-ins, weekly commitments, shared chat. Accountability without surveillance.',
  'app.howItWorks3': 'One leaderboard. Ranked by current streak, completion percentage, completed days. Private reflections stay private.',
  'app.howItWorks4': 'One rhythm. Reminders fire at your local cutoff. Reports land in the library. Nothing else.',
  'app.memberSignin': 'Member sign-in',
  'app.landingCta': 'Enter the system →',
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
  'notFound.eyebrow': '404 · NOT ON THE SCHEDULE',
  'notFound.title': 'This page does not exist.',
  'notFound.body': 'The link you followed does not match a surface in the system. If you got here from a notification, the link may be from a previous cohort. Return to the execution dashboard and take the next commitment.',
  'notFound.cta': 'Return to Today →',
  'notFound.signin': 'Sign in',
  'loading.eyebrow': 'DISCIPLINE OS',
  'loading.title': 'Preparing your day…',
  'loading.body': 'Loading the standard and checking your local time.',
  'public.memberAccess': 'MEMBER ACCESS',
  'public.verifyEmail': 'VERIFY EMAIL',
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
  'team.progressCategory': 'Category',
  'team.progressCategoryUpdate': 'Update',
  'team.progressCategoryBlocker': 'Blocker',
  'team.progressCategoryMilestone': 'Milestone',
  'team.progressCategoryIdea': 'Idea',
  'team.chatEyebrow': 'TEAM CHAT',
  'team.chatNotAssigned': 'No team assigned yet.',
  'team.chatPendingEyebrow': 'PENDING',
  'team.chatPendingTitle': 'Team chat opens with your team assignment.',
  'team.chatPendingBody': 'Once the cohort lead assigns your team, this page becomes your private execution room.',
  'chat.heading': 'Team chat.',
  'chat.eyebrow': 'PRIVATE EXECUTION ROOM',
  'chat.empty': 'No messages yet. Be the first to start the room.',
  'chat.send': 'Send →',
  'chat.sending': 'sending…',
  'chat.failed': 'failed · tap to retry',
  'chat.retry': 'failed',
  'chat.offline': 'Offline',
  'chat.connected': 'Live',
  'chat.connecting': 'Connecting…',
  'chat.loadOlder': 'Load older messages',
  'chat.loadingMore': 'Loading…',
  'chat.inputPlaceholder': 'Message your team…',
  'chat.inputLabel': 'Message your team',
  'chat.sendLabel': 'Send message',
  'chat.retryAria': 'Retry',
  'chat.errorNotSignedIn': 'You must be signed in to send a message.',
  'chat.errorSendFailed': 'Could not send. Tap retry.',
  'chat.ariaYouAt': 'You at {time}',
  'chat.ariaTeammateAt': 'Teammate at {time}',
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
  'verify.resendFailed': 'Unable to resend right now. Please wait and try again.',
  'verify.codeInputAria': 'Six-digit verification code'
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
