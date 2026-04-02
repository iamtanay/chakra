'use client'

import React from 'react'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { generateReportData, driftLabel } from '@/lib/insights'
import { AppShell } from '@/components/layout/AppShell'
import { KarmaWidget } from '@/components/karma/KarmaWidget'
import { PageTopBar } from '@/components/layout/PageTopBar'
import { PillToggle } from '@/components/ui/PillToggle'
import Link from 'next/link'
import type { Task, Project } from '@/types'
import {
  LayoutDashboard,
  Star,
  FolderKanban,
  ArrowRight,
  Flame,
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
} from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => (createClient() as any).from(table)

function getGreeting(name: string): { greeting: string; sub: string } {
  const hour = new Date().getHours()
  const firstName = name.split(' ')[0]
  if (hour < 5)  return { greeting: `Still up, ${firstName}?`,      sub: 'Late nights build great things.' }
  if (hour < 12) return { greeting: `Good morning, ${firstName}.`,   sub: 'Let\'s make today count.' }
  if (hour < 17) return { greeting: `Good afternoon, ${firstName}.`, sub: 'You\'re in the thick of it.' }
  if (hour < 21) return { greeting: `Good evening, ${firstName}.`,   sub: 'How did the day go?' }
  return               { greeting: `Evening, ${firstName}.`,         sub: 'Wind down or push through?' }
}

