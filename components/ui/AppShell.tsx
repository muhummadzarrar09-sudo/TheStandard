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
  brand?: { line1: string; line2: string }
  children: React.ReactNode
}

// A consistent rail with active-link highlighting. The pathname-aware
// active state is computed client-side so it stays correct after
// client-side navigation (Next 16 keeps the layout mounted).
export default function AppShell({ items, brand, children }: Props) {
  const pathname = usePathname() || '/'
  return (
    <div className="shell">
      <aside className="rail" aria-label="Primary navigation">
        <div className="brand">
          {brand?.line1 ?? t('app.brand')}
          <small>{brand?.line2 ?? t('app.brandSub')}</small>
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

// Active when the pathname matches the link's href exactly, or is a
// child path. Treats `/` as "active only when pathname is /".
function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}
