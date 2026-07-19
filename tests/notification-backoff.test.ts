// Backoff schedule for the notification_jobs queue. The
// edge function in supabase/functions/process-notifications
// uses the same constants; the unit suite here pins the
// schedule so a future tweak can't silently change the
// recovery time.

import { describe, it, expect } from 'vitest'
import { BACKOFF_MIN, PERMANENT_THRESHOLD, backoffMinutes, isPermanent, nextRetryAt } from '../lib/notification-backoff'

describe('notification backoff', () => {
  it('exposes the backoff schedule', () => {
    expect(BACKOFF_MIN).toEqual([0, 1, 5, 30, 60])
  })

  it('exposes the permanent threshold', () => {
    expect(PERMANENT_THRESHOLD).toBe(5)
  })

  it('returns 0 minutes for a never-failed job (attempts=0)', () => {
    expect(backoffMinutes(0)).toBe(0)
  })

  it('returns 0 minutes for negative attempts (defensive)', () => {
    expect(backoffMinutes(-1)).toBe(0)
  })

  it('schedules 1 minute after the first failure', () => {
    expect(backoffMinutes(1)).toBe(1)
  })

  it('schedules 5 minutes after the second', () => {
    expect(backoffMinutes(2)).toBe(5)
  })

  it('schedules 30 minutes after the third', () => {
    expect(backoffMinutes(3)).toBe(30)
  })

  it('caps at 60 minutes for attempts >= 4', () => {
    expect(backoffMinutes(4)).toBe(60)
    expect(backoffMinutes(10)).toBe(60)
    expect(backoffMinutes(100)).toBe(60)
  })

  it('marks the job as permanent at attempts >= 5', () => {
    expect(isPermanent(5)).toBe(true)
    expect(isPermanent(6)).toBe(true)
    expect(isPermanent(4)).toBe(false)
    expect(isPermanent(0)).toBe(false)
  })

  it('nextRetryAt is a date object offset by the right number of minutes', () => {
    const now = Date.parse('2026-01-01T00:00:00.000Z')
    expect(nextRetryAt(0, now).toISOString()).toBe('2026-01-01T00:00:00.000Z')
    expect(nextRetryAt(1, now).toISOString()).toBe('2026-01-01T00:01:00.000Z')
    expect(nextRetryAt(2, now).toISOString()).toBe('2026-01-01T00:05:00.000Z')
    expect(nextRetryAt(3, now).toISOString()).toBe('2026-01-01T00:30:00.000Z')
    expect(nextRetryAt(4, now).toISOString()).toBe('2026-01-01T01:00:00.000Z')
  })

  it('the edge function uses the same constants (mirror check)', () => {
    const fn = require('fs').readFileSync(
      require('path').resolve(__dirname, '../supabase/functions/process-notifications/index.ts'),
      'utf8'
    )
    expect(fn).toMatch(/BACKOFF_MIN[^=]*=\s*\[0,\s*1,\s*5,\s*30,\s*60\]/)
    expect(fn).toMatch(/PERMANENT_THRESHOLD\s*=\s*5/)
  })
})
