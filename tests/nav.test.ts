// Tests for the shared navigation rails. The 11 pages that use the
// AppShell each import from lib/nav. This test pins the surface so
// adding/removing a rail item is intentional.

import { describe, it, expect } from 'vitest'
import { MEMBER_RAIL, COMMUNITY_RAIL, PROFILE_RAIL, ADMIN_RAIL } from '../lib/nav'

describe('shared navigation rails', () => {
  it('MEMBER_RAIL contains the 8 standard surfaces', () => {
    const hrefs = MEMBER_RAIL.map(r => r.href)
    expect(hrefs).toEqual([
      '/dashboard', '/schedule', '/tracker', '/team',
      '/team/chat', '/leaderboard', '/reports', '/settings'
    ])
  })

  it('every rail item has a copy key', () => {
    for (const rail of [MEMBER_RAIL, COMMUNITY_RAIL, PROFILE_RAIL, ADMIN_RAIL]) {
      for (const item of rail) {
        expect(item.key.startsWith('rail.')).toBe(true)
        expect(typeof item.href).toBe('string')
        expect(item.href.startsWith('/')).toBe(true)
      }
    }
  })

  it('every rail key is unique within a rail', () => {
    for (const rail of [MEMBER_RAIL, COMMUNITY_RAIL, PROFILE_RAIL, ADMIN_RAIL]) {
      const keys = rail.map(r => r.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('every rail href is unique within a rail', () => {
    for (const rail of [MEMBER_RAIL, COMMUNITY_RAIL, PROFILE_RAIL, ADMIN_RAIL]) {
      const hrefs = rail.map(r => r.href)
      expect(new Set(hrefs).size).toBe(hrefs.length)
    }
  })

  it('COMMUNITY_RAIL is a focused 4-item subset', () => {
    expect(COMMUNITY_RAIL.map(r => r.href)).toEqual([
      '/dashboard', '/team', '/reports', '/community'
    ])
  })

  it('PROFILE_RAIL exposes the profile surface', () => {
    expect(PROFILE_RAIL.find(r => r.href === '/profile')).toBeTruthy()
  })

  it('ADMIN_RAIL contains the four admin surfaces', () => {
    expect(ADMIN_RAIL.map(r => r.href)).toEqual([
      '/admin/members', '/admin/enrollment', '/admin/analytics', '/admin/reports'
    ])
  })
})
