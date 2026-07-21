'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { t } from '../../lib/copy'
import type { RailItem } from '../../lib/nav'
import MobileNav from './MobileNav'

type Props = {
  items: RailItem[]
  children: React.ReactNode
}

// A consistent rail with active-link highlighting. The pathname-aware
// active state is computed client-side so it stays correct after
// client-side navigation. The shell is a client component because
// `usePathname` is; server pages can still pass server-rendered
// children through it (the children render on the server, only the
// shell runs on the client).
export default function AppShell({ items, children }: Props) {
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
      <MobileNav items={items} />
    </div>
  )
}

// Active when the pathname matches the link's href exactly, or is a
// child path. Treats `/` as "active only when pathname is /".
function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}
