'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderKanban, BarChart3 } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',         label: 'Board',    Icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', Icon: FolderKanban },
  { href: '/reports',  label: 'Reports',  Icon: BarChart3 },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-50"
      style={{
        background:    'rgba(14, 16, 18, 0.92)',
        backdropFilter: 'blur(20px)',
        borderTop:     '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1.5 flex-1 py-3 transition-all duration-150 relative"
              style={{ minHeight: 56 }}
            >
              {active && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: 'var(--amber)' }}
                />
              )}
              <Icon
                size={20}
                style={{ color: active ? 'var(--amber)' : 'var(--text3)' }}
              />
              <span
                className="font-syne text-xs font-500 tracking-wide"
                style={{ color: active ? 'var(--text)' : 'var(--text3)' }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
