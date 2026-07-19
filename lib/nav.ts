// Centralized rail definitions. Pages import from here so the
// navigation list is consistent across the app shell. Adding a new
// surface means adding one entry to MEMBER_RAIL (or a new
// dedicated rail) and the AppShell picks it up automatically.

import type { ComponentProps } from 'react'
import AppShell from '../components/ui/AppShell'

// The keys are typed against the `rail.*` copy keys; the AppShell
// component expects the same key strings for its label lookup.
export const MEMBER_RAIL = [
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
export const COMMUNITY_RAIL = [
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

export const ADMIN_RAIL = [
  { href: '/admin/members', key: 'rail.admin.members' as const },
  { href: '/admin/enrollment', key: 'rail.admin.enrollment' as const },
  { href: '/admin/teams', key: 'rail.admin.teams' as const },
  { href: '/admin/schedule', key: 'rail.admin.schedule' as const },
  { href: '/admin/analytics', key: 'rail.admin.analytics' as const },
  { href: '/admin/reports', key: 'rail.admin.reports' as const }
]

// Type re-export for convenience in pages.
export type RailItem = ComponentProps<typeof AppShell>['items'][number]
