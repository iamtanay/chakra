'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'
import { PageTopBar } from '@/components/layout/PageTopBar'
import { DailyPulse } from '@/components/layout/DailyPulse'
import { TaskModal, type NewTaskData } from '@/components/modals/TaskModal'
import { CompleteModal } from '@/components/modals/CompleteModal'
import { Logo } from '@/components/ui/Logo'
import { Check, RefreshCw, Star, Flame } from 'lucide-react'
import { KarmaWidget } from '@/components/karma/KarmaWidget'
import type { Task, Project, Status } from '@/types'
import {
  advanceRecurringCycle,
  toISODate,
  recurrenceLabel,
  parseLocalDate,
  isWarmStreak,
} from '@/lib/recurrence'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => (createClient() as any).from(table)

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }

const priorityColors: Record<string, string> = {
  High:   'var(--col-high)',
  Medium: 'var(--col-medium)',
  Low:    'var(--col-low)',
}

const categoryAbbr: Record<string, string> = {
  Development:            'DEV',
  Research:               'RES',
  'Review / QA':          'QA',
  Design:                 'DSN',
  'Journal Writing':      'JNL',
  'Document Generation':  'DOC',
  'Finance & Banking':    'FIN',
  'Bills & Payments':     'BILL',
  'Home & Maintenance':   'HOME',
  'Cleaning & Chores':    'CLN',
  'Health & Wellness':    'HLTH',
  'Errands & Shopping':   'ERR',
  'Family & Social':      'FAM',
  'Travel & Bookings':    'TRV',
  'Legal & Admin':        'LGL',
  'Self Care':            'SLF',
  Reading:                'READ',
  'Note Taking':          'NOTE',
  Practice:               'PRAC',
  Revision:               'REV',
  Assignment:             'ASGN',
  'Exam Prep':            'EXAM',
}

