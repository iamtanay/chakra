'use client'

/**
 * PageTopBar — single, unified top bar used across all pages.
 *
 * Layout contract:
 *   Mobile:  [Logo + "Chakra" brand]  ···  [right: page-specific actions]
 *   Desktop: [Page title]             ···  [right: page-specific actions]
 *
 * - On mobile the page name is hidden; the Logo + brand wordmark is shown instead.
 * - On desktop the Logo is hidden (Sidebar has it); only the page title is shown.
 * - Actions (right slot) are optional — passed as a ReactNode.
 */

import { Logo } from '@/components/ui/Logo'

interface PageTopBarProps {
  /** Required: shown on desktop only */
  title: string
  /** Optional: rendered in the right slot — keep to 1–2 compact items */
  actions?: React.ReactNode
  /** Passed through to the Logo spin animation */
  logoSpin?: 'once' | 'fast' | 'loop' | null
  /** Optional count badge next to the title (desktop only) */
  badge?: number | null
}

export function PageTopBar({ title, actions, logoSpin, badge }: PageTopBarProps) {
  return (
    <div
      className="flex items-center justify-between px-4 md:px-6 py-3 flex-shrink-0"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Left slot */}
      <div className="flex items-center gap-3">

        {/* Mobile: Logo + "Chakra" brand wordmark — page name hidden */}
        <span className="md:hidden flex items-center gap-2.5">
          <Logo size={22} spin={logoSpin} />
          <span
            className="font-cinzel font-600 text-sm tracking-[0.22em] uppercase"
            style={{
              background:           'linear-gradient(135deg, var(--logo-from) 0%, var(--logo-mid) 60%, var(--logo-to) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor:  'transparent',
              backgroundClip:       'text',
            }}
          >
            Chakra
          </span>
        </span>

        {/* Desktop: page title (Logo lives in Sidebar) */}
        <h1
          className="hidden md:block font-syne font-800 text-base uppercase tracking-widest"
          style={{ color: 'var(--text)', letterSpacing: '0.15em' }}
        >
          {title}
        </h1>

        {/* Badge — desktop only, next to title */}
        {badge != null && badge > 0 && (
          <span
            className="hidden md:flex font-mono text-xs w-6 h-6 rounded-full items-center justify-center flex-shrink-0"
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
