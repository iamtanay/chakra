'use client'

import { useState, useMemo } from 'react'
import type { Task, Project, Status } from '@/types'
import { Plus, ChevronDown } from 'lucide-react'
import { todayLocal, parseLocalDate, toISODate } from '@/lib/recurrence'

interface ListViewProps {
  tasks: Task[]
  projects: Project[]
  canWrite: boolean
  selectedProjectId: string | null
  onCardClick: (task: Task) => void
  onComplete: (task: Task) => void
  onUndoDone: (task: Task) => void
  onTodayToggle: (task: Task) => void
  onStatusChange: (taskId: string, newStatus: Status) => void
  onAddTask: (status: Status) => void
}

type DueFilter = 'all' | 'today' | 'week' | 'overdue' | 'no-date'
type StatusFilter = 'all' | 'Todo' | 'In Progress' | 'Done'
type PriorityFilter = 'all' | 'High' | 'Medium' | 'Low'

const STATUS_COLORS: Record<Status, string> = {
  'Todo':        'var(--col-todo)',
  'In Progress': 'var(--col-wip)',
  'Done':        'var(--col-done)',
}

const PRIORITY_COLORS: Record<string, string> = {
  High:   'var(--col-high)',
  Medium: 'var(--col-medium)',
  Low:    'var(--col-low)',
}

function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  const selected = options.find(o => o.value === value)
  return (
    <div className="relative flex items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--text3)' }}>
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value as T)}
          className="appearance-none font-syne text-xs font-500 pl-2.5 pr-6 py-1.5 rounded-lg cursor-pointer outline-none"
          style={{
            background: value !== 'all' ? 'var(--amber-dim)' : 'var(--bg3)',
            color: value !== 'all' ? 'var(--amber)' : 'var(--text2)',
            border: value !== 'all' ? '1px solid var(--amber)' : '1px solid var(--border)',
          }}
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown
          size={11}
          className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2"
          style={{ color: value !== 'all' ? 'var(--amber)' : 'var(--text3)' }}
        />
      </div>
    </div>
  )
}