export default function TodayPage() {
  const [tasks,          setTasks]          = useState<Task[]>([])
  const [projects,       setProjects]       = useState<Project[]>([])
  const [loading,        setLoading]        = useState(true)
  const [logoSpin,       setLogoSpin]       = useState<'once' | 'fast' | 'loop' | null>('once')
  const [editingTask,    setEditingTask]    = useState<Task | null>(null)
  const [modalOpen,      setModalOpen]      = useState(false)
  const [completingTask, setCompletingTask] = useState<Task | null>(null)
  const [userId,         setUserId]         = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setLogoSpin(null), 600)
    return () => clearTimeout(t)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await (createClient() as any).auth.getUser()
      setUserId(user?.id ?? null)
      const [{ data: pd, error: pe }, { data: td, error: te }] = await Promise.all([
        db('projects').select('*'),
        db('tasks').select('*'),
      ])
      if (pe) throw pe
      if (te) throw te
      setProjects((pd || []) as Project[])
      setTasks((td || []) as Task[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const todayStr = toISODate(new Date())

  const isRecentlyOverdue = (t: Task): boolean => {
    if (t.is_recurring) return false
    const dueISO = t.due_date
    if (!dueISO) return false
    const dueDate   = parseLocalDate(dueISO)
    const todayDate = parseLocalDate(todayStr)
    const diffMs    = todayDate.getTime() - dueDate.getTime()
    const diffDays  = diffMs / (1000 * 60 * 60 * 24)
    return diffDays >= 1 && diffDays <= 2
  }

  const isInToday = (t: Task) => {
    const effectiveDate = t.next_due_date ?? t.due_date
    return t.today_flag || effectiveDate === todayStr || isRecentlyOverdue(t)
  }

  const todayTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'Done' && isInToday(t))
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 1
        const pb = PRIORITY_ORDER[b.priority] ?? 1
        if (pa !== pb) return pa - pb
        const aDate = a.next_due_date ?? a.due_date
        const bDate = b.next_due_date ?? b.due_date
        if (aDate && bDate) return aDate.localeCompare(bDate)
        if (aDate) return -1
        if (bDate) return 1
        return 0
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, todayStr])

  const doneTodayTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'Done' && isInToday(t))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, todayStr])

  const projectsMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  )

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTaskSave = async (updatedTask: Task) => {
    try {
      setLogoSpin('loop')
      setTasks((prev) => prev.map((t) => t.id === updatedTask.id ? updatedTask : t))
      const { actual_hours, completed_at, ...updateData } = updatedTask
      await db('tasks').update(updateData).eq('id', updatedTask.id)
      setLogoSpin(null)
    } catch {
      loadData()
      setLogoSpin(null)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      setLogoSpin('loop')
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      await db('tasks').delete().eq('id', taskId)
      setLogoSpin(null)
    } catch {
      loadData()
      setLogoSpin(null)
    }
  }

  const handleTaskCreate = async (_data: NewTaskData) => { /* no-op */ }

  const handleTodayToggle = async (task: Task) => {
    try {
      setTasks((prev) =>
        prev.map((t) => t.id === task.id ? { ...t, today_flag: !t.today_flag } : t)
      )
      await db('tasks').update({ today_flag: !task.today_flag }).eq('id', task.id)
    } catch {
      loadData()
    }
  }

  const handleComplete = (task: Task) => setCompletingTask(task)

  const handleCompleteConfirm = async (hours: number | null, note: string | null) => {
    if (!completingTask) return
    const task = completingTask
    setCompletingTask(null)

    try {
      setLogoSpin('loop')

      if (task.is_recurring) {
        const advanced = advanceRecurringCycle(task)
        const dbUpdate = {
          status:               advanced.status,
          actual_hours:         null,
          completed_at:         null,
          today_flag:           false,
          last_completed_cycle: advanced.last_completed_cycle,
          next_due_date:        advanced.next_due_date,
          current_streak:       advanced.current_streak,
          completion_note:      null,
        }
        setTasks((prev) => prev.map((t) => t.id === task.id ? advanced : t))
        await db('tasks').update(dbUpdate).eq('id', task.id)
      } else {
        const now = new Date().toISOString()
        const updated: Task = {
          ...task,
          status:          'Done',
          actual_hours:    hours,
          completed_at:    now,
          completed_by:    userId,
          completion_note: note,
        }
        setTasks((prev) => prev.map((t) => t.id === task.id ? updated : t))
        await db('tasks')
          .update({ status: 'Done', actual_hours: hours, completed_at: now, completed_by: userId, completion_note: note })
          .eq('id', task.id)
      }

      setLogoSpin('fast')
      setTimeout(() => setLogoSpin(null), 400)
    } catch {
      loadData()
      setLogoSpin(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <Logo size={48} spin="loop" />
      </div>
    )
  }

  const totalToday = todayTasks.length + doneTodayTasks.length

  return (
    <AppShell projects={projects} selectedProjectId={null} onProjectSelect={() => {}}>
      {/* ── Unified top bar ── */}
      <PageTopBar
        title="Today"
        logoSpin={logoSpin}
        badge={totalToday > 0 ? totalToday : null}
      />

      {/* DailyPulse strip */}
      <DailyPulse tasks={tasks} projects={projects} selectedProjectId={null} />

      {/* Body */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Daily Karma rituals */}
        {userId && (
          <div className="max-w-2xl mx-auto mb-6">
            <KarmaWidget userId={userId} compact={true} />
          </div>
        )}

        {totalToday === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="font-syne text-sm" style={{ color: 'var(--text3)' }}>
              Nothing due or marked for today.
            </p>
            <p className="font-mono text-xs" style={{ color: 'var(--text3)', opacity: 0.6 }}>
              Star a task on the board or set a deadline to add it here.
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">

            {/* Pending tasks */}
            {todayTasks.length > 0 && (
              <div className="space-y-2.5">
                {todayTasks.map((task) => (
                  <TodayTaskRow
                    key={task.id}
                    task={task}
                    project={projectsMap.get(task.project_id)}
                    onEdit={() => { setEditingTask(task); setModalOpen(true) }}
                    onComplete={() => handleComplete(task)}
                    onUnstar={() => handleTodayToggle(task)}
                    isAutoAdded={!task.today_flag}
                  />
                ))}
              </div>
            )}

            {/* Completed today section */}
            {doneTodayTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="font-mono text-xs uppercase tracking-widest"
                    style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
                  >
                    Done (Last 24 Hours)
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  <span className="font-mono text-xs" style={{ color: 'var(--teal)' }}>
                    {doneTodayTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {doneTodayTasks.map((task) => (
                    <TodayDoneRow
                      key={task.id}
                      task={task}
                      project={projectsMap.get(task.project_id)}
                      onEdit={() => { setEditingTask(task); setModalOpen(true) }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <TaskModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTask(null) }}
        task={editingTask}
        projects={projects}
        allTasks={tasks}
        canWrite={true}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
        onCreate={handleTaskCreate}
      />

      <CompleteModal
        isOpen={completingTask !== null}
        onClose={() => setCompletingTask(null)}
        task={completingTask}
        onConfirm={handleCompleteConfirm}
      />
    </AppShell>
  )
}

// ── Today task row ─────────────────────────────────────────────────────────────

interface TodayTaskRowProps {
  task: Task
  project: Project | undefined
  onEdit: () => void
  onComplete: () => void
  onUnstar: () => void
  isAutoAdded: boolean
}

function TodayTaskRow({ task, project, onEdit, onComplete, onUnstar, isAutoAdded }: TodayTaskRowProps) {
  const pColor = priorityColors[task.priority] ?? 'var(--text3)'
  const abbr   = categoryAbbr[task.category] ?? task.category?.slice(0, 3).toUpperCase() ?? '—'
  const streak = task.current_streak ?? 0
  const warm   = task.is_recurring && isWarmStreak(streak)

  return (
    <div
      onClick={onEdit}
      className="flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer card-lift"
      style={{
        background: 'var(--bg2)',
        border:     `1px solid ${warm ? 'rgba(232,162,71,0.35)' : 'var(--border)'}`,
        boxShadow:  warm ? '0 0 14px rgba(232,162,71,0.08)' : undefined,
      }}
    >
      {/* Priority dot */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: pColor }}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
            {abbr}
          </span>

          {project && (
            <span
              className="font-syne text-xs px-1.5 py-0.5 rounded-full"
              style={{ color: project.color, background: `${project.color}18` }}
            >
              {project.name}
            </span>
          )}

          {task.is_recurring && (
            <span
              className="flex items-center gap-1 font-mono text-xs"
              style={{ color: 'var(--amber)' }}
            >
              <RefreshCw size={9} strokeWidth={2.5} />
              {recurrenceLabel(task)}
            </span>
          )}

          {task.is_recurring && streak > 0 && (
            <span
              className="flex items-center gap-1 font-mono text-xs px-1.5 py-0.5 rounded-full"
              style={{
                color:      warm ? '#080909'      : 'var(--text3)',
                background: warm ? 'var(--amber)'  : 'var(--bg4)',
              }}
            >
              {warm && <Flame size={9} strokeWidth={2} />}
              {streak}
            </span>
          )}

          {isAutoAdded && (
            <span
              className="font-mono text-xs px-1.5 py-0.5 rounded-full"
              style={{
                color:         'var(--col-high)',
                background:    'rgba(248,113,113,0.12)',
                letterSpacing: '0.04em',
              }}
            >
              due today
            </span>
          )}
        </div>

        <p
          className="font-syne font-600 text-sm truncate"
          style={{ color: 'var(--text)' }}
        >
          {task.title}
        </p>
      </div>

      {/* Unstar button — only for manually starred tasks */}
      {!isAutoAdded && (
        <button
          onClick={(e) => { e.stopPropagation(); onUnstar() }}
          className="flex-shrink-0 p-1.5 rounded-lg transition-all duration-150"
          style={{ color: 'var(--amber)' }}
          title="Remove from today"
        >
          <Star size={14} fill="var(--amber)" />
        </button>
      )}

      {/* Complete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onComplete() }}
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150"
        style={{
          background: 'transparent',
          border:     task.is_recurring ? '2px solid var(--amber)' : '2px solid var(--teal)',
        }}
        title={task.is_recurring ? 'Complete this cycle' : 'Mark complete'}
      >
        {task.is_recurring
          ? <RefreshCw size={14} style={{ color: 'var(--amber)' }} strokeWidth={2.5} />
          : <Check     size={15} style={{ color: 'var(--teal)'  }} strokeWidth={2.5} />
        }
      </button>
    </div>
  )
}

// ── Done today row ──────────────────────────────────────────────────────────────

interface TodayDoneRowProps {
  task: Task
  project: Project | undefined
  onEdit: () => void
}

function TodayDoneRow({ task, project, onEdit }: TodayDoneRowProps) {
  const abbr = categoryAbbr[task.category] ?? task.category?.slice(0, 3).toUpperCase() ?? '—'

  return (
    <div
      onClick={onEdit}
      className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150"
      style={{
        background: 'var(--bg2)',
        border:     '1px solid var(--border)',
        opacity:    0.65,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.65')}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--col-done)' }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>{abbr}</span>
          {project && (
            <span
              className="font-syne text-xs px-1.5 py-0.5 rounded-full"
              style={{ color: project.color, background: `${project.color}18` }}
            >
              {project.name}
            </span>
          )}
        </div>
        <p
          className="font-syne text-sm truncate"
          style={{ color: 'var(--text2)', textDecoration: 'line-through' }}
        >
          {task.title}
        </p>
        {task.completion_note && (
          <p
            className="font-syne text-xs italic mt-0.5 truncate"
            style={{ color: 'var(--text3)' }}
          >
            {task.completion_note}
          </p>
        )}
      </div>

      {task.actual_hours != null && (
        <span className="font-mono text-xs flex-shrink-0" style={{ color: 'var(--teal)' }}>
          {task.actual_hours}h
        </span>
      )}
    </div>
  )
}
