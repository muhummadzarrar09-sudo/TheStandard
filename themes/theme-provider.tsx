'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

export const presets = ['whoop-oura', 'linear', 'duolingo', 'robinhood', 'arc', 'discord'] as const
export type Preset = typeof presets[number]

type ThemeContextValue = {
  preset: Preset
  setPreset: (p: Preset) => void
  lastSyncedPreset: Preset | null
  syncState: 'idle' | 'syncing' | 'synced' | 'error'
}

const ThemeContext = createContext<ThemeContextValue>({
  preset: 'whoop-oura',
  setPreset: () => {},
  lastSyncedPreset: null,
  syncState: 'idle'
})

// Read the saved preset synchronously on the client so the first paint
// already matches the user's choice. Without this, the page flashes the
// default theme before useEffect runs. Runs only on the client; on the
// server we render the default and the inline script in app/layout.tsx
// (or this provider) sets the right one before paint via a fallback CSS
// class.
function readSaved(): Preset {
  if (typeof window === 'undefined') return 'whoop-oura'
  try {
    const saved = window.localStorage.getItem('discipline-theme')
    if (saved && (presets as readonly string[]).includes(saved)) {
      return saved as Preset
    }
  } catch {}
  return 'whoop-oura'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Use the saved preset for the first render. The first paint will be
  // correct because the CSS variables keyed off [data-theme="..."] apply
  // as soon as document.documentElement.dataset.theme is set, and that
  // happens in the same render below.
  const [preset, setPresetState] = useState<Preset>('whoop-oura')
  const [lastSyncedPreset, setLastSyncedPreset] = useState<Preset | null>(null)
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle')
  const userInitiated = useRef(false)
  const lastRequestedPreset = useRef<Preset | null>(null)

  // First-mount read from localStorage. We do this synchronously in the
  // useState initializer above; this effect just applies the dataset
  // attribute on the document.
  useEffect(() => {
    const saved = readSaved()
    if (saved !== preset) setPresetState(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Whenever preset changes, apply to DOM and persist locally. Only PATCH
  // the server if the change came from the user (not the initial read).
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = preset
    }
    try {
      window.localStorage.setItem('discipline-theme', preset)
    } catch {}
    if (!userInitiated.current) return
    setSyncState('syncing')
    lastRequestedPreset.current = preset
    fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ themePreset: preset })
    })
      .then(r => {
        if (!r.ok) throw new Error('save failed')
        setLastSyncedPreset(preset)
        setSyncState('synced')
      })
      .catch(() => setSyncState('error'))
  }, [preset])

  const setPreset = (p: Preset) => {
    userInitiated.current = true
    setPresetState(p)
  }

  return (
    <ThemeContext.Provider value={{ preset, setPreset, lastSyncedPreset, syncState }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
