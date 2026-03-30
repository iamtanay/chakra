'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FolderKanban, BarChart3, Star, Settings, Sun, Moon, LogOut, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { NotificationToggle } from '@/components/ui/NotificationToggle'

const NAV_ITEMS = [
  { href: '/',         label: 'Board',   Icon: LayoutDashboard },
  { href: '/today',    label: 'Today',   Icon: Star            },
  { href: '/projects', label: 'Projects', Icon: FolderKanban   },
  { href: '/reports',  label: 'Reports', Icon: BarChart3       },
]

export function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const { theme, toggle } = useTheme()

  const [settingsOpen,  setSettingsOpen]  = useState(false)
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSettingsOpen(false) }
    if (settingsOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [settingsOpen])

  const handleLogout = async () => {
    if (!logoutConfirm) {
      setLogoutConfirm(true)
      setTimeout(() => setLogoutConfirm(false), 2500)
      return
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden z-50"
        style={{
          background:    'var(--bg2)',
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
                  style={{
                    color: active ? 'var(--amber)' : 'var(--text3)',
                    // Today tab: fill the star icon when active for extra visibility
                    fill:  (href === '/today' && active) ? 'var(--amber)' : 'none',
                  }}
                />
                <span
                  className="font-syne text-xs font-500 tracking-wide"
                  style={{ color: active ? 'var(--text)' : 'var(--text3)', fontSize: '10px' }}
                >
                  {label}
                </span>
              </Link>
            )
          })}

          {/* Settings button */}
          <button
            onClick={() => { setSettingsOpen(true); setLogoutConfirm(false) }}
            className="flex flex-col items-center justify-center gap-1.5 flex-1 py-3 transition-all duration-150"
            style={{ minHeight: 56 }}
          >
            <Settings
              size={20}
              style={{ color: settingsOpen ? 'var(--amber)' : 'var(--text3)' }}
            />
            <span
              className="font-syne font-500"
              style={{ color: settingsOpen ? 'var(--amber)' : 'var(--text3)', fontSize: '10px' }}
            >
              More
            </span>
          </button>
        </div>
      </nav>

      {/* Settings Sheet */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-[60] md:hidden animate-fadeIn"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false) }}
        >
          <div
            className="fixed bottom-0 left-0 right-0 rounded-t-3xl sheet-enter"
            style={{
              background:    'var(--bg2)',
              borderTop:     '1px solid var(--border2)',
              boxShadow:     '0 -16px 60px rgba(0,0,0,0.5)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--bg5)' }} />
            </div>

            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <h2 className="font-syne font-700 text-base" style={{ color: 'var(--text)' }}>
                Settings
              </h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* Theme toggle */}
              <div
                className="flex items-center justify-between px-4 py-3.5 rounded-xl"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  {theme === 'dark'
                    ? <Moon size={16} style={{ color: 'var(--text3)' }} />
                    : <Sun  size={16} style={{ color: 'var(--amber)' }} />
                  }
                  <span className="font-syne text-sm font-500" style={{ color: 'var(--text)' }}>
                    {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                  </span>
                </div>
                <div
                  className="relative w-12 h-6 rounded-full cursor-pointer transition-colors duration-300 flex-shrink-0"
                  style={{ background: theme === 'light' ? 'var(--amber)' : 'var(--bg5)' }}
                  onClick={toggle}
                >
                  <div
                    className="absolute top-1 w-4 h-4 rounded-full transition-all duration-300"
                    style={{
                      background: '#fff',
                      left: theme === 'light' ? '28px' : '4px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}
                  />
                </div>
              </div>

              {/* Notification toggle */}
              <NotificationToggle />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-150"
                style={{
                  background: logoutConfirm ? 'var(--rose-dim)' : 'var(--bg3)',
                  border: `1px solid ${logoutConfirm ? 'var(--rose)' : 'var(--border)'}`,
                }}
              >
                <LogOut
                  size={16}
                  style={{ color: logoutConfirm ? 'var(--rose)' : 'var(--text3)' }}
                />
                <span
                  className="font-syne text-sm font-500"
                  style={{ color: logoutConfirm ? 'var(--rose)' : 'var(--text)' }}
                >
                  {logoutConfirm ? 'Tap again to confirm' : 'Log out'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
