// Centralized rail definitions. Pages import from here so the
// navigation list is consistent across the app shell. Adding a new
// surface means adding one entry to MEMBER_RAIL (or a new
// dedicated rail) and the AppShell picks it up automatically.

import type { ComponentProps } from 'react'
import AppShell from '../components/ui/AppShell'

// Single source of truth for the rail key union. AppShell imports
// this so adding a new key only requires touching one place.
// Keep this list in sync with the corresponding copy keys in lib/copy.ts.
export type RailKey =
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
  | 'rail.admin.teams'
  | 'rail.admin.schedule'
  | 'rail.admin.analytics'
  | 'rail.admin.reports'

export type RailItem = { href: string; key: RailKey }

// The keys are typed against the `rail.*` copy keys; the AppShell
// component expects the same key strings for its label lookup.
export const MEMBER_RAIL: RailItem[] = [
  { href: '/dashboard', key: 'rail.today' as const },
  { href: '/schedule', key: 'rail.schedule' as const },
  { href: '/tracker', key: 'rail.tracker' as const },
  { href: '/team', key: 'rail.team' as const },
  { href: '/team/chat', key: 'rail.teamChat' as const },
  { href: '/leaderboard', key: 'rail.leaderboard' as const },
  { href: '/reports', key: 'rail.reports' as const },
  { href: '/settings', key: 'rail.settings' as const }
]

// A shorter rail for surfaces that have a more focused task (e.g.
// profile, community). The keys here must exist on CopyKey in lib/copy.
export const COMMUNITY_RAIL: RailItem[] = [
  { href: '/dashboard', key: 'rail.today' as const },
  { href: '/team', key: 'rail.team' as const },
  { href: '/reports', key: 'rail.reports' as const },
  { href: '/community', key: 'rail.community' as const }
]

export const PROFILE_RAIL = [
  { href: '/dashboard', key: 'rail.today' as const },
  { href: '/tracker', key: 'rail.tracker' as const },
  { href: '/team', key: 'rail.team' as const },
  { href: '/reports', key: 'rail.reports' as const },
  { href: '/settings', key: 'rail.settings' as const },
  { href: '/profile', key: 'rail.profile' as const }
]

export const ADMIN_RAIL: RailItem[] = [
  { href: '/admin/members', key: 'rail.admin.members' as const },
  { href: '/admin/enrollment', key: 'rail.admin.enrollment' as const },
  { href: '/admin/teams', key: 'rail.admin.teams' as const },
  { href: '/admin/schedule', key: 'rail.admin.schedule' as const },
  { href: '/admin/analytics', key: 'rail.admin.analytics' as const },
  { href: '/admin/reports', key: 'rail.admin.reports' as const }
]

// AppShell re-imports the RailItem type from here so the keys stay in
// sync. Re-export ComponentProps<typeof AppShell> for callers that
// want to type their own AppShell props without importing AppShell.
export type AppShellProps = ComponentProps<typeof AppShell>
