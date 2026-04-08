'use client'

import { useState, useMemo } from 'react'
import type { Task, Project } from '@/types'
import { ChevronLeft, ChevronRight, RefreshCw, Star, X } from 'lucide-react'
import {
  toISODate,
  parseLocalDate,
  computeNextDueDate,
} from '@/lib/recurrence'

interface CalendarViewProps {
  tasks: Task[]           // ALL tasks for this user, only project-filtered — NOT lead-window filtered
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

const STATUS_COLORS: Record<string, string> = {
  'Todo':        'var(--col-todo)',
  'In Progress': 'var(--col-wip)',
  'Done':        'var(--col-done)',
}

// ── Recurring expansion ───────────────────────────────────────────────────────

interface CalendarTaskEntry {
  task: Task
  dateStr: string
  /**
   * isSynthesised = true  → future occurrence projected from the recurrence pattern
   * isSynthesised = false → the current active DB cycle (task.next_due_date)
   */
  isSynthesised: boolean
}

// How many months ahead to project future occurrences
const CALENDAR_HORIZON_MONTHS = 6
// Safety cap — daily tasks would otherwise generate hundreds of entries
const MAX_SYNTHESISED_INSTANCES = 200

/**
 * Expand a recurring task into all occurrence dates within [rangeStart, rangeEnd].
 *
 * Strategy:
 *  - The current cycle lives at task.next_due_date (real DB row, isSynthesised=false)
 *  - Future cycles are walked forward using computeNextDueDate (isSynthesised=true)
 *  - If next_due_date is before rangeStart we still walk forward from it — the loop
 *    skips dates outside the range and adds those that fall inside.
 *  - We do NOT synthesise past occurrences (before next_due_date) — those either exist
 *    as task_occurrence rows (not shown here) or are lost.
 */
function expandRecurringTask(
  task: Task,
  rangeStart: Date,
  rangeEnd: Date,
): CalendarTaskEntry[] {
  if (!task.is_recurring || !task.next_due_date) return []

  const entries: CalendarTaskEntry[] = []
  const currentDue = parseLocalDate(task.next_due_date)

  // Current (real) cycle — show if it falls within the visible range
  if (currentDue >= rangeStart && currentDue <= rangeEnd) {
    entries.push({ task, dateStr: task.next_due_date, isSynthesised: false })
  }

  // Walk forward from currentDue, projecting future cycles
  let cursor = currentDue
  let count = 0

  while (count < MAX_SYNTHESISED_INSTANCES) {
    let next: Date
    try {
      next = computeNextDueDate(task, cursor)
    } catch {
      break
    }

    // Guard: computeNextDueDate must always advance strictly forward
    // If it doesn't (shouldn't happen but be safe), bail to avoid infinite loop
    if (next <= cursor) break

    if (next > rangeEnd) break

    if (next >= rangeStart) {
      const syntheticTask: Task = {
        ...task,
        // Override next_due_date so clicking this entry opens the right cycle context
        next_due_date:   toISODate(next),
        status:          'Todo',
        actual_hours:    null,
        completed_at:    null,
        today_flag:      false,
        completion_note: null,
      }
      entries.push({ task: syntheticTask, dateStr: toISODate(next), isSynthesised: true })
    }

    cursor = next
    count++
  }

  return entries
}

export function CalendarView({
  tasks,
  projects,
  selectedProjectId,
  onCardClick,
}: CalendarViewProps) {
  const today = new Date()
  const [year,         setYear]         = useState(today.getFullYear())
  const [month,        setMonth]        = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(toISODate(today))

  const projectsMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  // Project filter — CalendarView handles this internally because it receives
  // the full tasks list (unlike board/list which receive pre-filtered tasks)
  const filteredTasks = useMemo(() =>
    selectedProjectId
      ? tasks.filter(t => t.project_id === selectedProjectId)
      : tasks,
    [tasks, selectedProjectId]
  )

  // ── Build calendar entry map ──────────────────────────────────────────────
  // Range: generous window so navigating months feels instant
  // rangeStart: 1 month before current view
  // rangeEnd:   CALENDAR_HORIZON_MONTHS ahead of current view
  const calendarEntries = useMemo(() => {
    const rangeStart = new Date(year, month - 1, 1)
    const rangeEnd   = new Date(year, month + CALENDAR_HORIZON_MONTHS, 0)

    const map = new Map<string, CalendarTaskEntry[]>()

    const addEntry = (entry: CalendarTaskEntry) => {
      const existing = map.get(entry.dateStr) ?? []
      existing.push(entry)
      map.set(entry.dateStr, existing)
    }

    for (const task of filteredTasks) {
      if (task.is_recurring) {
        // Expand all occurrences within the calendar window
        for (const entry of expandRecurringTask(task, rangeStart, rangeEnd)) {
          addEntry(entry)
        }
      } else {
        // Non-recurring: place on due_date (not next_due_date)
        const dateStr = task.due_date ?? null
        if (dateStr) {
          addEntry({ task, dateStr, isSynthesised: false })
        }
      }
    }

    return map
  }, [filteredTasks, year, month])

  // Calendar grid cells
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

  const todayStr        = toISODate(today)
  const selectedEntries = selectedDate ? (calendarEntries.get(selectedDate) ?? []) : []

  // Month overview — includes synthesised (upcoming) tasks so users can see full workload
  const monthSummary = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
    let total = 0, done = 0, wip = 0, todo = 0

    for (const [dateStr, entries] of calendarEntries.entries()) {
      if (!dateStr.startsWith(prefix)) continue
      for (const { isSynthesised, task } of entries) {
        total++
        if (isSynthesised || task.status === 'Todo') todo++
        else if (task.status === 'Done') done++
        else wip++
      }
    }

    return { total, done, wip, todo }
  }, [calendarEntries, year, month])

  // ── Calendar grid ─────────────────────────────────────────────────────────
  const CalendarGrid = (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-150"
          style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
        >
          <ChevronLeft size={13} />
        </button>
        <p className="font-syne font-700 text-sm" style={{ color: 'var(--text)' }}>
          {(MONTHS[month] ?? '').slice(0, 3)} {year}
        </p>
        <button
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-150"
          style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
        >
          <ChevronRight size={13} />
        </button>
      </div>

      <div className="p-2">
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center font-mono py-1" style={{ color: 'var(--text3)', fontSize: 9 }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />
            const dateStr    = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayEntries = calendarEntries.get(dateStr) ?? []
            const isToday    = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const hasTasks   = dayEntries.length > 0

            // Up to 3 dots, one per unique project colour on this day
            // Use index-based key to avoid dedup collisions across synthesised/real entries
            const seenProjects = new Set<string>()
            const dotData: { color: string; faded: boolean }[] = []
            for (const e of dayEntries) {
              if (dotData.length >= 3) break
              const key = e.task.project_id
              if (!seenProjects.has(key)) {
                seenProjects.add(key)
                dotData.push({
                  color: projectsMap.get(e.task.project_id)?.color ?? 'var(--amber)',
                  faded: e.isSynthesised,
                })
              }
            }

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
                    color: isSelected
                      ? '#0a0a0a'
                      : isToday
                        ? 'var(--text)'
                        : hasTasks ? 'var(--text2)' : 'var(--text3)',
                  }}
                >
                  {day}
                </span>
                {hasTasks && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dotData.map(({ color, faded }, i) => (
                      <span
                        key={i}
                        className="rounded-full"
                        style={{
                          width: 4,
                          height: 4,
                          backgroundColor: isSelected ? 'rgba(0,0,0,0.4)' : color,
                          opacity: faded ? 0.4 : 1,
                        }}
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

  // ── Month summary ─────────────────────────────────────────────────────────
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

  // ── Selected date panel ───────────────────────────────────────────────────
  const SelectedDatePanel = (
    <div className="flex flex-col gap-3">
      {!selectedDate ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="font-syne text-sm" style={{ color: 'var(--text3)' }}>Select a date to see tasks</p>
          <p className="font-mono text-xs" style={{ color: 'var(--border2)' }}>Dates with dots have tasks due</p>
        </div>
      ) : (
        <>
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
                {selectedEntries.length === 0
                  ? 'No tasks due'
                  : `${selectedEntries.length} task${selectedEntries.length !== 1 ? 's' : ''} due`}
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

          {selectedEntries.length === 0 ? (
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
              {selectedEntries.map(({ task, isSynthesised }, idx) => {
                const project = projectsMap.get(task.project_id)
                const isDone  = task.status === 'Done'
                return (
                  <button
                    key={`${task.id}-${idx}`}
                    onClick={() => onCardClick(task)}
                    className="w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors duration-100"
                    style={{
                      borderBottom: idx < selectedEntries.length - 1 ? '1px solid var(--border)' : 'none',
                      opacity: isDone ? 0.6 : isSynthesised ? 0.65 : 1,
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
                        {task.today_flag && !isSynthesised && (
                          <Star size={10} style={{ color: 'var(--amber)' }} fill="var(--amber)" />
                        )}
                        <p
                          className="font-syne font-600 text-sm truncate"
                          style={{
                            color: isDone ? 'var(--text3)' : 'var(--text)',
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}
                        >
                          {task.title}
                        </p>
                        {isSynthesised && (
                          <span
                            className="font-mono text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{
                              background: 'var(--bg4)',
                              color: 'var(--text3)',
                              border: '1px dashed var(--border2)',
                            }}
                          >
                            upcoming
                          </span>
                        )}
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
      {/* ── DESKTOP: side-by-side ── */}
      <div className="hidden md:flex gap-4 h-full pb-6" style={{ minHeight: 0 }}>
        <div
          className="flex-shrink-0 flex flex-col gap-3"
          style={{ width: 'clamp(240px, 35%, 300px)' }}
        >
          {CalendarGrid}
          {MonthSummary}
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto">
          {SelectedDatePanel}
        </div>
      </div>

      {/* ── MOBILE: stacked ── */}
      <div className="md:hidden flex flex-col gap-3 pb-6">
        {CalendarGrid}
        {MonthSummary}
        {SelectedDatePanel}
      </div>
    </>
  )
}
