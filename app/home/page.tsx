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
import type { Task, Project, TaskOccurrence } from '@/types'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Star,
  Orbit,
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
  const router = useRouter()
  const [projects,      setProjects]      = useState<Project[]>([])
  const [tasks,         setTasks]         = useState<Task[]>([])
  const [occurrences,   setOccurrences]   = useState<TaskOccurrence[]>([])
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
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUserId(user?.id ?? null)
        setDisplayName(user?.user_metadata?.display_name ?? user?.email?.split('@')[0] ?? 'there')

        const [{ data: pd }, { data: td }, { data: od }] = await Promise.all([
          db('projects').select('*'),
          db('tasks').select('*'),
          db('task_occurrences').select('*'),
        ])
        setProjects((pd || []) as Project[])
        setTasks((td || []) as Task[])
        setOccurrences((od || []) as TaskOccurrence[])
      } catch (err) {
        console.error('Home page load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const report = useMemo(
    () => generateReportData(tasks, projects, timeRange, currentUserId, occurrences),
    [tasks, projects, timeRange, currentUserId, occurrences]
  )

  // ── Today's pulse ──────────────────────────────────────────────────────────
  const todayPulse = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)

    // Non-recurring tasks completed today
    const myDoneToday = tasks.filter((t) => {
      if (!t.completed_at || !t.completed_by) return false
      if (t.is_recurring) return false  // recurring hours come from occurrences
      if (currentUserId && t.completed_by !== currentUserId) return false
      const d = new Date(t.completed_at); d.setHours(0, 0, 0, 0)
      return d.getTime() === today.getTime()
    })

    // Recurring cycles completed today (from task_occurrences)
    const myRecurringToday = occurrences.filter((o) => {
      if (currentUserId && o.completed_by && o.completed_by !== currentUserId) return false
      const d = new Date(o.completed_at); d.setHours(0, 0, 0, 0)
      return d.getTime() === today.getTime()
    })

    const nonRecurringHours = myDoneToday.reduce((s, t) => s + (t.actual_hours ?? t.estimated_hours ?? 0), 0)
    const recurringHours    = myRecurringToday.reduce((s, o) => s + (o.actual_hours ?? 0), 0)
    const hours = Math.round((nonRecurringHours + recurringHours) * 100) / 100
    const done  = myDoneToday.length + myRecurringToday.length

    const dueTodayCount = tasks.filter((t) => {
      if (t.status === 'Done') return false
      if (!t.due_date) return false
      return t.due_date.slice(0, 10) === today.toISOString().slice(0, 10)
    }).length
    return { done, hours, dueToday: dueTodayCount }
  }, [tasks, occurrences, currentUserId])

  // ── My longest streak across all projects ─────────────────────────────────
  const topStreak = useMemo(() => {
    return tasks.reduce((max, t) => Math.max(max, t.current_streak ?? 0), 0)
  }, [tasks])

  // ── Activity chart data — responds to timeRange ───────────────────────────
  const activityData = useMemo(() => {
    const now = new Date()
    const todayISO = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

    const taskCount = (iso: string) =>
      tasks.filter((t) => {
        if (!t.completed_at) return false
        if (currentUserId && t.completed_by !== currentUserId) return false
        return t.completed_at.slice(0, 10) === iso
      }).length

    if (timeRange === 'week') {
      const days: { label: string; shortLabel: string; date: string; count: number; isToday: boolean; isFuture: boolean }[] = []
      // Compute Monday of the current week (matches insights.ts week-start logic)
      const dayOfWeek = now.getDay() // 0=Sun..6=Sat
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(now)
      monday.setDate(now.getDate() + diffToMonday)
      monday.setHours(0, 0, 0, 0)
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
        const isToday = iso === todayISO
        const isFuture = d > now && !isToday
        days.push({
          label:      d.toLocaleDateString('en-US', { weekday: 'long' }),
          shortLabel: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
          date:    iso,
          count:   isFuture ? 0 : taskCount(iso),
          isToday,
          isFuture,
        })
      }
      return { type: 'week' as const, days }
    }

    if (timeRange === 'month') {
      const year  = now.getFullYear()
      const month = now.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      // firstDow: 0=Sun..6=Sat → we want Mon-start, so offset
      const firstDow = new Date(year, month, 1).getDay() // 0=Sun
      const startOffset = (firstDow + 6) % 7             // Mon=0..Sun=6
      const cells: { date: string; count: number; isToday: boolean; inMonth: boolean; day: number }[] = []
      // leading empty cells
      for (let i = 0; i < startOffset; i++) {
        cells.push({ date: '', count: 0, isToday: false, inMonth: false, day: 0 })
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        cells.push({ date: iso, count: taskCount(iso), isToday: iso === todayISO, inMonth: true, day: d })
      }
      // trailing cells to complete final row
      const remainder = cells.length % 7
      if (remainder > 0) {
        for (let i = 0; i < 7 - remainder; i++) {
          cells.push({ date: '', count: 0, isToday: false, inMonth: false, day: 0 })
        }
      }
      const monthName = now.toLocaleDateString('en-US', { month: 'long' })
      return { type: 'month' as const, cells, monthName, year }
    }

    // year
    const year = now.getFullYear()
    const currentMonth = now.getMonth()
    const months: { label: string; shortLabel: string; count: number; isCurrent: boolean; monthIdx: number }[] = []
    for (let m = 0; m < 12; m++) {
      const monthStart = `${year}-${String(m+1).padStart(2,'0')}-01`
      const daysInM = new Date(year, m + 1, 0).getDate()
      let count = 0
      for (let d = 1; d <= daysInM; d++) {
        const iso = `${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        count += taskCount(iso)
      }
      months.push({
        label:      new Date(year, m, 1).toLocaleDateString('en-US', { month: 'long' }),
        shortLabel: new Date(year, m, 1).toLocaleDateString('en-US', { month: 'short' }),
        count,
        isCurrent:  m === currentMonth,
        monthIdx:   m,
      })
    }
    return { type: 'year' as const, months, year }
  }, [tasks, currentUserId, timeRange])

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
    { label: 'Spaces',     value: report.projectsActive,   color: 'var(--violet)', dim: 'var(--violet-dim)' },
    { label: 'Categories',   value: report.categoriesUsed,   color: 'var(--rose)',   dim: 'var(--rose-dim)'   },
  ]

  const quickLinks = [
    {
      href:  '/canvas',
      label: 'Canvas',
      sub:   'Kanban, list & calendar views',
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
      href:  '/spaces',
      label: 'Spaces',
      sub:   'Manage your spaces',
      Icon:  Orbit,
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
                  <button
                    onClick={() => router.push('/today')}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-150"
                    style={{ background: 'var(--violet-dim)', border: '1px solid rgba(167,139,250,0.15)', cursor: 'pointer' }}
                  >
                    <Zap size={13} style={{ color: 'var(--violet)' }} />
                    <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
                      <span style={{ color: 'var(--violet)', fontWeight: 600 }}>{todayPulse.dueToday}</span> due today
                    </span>
                  </button>
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
                  Your Spaces
                </h2>
                <Link
                  href="/spaces"
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
                      href={`/canvas?project=${project.id}`}
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
                href="/canvas"
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl font-syne text-sm font-600 transition-all duration-150"
                style={{ background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid rgba(232,162,71,0.2)' }}
              >
                <LayoutDashboard size={14} /> Open Canvas
              </Link>
            </div>
          ) : (
            <>
              {/* ── Activity chart ── */}
              {(() => {
                // ── shared header values ──
                let total = 0
                let bestLabel = ''
                let bestCount = 0
                let periodLabel = ''

                if (activityData.type === 'week') {
                  total = activityData.days.reduce((s, d) => s + d.count, 0)
                  const best = activityData.days.reduce((b, d) => d.count > b.count ? d : b, activityData.days[0]!)
                  bestLabel = best.count > 0 ? best.label.slice(0, 3) : ''
                  bestCount = best.count
                  periodLabel = 'This Week'
                } else if (activityData.type === 'month') {
                  total = activityData.cells.filter(c => c.inMonth).reduce((s, c) => s + c.count, 0)
                  const best = activityData.cells.filter(c => c.inMonth).reduce((b, c) => c.count > b.count ? c : b, activityData.cells.find(c => c.inMonth)!)
                  bestLabel = best && best.count > 0 ? `${activityData.monthName.slice(0,3)} ${best.day}` : ''
                  bestCount = best ? best.count : 0
                  periodLabel = activityData.monthName
                } else {
                  total = activityData.months.reduce((s, m) => s + m.count, 0)
                  const best = activityData.months.reduce((b, m) => m.count > b.count ? m : b, activityData.months[0]!)
                  bestLabel = best.count > 0 ? best.shortLabel : ''
                  bestCount = best.count
                  periodLabel = String(activityData.year)
                }

                // ── amber intensity helper (relative within period) ──
                const maxInPeriod = (() => {
                  if (activityData.type === 'week') return Math.max(...activityData.days.map(d => d.count), 1)
                  if (activityData.type === 'month') return Math.max(...activityData.cells.filter(c => c.inMonth).map(c => c.count), 1)
                  return Math.max(...activityData.months.map(m => m.count), 1)
                })()

                const cellBg = (count: number, isHighlight: boolean, isEmpty: boolean) => {
                  if (isEmpty) return 'transparent'
                  if (count === 0) return 'var(--bg4)'
                  const intensity = count / maxInPeriod
                  if (isHighlight) {
                    // amber with full intensity glow
                    return `rgba(232,162,71,${0.25 + intensity * 0.75})`
                  }
                  return `rgba(232,162,71,${0.12 + intensity * 0.68})`
                }

                const cellGlow = (count: number, isHighlight: boolean) => {
                  if (count === 0 || !isHighlight) return undefined
                  const intensity = count / maxInPeriod
                  return `0 0 ${6 + intensity * 8}px rgba(232,162,71,${0.2 + intensity * 0.4})`
                }

                return (
                  <div
                    className="rounded-2xl p-5 md:p-6"
                    style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                  >
                    {/* Header */}
                    <div className="flex items-end justify-between mb-5">
                      <div>
                        <h2 className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}>
                          Activity · {periodLabel}
                        </h2>
                        <p className="font-syne font-700 text-xl mt-1" style={{ color: 'var(--text)', lineHeight: 1 }}>
                          {total}
                          <span className="font-syne font-400 text-sm ml-1.5" style={{ color: 'var(--text3)' }}>tasks done</span>
                        </p>
                      </div>
                      {bestCount > 0 && (
                        <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                          best <span style={{ color: 'var(--amber)' }}>{bestLabel}</span> · {bestCount}
                        </p>
                      )}
                    </div>

                    {/* ── Week: bar chart ── */}
                    {activityData.type === 'week' && (
                      <div className="flex items-end gap-1.5" style={{ height: 80 }}>
                        {activityData.days.map((day) => {
                          const heightPct = day.count / maxInPeriod
                          const barH = Math.max(heightPct * 56, day.count > 0 ? 6 : 2)
                          const isBest = day.count > 0 && day.count === maxInPeriod
                          return (
                            <div key={day.date} className="flex-1 flex flex-col items-center justify-end gap-1.5" style={{ opacity: day.isFuture ? 0.3 : 1 }}>
                              <span className="font-mono transition-opacity duration-300" style={{ fontSize: 10, color: isBest ? 'var(--amber)' : 'var(--text3)', opacity: day.count > 0 ? 1 : 0 }}>
                                {day.count > 0 ? day.count : ''}
                              </span>
                              <div
                                className="w-full rounded-t-md transition-all duration-700"
                                style={{
                                  height: day.isFuture ? 2 : barH,
                                  background: day.isFuture ? 'var(--border)' : cellBg(day.count, day.isToday || isBest, false),
                                  boxShadow: day.isFuture ? undefined : cellGlow(day.count, day.isToday || isBest),
                                  opacity: day.isFuture ? 1 : (day.count === 0 ? 0.35 : 1),
                                }}
                              />
                              <span className="font-mono" style={{ fontSize: 10, color: day.isToday ? 'var(--amber)' : 'var(--text3)', fontWeight: day.isToday ? 700 : 400 }}>
                                {day.shortLabel}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* ── Month: calendar heatmap ── */}
                    {activityData.type === 'month' && (
                      <div>
                        {/* Day-of-week headers */}
                        <div className="grid grid-cols-7 gap-1 mb-1">
                          {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                            <div key={d} className="flex items-center justify-center" style={{ height: 16 }}>
                              <span className="font-mono" style={{ fontSize: 9, color: 'var(--text3)', opacity: 0.6 }}>{d}</span>
                            </div>
                          ))}
                        </div>
                        {/* Cells */}
                        <div className="grid grid-cols-7 gap-1">
                          {activityData.cells.map((cell, i) => {
                            const isBest = cell.inMonth && cell.count > 0 && cell.count === maxInPeriod
                            return (
                              <div
                                key={i}
                                className="relative flex items-center justify-center rounded-md transition-all duration-500"
                                style={{
                                  height:      28,
                                  background:  cell.inMonth ? cellBg(cell.count, cell.isToday || isBest, false) : 'transparent',
                                  boxShadow:   cell.inMonth ? cellGlow(cell.count, cell.isToday || isBest) : undefined,
                                  outline:     cell.isToday ? '1.5px solid rgba(232,162,71,0.7)' : undefined,
                                  outlineOffset: '0px',
                                }}
                                title={cell.inMonth && cell.count > 0 ? `${cell.date}: ${cell.count} task${cell.count !== 1 ? 's' : ''}` : undefined}
                              >
                                {cell.inMonth && (
                                  <span
                                    className="font-mono select-none"
                                    style={{
                                      fontSize:   10,
                                      lineHeight: 1,
                                      color:      cell.count > 0
                                        ? (cell.count / maxInPeriod > 0.5 ? 'rgba(255,255,255,0.9)' : 'var(--amber)')
                                        : 'var(--text3)',
                                      opacity:    cell.count === 0 ? 0.4 : 1,
                                      fontWeight: cell.isToday ? 700 : 400,
                                    }}
                                  >
                                    {cell.day}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── Year: month heatmap strip ── */}
                    {activityData.type === 'year' && (
                      <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                        {activityData.months.map((month) => {
                          const isBest = month.count > 0 && month.count === maxInPeriod
                          const isFuture = month.monthIdx > new Date().getMonth() && activityData.year === new Date().getFullYear()
                          return (
                            <div
                              key={month.monthIdx}
                              className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 transition-all duration-500"
                              style={{
                                background:  isFuture ? 'transparent' : cellBg(month.count, month.isCurrent || isBest, false),
                                boxShadow:   isFuture ? undefined : cellGlow(month.count, month.isCurrent || isBest),
                                outline:     month.isCurrent ? '1.5px solid rgba(232,162,71,0.6)' : undefined,
                                opacity:     isFuture ? 0.25 : 1,
                              }}
                              title={`${month.label}: ${month.count} task${month.count !== 1 ? 's' : ''}`}
                            >
                              <span
                                className="font-mono"
                                style={{
                                  fontSize:   11,
                                  color:      month.count > 0
                                    ? (month.count / maxInPeriod > 0.5 ? 'rgba(255,255,255,0.85)' : 'var(--amber)')
                                    : month.isCurrent ? 'var(--amber)' : 'var(--text3)',
                                  fontWeight: month.isCurrent ? 700 : 400,
                                  opacity:    month.count === 0 && !month.isCurrent ? 0.45 : 1,
                                }}
                              >
                                {month.shortLabel}
                              </span>
                              {month.count > 0 && (
                                <span
                                  className="font-mono"
                                  style={{
                                    fontSize: 9,
                                    color: month.count / maxInPeriod > 0.5 ? 'rgba(255,255,255,0.7)' : 'rgba(232,162,71,0.8)',
                                    lineHeight: 1,
                                  }}
                                >
                                  {month.count}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })()}

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

              {/* Reflections */}
              {report.insights.length > 0 && (
                <div
                  className="rounded-2xl p-6"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                >
                  <h2
                    className="font-mono text-xs uppercase tracking-widest mb-4"
                    style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
                  >
                    Reflections
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