export default function HomePage() {
  const supabase = createClient()
  const [projects,      setProjects]      = useState<Project[]>([])
  const [tasks,         setTasks]         = useState<Task[]>([])
  const [loading,       setLoading]       = useState(true)
  const [timeRange,     setTimeRange]     = useState<'week' | 'month' | 'year'>('week')
  const [displayName,   setDisplayName]   = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [logoSpin,      setLogoSpin]      = useState<'once' | 'fast' | 'loop' | null>('once')

  useEffect(() => {
    const t = setTimeout(() => setLogoSpin(null), 600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)
      setDisplayName(user?.user_metadata?.display_name ?? user?.email?.split('@')[0] ?? 'there')

      const [{ data: pd }, { data: td }] = await Promise.all([
        db('projects').select('*'),
        db('tasks').select('*'),
      ])
      setProjects((pd || []) as Project[])
      setTasks((td || []) as Task[])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const report = useMemo(
    () => generateReportData(tasks, projects, timeRange, currentUserId),
    [tasks, projects, timeRange, currentUserId]
  )

  // ── Today's pulse ──────────────────────────────────────────────────────────
  const todayPulse = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const myDoneToday = tasks.filter((t) => {
      if (!t.completed_at || !t.completed_by) return false
      if (currentUserId && t.completed_by !== currentUserId) return false
      const d = new Date(t.completed_at); d.setHours(0, 0, 0, 0)
      return d.getTime() === today.getTime()
    })
    const hours = myDoneToday.reduce((s, t) => s + (t.actual_hours ?? t.estimated_hours ?? 0), 0)
    const dueTodayCount = tasks.filter((t) => {
      if (t.status === 'Done') return false
      if (!t.due_date) return false
      return t.due_date.slice(0, 10) === today.toISOString().slice(0, 10)
    }).length
    return { done: myDoneToday.length, hours: Math.round(hours * 100) / 100, dueToday: dueTodayCount }
  }, [tasks, currentUserId])

  // ── My longest streak across all projects ─────────────────────────────────
  const topStreak = useMemo(() => {
    return tasks.reduce((max, t) => Math.max(max, t.current_streak ?? 0), 0)
  }, [tasks])

  const { greeting, sub } = getGreeting(displayName)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <span className="font-syne text-sm animate-pulse" style={{ color: 'var(--text3)' }}>Loading…</span>
      </div>
    )
  }

  const statCards = [
    { label: 'Tasks done',   value: report.tasksCompleted,   color: 'var(--teal)',   dim: 'var(--teal-dim)'   },
    { label: 'Hours logged', value: `${report.totalHours}h`, color: 'var(--amber)',  dim: 'var(--amber-dim)'  },
    { label: 'Projects',     value: report.projectsActive,   color: 'var(--violet)', dim: 'var(--violet-dim)' },
    { label: 'Categories',   value: report.categoriesUsed,   color: 'var(--rose)',   dim: 'var(--rose-dim)'   },
  ]

  const quickLinks = [
    {
      href:  '/board',
      label: 'Open Board',
      sub:   'Kanban view of all your tasks',
      Icon:  LayoutDashboard,
      color: 'var(--amber)',
      dim:   'var(--amber-dim)',
    },
    {
      href:  '/today',
      label: 'Today',
      sub:   'Tasks due or starred for today',
      Icon:  Star,
      color: 'var(--teal)',
      dim:   'var(--teal-dim)',
    },
    {
      href:  '/projects',
      label: 'Projects',
      sub:   'Manage your projects',
      Icon:  FolderKanban,
      color: 'var(--violet)',
      dim:   'var(--violet-dim)',
    },
  ]

  return (
    <AppShell projects={projects} selectedProjectId={null} onProjectSelect={() => {}}>
      {/* ── Unified top bar ── */}
      <PageTopBar
        title="Home"
        logoSpin={logoSpin}
        actions={
          <PillToggle
            options={['week', 'month', 'year'] as const}
            value={timeRange}
            onChange={setTimeRange}
          />
        }
      />

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-auto p-5 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* ── Greeting + Today pulse ── */}
          <div
            className="rounded-2xl p-6 md:p-8 relative overflow-hidden"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
          >
            {/* Ambient glow */}
            <div
              className="absolute top-0 right-0 pointer-events-none"
              style={{
                width: '320px', height: '220px',
                background: 'radial-gradient(circle at top right, rgba(232,162,71,0.07) 0%, transparent 65%)',
              }}
            />
            <div className="relative">
              <p
                className="font-mono text-xs uppercase tracking-widest mb-2"
                style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
              >
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h2 className="font-syne font-800 text-2xl md:text-3xl mb-1" style={{ color: 'var(--text)' }}>
                {greeting}
              </h2>
              <p className="font-syne text-sm mb-6" style={{ color: 'var(--text3)' }}>{sub}</p>

              {/* Today's pulse strip */}
              <div className="flex flex-wrap gap-3">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'var(--teal-dim)', border: '1px solid rgba(45,212,191,0.15)' }}
                >
                  <CheckCircle2 size={13} style={{ color: 'var(--teal)' }} />
                  <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
                    <span style={{ color: 'var(--teal)', fontWeight: 600 }}>{todayPulse.done}</span> done today
                  </span>
                </div>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'var(--amber-dim)', border: '1px solid rgba(232,162,71,0.15)' }}
                >
                  <Clock size={13} style={{ color: 'var(--amber)' }} />
                  <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
                    <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{todayPulse.hours}h</span> logged
                  </span>
                </div>
                {topStreak > 0 && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}
                  >
                    <Flame size={13} style={{ color: 'var(--rose)' }} />
                    <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
                      <span style={{ color: 'var(--rose)', fontWeight: 600 }}>{topStreak}</span>-day streak
                    </span>
                  </div>
                )}
                {todayPulse.dueToday > 0 && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'var(--violet-dim)', border: '1px solid rgba(167,139,250,0.15)' }}
                  >
                    <Zap size={13} style={{ color: 'var(--violet)' }} />
                    <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
                      <span style={{ color: 'var(--violet)', fontWeight: 600 }}>{todayPulse.dueToday}</span> due today
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Karma widget ── */}
          {currentUserId && (
            <KarmaWidget userId={currentUserId} compact={true} />
          )}

          {/* ── Quick links ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {quickLinks.map(({ href, label, sub, Icon, color, dim }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-150 card-lift"
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', textDecoration: 'none' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150"
                  style={{ background: dim, border: `1px solid ${color}22` }}
                >
                  <Icon size={16} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-syne text-sm font-600" style={{ color: 'var(--text)' }}>{label}</p>
                  <p className="font-mono text-xs truncate" style={{ color: 'var(--text3)', fontSize: 10 }}>{sub}</p>
                </div>
                <ArrowRight
                  size={14}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 -translate-x-1 group-hover:translate-x-0"
                  style={{ color: 'var(--text3)', transition: 'opacity 150ms ease, transform 150ms ease' }}
                />
              </Link>
            ))}
          </div>

          {/* ── Projects strip ── */}
          {projects.length > 0 && (
            <div
              className="rounded-2xl p-6"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="font-mono text-xs uppercase tracking-widest"
                  style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
                >
                  Your Projects
                </h2>
                <Link
                  href="/projects"
                  className="font-mono text-xs transition-colors duration-150"
                  style={{ color: 'var(--text3)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--amber)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text3)')}
                >
                  Manage →
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {projects.map((project) => {
                  const projectTasks = tasks.filter((t) => t.project_id === project.id)
                  const doneTasks    = projectTasks.filter((t) => t.status === 'Done').length
                  const totalTasks   = projectTasks.length
                  const pct          = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
                  return (
                    <Link
                      key={project.id}
                      href={`/board?project=${project.id}`}
                      className="group flex flex-col gap-2 px-4 py-3 rounded-xl transition-all duration-150"
                      style={{
                        background:   'var(--bg3)',
                        border:       '1px solid var(--border)',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = project.color + '55')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: project.color, boxShadow: `0 0 6px ${project.color}` }}
                        />
                        <span className="font-syne text-xs font-600 truncate" style={{ color: 'var(--text)' }}>
                          {project.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs" style={{ color: 'var(--text3)', fontSize: 10 }}>
                          {doneTasks}/{totalTasks} done
                        </span>
                        <span className="font-mono text-xs font-600" style={{ color: project.color, fontSize: 10 }}>
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg5)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: project.color }}
                        />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Stats ── */}
          {report.tasksCompleted === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 rounded-2xl"
              style={{ border: '1.5px dashed var(--border2)' }}
            >
              <TrendingUp size={28} style={{ color: 'var(--text3)', marginBottom: 12 }} />
              <p className="font-syne text-sm" style={{ color: 'var(--text3)' }}>
                No completed tasks in this period.
              </p>
              <p className="font-mono text-xs mt-1" style={{ color: 'var(--text3)', opacity: 0.6 }}>
                Complete tasks to see your telemetry here.
              </p>
              <Link
                href="/board"
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl font-syne text-sm font-600 transition-all duration-150"
                style={{ background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid rgba(232,162,71,0.2)' }}
              >
                <LayoutDashboard size={14} /> Go to Board
              </Link>
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl p-5 card-lift"
                    style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                  >
                    <p className="font-mono text-xs mb-2" style={{ color: 'var(--text3)' }}>{s.label}</p>
                    <p className="font-syne font-800 text-3xl" style={{ color: s.color, lineHeight: 1 }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* By Space */}
              {report.byProject.length > 0 && (
                <div
                  className="rounded-2xl p-6"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                >
                  <h2
                    className="font-mono text-xs uppercase tracking-widest mb-5"
                    style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
                  >
                    By Space
                  </h2>
                  <div className="space-y-4">
                    {report.byProject.map((p) => {
                      const pct = report.totalHours > 0 ? (p.hours / report.totalHours) * 100 : 0
                      return (
                        <div key={p.projectId}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.projectColor }} />
                              <span className="font-syne text-sm" style={{ color: 'var(--text)' }}>{p.projectName}</span>
                              <span
                                className="font-mono text-xs px-2 py-0.5 rounded"
                                style={{ background: 'var(--bg4)', color: 'var(--text3)' }}
                              >
                                {p.projectType}
                              </span>
                            </div>
                            <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
                              {p.count} tasks · {p.hours}h
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg5)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width:     `${pct}%`,
                                background: p.projectColor,
                                boxShadow: `0 0 6px ${p.projectColor}50`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* By Category */}
              {report.byCategory.length > 0 && (
                <div
                  className="rounded-2xl p-6"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                >
                  <h2
                    className="font-mono text-xs uppercase tracking-widest mb-5"
                    style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
                  >
                    By Category
                  </h2>
                  <div className="space-y-4">
                    {report.byCategory.map((cat) => {
                      const pct = report.totalHours > 0 ? (cat.hours / report.totalHours) * 100 : 0
                      return (
                        <div key={cat.category}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-syne text-sm" style={{ color: 'var(--text)' }}>{cat.category}</span>
                            <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
                              {cat.count} · {cat.hours}h
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg5)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width:     `${pct}%`,
                                background: 'linear-gradient(90deg, var(--amber), var(--teal))',
                                boxShadow: '0 0 6px rgba(232,162,71,0.4)',
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Drift */}
              {report.driftByCategory.length > 0 && (
                <div
                  className="rounded-2xl p-6"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h2
                      className="font-mono text-xs uppercase tracking-widest"
                      style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
                    >
                      Drift
                    </h2>
                    <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>actual ÷ estimated</span>
                  </div>
                  <div className="space-y-4">
                    {report.driftByCategory.map((entry) => {
                      const isOver   = entry.ratio > 1.1
                      const isUnder  = entry.ratio < 0.9
                      const barColor = isOver ? 'var(--col-high)' : isUnder ? 'var(--teal)' : 'var(--text3)'
                      const barPct   = Math.min((entry.ratio / 2) * 100, 100)
                      return (
                        <div key={entry.category}>
                          <div className="flex items-start justify-between mb-2 gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-syne text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                                {driftLabel(entry)}
                              </p>
                              <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                                Based on {entry.sampleCount} completed task{entry.sampleCount === 1 ? '' : 's'}
                              </p>
                            </div>
                            <span className="font-mono text-sm font-600 flex-shrink-0" style={{ color: barColor }}>
                              {entry.ratio.toFixed(2)}×
                            </span>
                          </div>
                          <div className="relative w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg5)' }}>
                            <div className="absolute top-0 h-full w-px" style={{ left: '50%', background: 'var(--border2)' }} />
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${barPct}%`, background: barColor }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Insights */}
              {report.insights.length > 0 && (
                <div
                  className="rounded-2xl p-6"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                >
                  <h2
                    className="font-mono text-xs uppercase tracking-widest mb-4"
                    style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
                  >
                    Insights
                  </h2>
                  <div className="space-y-3">
                    {report.insights.map((insight, i) => (
                      <div key={`insight-${i}-${insight.slice(0, 20)}`} className="flex gap-3">
                        <span className="font-mono text-xs w-6 flex-shrink-0 pt-0.5" style={{ color: 'var(--amber)' }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <p className="font-syne text-sm leading-relaxed" style={{ color: 'var(--text2)' }}>{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed tasks table */}
              {report.completedTasks.length > 0 && (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                >
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h2
                      className="font-mono text-xs uppercase tracking-widest"
                      style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
                    >
                      Completed Tasks
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Title', 'Space', 'Category', 'Est.', 'Actual', 'Date'].map((h) => (
                            <th
                              key={h}
                              className="text-left py-3 px-4 font-mono text-xs"
                              style={{ color: 'var(--text3)', fontWeight: 400 }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.completedTasks.map((task) => {
                          const proj       = projects.find((p) => p.id === task.project_id)
                          const overBudget = task.actual_hours && task.estimated_hours && task.actual_hours > task.estimated_hours
                          return (
                            <React.Fragment key={task.id}>
                              <tr
                                className="transition-colors duration-100"
                                style={{ borderBottom: task.completion_note ? 'none' : '1px solid var(--border)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg3)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <td className="py-3 px-4 font-syne text-xs max-w-[180px] truncate" style={{ color: 'var(--text)' }}>
                                  {task.title}
                                </td>
                                <td className="py-3 px-4">
                                  {proj && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: proj.color }} />
                                      <span className="font-syne text-xs" style={{ color: 'var(--text2)' }}>{proj.name}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-mono text-xs" style={{ color: 'var(--text3)' }}>{task.category}</td>
                                <td className="py-3 px-4 font-mono text-xs" style={{ color: 'var(--text3)' }}>{task.estimated_hours ?? '—'}</td>
                                <td className="py-3 px-4 font-mono text-xs" style={{ color: overBudget ? 'var(--col-high)' : 'var(--teal)' }}>
                                  {task.actual_hours ?? '—'}
                                </td>
                                <td className="py-3 px-4 font-mono text-xs" style={{ color: 'var(--text3)' }}>
                                  {new Date(task.completed_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </td>
                              </tr>
                              {task.completion_note && (
                                <tr
                                  key={`${task.id}-note`}
                                  style={{ borderBottom: '1px solid var(--border)' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg3)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <td colSpan={6} className="px-4 pb-3">
                                    <p className="font-syne text-xs italic leading-relaxed" style={{ color: 'var(--text3)', paddingLeft: '2px' }}>
                                      &ldquo;{task.completion_note}&rdquo;
                                    </p>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
