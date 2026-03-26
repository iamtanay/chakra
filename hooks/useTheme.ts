'use client'

import { useEffect, useState, useCallback } from 'react'

export type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    // Read from localStorage, fall back to system preference
    const stored = localStorage.getItem('chakra-theme') as Theme | null
    if (stored === 'dark' || stored === 'light') {
      setThemeState(stored)
      document.documentElement.setAttribute('data-theme', stored)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const resolved: Theme = prefersDark ? 'dark' : 'light'
      setThemeState(resolved)
      document.documentElement.setAttribute('data-theme', resolved)
    }
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem('chakra-theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('chakra-theme', next)
      document.documentElement.setAttribute('data-theme', next)
      return next
    })
  }, [])

  return { theme, setTheme, toggle }
}
