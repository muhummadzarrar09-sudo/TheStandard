'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { t } from '../../lib/copy'

type RailItem = {
  href: string
  key: 'rail.today' | 'rail.schedule' | 'rail.tracker' | 'rail.team' | 'rail.teamChat' | 'rail.leaderboard' | 'rail.reports' | 'rail.community' | 'rail.settings' | 'rail.profile' | 'rail.admin.members' | 'rail.admin.enrollment' | 'rail.admin.analytics' | 'rail.admin.reports'
}

type Props = {
  items: RailItem[]
  children: React.ReactNode
}

// Client-side equivalent of AppShell. Used by client pages (settings,
// devices) that have a rail but render most of the body client-side.
export default function AppShellClient({ items, children }: Props) {
  const pathname = usePathname() || '/'
  return (
    <div className="shell">
      <aside className="rail" aria-label="Primary navigation">
        <div className="brand">
          {t('app.brand')}
          <small>{t('app.brandSub')}</small>
        </div>
        <nav>
          {items.map(item => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
              >
                {t(item.key)}
              </Link>
            )
          })}
        </nav>
      </aside>
      <main className="main" id="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}
