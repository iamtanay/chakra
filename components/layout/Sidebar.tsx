'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'
import { LogOut, LayoutDashboard, FolderKanban, BarChart3, Sun, Moon } from 'lucide-react'
import type { Project } from '@/types'
import { useTheme } from '@/hooks/useTheme'

interface SidebarProps {
  projects: Project[]
  selectedProjectId: string | null
  onProjectSelect: (projectId: string | null) => void
}

const NAV_ITEMS = [
  { href: '/',         label: 'Board',    Icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', Icon: FolderKanban },
  { href: '/reports',  label: 'Reports',  Icon: BarChart3 },
]

export function Sidebar({ projects, selectedProjectId, onProjectSelect }: SidebarProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { theme, toggle } = useTheme()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
      {/* ── Logo ── */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: '1px solid var(--border)' }}
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
      </div>

      {/* ── Nav ── */}
      <nav className="px-3 pt-4 space-y-1">
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
                style={{ color: active ? 'var(--amber)' : 'var(--text3)', flexShrink: 0 }}
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

      {/* ── Projects ── */}
      {projects.length > 0 && (
        <div
          className="mt-5 mx-3 pt-4 flex-1 overflow-y-auto"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={() => onProjectSelect(null)}
            className="w-full text-left px-3 py-2 rounded-lg font-syne text-xs font-500 transition-all duration-150 mb-2"
            style={{
              color:      selectedProjectId === null ? 'var(--amber)' : 'var(--text3)',
              background: selectedProjectId === null ? 'var(--amber-dim)' : 'transparent',
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
                {list.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onProjectSelect(project.id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 flex items-center gap-2.5 group"
                    style={{
                      color:      selectedProjectId === project.id ? 'var(--text)' : 'var(--text2)',
                      background: selectedProjectId === project.id ? 'var(--bg4)' : 'transparent',
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 transition-all duration-150"
                      style={{
                        backgroundColor: project.color,
                        boxShadow: selectedProjectId === project.id
                          ? `0 0 6px ${project.color}`
                          : 'none',
                      }}
                    />
                    <span className="truncate font-syne text-xs font-500">{project.name}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Theme toggle + Logout ── */}
      <div className="px-3 pt-3 pb-5 mt-auto flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group mb-1"
          style={{ color: 'var(--text3)' }}
        >
          <div className="relative w-8 h-4 rounded-full flex-shrink-0 transition-colors duration-300"
            style={{ background: theme === 'dark' ? 'var(--bg5)' : 'var(--amber)' }}
          >
            <div
              className="absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300"
              style={{
                background: theme === 'dark' ? 'var(--text3)' : '#fff',
                left: theme === 'dark' ? '2px' : '18px',
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
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group"
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
