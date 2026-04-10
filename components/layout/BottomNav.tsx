'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Orbit, Home, Star, ChevronsUp,
  Sun, Moon, SunMoon, LogOut, X, Pencil, Check,
  List, CalendarDays, Waves,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useView, type ViewMode } from '@/lib/viewContext'
import { NotificationToggle } from '@/components/ui/NotificationToggle'

// ── Bottom nav: Home · Canvas · Today · Streams · More ───────────────────
// More sheet contains: Spaces, theme, notifications, logout.

const NAV_ITEMS = [
  { href: '/home',    label: 'Home',    Icon: Home,            tourId: 'nav-home'    },
  { href: '/canvas',  label: 'Canvas',  Icon: LayoutDashboard, tourId: 'nav-canvas'  },
  { href: '/today',   label: 'Today',   Icon: Star,            tourId: 'nav-today'   },
  { href: '/streams', label: 'Streams', Icon: Waves,           tourId: 'nav-streams' },
]

const VIEW_OPTIONS: { value: ViewMode; label: string; Icon: React.ElementType; desc: string }[] = [
  { value: 'kanban',   label: 'Board',    Icon: LayoutDashboard, desc: 'Kanban columns by status' },
  { value: 'list',     label: 'List',     Icon: List,            desc: 'All tasks grouped by space' },
  { value: 'calendar', label: 'Calendar', Icon: CalendarDays,    desc: 'Tasks by due date' },
]

