'use client'
import { createContext, useContext, useEffect, useState } from 'react'
export const presets = ['whoop-oura','linear','duolingo','robinhood','arc','discord'] as const
type Preset=typeof presets[number]
const ThemeContext = createContext({ preset: 'whoop-oura' as Preset, setPreset: (_: Preset) => {} })
export function ThemeProvider({ children }: { children: React.ReactNode }) { const [preset,setPreset] = useState<Preset>('whoop-oura'); useEffect(()=>{const saved=localStorage.getItem('discipline-theme') as Preset|null;if(saved&&presets.includes(saved))setPreset(saved)},[]); useEffect(()=>{document.documentElement.dataset.theme=preset;localStorage.setItem('discipline-theme',preset);fetch('/api/profile',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({themePreset:preset})}).catch(()=>{})},[preset]); return <ThemeContext.Provider value={{preset,setPreset}}>{children}</ThemeContext.Provider> }
export const useTheme = () => useContext(ThemeContext)
