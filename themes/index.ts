// Theme catalog. The preset *ids* are the single source of truth —
// the provider, the FOUC bootstrap in app/layout.tsx, the API
// validator, and the test suite all read from this list. Adding a
// new theme means adding one entry here; everything else picks it
// up automatically.

export type ThemePreset = {
  name: string
  background: string
  surface: string
  text: string
  muted: string
  accent: string
  radius: string
  density: 'compact' | 'balanced' | 'spacious'
  font: string
}

export const themes: Record<string, ThemePreset> = {
  'whoop-oura': { name: 'Whoop / Oura', background: '#090a0b', surface: '#111415', text: '#eef2ed', muted: '#899390', accent: '#c7f36b', radius: '4px', density: 'spacious', font: 'Manrope' },
  'linear':     { name: 'Linear',       background: '#0d0d0f', surface: '#151518', text: '#f5f5f5', muted: '#85858e', accent: '#8ab4ff', radius: '6px', density: 'compact', font: 'Inter' },
  'duolingo':   { name: 'Duolingo',     background: '#f4f7f4', surface: '#ffffff', text: '#18231e', muted: '#63756c', accent: '#48b86a', radius: '16px', density: 'spacious', font: 'Nunito' },
  'robinhood':  { name: 'Robinhood',    background: '#f7f8f8', surface: '#ffffff', text: '#13231b', muted: '#687871', accent: '#00a86b', radius: '3px', density: 'balanced', font: 'Inter' },
  'arc':        { name: 'Arc',          background: '#17132a', surface: '#241d3d', text: '#faf7ff', muted: '#aaa0c5', accent: '#ff8ebd', radius: '18px', density: 'spacious', font: 'Manrope' },
  'discord':    { name: 'Discord',      background: '#313338', surface: '#2b2d31', text: '#f2f3f5', muted: '#b5bac1', accent: '#5865f2', radius: '8px', density: 'compact', font: 'Inter' }
}

// The runtime list of preset ids, in the order they appear above.
// Used by the provider, the FOUC bootstrap, the API validator, and
// the test suite. Derived from the themes object so the two cannot
// drift.
export const presets = Object.keys(themes) as Array<keyof typeof themes>
export type Preset = typeof themes[PresetKey] extends never ? never : keyof typeof themes
export type PresetKey = keyof typeof themes

// Validate that a string is a known preset id. The validator
// (lib/validation/schedule.ts) and the FOUC bootstrap both use this
// so an unknown theme name is treated as "no choice" rather than
// crashing.
export function isPreset(value: unknown): value is Preset {
  return typeof value === 'string' && (presets as readonly string[]).includes(value)
}
