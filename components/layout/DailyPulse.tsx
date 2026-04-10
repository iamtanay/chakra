'use client'

import type { Task, Project, TaskOccurrence } from '@/types'
import { useMemo } from 'react'
import { CheckCircle2, Clock, FolderDot, Layers } from 'lucide-react'

interface DailyPulseProps {
  tasks: Task[]
  projects: Project[]
  occurrences: TaskOccurrence[]   // ← NEW: recurring cycle completions
  selectedProjectId?: string | null
  currentUserId?: string | null
}

function fmtHours(raw: number): string {
  return (Math.round(raw * 100) / 100).toFixed(2)
}

export function DailyPulse({ tasks, projects, occurrences, selectedProjectId, currentUserId }: DailyPulseProps) {
  const pulse = useMemo(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // ── Non-recurring tasks completed today ───────────────────────────────
    const scopedTasks = selectedProjectId
      ? tasks.filter((t) => t.project_id === selectedProjectId)
      : tasks

    const nonRecurringDoneToday = scopedTasks.filter((t) => {
      if (t.status !== 'Done') return false
      if (t.is_recurring) return false   // recurring hours come from occurrences
      if (!t.completed_at) return false
      if (currentUserId && t.completed_by && t.completed_by !== currentUserId) return false
      const d = new Date(t.completed_at)
      d.setHours(0, 0, 0, 0)
      return d.getTime() === todayStart.getTime()
    })

    // ── Recurring cycles completed today (from task_occurrences) ──────────
    // We need to join back to tasks to apply the project filter.
    // Build a fast lookup: task_id → project_id
    const taskProjectMap = new Map(tasks.map((t) => [t.id, t.project_id]))

    const recurringDoneToday = occurrences.filter((o) => {
      if (currentUserId && o.completed_by && o.completed_by !== currentUserId) return false
      const d = new Date(o.completed_at)
      d.setHours(0, 0, 0, 0)
      if (d.getTime() !== todayStart.getTime()) return false
      if (selectedProjectId) {
        const projectId = taskProjectMap.get(o.task_id)
        if (projectId !== selectedProjectId) return false
      }
      return true
    })

    // ── Totals ────────────────────────────────────────────────────────────
    const count = nonRecurringDoneToday.length + recurringDoneToday.length

    const nonRecurringHours = nonRecurringDoneToday.reduce(
      (s, t) => s + (t.actual_hours ?? t.estimated_hours ?? 0), 0
    )
    const recurringHours = recurringDoneToday.reduce(
      (s, o) => s + (o.actual_hours ?? 0), 0
    )
    const hoursRaw = nonRecurringHours + recurringHours

    // ── Projects touched today ────────────────────────────────────────────
    const uniqueProjectIds = new Set([
      ...nonRecurringDoneToday.map((t) => t.project_id),
      ...recurringDoneToday.map((o) => taskProjectMap.get(o.task_id)).filter(Boolean) as string[],
    ])
    const projectsTodayCount = uniqueProjectIds.size

    return {
      count,
      hoursFormatted:     fmtHours(hoursRaw),
      hoursRaw,
      projectsTodayCount,
      projectsTodayNames: Array.from(uniqueProjectIds)
        .map((id) => projects.find((p) => p.id === id)?.name)
        .filter(Boolean) as string[],
    }
  }, [tasks, projects, occurrences, selectedProjectId, currentUserId])

  const scopeLabel = selectedProjectId
    ? (projects.find((p) => p.id === selectedProjectId)?.name ?? 'Space')
    : 'All'

  return (
    <div
      data-tour="daily-pulse"
      className="flex items-center gap-6 px-5 md:px-6 h-11 flex-shrink-0"
      style={{
        background:   'var(--bg2)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Tasks done today */}
      <div className="flex items-center gap-2">
        <CheckCircle2 size={13} style={{ color: 'var(--teal)' }} />
        <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
          <span style={{ color: pulse.count > 0 ? 'var(--teal)' : 'var(--text)' }}>{pulse.count}</span>
          {' '}done
        </span>
      </div>

      <div className="w-px h-4" style={{ background: 'var(--border)' }} />

      {/* Hours logged today */}
      <div className="flex items-center gap-2">
        <Clock size={13} style={{ color: 'var(--amber)' }} />
        <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
          <span style={{ color: pulse.hoursRaw > 0 ? 'var(--amber)' : 'var(--text)' }}>
            {pulse.hoursFormatted}h
          </span>
          {' '}today
        </span>
      </div>

      {!selectedProjectId && pulse.count > 0 && pulse.projectsTodayCount > 0 && (
        <>
          <div className="w-px h-4" style={{ background: 'var(--border)' }} />
          <div
            className="flex items-center gap-2"
            title={pulse.projectsTodayNames.join(', ')}
          >
            <FolderDot size={13} style={{ color: 'var(--violet)' }} />
            <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
              <span style={{ color: 'var(--violet)' }}>{pulse.projectsTodayCount}</span>
              {' '}{pulse.projectsTodayCount === 1 ? 'space' : 'spaces'}
            </span>
          </div>
        </>
      )}

      {/* Scope indicator */}
      <div className="ml-auto flex items-center gap-2">
        <Layers size={11} style={{ color: 'var(--text3)' }} />
        <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
          {scopeLabel}
        </span>
      </div>
    </div>
  )
}