export function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const { mode, setMode } = useTheme()
  const { view, setView } = useView()

  const [moreOpen,      setMoreOpen]      = useState(false)
  const [viewsOpen,     setViewsOpen]     = useState(false)
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  const [displayName, setDisplayName] = useState<string>('')
  const [email,       setEmail]       = useState<string>('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput,   setNameInput]   = useState('')
  const [savingName,  setSavingName]  = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      setDisplayName(user.user_metadata?.display_name ?? '')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMoreOpen(false); setViewsOpen(false) }
    }
    if (moreOpen || viewsOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [moreOpen, viewsOpen])

  const handleLogout = async () => {
    if (!logoutConfirm) {
      setLogoutConfirm(true)
      setTimeout(() => setLogoutConfirm(false), 2500)
      return
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  const startEdit = () => { setNameInput(displayName); setEditingName(true) }
  const cancelEdit = () => { setEditingName(false); setNameInput('') }

  const saveName = async () => {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === displayName) { cancelEdit(); return }
    setSavingName(true)
    const { error } = await supabase.auth.updateUser({ data: { display_name: trimmed } })
    if (!error) setDisplayName(trimmed)
    setSavingName(false)
    setEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveName()
    if (e.key === 'Escape') cancelEdit()
  }

  const avatarChar = (displayName || email).charAt(0).toUpperCase()
  const isOnViews  = pathname === '/canvas'
  const isOnSpaces = pathname === '/spaces'
  const moreActive = moreOpen || isOnSpaces

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden z-50"
        style={{
          background:     'var(--bg2)',
          backdropFilter: 'blur(20px)',
          borderTop:      '1px solid var(--border)',
          paddingBottom:  'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center">
          {NAV_ITEMS.map(({ href, label, Icon, tourId }) => {
            const active = pathname === href || pathname.startsWith(href + '/')

            // Canvas tab: tapping opens views sheet
            if (href === '/canvas') {
              return (
                <button
                  key={href}
                  data-tour={tourId}
                  onClick={() => { setMoreOpen(false); setViewsOpen(true) }}
                  className="flex flex-col items-center justify-center gap-1.5 flex-1 py-3 transition-all duration-150 relative"
                  style={{ minHeight: 56 }}
                >
                  {(active || viewsOpen) && (
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                      style={{ background: 'var(--amber)' }}
                    />
                  )}
                  <Icon size={20} style={{ color: (active || viewsOpen) ? 'var(--amber)' : 'var(--text3)' }} />
                  <span
                    className="font-syne font-500 tracking-wide"
                    style={{ color: (active || viewsOpen) ? 'var(--text)' : 'var(--text3)', fontSize: '10px' }}
                  >
                    {label}
                  </span>
                </button>
              )
            }

            return (
              <Link
                key={href}
                href={href}
                data-tour={tourId}
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
                    fill:  (href === '/today' && active) ? 'var(--amber)' : 'none',
                  }}
                />
                <span
                  className="font-syne font-500 tracking-wide"
                  style={{ color: active ? 'var(--text)' : 'var(--text3)', fontSize: '10px' }}
                >
                  {label}
                </span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            data-tour="more-button"
            onClick={() => { setViewsOpen(false); setMoreOpen(true); setLogoutConfirm(false) }}
            className="flex flex-col items-center justify-center gap-1.5 flex-1 py-3 transition-all duration-150 relative"
            style={{ minHeight: 56 }}
          >
            {moreActive && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: 'var(--amber)' }}
              />
            )}
            <ChevronsUp
              size={20}
              style={{ color: moreActive ? 'var(--amber)' : 'var(--text3)' }}
            />
            <span
              className="font-syne font-500"
              style={{ color: moreActive ? 'var(--text)' : 'var(--text3)', fontSize: '10px' }}
            >
              More
            </span>
          </button>
        </div>
      </nav>

      {/* ── Views Picker Sheet ── */}
      {viewsOpen && (
        <div
          className="fixed inset-0 z-[60] md:hidden animate-fadeIn"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setViewsOpen(false) }}
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
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <p className="font-syne font-700 text-base" style={{ color: 'var(--text)' }}>Views</p>
                <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>Choose how to see your tasks</p>
              </div>
              <button
                onClick={() => setViewsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-2.5">
              {VIEW_OPTIONS.map(({ value, label, Icon, desc }) => {
                const active = view === value
                return (
                  <button
                    key={value}
                    onClick={() => { setView(value); router.push('/canvas'); setViewsOpen(false) }}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200"
                    style={{
                      background: active ? 'var(--amber-dim)' : 'var(--bg3)',
                      border: `1px solid ${active ? 'var(--amber)' : 'var(--border)'}`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: active ? 'var(--amber)' : 'var(--bg4)',
                        color: active ? '#0a0a0a' : 'var(--text3)',
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-syne font-700 text-sm" style={{ color: active ? 'var(--amber)' : 'var(--text)' }}>
                        {label}
                      </p>
                      <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>{desc}</p>
                    </div>
                    {active && (
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: 'var(--amber)', boxShadow: '0 0 6px var(--amber)' }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── More Sheet (Settings + Spaces) ── */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-[60] md:hidden animate-fadeIn"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setMoreOpen(false) }}
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
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--bg5)' }} />
            </div>

            {/* User identity header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-syne font-700 text-base"
                  style={{ background: 'var(--bg4)', color: 'var(--amber)', border: '1px solid var(--border)' }}
                >
                  {avatarChar}
                </div>
                <div className="flex-1 min-w-0">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={handleNameKeyDown}
                        autoFocus
                        maxLength={40}
                        placeholder="Your name"
                        className="flex-1 min-w-0 font-syne text-sm outline-none px-2 py-1 rounded-lg"
                        style={{ background: 'var(--bg4)', border: '1px solid var(--amber)', color: 'var(--text)' }}
                      />
                      <button onClick={saveName} disabled={savingName}
                        className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{ background: 'var(--bg4)', color: 'var(--teal)' }}>
                        <Check size={14} strokeWidth={2.5} />
                      </button>
                      <button onClick={cancelEdit}
                        className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{ background: 'var(--bg4)', color: 'var(--text3)' }}>
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        {displayName ? (
                          <>
                            <p className="font-syne font-700 text-sm truncate" style={{ color: 'var(--text)' }}>{displayName}</p>
                            <p className="font-mono text-xs truncate" style={{ color: 'var(--text3)' }}>{email}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-mono text-xs truncate" style={{ color: 'var(--text2)' }}>{email}</p>
                            <p className="font-mono text-xs" style={{ color: 'var(--text3)', opacity: 0.7 }}>Tap to add a display name</p>
                          </>
                        )}
                      </div>
                      <button onClick={startEdit}
                        className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{ background: 'var(--bg4)', color: 'var(--text3)' }}>
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {!editingName && (
                <button
                  onClick={() => setMoreOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center ml-3 flex-shrink-0"
                  style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="p-5 space-y-3">

              {/* Spaces link */}
              <Link
                href="/spaces"
                data-tour="nav-spaces"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-150"
                style={{
                  background: isOnSpaces ? 'var(--amber-dim)' : 'var(--bg3)',
                  border: `1px solid ${isOnSpaces ? 'var(--amber)' : 'var(--border)'}`,
                  textDecoration: 'none',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isOnSpaces ? 'var(--amber)' : 'var(--bg4)',
                    color:      isOnSpaces ? '#0a0a0a'      : 'var(--text3)',
                  }}
                >
                  <Orbit size={17} />
                </div>
                <div>
                  <p className="font-syne font-700 text-sm" style={{ color: isOnSpaces ? 'var(--amber)' : 'var(--text)' }}>
                    Spaces
                  </p>
                  <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>Manage projects and tasks</p>
                </div>
              </Link>

              {/* Theme selector */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
              >
                <p className="font-syne text-xs font-500 px-4 pt-3 pb-2" style={{ color: 'var(--text3)' }}>
                  Theme
                </p>
                <div className="flex mx-3 mb-3 rounded-lg overflow-hidden" style={{ background: 'var(--bg4)', gap: '1px' }}>
                  {([
                    { value: 'dark',     Icon: Moon,    label: 'Dark'  },
                    { value: 'adaptive', Icon: SunMoon, label: 'Auto'  },
                    { value: 'light',    Icon: Sun,     label: 'Light' },
                  ] as const).map(({ value, Icon, label }) => {
                    const active = mode === value
                    return (
                      <button key={value} onClick={() => setMode(value)}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all duration-200"
                        style={{
                          background:   active ? 'var(--bg6, var(--bg2))' : 'transparent',
                          color:        active ? 'var(--amber)' : 'var(--text3)',
                          borderRadius: '6px',
                        }}
                      >
                        <Icon size={15} />
                        <span className="font-syne text-xs font-500">{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Notification toggle */}
              <div data-tour="notif-toggle">
                <NotificationToggle />
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-150"
                style={{
                  background: logoutConfirm ? 'var(--rose-dim)' : 'var(--bg3)',
                  border: `1px solid ${logoutConfirm ? 'var(--rose)' : 'var(--border)'}`,
                }}
              >
                <LogOut size={16} style={{ color: logoutConfirm ? 'var(--rose)' : 'var(--text3)' }} />
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