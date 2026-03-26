'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FolderKanban, BarChart3, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/',         label: 'Board',    Icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', Icon: FolderKanban },
  { href: '/reports',  label: 'Reports',  Icon: BarChart3 },
]

export function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [confirm, setConfirm] = useState(false)

  const handleLogout = async () => {
    if (!confirm) { setConfirm(true); setTimeout(() => setConfirm(false), 2500); return }
    await supabase.auth.signOut()
    router.push('/login')
  }

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

        {/* Subtle logout — tap once to prime, tap again to confirm */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1.5 py-3 transition-all duration-200 relative"
          style={{ minHeight: 56, minWidth: 56 }}
          title="Log out"
        >
          <LogOut
            size={18}
            style={{
              color: confirm ? 'var(--rose)' : 'var(--text3)',
              transition: 'color 200ms',
            }}
          />
          <span
            className="font-syne text-xs font-500"
            style={{
              color: confirm ? 'var(--rose)' : 'var(--text3)',
              fontSize: '10px',
              transition: 'color 200ms',
            }}
          >
            {confirm ? 'Sure?' : 'Out'}
          </span>
        </button>
      </div>
    </nav>
  )
}
