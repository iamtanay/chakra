'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export type ThemeMode = 'dark' | 'light' | 'adaptive'

/** Resolves adaptive → 'dark' | 'light' based on current hour */
function resolveAdaptive(): 'dark' | 'light' {
  const hour = new Date().getHours()
  // Light from 08:00, dark from 18:00
  return hour >= 8 && hour < 18 ? 'light' : 'dark'
}

/** Applies the resolved theme to the DOM */
function applyTheme(mode: ThemeMode) {
  const resolved = mode === 'adaptive' ? resolveAdaptive() : mode
  document.documentElement.setAttribute('data-theme', resolved)
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>('dark')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // On mount: read stored preference and apply
  useEffect(() => {
    const stored = localStorage.getItem('chakra-theme') as ThemeMode | null
    const initial: ThemeMode =
      stored === 'dark' || stored === 'light' || stored === 'adaptive'
        ? stored
        : 'dark'
    setModeState(initial)
    applyTheme(initial)
  }, [])

  // When mode changes to adaptive, start a minute-interval checker
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (mode === 'adaptive') {
      // Apply immediately, then re-check every 60 s
      applyTheme('adaptive')
      intervalRef.current = setInterval(() => applyTheme('adaptive'), 60_000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [mode])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    localStorage.setItem('chakra-theme', m)
    applyTheme(m)
  }, [])

  // Derived: what the DOM is currently showing (useful for icon display)
  const resolvedTheme: 'dark' | 'light' =
    mode === 'adaptive' ? resolveAdaptive() : mode

  return { mode, resolvedTheme, setMode }
}
