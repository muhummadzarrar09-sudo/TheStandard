// Verify the CSS theme system has the required tokens and presets.
// These tests catch regressions where a new preset is added without
// overriding the full set, or where a utility class references a
// token that has been removed.
//
// The test reads the raw CSS as a string (no CSS parser dependency).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { presets } from '../themes'

// Resolve the test file's directory via import.meta.url so the test
// is portable across CJS and ESM vitest runtimes.
const here = dirname(fileURLToPath(import.meta.url))

const css = readFileSync(resolve(here, '../app/globals.css'), 'utf8')

// Extract a CSS rule body for a selector. Looks for the first
// `{...}` block after the selector name. Throws on miss.
function ruleBody(selector: string): string {
  const idx = css.indexOf(selector)
  if (idx === -1) throw new Error(`Selector not found: ${selector}`)
  const start = css.indexOf('{', idx)
  const end = css.indexOf('}', start)
  if (start === -1 || end === -1) throw new Error(`Malformed rule for ${selector}`)
  return css.slice(start + 1, end)
}

describe('globals.css theme system', () => {
  it('defines the core tokens in :root', () => {
    const rootBody = css.slice(
      css.indexOf(':root {'),
      css.indexOf('}', css.indexOf(':root {'))
    )
    for (const token of ['--bg', '--surface', '--line', '--text', '--muted', '--accent', '--accent-text', '--danger', '--font', '--radius', '--density', '--gap']) {
      expect(rootBody, `missing ${token} in :root`).toContain(token + ':')
    }
  })

  it('every preset overrides the full palette including --accent-text and --danger', () => {
    for (const preset of presets) {
      const needle = `[data-theme="${preset}"]`
      const idx = css.indexOf(needle)
      expect(idx, `preset block for ${preset} not found`).toBeGreaterThan(-1)
      const start = css.indexOf('{', idx)
      const end = css.indexOf('}', start)
      const body = css.slice(start + 1, end)
      for (const token of ['--bg', '--surface', '--line', '--text', '--muted', '--accent', '--accent-text', '--danger']) {
        expect(body, `preset ${preset} missing ${token}`).toContain(token + ':')
      }
    }
  })

  it('the .button class uses var(--accent-text), not a hardcoded hex', () => {
    const body = ruleBody('.button {')
    expect(body).toContain('var(--accent-text)')
    // The 'color:' line should not be a hex literal.
    const colorLine = body.split(';').find(l => l.trim().startsWith('color:'))
    expect(colorLine).toBeTruthy()
    expect(colorLine).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })

  it('the .input class is defined and uses theme tokens', () => {
    const body = ruleBody('.input {')
    expect(body).toContain('var(--bg)')
    expect(body).toContain('var(--line)')
  })

  it('.link-button and .link-button-danger have valid font-size units', () => {
    // font-size must have a unit (px/rem/etc.) — bare numbers are invalid
    // CSS and silently ignored.
    for (const sel of ['.link-button {', '.link-button-danger {']) {
      const body = ruleBody(sel)
      expect(body, `${sel} missing font-size`).toMatch(/font-size:\s*\d+(?:\.\d+)?(?:px|rem|em|%)\b/)
    }
  })

  it('.status-msg.err uses var(--danger) not a hardcoded hex', () => {
    const body = ruleBody('.status-msg.err {')
    expect(body).toContain('var(--danger)')
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })
})

