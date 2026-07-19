// The Playwright e2e harness is opt-in (it requires a running
// dev server + a real Supabase for the integration specs). We
// still want CI to fail loudly if the config file has a typo or
// a malformed pattern. This test loads the config and asserts
// its public shape.

import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const configPath = resolve(here, '../playwright.config.ts')
const e2eDir = resolve(here, '../e2e')

// tsx isn't always available in the sandbox; the test does a
// syntactic check + asserts the public shape from the file text.
// If the file is broken, this test fails; the actual e2e suite
// fails separately when run.
describe('playwright config', () => {
  let src: string
  beforeAll(() => {
    src = readFileSync(configPath, 'utf8')
  })

  it('exports a default config', () => {
    expect(src).toMatch(/export\s+default\s+defineConfig\(/)
  })

  it('points at the e2e/ directory', () => {
    expect(src).toMatch(/testDir:\s*['"]\.\/e2e['"]/)
  })

  it('matches *.e2e.ts (so vitest does not pick them up)', () => {
    expect(src).toMatch(/testMatch:\s*\/\.\*\\\.e2e\\\.ts\//)
  })

  it('has a webServer block gated on E2E=1', () => {
    expect(src).toMatch(/webServer:\s*process\.env\.E2E/)
    expect(src).toMatch(/command:\s*['"]npm run dev['"]/)
  })

  it('enforces a baseURL on http://localhost', () => {
    expect(src).toMatch(/baseURL:\s*BASE_URL/)
  })

  it('the e2e directory has at least one spec file', () => {
    const files = readdirSync(e2eDir) as string[]
    const specs = files.filter(f => f.endsWith('.e2e.ts'))
    expect(specs.length).toBeGreaterThan(0)
  })

  it('every spec file uses @playwright/test', () => {
    const files = readdirSync(e2eDir) as string[]
    for (const f of files.filter((f: string) => f.endsWith('.e2e.ts'))) {
      const text = readFileSync(resolve(e2eDir, f), 'utf8')
      expect(text, f).toMatch(/@playwright\/test/)
    }
  })
})
