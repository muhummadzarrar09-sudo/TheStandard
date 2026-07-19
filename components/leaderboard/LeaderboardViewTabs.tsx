'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { t } from '../../lib/copy'

// The leaderboard has three views (PRD §7.3): all / team / week.
// This tab strip drives the ?view= search param. It's a client
// component so the active state stays correct after client-side
// navigation; the page itself is a server component.
export default function LeaderboardViewTabs({ current }: { current: 'all' | 'team' | 'week' }) {
  const pathname = usePathname() || '/leaderboard'
  const sp = useSearchParams()
  const tabs: { value: 'all' | 'team' | 'week'; label: string }[] = [
    { value: 'all', label: t('leaderboard.viewAll') },
    { value: 'team', label: t('leaderboard.viewTeam') },
    { value: 'week', label: t('leaderboard.viewWeek') }
  ]
  return (
    <div
      role="tablist"
      aria-label="Leaderboard view"
      style={{
        display: 'flex',
        gap: 4,
        marginTop: 24,
        padding: 4,
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        background: 'var(--surface)',
        width: 'fit-content'
      }}
    >
      {tabs.map(tab => {
        const isActive = tab.value === current
        // Preserve any other search params when switching tabs.
        const params = new URLSearchParams(sp?.toString() || '')
        if (tab.value === 'all') {
          params.delete('view')
        } else {
          params.set('view', tab.value)
        }
        const qs = params.toString()
        const href = qs ? `${pathname}?${qs}` : pathname
        return (
          <Link
            key={tab.value}
            href={href}
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? 'true' : undefined}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius)',
              background: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? 'var(--accent-text)' : 'var(--muted)',
              fontWeight: isActive ? 700 : 500,
              fontSize: 13,
              letterSpacing: '.04em',
              transition: 'background-color 0.15s ease'
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
