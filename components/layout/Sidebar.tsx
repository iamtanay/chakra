'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'
import { LogOut, LayoutDashboard, FolderKanban, BarChart3, Star, Sun, Moon, Pencil, Check, X } from 'lucide-react'
import type { Project } from '@/types'
import { useTheme } from '@/hooks/useTheme'
import { useState, useEffect } from 'react'

interface SidebarProps {
  projects: Project[]
  selectedProjectId: string | null
  onProjectSelect: (projectId: string | null) => void
}

const NAV_ITEMS = [
  { href: '/home',     label: 'Home',     Icon: BarChart3       },
  { href: '/board',    label: 'Board',    Icon: LayoutDashboard },
  { href: '/today',    label: 'Today',    Icon: Star            },
  { href: '/projects', label: 'Projects', Icon: FolderKanban   },
]

export function Sidebar({ projects, selectedProjectId, onProjectSelect }: SidebarProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { theme, toggle } = useTheme()

  const [displayName,    setDisplayName]    = useState<string>('')
  const [email,          setEmail]          = useState<string>('')
  const [editingName,    setEditingName]    = useState(false)
  const [nameInput,      setNameInput]      = useState('')
  const [savingName,     setSavingName]     = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      setDisplayName(user.user_metadata?.display_name ?? '')
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Avatar initial — first letter of display name or email
  const avatarChar = (displayName || email).charAt(0).toUpperCase()

  /**
   * Clicking a project in the sidebar navigates to /board?project=<id>.
   * If already on /board, we also call onProjectSelect so the board
   * updates without a full navigation (URL change triggers the board via useSearchParams).
   */
  const handleProjectClick = (projectId: string | null) => {
    if (projectId === null) {
      router.push('/board')
    } else {
      router.push(`/board?project=${projectId}`)
    }
    onProjectSelect(projectId)
  }

  // Highlight a project row when on /board and it matches the URL
  const isOnBoard = pathname === '/board'

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
      {/* Logo — clicking always goes to /home */}
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

      {/* Projects */}
      {projects.length > 0 && (
        <div
          className="mt-3 mx-3 pt-3 flex-1 overflow-y-auto"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {/* "All Projects" shortcut — goes to /board with no filter */}
          <button
            onClick={() => handleProjectClick(null)}
            className="w-full text-left px-3 py-2 rounded-lg font-syne text-xs font-500 transition-all duration-150 mb-2"
            style={{
              color:      (isOnBoard && selectedProjectId === null) ? 'var(--amber)' : 'var(--text3)',
              background: (isOnBoard && selectedProjectId === null) ? 'var(--amber-dim)' : 'transparent',
              letterSpacing: '0.05em',
            }}
          >
            ALL PROJECTS
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
                  const isActive = isOnBoard && selectedProjectId === project.id
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

        {/* ── User identity ── */}
        <div
          className="flex items-center gap-2.5 px-3 py-1.5 mb-1 rounded-lg group"
          style={{ minHeight: 36 }}
        >
          {/* Avatar */}
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-syne font-700 text-xs"
            style={{
              background: 'var(--bg5)',
              color:      'var(--amber)',
              border:     '1px solid var(--border)',
            }}
          >
            {avatarChar}
          </div>

          {/* Name / email + edit */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1">
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  autoFocus
                  maxLength={40}
                  className="flex-1 min-w-0 font-syne text-xs outline-none px-1.5 py-0.5 rounded-md"
                  style={{
                    background:  'var(--bg4)',
                    border:      '1px solid var(--amber)',
                    color:       'var(--text)',
                    width:       '100%',
                  }}
                />
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="w-5 h-5 flex items-center justify-center rounded flex-shrink-0"
                  style={{ color: 'var(--teal)' }}
                >
                  <Check size={11} strokeWidth={2.5} />
                </button>
                <button
                  onClick={cancelEdit}
                  className="w-5 h-5 flex items-center justify-center rounded flex-shrink-0"
                  style={{ color: 'var(--text3)' }}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="min-w-0">
                  {displayName ? (
                    <p className="font-syne text-xs font-600 truncate" style={{ color: 'var(--text2)' }}>
                      {displayName}
                    </p>
                  ) : (
                    <p className="font-mono text-xs truncate" style={{ color: 'var(--text3)' }}>
                      {email}
                    </p>
                  )}
                  {displayName && (
                    <p className="font-mono text-xs truncate leading-tight" style={{ color: 'var(--text3)', fontSize: 10 }}>
                      {email}
                    </p>
                  )}
                </div>
                {/* Edit pencil — only visible on group hover */}
                <button
                  onClick={startEdit}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-0.5 rounded"
                  style={{ color: 'var(--text3)' }}
                  title="Edit display name"
                >
                  <Pencil size={10} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-150 group mb-0.5"
          style={{ color: 'var(--text3)' }}
        >
          <div className="relative w-7 h-3.5 rounded-full flex-shrink-0 transition-colors duration-300"
            style={{ background: theme === 'dark' ? 'var(--bg5)' : 'var(--amber)' }}
          >
            <div
              className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all duration-300"
              style={{
                background: theme === 'dark' ? 'var(--text3)' : '#fff',
                left: theme === 'dark' ? '2px' : '16px',
              }}
            />
          </div>
          <span className="font-syne text-xs font-500 tracking-wide flex items-center gap-1.5">
            {theme === 'dark'
              ? <><Moon size={11} style={{ color: 'var(--text3)' }} /> Dark</>
              : <><Sun  size={11} style={{ color: 'var(--amber)' }} /> Light</>
            }
          </span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-150 group"
          style={{ color: 'var(--text3)' }}
        >
          <LogOut
            size={15}
            className="group-hover:text-[var(--rose)] transition-colors duration-150"
          />
          <span className="font-syne text-xs font-500 tracking-wide group-hover:text-[var(--rose)] transition-colors duration-150">
            Log out
          </span>
        </button>
      </div>
    </aside>
  )
}
