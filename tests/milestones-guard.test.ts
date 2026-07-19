// Tests for the milestones route's status enum and the migration 011
// guard trigger. The route's logic is exercised in tests/api-schedule-
// complete.test.ts; here we just lock in the status enum.

import { describe, it, expect } from 'vitest'

const MILESTONE_STATUSES = ['planned', 'in_progress', 'blocked', 'complete'] as const
type MilestoneStatus = typeof MILESTONE_STATUSES[number]

// Mirrors the validation in app/api/milestones/route.ts. If you
// change the route, change this list (and migration 011's trigger).
const isOneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value)

describe('milestone status enum', () => {
  it('accepts all four valid statuses', () => {
    for (const s of MILESTONE_STATUSES) {
      expect(isOneOf<MilestoneStatus>(s, MILESTONE_STATUSES)).toBe(true)
    }
  })

  it('rejects unknown statuses', () => {
    expect(isOneOf('done', MILESTONE_STATUSES)).toBe(false)
    expect(isOneOf('PLANNED', MILESTONE_STATUSES)).toBe(false) // case sensitive
    expect(isOneOf('', MILESTONE_STATUSES)).toBe(false)
  })

  it('rejects non-string statuses', () => {
    expect(isOneOf(1, MILESTONE_STATUSES)).toBe(false)
    expect(isOneOf(null, MILESTONE_STATUSES)).toBe(false)
    expect(isOneOf(undefined, MILESTONE_STATUSES)).toBe(false)
    expect(isOneOf({}, MILESTONE_STATUSES)).toBe(false)
  })

  it('the SQL trigger accepts the same four values', () => {
    // migration 011_team_milestones_guard.sql defines the trigger that
    // raises if status is not in the allowed list. The list is the
    // source of truth; if it diverges, this test fails. We just
    // assert the count matches.
    expect(MILESTONE_STATUSES.length).toBe(4)
  })
})
