'use client'

/**
 * PageTopBar — single, unified top bar used across all pages.
 *
 * Layout contract (both mobile & desktop):
 *   [left: Logo? + Page title]  ···  [right: page-specific actions]
 *
 * - Logo is shown on mobile only (desktop already has it in the Sidebar).
 * - Page title is always present.
 * - Actions (right slot) are optional — passed as a ReactNode.
 * - Height is fixed and compact: py-3 (12px) on both breakpoints.
 *
 * Usage:
 *   <PageTopBar title="Board" actions={<Button>Add task</Button>} logoSpin={logoSpin} />
 */

import { Logo } from '@/components/ui/Logo'

interface PageTopBarProps {
  /** Required: shown on both mobile and desktop */
  title: string
  /** Optional: rendered in the right slot — keep to 1–2 compact items */
  actions?: React.ReactNode
  /** Passed through to the Logo spin animation */
  logoSpin?: 'once' | 'fast' | 'loop' | null
  /** Optional count badge next to the title (e.g., task count on Today) */
  badge?: number | null
}

export function PageTopBar({ title, actions, logoSpin, badge }: PageTopBarProps) {
  return (
    <div
      className="flex items-center justify-between px-4 md:px-6 py-3 flex-shrink-0"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Left: Logo (mobile only) + title */}
      <div className="flex items-center gap-3">
        {/* Logo on mobile only — desktop Sidebar already shows it */}
        <span className="md:hidden flex items-center">
          <Logo size={22} spin={logoSpin} />
        </span>

        <h1
          className="font-syne font-800 text-base uppercase tracking-widest"
          style={{ color: 'var(--text)', letterSpacing: '0.15em' }}
        >
          {title}
        </h1>

        {badge != null && badge > 0 && (
          <span
            className="font-mono text-xs w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--bg4)', color: 'var(--text3)' }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Right: page actions */}
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