export function ListView({
  tasks, projects, canWrite, selectedProjectId,
  onCardClick, onComplete, onUndoDone, onTodayToggle, onStatusChange, onAddTask,
}: ListViewProps) {
  const [dueFilter,      setDueFilter]      = useState<DueFilter>('all')
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [sortCol,        setSortCol]        = useState<'title' | 'status' | 'priority' | 'due' | 'project'>('due')
  const [sortDir,        setSortDir]        = useState<'asc' | 'desc'>('asc')

  const projectsMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const today    = todayLocal()
  const todayStr = toISODate(today)
  const weekEnd  = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7)
  const weekStr  = toISODate(weekEnd)

  const counts = useMemo(() => {
    const base = selectedProjectId ? tasks.filter(t => t.project_id === selectedProjectId) : tasks
    return {
      today:   base.filter(t => (t.next_due_date ?? t.due_date) === todayStr && t.status !== 'Done').length,
      week:    base.filter(t => { const d = t.next_due_date ?? t.due_date; return d && d > todayStr && d <= weekStr && t.status !== 'Done' }).length,
      overdue: base.filter(t => { const d = t.next_due_date ?? t.due_date; return d && d < todayStr && t.status !== 'Done' }).length,
    }
  }, [tasks, selectedProjectId, todayStr, weekStr])

  const filtered = useMemo(() => {
    let result = selectedProjectId
      ? tasks.filter(t => t.project_id === selectedProjectId)
      : tasks

    if (dueFilter === 'today') {
      result = result.filter(t => (t.next_due_date ?? t.due_date) === todayStr)
    } else if (dueFilter === 'week') {
      result = result.filter(t => {
        const d = t.next_due_date ?? t.due_date
        return d && d > todayStr && d <= weekStr
      })
    } else if (dueFilter === 'overdue') {
      result = result.filter(t => {
        const d = t.next_due_date ?? t.due_date
        return d && d < todayStr && t.status !== 'Done'
      })
    } else if (dueFilter === 'no-date') {
      result = result.filter(t => !t.next_due_date && !t.due_date)
    }

    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter)
    if (priorityFilter !== 'all') result = result.filter(t => t.priority === priorityFilter)

    const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
    const STATUS_ORDER: Record<string, number> = { 'Todo': 0, 'In Progress': 1, 'Done': 2 }
    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortCol === 'title')    cmp = a.title.localeCompare(b.title)
      if (sortCol === 'status') {
        cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
      }
      if (sortCol === 'priority') {
        cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
      }
      if (sortCol === 'due') {
        const ad = a.next_due_date ?? a.due_date ?? '9999'
        const bd = b.next_due_date ?? b.due_date ?? '9999'
        cmp = ad.localeCompare(bd)
      }
      if (sortCol === 'project') {
        const ap = projectsMap.get(a.project_id)?.name ?? ''
        const bp = projectsMap.get(b.project_id)?.name ?? ''
        cmp = ap.localeCompare(bp)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [tasks, selectedProjectId, dueFilter, statusFilter, priorityFilter, sortCol, sortDir, todayStr, weekStr, projectsMap])

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const SortIcon = ({ col }: { col: typeof sortCol }) => {
    if (sortCol !== col) return <span className="opacity-30">↕</span>
    return <span style={{ color: 'var(--amber)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const getDueLabel = (task: Task): { label: string; color: string } | null => {
    const d = task.next_due_date ?? task.due_date
    if (!d) return null
    if (d < todayStr && task.status !== 'Done') return { label: 'Overdue', color: 'var(--col-high)' }
    if (d === todayStr) return { label: 'Today', color: 'var(--amber)' }
    const date = parseLocalDate(d)
    return {
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: 'var(--text3)',
    }
  }

  return (
    <div className="flex flex-col gap-3 pb-6">
      {/* Filter bar — dropdowns */}
      <div
        className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
      >
        <FilterDropdown
          label="Due"
          value={dueFilter}
          onChange={setDueFilter}
          options={[
            { value: 'all',     label: 'All' },
            { value: 'today',   label: counts.today   > 0 ? `Today (${counts.today})`   : 'Today'   },
            { value: 'week',    label: counts.week    > 0 ? `This Week (${counts.week})` : 'This Week'},
            { value: 'overdue', label: counts.overdue > 0 ? `Overdue (${counts.overdue})`: 'Overdue'  },
            { value: 'no-date', label: 'No Date' },
          ]}
        />
        <FilterDropdown
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all',         label: 'All'         },
            { value: 'Todo',        label: 'Todo'        },
            { value: 'In Progress', label: 'In Progress' },
            { value: 'Done',        label: 'Done'        },
          ]}
        />
        <FilterDropdown
          label="Priority"
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[
            { value: 'all',    label: 'All'    },
            { value: 'High',   label: 'High'   },
            { value: 'Medium', label: 'Medium' },
            { value: 'Low',    label: 'Low'    },
          ]}
        />
      </div>

      {/* Table — horizontally scrollable on mobile */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
      >
        <div className="overflow-x-auto">
          <div style={{ minWidth: 560 }}>
            {/* Table header */}
            <div
              className="grid items-center px-4 py-2.5"
              style={{
                gridTemplateColumns: 'minmax(0,1fr) 110px 90px 90px 80px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg3)',
              }}
            >
              {([
                { col: 'title',    label: 'Task'     },
                { col: 'project',  label: 'Space'    },
                { col: 'status',   label: 'Status'   },
                { col: 'due',      label: 'Due'      },
                { col: 'priority', label: 'Priority' },
              ] as { col: typeof sortCol; label: string }[]).map(({ col, label }) => (
                <button
                  key={col}
                  onClick={() => toggleSort(col)}
                  className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-left transition-colors duration-150"
                  style={{ color: sortCol === col ? 'var(--amber)' : 'var(--text3)', letterSpacing: '0.1em' }}
                >
                  {label} <SortIcon col={col} />
                </button>
              ))}
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <p className="font-syne text-sm" style={{ color: 'var(--text3)' }}>No tasks match your filters.</p>
                {canWrite && (
                  <button
                    onClick={() => onAddTask('Todo')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-syne text-sm font-600"
                    style={{ background: 'var(--amber)', color: '#0a0a0a' }}
                  >
                    <Plus size={14} /> Add task
                  </button>
                )}
              </div>
            ) : (
              <div>
                {filtered.map((task, idx) => {
                  const project = projectsMap.get(task.project_id)
                  const dueInfo = getDueLabel(task)
                  const isDone  = task.status === 'Done'

                  return (
                    <div
                      key={task.id}
                      onClick={() => onCardClick(task)}
                      className="grid items-center px-4 py-3 cursor-pointer transition-colors duration-100"
                      style={{
                        gridTemplateColumns: 'minmax(0,1fr) 110px 90px 90px 80px',
                        borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                        opacity: isDone ? 0.6 : 1,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Title — plain, no icons */}
                      <div className="min-w-0 pr-3">
                        <span
                          className="font-syne text-sm truncate block"
                          style={{
                            color: isDone ? 'var(--text3)' : 'var(--text)',
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}
                        >
                          {task.title}
                        </span>
                      </div>

                      {/* Space */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        {project && (
                          <>
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: project.color }}
                            />
                            <span className="font-syne text-xs truncate" style={{ color: 'var(--text3)' }}>
                              {project.name}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        <span
                          className="font-mono text-[10px] px-2 py-1 rounded-full whitespace-nowrap"
                          style={{
                            background: `${STATUS_COLORS[task.status]}18`,
                            color: STATUS_COLORS[task.status],
                          }}
                        >
                          {task.status === 'In Progress' ? 'WIP' : task.status}
                        </span>
                      </div>

                      {/* Due */}
                      <div>
                        {dueInfo ? (
                          <span className="font-mono text-xs" style={{ color: dueInfo.color }}>
                            {dueInfo.label}
                          </span>
                        ) : (
                          <span className="font-mono text-xs" style={{ color: 'var(--border2)' }}>—</span>
                        )}
                      </div>

                      {/* Priority */}
                      <div>
                        <span
                          className="font-mono text-[10px] px-2 py-1 rounded-full"
                          style={{
                            background: `${PRIORITY_COLORS[task.priority] ?? 'var(--text3)'}18`,
                            color: PRIORITY_COLORS[task.priority] ?? 'var(--text3)',
                          }}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {/* Add row */}
                {canWrite && (
                  <button
                    onClick={() => onAddTask('Todo')}
                    className="w-full flex items-center gap-2.5 px-4 py-3 transition-colors duration-150"
                    style={{ borderTop: '1px solid var(--border)', color: 'var(--text3)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Plus size={13} />
                    <span className="font-syne text-xs">Add task</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row count */}
      <p className="font-mono text-xs text-right" style={{ color: 'var(--text3)' }}>
        {filtered.length} task{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
