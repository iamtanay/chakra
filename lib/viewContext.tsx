'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type ViewMode = 'kanban' | 'list' | 'calendar'

interface ViewContextValue {
  view: ViewMode
  setView: (v: ViewMode) => void
}

const ViewContext = createContext<ViewContextValue>({
  view: 'kanban',
  setView: () => {},
})

export function ViewProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<ViewMode>('kanban')

  useEffect(() => {
    const stored = localStorage.getItem('chakra-view') as ViewMode | null
    if (stored && ['kanban', 'list', 'calendar'].includes(stored)) {
      setViewState(stored)
    }
  }, [])

  const setView = (v: ViewMode) => {
    setViewState(v)
    localStorage.setItem('chakra-view', v)
  }

  return (
    <ViewContext.Provider value={{ view, setView }}>
      {children}
    </ViewContext.Provider>
  )
}

export function useView() {
  return useContext(ViewContext)
}
