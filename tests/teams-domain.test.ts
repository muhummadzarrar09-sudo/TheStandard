// Domain tests for lib/domain/streaks.ts. The existing tests cover
// the basics; here we add boundary cases that surfaced in the
// client-readiness pass.

import { describe, it, expect } from 'vitest'
import { consecutiveDays, bestStreak } from '../lib/domain/streaks'

describe('consecutiveDays (boundary cases)', () => {
  it('returns 0 for an empty set', () => {
    expect(consecutiveDays([], '2026-06-15')).toBe(0)
  })

  it('returns 0 if today is not in the set and yesterday is also missing', () => {
    expect(consecutiveDays(['2026-06-10'], '2026-06-15')).toBe(0)
  })

  it('returns 1 if only today is in the set', () => {
    expect(consecutiveDays(['2026-06-15'], '2026-06-15')).toBe(1)
  })

  it('returns 1 if only yesterday is in the set (today not yet done)', () => {
    expect(consecutiveDays(['2026-06-14'], '2026-06-15')).toBe(1)
  })

  it('skips today exactly once and counts back from yesterday', () => {
    // Today missing, yesterday + day before present → 2
    expect(consecutiveDays(['2026-06-13', '2026-06-14'], '2026-06-15')).toBe(2)
  })

  it('breaks at the first gap', () => {
    // 13, 14, 16 → only 13, 14 count (skipping today = 15, then 16 is
    // a gap so 13, 14 = 2)
    expect(consecutiveDays(['2026-06-13', '2026-06-14', '2026-06-16'], '2026-06-15')).toBe(2)
  })

  it('handles a 7-day run correctly', () => {
    const dates = ['2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15']
    expect(consecutiveDays(dates, '2026-06-15')).toBe(7)
  })

  it('handles duplicate dates in the set (should not double-count)', () => {
    expect(consecutiveDays(['2026-06-15', '2026-06-15', '2026-06-14'], '2026-06-15')).toBe(2)
  })
})

describe('bestStreak (boundary cases)', () => {
  it('returns 0 for an empty set', () => {
    expect(bestStreak([])).toBe(0)
  })

  it('returns 1 for a single date', () => {
    expect(bestStreak(['2026-06-15'])).toBe(1)
  })

  it('returns the longest run when multiple runs exist', () => {
    expect(bestStreak([
      '2026-06-01', '2026-06-02', '2026-06-03', // 3
      '2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14' // 5
    ])).toBe(5)
  })

  it('returns 1 when no two dates are adjacent', () => {
    expect(bestStreak(['2026-06-01', '2026-06-10', '2026-06-20'])).toBe(1)
  })

  it('deduplicates identical dates', () => {
    expect(bestStreak(['2026-06-14', '2026-06-14', '2026-06-15'])).toBe(2)
  })
})
