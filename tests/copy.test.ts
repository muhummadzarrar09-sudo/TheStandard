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
})
