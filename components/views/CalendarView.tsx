'use client'

import { useState, useMemo } from 'react'
import type { Task, Project } from '@/types'
import { ChevronLeft, ChevronRight, RefreshCw, Star, X } from 'lucide-react'
import { toISODate, parseLocalDate } from '@/lib/recurrence'

interface CalendarViewProps {
  tasks: Task[]
  projects: Project[]
  selectedProjectId: string | null
  onCardClick: (task: Task) => void
  onAddTask?: (status: 'Todo') => void
  canWrite?: boolean
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getTaskDate(task: Task): string | null {
  return task.next_due_date ?? task.due_date ?? null
}

const STATUS_COLORS: Record<string, string> = {
  'Todo':        'var(--col-todo)',
  'In Progress': 'var(--col-wip)',
  'Done':        'var(--col-done)',
}

export function CalendarView({ tasks, projects, selectedProjectId, onCardClick, onAddTask, canWrite }: CalendarViewProps) {
  const today = new Date()
  const [year,         setYear]         = useState(today.getFullYear())
  const [month,        setMonth]        = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(toISODate(today))

  const projectsMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  // Apply project filter
  const filteredTasks = useMemo(() =>
    selectedProjectId
      ? tasks.filter(t => t.project_id === selectedProjectId)
      : tasks,
    [tasks, selectedProjectId]
  )

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of filteredTasks) {
      const date = getTaskDate(task)
      if (!date) continue
      const list = map.get(date) ?? []
      list.push(task)
      map.set(date, list)
    }
    return map
  }, [filteredTasks])

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const todayStr     = toISODate(today)
  const selectedTasks = selectedDate ? (tasksByDate.get(selectedDate) ?? []) : []

  // Month summary data
  const monthSummary = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
    const monthTasks = filteredTasks.filter(t => {
      const d = getTaskDate(t)
      return d && d.startsWith(prefix)
    })
    return {
      total: monthTasks.length,
      done:  monthTasks.filter(t => t.status === 'Done').length,
      wip:   monthTasks.filter(t => t.status === 'In Progress').length,
      todo:  monthTasks.filter(t => t.status === 'Todo').length,
    }
  }, [filteredTasks, year, month])

  // ── Calendar grid component (shared between layouts) ──────────────────────
  const CalendarGrid = (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
    >
      {/* Month nav */}
      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-150"
          style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
        >
          <ChevronLeft size={13} />
        </button>
        <p className="font-syne font-700 text-sm" style={{ color: 'var(--text)' }}>
          {MONTHS[month].slice(0, 3)} {year}
        </p>
        <button
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-150"
          style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Grid */}
      <div className="p-2">
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center font-mono py-1" style={{ color: 'var(--text3)', fontSize: 9 }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />
            const dateStr  = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayTasks   = tasksByDate.get(dateStr) ?? []
            const isToday    = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const hasTasks   = dayTasks.length > 0
            const dotColors  = [...new Set(dayTasks.slice(0, 3).map(t =>
              projectsMap.get(t.project_id)?.color ?? 'var(--amber)'
            ))]

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className="flex flex-col items-center justify-start rounded-lg transition-all duration-150 py-1"
                style={{
                  background: isSelected ? 'var(--amber)' : isToday ? 'var(--bg4)' : 'transparent',
                  border: isToday && !isSelected ? '1px solid var(--border2)' : '1px solid transparent',
                  minHeight: 32,
                }}
              >
                <span
                  className="font-syne font-500 leading-none"
                  style={{
                    fontSize: 11,
                    color: isSelected ? '#0a0a0a' : isToday ? 'var(--text)' : hasTasks ? 'var(--text2)' : 'var(--text3)',
                  }}
                >
                  {day}
                </span>
                {hasTasks && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dotColors.slice(0, 3).map((color, i) => (
                      <span
                        key={i}
                        className="rounded-full"
                        style={{ width: 4, height: 4, backgroundColor: isSelected ? 'rgba(0,0,0,0.4)' : color }}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  // Month summary component
  const MonthSummary = (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
    >
      <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text3)' }}>
        {MONTHS[month]} overview
      </p>
      {monthSummary.total === 0 ? (
        <p className="font-syne text-xs" style={{ color: 'var(--text3)' }}>No tasks this month</p>
      ) : (
        <div className="flex gap-4">
          <div className="text-center">
            <p className="font-syne font-700 text-base" style={{ color: 'var(--col-done)' }}>{monthSummary.done}</p>
            <p className="font-mono text-[9px]" style={{ color: 'var(--text3)' }}>Done</p>
          </div>
          <div className="text-center">
            <p className="font-syne font-700 text-base" style={{ color: 'var(--col-wip)' }}>{monthSummary.wip}</p>
            <p className="font-mono text-[9px]" style={{ color: 'var(--text3)' }}>WIP</p>
          </div>
          <div className="text-center">
            <p className="font-syne font-700 text-base" style={{ color: 'var(--col-todo)' }}>{monthSummary.todo}</p>
            <p className="font-mono text-[9px]" style={{ color: 'var(--text3)' }}>Todo</p>
          </div>
          <div className="text-center">
            <p className="font-syne font-700 text-base" style={{ color: 'var(--text2)' }}>{monthSummary.total}</p>
            <p className="font-mono text-[9px]" style={{ color: 'var(--text3)' }}>Total</p>
          </div>
        </div>
      )}
    </div>
  )

  // Selected date task list component
  const SelectedDatePanel = (
    <div className="flex flex-col gap-3">
      {!selectedDate ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="font-syne text-sm" style={{ color: 'var(--text3)' }}>Select a date to see tasks</p>
          <p className="font-mono text-xs" style={{ color: 'var(--border2)' }}>Dates with dots have tasks due</p>
        </div>
      ) : (
        <>
          {/* Date header */}
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
          >
            <div>
              <p className="font-syne font-700 text-sm" style={{ color: 'var(--text)' }}>
                {parseLocalDate(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric',
                })}
              </p>
              <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                {selectedTasks.length === 0
                  ? 'No tasks due'
                  : `${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''} due`}
              </p>
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="w-7 h-7 flex items-center justify-center rounded-lg"
              style={{ background: 'var(--bg3)', color: 'var(--text3)' }}
            >
              <X size={13} />
            </button>
          </div>

          {/* Task list */}
          {selectedTasks.length === 0 ? (
            <div
              className="rounded-xl flex flex-col items-center justify-center py-10"
              style={{ background: 'var(--bg2)', border: '1px dashed var(--border)' }}
            >
              <p className="font-syne text-xs" style={{ color: 'var(--text3)' }}>No tasks due on this day</p>
            </div>
          ) : (
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
            >
              {selectedTasks.map((task, idx) => {
                const project = projectsMap.get(task.project_id)
                const isDone  = task.status === 'Done'
                return (
                  <button
                    key={task.id}
                    onClick={() => onCardClick(task)}
                    className="w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors duration-100"
                    style={{
                      borderBottom: idx < selectedTasks.length - 1 ? '1px solid var(--border)' : 'none',
                      opacity: isDone ? 0.6 : 1,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: project?.color ?? 'var(--amber)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {task.is_recurring && <RefreshCw size={10} style={{ color: 'var(--text3)' }} />}
                        {task.today_flag && <Star size={10} style={{ color: 'var(--amber)' }} fill="var(--amber)" />}
                        <p
                          className="font-syne font-600 text-sm truncate"
                          style={{
                            color: isDone ? 'var(--text3)' : 'var(--text)',
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}
                        >
                          {task.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                          {project?.name}
                        </span>
                        <span
                          className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                          style={{
                            background: `${STATUS_COLORS[task.status]}18`,
                            color: STATUS_COLORS[task.status],
                          }}
                        >
                          {task.status === 'In Progress' ? 'WIP' : task.status}
                        </span>
                        <span
                          className="font-mono text-[10px]"
                          style={{ color: task.priority === 'High' ? 'var(--col-high)' : 'var(--text3)' }}
                        >
                          {task.priority}
                        </span>
                      </div>
                      {task.description && (
                        <p className="font-syne text-xs mt-1 line-clamp-1" style={{ color: 'var(--text3)' }}>
                          {task.description}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )

  return (
    <>
      {/* ── DESKTOP layout: side-by-side ── */}
      <div className="hidden md:flex gap-4 h-full pb-6" style={{ minHeight: 0 }}>
        {/* LEFT: calendar + summary */}
        <div
          className="flex-shrink-0 flex flex-col gap-3"
          style={{ width: 'clamp(240px, 35%, 300px)' }}
        >
          {CalendarGrid}
          {MonthSummary}
        </div>

        {/* RIGHT: selected date tasks */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {SelectedDatePanel}
        </div>
      </div>

      {/* ── MOBILE layout: calendar on top, tasks below ── */}
      <div className="md:hidden flex flex-col gap-3 pb-6">
        {CalendarGrid}
        {MonthSummary}
        {SelectedDatePanel}
      </div>
    </>
  )
}
