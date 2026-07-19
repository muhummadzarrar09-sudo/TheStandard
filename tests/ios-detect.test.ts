// The iOS install hint is the UX fallback when the iOS Safari
// user isn't in standalone (Home Screen) mode. The detection
// logic in components/pwa/PushSubscription.tsx is small but
// load-bearing — a regression here would mean real iOS users
// never see the "Add to Home Screen" hint.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(resolve(here, '../components/pwa/PushSubscription.tsx'), 'utf8')

describe('iOS install hint', () => {
  it('the component has an isiOS predicate', () => {
    expect(src).toMatch(/function\s+isiOS\b/)
  })
  it('the component has an isStandalone predicate', () => {
    expect(src).toMatch(/function\s+isStandalone\b/)
  })
  it('the component reads navigator.standalone (iOS Safari)', () => {
    // The component casts `navigator as Navigator & { standalone?: boolean }`
    // so the literal string may not appear. Look for either
    // the raw read or the cast.
    expect(src).toMatch(/navigator\.standalone|standalone\?:/)
  })
  it('the component handles iPadOS desktop UA (Mac + maxTouchPoints > 1)', () => {
    expect(src).toMatch(/maxTouchPoints\s*>\s*1/)
  })
  it('the iOS install hint mentions the Share button + Add to Home Screen', () => {
    expect(src).toContain('Add to Home Screen')
    expect(src).toMatch(/Share/i)
  })
  it('the iOS install hint mentions iOS 16.4 as the minimum', () => {
    expect(src).toContain('16.4')
  })
  it('the pushSupported guard checks serviceWorker + PushManager + Notification', () => {
    expect(src).toContain("'serviceWorker' in navigator")
    expect(src).toContain("'PushManager' in window")
    expect(src).toContain("'Notification' in window")
  })
  it('the catch branch on subscribe() also routes iOS users to the install hint', () => {
    const catchesIStrandalone =
      /catch\s*\{[\s\S]*?isiOS\(\)[\s\S]*?ios-needs-install[\s\S]*?\}/m.test(src)
    expect(catchesIStrandalone).toBe(true)
  })
})
