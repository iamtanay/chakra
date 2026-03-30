'use client'

import type { Task, Project } from '@/types'
import { useMemo } from 'react'
import { CheckCircle2, Clock, Layers, FolderDot } from 'lucide-react'

interface DailyPulseProps {
  tasks: Task[]
  projects: Project[]
  selectedProjectId?: string | null
}

/**
 * Round a raw hours value to exactly 2 decimal places.
 * 0.25 hrs → "0.25",  0.3333 → "0.33",  1.0 → "1.00"
 */
function fmtHours(raw: number): string {
  return (Math.round(raw * 100) / 100).toFixed(2)
}

export function DailyPulse({ tasks, projects, selectedProjectId }: DailyPulseProps) {
  const pulse = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Filter by selected project if one is chosen
    const scopedTasks = selectedProjectId
      ? tasks.filter((t) => t.project_id === selectedProjectId)
      : tasks

    const completedToday = scopedTasks.filter((t) => {
      if (t.status !== 'Done') return false
      if (!t.completed_at) return false
      const d = new Date(t.completed_at)
      d.setHours(0, 0, 0, 0)
      return d.getTime() === today.getTime()
    })

    // Sum hours — raw float, formatted to 2dp at render time
    const hoursRaw = completedToday.reduce(
      (s, t) => s + (t.actual_hours ?? t.estimated_hours ?? 0), 0
    )

    // Unique projects touched today (only meaningful in All-projects view)
    const uniqueProjectIds = new Set(completedToday.map((t) => t.project_id))
    const projectsTodayCount = uniqueProjectIds.size

    return {
      count:              completedToday.length,
      hoursFormatted:     fmtHours(hoursRaw),
      hoursRaw,
      projectsTodayCount,
      // Pass the names of projects touched today for the tooltip
      projectsTodayNames: Array.from(uniqueProjectIds)
        .map((id) => projects.find((p) => p.id === id)?.name)
        .filter(Boolean) as string[],
    }
  }, [tasks, projects, selectedProjectId])

  const scopeLabel = selectedProjectId
    ? (projects.find((p) => p.id === selectedProjectId)?.name ?? 'Project')
    : 'All'

  return (
    <div
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

      {/*
        Projects touched today — only show in "All" view and only if tasks were done
        across more than one project (single-project context already has the project name
        in the scope pill on the right, so this would be redundant).
      */}
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
              {' '}{pulse.projectsTodayCount === 1 ? 'project' : 'projects'}
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
