'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'
import { LogOut, LayoutDashboard, FolderKanban, BarChart3, Star, Sun, Moon, SunMoon, Pencil, Check, X, ChevronUp } from 'lucide-react'
import type { Project } from '@/types'
import { useTheme } from '@/hooks/useTheme'
import { useView } from '@/lib/viewContext'
import { useState, useEffect, useRef } from 'react'

interface SidebarProps {
  projects: Project[]
  selectedProjectId: string | null
  onProjectSelect: (projectId: string | null) => void
}

const NAV_ITEMS = [
  { href: '/home',   label: 'Home',  Icon: BarChart3       },
  { href: '/canvas',   label: 'Canvas',  Icon: LayoutDashboard },
  { href: '/today',  label: 'Today', Icon: Star            },
  { href: '/spaces', label: 'Spaces', Icon: FolderKanban   },
]


export function Sidebar({ projects, selectedProjectId, onProjectSelect }: SidebarProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { mode, resolvedTheme, setMode } = useTheme()
  const { setView } = useView()
  const [displayName,    setDisplayName]    = useState<string>('')
  const [email,          setEmail]          = useState<string>('')
  const [editingName,    setEditingName]    = useState(false)
  const [nameInput,      setNameInput]      = useState('')
  const [savingName,     setSavingName]     = useState(false)
  const [userMenuOpen,   setUserMenuOpen]   = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      setDisplayName(user.user_metadata?.display_name ?? '')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!userMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  const handleLogout = async () => {
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

  const handleProjectClick = (projectId: string | null) => {
    if (projectId === null) {
      router.push('/canvas')
    } else {
      // Clicking a project in sidebar always opens kanban view
      setView('kanban')
      router.push(`/canvas?project=${projectId}`)
    }
    onProjectSelect(projectId)
  }

  const isOnViews = pathname === '/canvas'

  const groupedProjects = {
    Work:     projects.filter((p) => p.type === 'Work'),
    Study:    projects.filter((p) => p.type === 'Study'),
    Personal: projects.filter((p) => p.type === 'Personal'),
  }

  return (
    <aside
      className="hidden md:flex flex-col fixed left-0 top-0 z-40"
      style={{
        width: 'var(--sidebar-w)',
        height: '100dvh',
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <Link
        href="/home"
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: '1px solid var(--border)', textDecoration: 'none' }}
      >
        <Logo size={26} />
        <span
          className="font-cinzel font-600 text-sm tracking-[0.22em] uppercase"
          style={{
            background: 'linear-gradient(135deg, var(--logo-from) 0%, var(--logo-mid) 60%, var(--logo-to) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Chakra
        </span>
      </Link>

      {/* Nav */}
      <nav className="px-3 pt-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative"
              style={{
                background:  active ? 'var(--bg4)'    : 'transparent',
                color:       active ? 'var(--text)'   : 'var(--text3)',
                borderLeft:  active ? '2px solid var(--amber)' : '2px solid transparent',
              }}
            >
              {active && (
                <div
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{ background: 'var(--amber-dim)', borderRadius: '8px' }}
                />
              )}
              <Icon
                size={16}
                style={{
                  color: active ? 'var(--amber)' : 'var(--text3)',
                  flexShrink: 0,
                  fill: (href === '/today' && active) ? 'var(--amber)' : 'none',
                }}
                className="transition-colors duration-150 group-hover:text-[var(--text2)]"
              />
              <span
                className="font-syne font-600 text-sm tracking-wide"
                style={{ color: active ? 'var(--text)' : undefined }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Spaces */}
      {projects.length > 0 && (
        <div
          className="mt-3 mx-3 pt-3 flex-1 overflow-y-auto"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={() => handleProjectClick(null)}
            className="w-full text-left px-3 py-2 rounded-lg font-syne text-xs font-500 transition-all duration-150 mb-2"
            style={{
              color:      (isOnViews && selectedProjectId === null) ? 'var(--amber)' : 'var(--text3)',
              background: (isOnViews && selectedProjectId === null) ? 'var(--amber-dim)' : 'transparent',
              letterSpacing: '0.05em',
            }}
          >
            ALL SPACES
          </button>

          {Object.entries(groupedProjects).map(([type, list]) => {
            if (list.length === 0) return null
            return (
              <div key={type} className="mb-4">
                <div
                  className="px-3 py-1.5 font-mono text-xs tracking-widest uppercase"
                  style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
                >
                  {type}
                </div>
                {list.map((project) => {
                  const isActive = isOnViews && selectedProjectId === project.id
                  return (
                    <button
                      key={project.id}
                      onClick={() => handleProjectClick(project.id)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 flex items-center gap-2.5 group"
                      style={{
                        color:      isActive ? 'var(--text)' : 'var(--text2)',
                        background: isActive ? 'var(--bg4)' : 'transparent',
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0 transition-all duration-150"
                        style={{
                          backgroundColor: project.color,
                          boxShadow: isActive
                            ? `0 0 6px ${project.color}`
                            : 'none',
                        }}
                      />
                      <span className="truncate font-syne text-xs font-500">{project.name}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom section */}
      <div className="px-3 pt-2 pb-3 mt-auto flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <div ref={userMenuRef} className="relative">

          {userMenuOpen && (
            <div
              className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl overflow-hidden"
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border2)',
                boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                {editingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={handleNameKeyDown}
                      autoFocus
                      maxLength={40}
                      className="flex-1 min-w-0 font-syne text-xs outline-none px-2 py-1.5 rounded-lg"
                      style={{ background: 'var(--bg4)', border: '1px solid var(--amber)', color: 'var(--text)' }}
                    />
                    <button onClick={saveName} disabled={savingName}
                      className="w-6 h-6 flex items-center justify-center rounded-lg flex-shrink-0"
                      style={{ color: 'var(--teal)', background: 'var(--bg4)' }}>
                      <Check size={11} strokeWidth={2.5} />
                    </button>
                    <button onClick={cancelEdit}
                      className="w-6 h-6 flex items-center justify-center rounded-lg flex-shrink-0"
                      style={{ color: 'var(--text3)', background: 'var(--bg4)' }}>
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group/name">
                    <div className="flex-1 min-w-0">
                      {displayName && (
                        <p className="font-syne text-xs font-600 truncate" style={{ color: 'var(--text2)' }}>{displayName}</p>
                      )}
                      <p className="font-mono truncate" style={{ color: 'var(--text3)', fontSize: 10 }}>{email}</p>
                    </div>
                    <button onClick={startEdit}
                      className="flex-shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity duration-150 p-1 rounded-lg"
                      style={{ color: 'var(--text3)', background: 'var(--bg4)' }}
                      title="Edit display name">
                      <Pencil size={10} />
                    </button>
                  </div>
                )}
              </div>

              <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <p className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--text3)' }}>Theme</p>
                <div className="flex rounded-xl overflow-hidden" style={{ background: 'var(--bg4)', border: '1px solid var(--border)', gap: '1px' }}>
                  {([
                    { value: 'dark',     Icon: Moon,    label: 'Dark'  },
                    { value: 'adaptive', Icon: SunMoon, label: 'Auto'  },
                    { value: 'light',    Icon: Sun,     label: 'Light' },
                  ] as const).map(({ value, Icon, label }) => {
                    const active = mode === value
                    return (
                      <button key={value} onClick={() => setMode(value)}
                        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-200"
                        style={{
                          background: active ? 'var(--bg6, var(--bg5))' : 'transparent',
                          color: active ? 'var(--amber)' : 'var(--text3)',
                          borderRadius: '8px',
                        }}
                        title={label}>
                        <Icon size={12} />
                        <span className="font-syne text-[9px] font-500 tracking-wide">{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 group/logout"
                style={{ color: 'var(--text3)' }}>
                <LogOut size={14} className="group-hover/logout:text-[var(--rose)] transition-colors duration-150" />
                <span className="font-syne text-xs font-500 tracking-wide group-hover/logout:text-[var(--rose)] transition-colors duration-150">
                  Log out
                </span>
              </button>
            </div>
          )}

          <button
            onClick={() => setUserMenuOpen((p) => !p)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150"
            style={{
              background: userMenuOpen ? 'var(--bg4)' : 'transparent',
              border: userMenuOpen ? '1px solid var(--border)' : '1px solid transparent',
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-syne font-700 text-xs"
              style={{ background: 'var(--bg5)', color: 'var(--amber)', border: '1px solid var(--border)' }}
            >
              {avatarChar}
            </div>
            <span className="flex-1 min-w-0 font-syne text-xs font-600 truncate text-left" style={{ color: 'var(--text2)' }}>
              {displayName || email}
            </span>
            <ChevronUp
              size={12}
              style={{
                color: 'var(--text3)',
                flexShrink: 0,
                transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>
        </div>
      </div>
    </aside>
  )
}
