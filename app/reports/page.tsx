'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { generateReportData, driftLabel } from '@/lib/insights'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Logo } from '@/components/ui/Logo'
import { PillToggle } from '@/components/ui/PillToggle'
import type { Task, Project } from '@/types'

export default function ReportsPage() {
  const supabase = createClient()
  const [projects,  setProjects]  = useState<Project[]>([])
  const [tasks,     setTasks]     = useState<Task[]>([])
  const [loading,   setLoading]   = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month')
  const [logoSpin,  setLogoSpin]  = useState<'once' | 'fast' | 'loop' | null>('once')

  useEffect(() => {
    const t = setTimeout(() => setLogoSpin(null), 600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const [{ data: pd }, { data: td }] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('tasks').select('*'),
      ])
      setProjects((pd || []) as Project[])
      setTasks((td || []) as Task[])
      setLoading(false)
    }
    load()
  }, [])

  const report = useMemo(() => generateReportData(tasks, projects, timeRange, currentUserId), [tasks, projects, timeRange, currentUserId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <Logo size={40} spin="loop" />
      </div>
    )
  }

  const statCards = [
    { label: 'Tasks done',   value: report.tasksCompleted,   color: 'var(--teal)'   },
    { label: 'Total hours',  value: `${report.totalHours}h`, color: 'var(--amber)'  },
    { label: 'Projects',     value: report.projectsActive,   color: 'var(--violet)' },
    { label: 'Categories',   value: report.categoriesUsed,   color: 'var(--rose)'   },
  ]

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar projects={projects} selectedProjectId={null} onProjectSelect={() => {}} />

      <div
        className="flex-1 flex flex-col overflow-hidden pb-14 md:pb-0"
        style={{ marginLeft: '0', paddingLeft: '0' }}
      >
        <div className="md:ml-[var(--sidebar-w)] flex flex-col flex-1 overflow-hidden">
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-5 md:px-8 py-4 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <Logo size={22} spin={logoSpin} />
              <h1
                className="font-syne font-800 text-lg uppercase tracking-widest"
                style={{ color: 'var(--text)', letterSpacing: '0.15em' }}
              >
                Reports
              </h1>
            </div>
            <PillToggle
              options={['month', 'quarter', 'year'] as const}
              value={timeRange}
              onChange={setTimeRange}
            />
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto p-5 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              {report.tasksCompleted === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-20 rounded-2xl"
                  style={{ border: '1.5px dashed var(--border2)' }}
                >
                  <p className="font-syne text-sm" style={{ color: 'var(--text3)' }}>
                    Nothing logged yet.
                  </p>
                  <p className="font-mono text-xs mt-1" style={{ color: 'var(--text3)', opacity: 0.6 }}>
                    Complete tasks to see telemetry.
                  </p>
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
                        <p className="font-mono text-xs mb-2" style={{ color: 'var(--text3)' }}>
                          {s.label}
                        </p>
                        <p
                          className="font-syne font-800 text-3xl"
                          style={{ color: s.color, lineHeight: 1 }}
                        >
                          {s.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* By Project */}
                  {report.byProject.length > 0 && (
                    <div
                      className="rounded-2xl p-6"
                      style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                    >
                      <h2
                        className="font-mono text-xs uppercase tracking-widest mb-5"
                        style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
                      >
                        By Project
                      </h2>
                      <div className="space-y-4">
                        {report.byProject.map((p) => {
                          const pct = report.totalHours > 0 ? (p.hours / report.totalHours) * 100 : 0
                          return (
                            <div key={p.projectId}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.projectColor }} />
                                  <span className="font-syne text-sm" style={{ color: 'var(--text)' }}>
                                    {p.projectName}
                                  </span>
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
                                <span className="font-syne text-sm" style={{ color: 'var(--text)' }}>
                                  {cat.category}
                                </span>
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

                  {/* ── Drift section ────────────────────────────────────────────── */}
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
                        <span
                          className="font-mono text-xs"
                          style={{ color: 'var(--text3)' }}
                        >
                          actual ÷ estimated
                        </span>
                      </div>

                      <div className="space-y-4">
                        {report.driftByCategory.map((entry) => {
                          // Determine color: over → amber/rose, under → teal, spot on → text3
                          const isOver   = entry.ratio > 1.1
                          const isUnder  = entry.ratio < 0.9
                          const barColor = isOver ? 'var(--col-high)' : isUnder ? 'var(--teal)' : 'var(--text3)'
                          // Bar width: ratio 1.0 = 50%, max bar at 2.0+
                          const barPct   = Math.min((entry.ratio / 2) * 100, 100)

                          return (
                            <div key={entry.category}>
                              <div className="flex items-start justify-between mb-2 gap-4">
                                <div className="flex-1 min-w-0">
                                  <p
                                    className="font-syne text-sm leading-relaxed"
                                    style={{ color: 'var(--text)' }}
                                  >
                                    {driftLabel(entry)}
                                  </p>
                                  <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                                    Based on {entry.sampleCount} completed task{entry.sampleCount === 1 ? '' : 's'}
                                  </p>
                                </div>
                                <span
                                  className="font-mono text-sm font-600 flex-shrink-0"
                                  style={{ color: barColor }}
                                >
                                  {entry.ratio.toFixed(2)}×
                                </span>
                              </div>
                              {/* Bar — midpoint at 50% = 1.0 ratio */}
                              <div
                                className="relative w-full h-1.5 rounded-full overflow-hidden"
                                style={{ background: 'var(--bg5)' }}
                              >
                                {/* 1.0 reference line */}
                                <div
                                  className="absolute top-0 h-full w-px"
                                  style={{ left: '50%', background: 'var(--border2)' }}
                                />
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width:     `${barPct}%`,
                                    background: barColor,
                                  }}
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
                          <div key={i} className="flex gap-3">
                            <span
                              className="font-mono text-xs w-6 flex-shrink-0 pt-0.5"
                              style={{ color: 'var(--amber)' }}
                            >
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <p className="font-syne text-sm leading-relaxed" style={{ color: 'var(--text2)' }}>
                              {insight}
                            </p>
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
                      <div
                        className="px-6 py-4"
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
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
                              {['Title', 'Project', 'Category', 'Est.', 'Actual', 'Date'].map((h) => (
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
                                <>
                                  <tr
                                    key={task.id}
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
                                    <td className="py-3 px-4 font-mono text-xs" style={{ color: 'var(--text3)' }}>
                                      {task.category}
                                    </td>
                                    <td className="py-3 px-4 font-mono text-xs" style={{ color: 'var(--text3)' }}>
                                      {task.estimated_hours ?? '—'}
                                    </td>
                                    <td className="py-3 px-4 font-mono text-xs" style={{ color: overBudget ? 'var(--col-high)' : 'var(--teal)' }}>
                                      {task.actual_hours ?? '—'}
                                    </td>
                                    <td className="py-3 px-4 font-mono text-xs" style={{ color: 'var(--text3)' }}>
                                      {new Date(task.completed_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </td>
                                  </tr>
                                  {/* Traces note row — only shown when a note exists */}
                                  {task.completion_note && (
                                    <tr
                                      key={`${task.id}-note`}
                                      style={{ borderBottom: '1px solid var(--border)' }}
                                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg3)')}
                                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                      <td
                                        colSpan={6}
                                        className="px-4 pb-3"
                                      >
                                        <p
                                          className="font-syne text-xs italic leading-relaxed"
                                          style={{ color: 'var(--text3)', paddingLeft: '2px' }}
                                        >
                                          "{task.completion_note}"
                                        </p>
                                      </td>
                                    </tr>
                                  )}
                                </>
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
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
