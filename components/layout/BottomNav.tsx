'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FolderKanban, BarChart3, Star, Settings, Sun, Moon, SunMoon, LogOut, X, Pencil, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { NotificationToggle } from '@/components/ui/NotificationToggle'

const NAV_ITEMS = [
  { href: '/home',     label: 'Home',     Icon: BarChart3       },
  { href: '/board',    label: 'Board',    Icon: LayoutDashboard },
  { href: '/today',    label: 'Today',    Icon: Star            },
  { href: '/spaces', label: 'Spaces', Icon: FolderKanban   },
]

export function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const { mode, resolvedTheme, setMode } = useTheme()

  const [settingsOpen,  setSettingsOpen]  = useState(false)
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

  const startEdit = () => {
    setNameInput(displayName)
    setEditingName(true)
  }

  const cancelEdit = () => {
    setEditingName(false)
    setNameInput('')
  }

  const saveName = async () => {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === displayName) { cancelEdit(); return }
    setSavingName(true)
    const { error } = await supabase.auth.updateUser({
      data: { display_name: trimmed },
    })
    if (!error) setDisplayName(trimmed)
    setSavingName(false)
    setEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveName()
    if (e.key === 'Escape') cancelEdit()
  }

  const avatarChar = (displayName || email).charAt(0).toUpperCase()

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
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--bg5)' }} />
            </div>

            {/* ── User identity header ── */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-syne font-700 text-base"
                  style={{
                    background: 'var(--bg4)',
                    color:      'var(--amber)',
                    border:     '1px solid var(--border)',
                  }}
                >
                  {avatarChar}
                </div>

                {/* Name + email */}
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
                        style={{
                          background: 'var(--bg4)',
                          border:     '1px solid var(--amber)',
                          color:      'var(--text)',
                        }}
                      />
                      <button
                        onClick={saveName}
                        disabled={savingName}
                        className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{ background: 'var(--bg4)', color: 'var(--teal)' }}
                      >
                        <Check size={14} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{ background: 'var(--bg4)', color: 'var(--text3)' }}
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        {displayName ? (
                          <>
                            <p className="font-syne font-700 text-sm truncate" style={{ color: 'var(--text)' }}>
                              {displayName}
                            </p>
                            <p className="font-mono text-xs truncate" style={{ color: 'var(--text3)' }}>
                              {email}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-mono text-xs truncate" style={{ color: 'var(--text2)' }}>
                              {email}
                            </p>
                            <p className="font-mono text-xs" style={{ color: 'var(--text3)', opacity: 0.7 }}>
                              Tap to add a display name
                            </p>
                          </>
                        )}
                      </div>
                      <button
                        onClick={startEdit}
                        className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-all duration-150"
                        style={{ background: 'var(--bg4)', color: 'var(--text3)' }}
                        title="Edit display name"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Close button */}
              {!editingName && (
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center ml-3 flex-shrink-0"
                  style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="p-5 space-y-3">
              {/* Theme selector — 3-segment pill */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
              >
                <p className="font-syne text-xs font-500 px-4 pt-3 pb-2" style={{ color: 'var(--text3)' }}>
                  Theme
                </p>
                <div
                  className="flex mx-3 mb-3 rounded-lg overflow-hidden"
                  style={{ background: 'var(--bg4)', gap: '1px' }}
                >
                  {([
                    { value: 'dark',     Icon: Moon,    label: 'Dark'  },
                    { value: 'adaptive', Icon: SunMoon, label: 'Auto'  },
                    { value: 'light',    Icon: Sun,     label: 'Light' },
                  ] as const).map(({ value, Icon, label }) => {
                    const active = mode === value
                    return (
                      <button
                        key={value}
                        onClick={() => setMode(value)}
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
