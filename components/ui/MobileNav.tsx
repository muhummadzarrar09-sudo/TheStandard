'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { t } from '../../lib/copy'
import type { RailItem } from '../../lib/nav'

type Props = { items: RailItem[] }

export default function MobileNav({ items }: Props) {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)
  const primary = items.slice(0, 4)
  const secondary = items.slice(4)

  return (
    <>
      {open && (
        <button className="mobile-nav-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />
      )}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {primary.map(item => <NavLink key={item.href} item={item} pathname={pathname} onNavigate={() => setOpen(false)} />)}
        <button className={`mobile-nav-item ${open ? 'active' : ''}`} onClick={() => setOpen(value => !value)} aria-expanded={open}>
          <span className="mobile-nav-icon" aria-hidden="true">•••</span>
          <span>More</span>
        </button>
      </nav>
      {open && (
        <div className="mobile-nav-sheet" role="dialog" aria-label="More navigation">
          <div className="mobile-nav-sheet-header">
            <strong>More</strong>
            <button className="link-button" onClick={() => setOpen(false)}>Close</button>
          </div>
          {secondary.map(item => <NavLink key={item.href} item={item} pathname={pathname} onNavigate={() => setOpen(false)} />)}
        </div>
      )}
    </>
  )
}

function NavLink({ item, pathname, onNavigate }: { item: RailItem; pathname: string; onNavigate: () => void }) {
  const active = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/')
  return (
    <Link href={item.href} className={`mobile-nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined} onClick={onNavigate}>
      <span className="mobile-nav-icon" aria-hidden="true">{iconFor(item.href)}</span>
      <span>{t(item.key)}</span>
    </Link>
  )
}

function iconFor(href: string): string {
  if (href.includes('schedule')) return '◷'
  if (href.includes('tracker')) return '✓'
  if (href.includes('team')) return '◎'
  if (href.includes('leaderboard')) return '↗'
  if (href.includes('report')) return '▤'
  if (href.includes('settings')) return '⚙'
  return '●'
}
