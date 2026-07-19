import { describe, it, expect } from 'vitest'
import { t, supportedLocales, defaultLocale, type CopyKey } from '../lib/copy'

describe('copy table', () => {
  it('defaultLocale is in supportedLocales', () => {
    expect(supportedLocales).toContain(defaultLocale)
  })

  it('resolves a known key', () => {
    expect(t('app.brand')).toBe('DISCIPLINE')
  })

  it('substitutes {name} placeholders with the supplied value', () => {
    // The caller is responsible for any formatting (padding, locale-aware
    // numbers, etc.). The copy table is a pure string substitution.
    expect(t('today.dayLabel', 'en', { day: 3 })).toBe('DAY 3')
    expect(t('today.dayLabel', 'en', { day: 12 })).toBe('DAY 12')
  })

  it('substitutes strings too', () => {
    expect(t('verify.subtitle', 'en', { email: 'a@b.com' }))
      .toBe('Code sent to a@b.com · expires shortly · one use only.')
  })

  it('leaves unresolved placeholders in place', () => {
    expect(t('today.dayLabel', 'en', {})).toBe('DAY {day}')
  })

  it('returns the key for missing keys (caller can detect)', () => {
    const missing = t('nope.this.does.not.exist' as CopyKey)
    expect(missing).toBe('nope.this.does.not.exist')
  })

  it('every key has a value (no missing entries in the table)', () => {
    // The `t()` helper returns the key when an entry is missing; this
    // test catches a regression where a new CopyKey is added but the
    // `en` table isn't updated. We round-trip every key through `t()`
    // and assert the result is not the key itself.
    const keys = [
      'app.brand', 'app.brandSub', 'app.tagline', 'app.howItWorksEyebrow',
      'app.howItWorks1', 'app.howItWorks2', 'app.howItWorks3', 'app.howItWorks4',
      'app.memberSignin', 'app.landingCta',
      'rail.today', 'rail.schedule', 'rail.tracker', 'rail.team', 'rail.teamChat',
      'rail.leaderboard', 'rail.reports', 'rail.community', 'rail.settings', 'rail.profile',
      'rail.admin.members', 'rail.admin.enrollment', 'rail.admin.analytics', 'rail.admin.reports',
      'skipToContent',
      'notFound.eyebrow', 'notFound.title', 'notFound.body', 'notFound.cta', 'notFound.signin',
      'loading.eyebrow', 'loading.title', 'loading.body',
      'public.memberAccess', 'public.verifyEmail',
      'today.heading', 'today.completionEyebrow', 'today.upNextEyebrow',
      'today.allCompleteTitle', 'today.allCompleteDetail', 'today.dayLabel',
      'tracker.heading', 'tracker.currentStreak', 'tracker.bestStreak',
      'tracker.weeklyReview', 'tracker.daysOf',
      'team.heading', 'team.emptyTitle', 'team.emptyDetail', 'team.objective',
      'team.cadence', 'team.openChat',
      'leaderboard.heading', 'leaderboard.subtitle',
      'leaderboard.viewAll', 'leaderboard.viewTeam', 'leaderboard.viewWeek',
      'leaderboard.colRank', 'leaderboard.colMember',
      'leaderboard.colStreak', 'leaderboard.colDays',
      'leaderboard.colComplete', 'leaderboard.colWeek',
      'leaderboard.empty', 'leaderboard.unavailable',
      'leaderboard.tieExplanation',
      'team.progressCategory', 'team.progressCategoryUpdate',
      'team.progressCategoryBlocker', 'team.progressCategoryMilestone',
      'team.progressCategoryIdea',
      'team.chatEyebrow', 'team.chatNotAssigned',
      'team.chatPendingEyebrow', 'team.chatPendingTitle', 'team.chatPendingBody',
      'chat.heading', 'chat.eyebrow', 'chat.empty', 'chat.send', 'chat.sending', 'chat.failed',
      'chat.retry', 'chat.offline', 'chat.connected', 'chat.connecting',
      'chat.loadOlder', 'chat.loadingMore', 'chat.inputPlaceholder', 'chat.inputLabel',
      'chat.sendLabel', 'chat.retryAria', 'chat.errorNotSignedIn', 'chat.errorSendFailed',
      'chat.ariaYouAt', 'chat.ariaTeammateAt',
      'settings.heading', 'settings.themeEyebrow', 'settings.themeDescription',
      'settings.notificationsEyebrow', 'settings.securityEyebrow', 'settings.devicesLink',
      'login.heading', 'login.subtitle', 'login.emailLabel', 'login.submit',
      'login.sending', 'login.error',
      'verify.heading', 'verify.subtitle', 'verify.codeLabel', 'verify.submit',
      'verify.verifying', 'verify.error', 'verify.resend', 'verify.invalidCode',
      'verify.sentNew', 'verify.resendFailed', 'verify.codeInputAria'
    ] as CopyKey[]
    for (const key of keys) {
      const value = t(key)
      expect(value).not.toBe(key)
    }
  })
})
