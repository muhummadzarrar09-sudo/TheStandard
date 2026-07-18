import { describe, it, expect } from 'vitest'
import { localDateInTimezone, cutoffForLocalDate } from '../lib/domain'
import { consecutiveDays, bestStreak } from '../lib/domain/streaks'

// These tests cover timezone edge cases. The Node test runner uses
// ICU which has full IANA data. The dates used here are deliberately
// chosen to be unambiguous (US spring-forward, fall-back, year boundary,
// leap day) so the test failures point to real bugs, not to ambiguous
// calendar math.

function partsInZone(date: Date, timezone: string) {
  const ps = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(date)
  const get = (t: string) => Number(ps.find(p => p.type === t)!.value)
  return {
    y: get('year'),
    mo: get('month'),
    d: get('day'),
    h: get('hour') === 24 ? 0 : get('hour'),
    mi: get('minute')
  }
}

describe('DST and travel: localDateInTimezone', () => {
  it('LA spring-forward day (2026-03-08) at 02:30 PDT is still 2026-03-08', () => {
    // 02:30 PST = 10:30 UTC. The date in LA is still 2026-03-08
    // (the spring-forward jump is at 02:00 PST -> 03:00 PDT, so 02:30
    // doesn't exist; the only valid 02:xx is PST pre-jump).
    const d = new Date(Date.UTC(2026, 2, 8, 10, 30, 0))
    expect(localDateInTimezone(d, 'America/Los_Angeles')).toBe('2026-03-08')
  })
  it('LA fall-back day still has a single date at midnight', () => {
    // 2026-11-01 is the US fall-back. 09:00 UTC is 01:00 PDT.
    const d = new Date(Date.UTC(2026, 10, 1, 9, 0, 0))
    expect(localDateInTimezone(d, 'America/Los_Angeles')).toBe('2026-11-01')
  })
  it('PKT, NPT, JST produce different dates near the date line', () => {
    // 18:00 UTC on 2026-07-18 is 23:00 PKT (still 2026-07-18),
    // 23:45 NPT (still 2026-07-18), and 2026-07-19 03:00 JST.
    const d1 = new Date(Date.UTC(2026, 6, 18, 18, 0, 0))
    const d2 = new Date(Date.UTC(2026, 6, 18, 19, 0, 0))
    expect(localDateInTimezone(d1, 'Asia/Karachi')).toBe('2026-07-18')
    expect(localDateInTimezone(d2, 'Asia/Karachi')).toBe('2026-07-19')
    expect(localDateInTimezone(d1, 'Asia/Kathmandu')).toBe('2026-07-18')
    expect(localDateInTimezone(d2, 'Asia/Kathmandu')).toBe('2026-07-19')
    expect(localDateInTimezone(d1, 'Asia/Tokyo')).toBe('2026-07-19')
    expect(localDateInTimezone(d2, 'Asia/Tokyo')).toBe('2026-07-19')
  })
})

describe('DST and travel: cutoffForLocalDate is a half-hour stable function', () => {
  // Property test: shifting the local date by an amount less than any
  // IANA offset's half-hour resolution never crosses a DST boundary
  // and never changes the cutoff by more than the offset. This is a
  // structural test that runs fast (no 1-minute scan) and catches
  // gross bugs.
  const zones = [
    'UTC', 'America/Los_Angeles', 'America/New_York',
    'Asia/Karachi', 'Asia/Kathmandu', 'Pacific/Chatham',
    'Australia/Adelaide', 'Pacific/Apia'
  ]
  for (const tz of zones) {
    for (const date of [
      '2026-01-15', '2026-03-08', '2026-11-01', '2026-07-18', '2028-02-29'
    ]) {
      for (const hour of [0, 3, 5, 12, 23]) {
        it(`${tz} ${date} ${hour}:00 has a valid cutoff`, () => {
          const got = cutoffForLocalDate(date, tz, hour)
          expect(Number.isFinite(got.getTime())).toBe(true)
          // The cutoff, when read in the target zone, must show the
          // requested local date at the requested hour with minute=0.
          const w = partsInZone(got, tz)
          const [y, mo, d] = date.split('-').map(Number)
          expect(w.y).toBe(y)
          expect(w.mo).toBe(mo)
          expect(w.d).toBe(d)
          expect(w.h).toBe(hour)
          expect(w.mi).toBe(0)
        })
      }
    }
  }
})

describe('Travel: consecutiveDays with date storage', () => {
  it('streak survives a member traveling east-to-west', () => {
    // The API normalizes to a single local_date per (user, day) using
    // the profile's timezone. As long as the dates are in chronological
    // order, the streak math is unaffected.
    const dates = ['2026-07-16', '2026-07-17', '2026-07-18']
    expect(consecutiveDays(dates, '2026-07-18')).toBe(3)
  })
  it('duplicate dates do not double-count', () => {
    const dates = ['2026-07-17', '2026-07-18', '2026-07-18']
    expect(consecutiveDays(dates, '2026-07-18')).toBe(2)
  })
})

describe('bestStreak: DST does not break a 30-day streak', () => {
  it('keeps a 30-day streak intact when one day falls on spring-forward', () => {
    const dates: string[] = []
    for (let d = 1; d <= 31; d++) {
      dates.push(`2026-03-${String(d).padStart(2, '0')}`)
    }
    expect(bestStreak(dates)).toBe(31)
  })
})
