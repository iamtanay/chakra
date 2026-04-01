'use client'

/**
 * AppShell — the persistent shell for all authenticated pages.
 *
 * Structure:
 *   [Sidebar (md+)]  |  [main content area]
 *                    |    [children]
 *   [BottomNav (< md, fixed)]
 *
 * Why this exists:
 *   - Sidebar and BottomNav are mounted ONCE here, not per-page.
 *   - This eliminates the BottomNav re-render flash on page transitions.
 *   - Each page only mounts its own content — no layout components needed.
 *
 * Usage in layout.tsx:
 *   Wrap authenticated pages with <AppShell> inside a client boundary.
 *   The Sidebar needs projects + selectedProjectId, so each page that
 *   needs project-switching must manage that state and pass it down, OR
 *   you can lift state here via a context (see NOTE below).
 *
 * NOTE on Sidebar project state:
 *   For the Board page, selectedProjectId is driven by URL search params
 *   (?project=<id>). The Sidebar reads this from the URL and navigates.
 *   Pages that don't filter by project pass selectedProjectId={null} and
 *   a no-op onProjectSelect to keep the Sidebar in a neutral state.
 */

import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import type { Project } from '@/types'

interface AppShellProps {
  children: React.ReactNode
  projects: Project[]
  /** The currently selected project for Board-style pages. null = All. */
  selectedProjectId: string | null
  /** Called when user clicks a project in the Sidebar */
  onProjectSelect: (id: string | null) => void
}

export function AppShell({ children, projects, selectedProjectId, onProjectSelect }: AppShellProps) {
  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>
      {/* Sidebar — desktop only, renders once, no flash */}
      <Sidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectSelect={onProjectSelect}
      />

      {/* Main content — offset for sidebar on md+ */}
      <div className="flex-1 md:ml-[var(--sidebar-w)] flex flex-col overflow-hidden pb-14 md:pb-0">
        {children}
      </div>

      {/* BottomNav — mobile only, fixed, renders once */}
      <BottomNav />
    </div>
  )
}
