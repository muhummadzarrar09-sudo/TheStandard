import { describe, it, expect } from 'vitest'
import { withinQuietHours, shouldSend, type NotificationPreference } from '../lib/notifications/schedule'

const base: NotificationPreference = {
  daily_reminder: true,
  report_alerts: true,
  team_messages: true,
  critical_block_reminder: true,
  quiet_start: null,
  quiet_end: null
}

describe('withinQuietHours', () => {
  it('returns false when no quiet hours set', () => {
    expect(withinQuietHours('12:00', base)).toBe(false)
  })
  it('returns true within normal same-day range', () => {
    const p = { ...base, quiet_start: '22:00', quiet_end: '06:00' }
    // quiet hours cross midnight
    expect(withinQuietHours('23:30', p)).toBe(true)
    expect(withinQuietHours('05:00', p)).toBe(true)
    expect(withinQuietHours('10:00', p)).toBe(false)
    expect(withinQuietHours('21:59', p)).toBe(false)
    expect(withinQuietHours('06:00', p)).toBe(false) // end is exclusive
  })
  it('handles same-day quiet hours', () => {
    const p = { ...base, quiet_start: '13:00', quiet_end: '14:00' }
    expect(withinQuietHours('13:00', p)).toBe(true)
    expect(withinQuietHours('13:30', p)).toBe(true)
    expect(withinQuietHours('14:00', p)).toBe(false)
    expect(withinQuietHours('12:59', p)).toBe(false)
  })
  it('rejects invalid time strings', () => {
    const p = { ...base, quiet_start: '25:00', quiet_end: '06:00' } as any
    expect(withinQuietHours('12:00', p)).toBe(false)
  })
})

describe('shouldSend', () => {
  it('honors per-category flag', () => {
    const p = { ...base, daily_reminder: false, report_alerts: true, team_messages: false, critical_block_reminder: true }
    expect(shouldSend('daily_reminder', '12:00', p)).toBe(false)
    expect(shouldSend('report_alerts', '12:00', p)).toBe(true)
    expect(shouldSend('team_messages', '12:00', p)).toBe(false)
    expect(shouldSend('critical_block', '12:00', p)).toBe(true)
  })
  it('honors quiet hours regardless of category', () => {
    const p = { ...base, quiet_start: '13:00', quiet_end: '14:00' }
    expect(shouldSend('daily_reminder', '13:30', p)).toBe(false)
    expect(shouldSend('report_alerts', '13:30', p)).toBe(false)
    expect(shouldSend('critical_block', '13:30', p)).toBe(false)
    expect(shouldSend('daily_reminder', '12:00', p)).toBe(true)
  })
})
