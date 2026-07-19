import { describe, it, expect } from 'vitest'
import { themes, presets, isPreset } from '../themes'

describe('themes', () => {
  it('presets list is derived from the themes object', () => {
    // The single source of truth: adding/removing a theme to themes[]
    // changes presets[] automatically. We assert the two are aligned
    // here so a future maintainer can't drift them.
    expect(presets).toEqual(Object.keys(themes))
  })

  it('every theme has the required fields', () => {
    for (const [id, t] of Object.entries(themes)) {
      expect(typeof t.name).toBe('string')
      expect(t.name.length).toBeGreaterThan(0)
      expect(typeof t.background).toBe('string')
      expect(typeof t.surface).toBe('string')
      expect(typeof t.text).toBe('string')
      expect(typeof t.muted).toBe('string')
      expect(typeof t.accent).toBe('string')
      expect(typeof t.radius).toBe('string')
      expect(['compact', 'balanced', 'spacious']).toContain(t.density)
      expect(typeof t.font).toBe('string')
      // id is the same as the key in the map
      expect(id).toMatch(/^[a-z-]+$/)
    }
  })

  it('isPreset returns true only for known ids', () => {
    expect(isPreset('whoop-oura')).toBe(true)
    expect(isPreset('discord')).toBe(true)
    expect(isPreset('unknown-theme')).toBe(false)
    expect(isPreset(null)).toBe(false)
    expect(isPreset(undefined)).toBe(false)
    expect(isPreset(42)).toBe(false)
  })
})
