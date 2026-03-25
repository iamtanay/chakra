'use client'

import type { Task, Project } from '@/types'
import { useMemo } from 'react'
import { CheckCircle2, Clock, Layers } from 'lucide-react'

interface DailyPulseProps {
  tasks: Task[]
  projects: Project[]
  selectedProjectId?: string | null
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

    const hoursToday = completedToday.reduce(
      (s, t) => s + (t.actual_hours ?? t.estimated_hours ?? 0), 0
    )

    const counts: Record<string, number> = {}
    completedToday.forEach((t) => { counts[t.project_id] = (counts[t.project_id] || 0) + 1 })

    let topProjectId: string | null = null
    let max = 0
    for (const [id, c] of Object.entries(counts)) {
      if (c > max) { max = c; topProjectId = id }
    }
    const topProject = topProjectId
      ? projects.find((p) => p.id === topProjectId)
      : null

    return {
      count:  completedToday.length,
      hours:  Math.round(hoursToday * 10) / 10,
      topProject: selectedProjectId ? null : topProject, // don't show project pill when already filtered
    }
  }, [tasks, projects, selectedProjectId])

  return (
    <div
      className="flex items-center gap-6 px-5 md:px-6 h-11 flex-shrink-0"
      style={{
        background:   'var(--bg2)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 size={13} style={{ color: 'var(--teal)' }} />
        <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
          <span style={{ color: pulse.count > 0 ? 'var(--teal)' : 'var(--text)' }}>{pulse.count}</span>
          {' '}done
        </span>
      </div>

      <div
        className="w-px h-4"
        style={{ background: 'var(--border)' }}
      />

      <div className="flex items-center gap-2">
        <Clock size={13} style={{ color: 'var(--amber)' }} />
        <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
          <span style={{ color: pulse.hours > 0 ? 'var(--amber)' : 'var(--text)' }}>{pulse.hours}h</span>
          {' '}today
        </span>
      </div>

      {pulse.topProject && (
        <>
          <div className="w-px h-4" style={{ background: 'var(--border)' }} />
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: pulse.topProject.color }}
            />
            <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
              {pulse.topProject.name}
            </span>
          </div>
        </>
      )}

      {/* Scope indicator on the right */}
      <div className="ml-auto flex items-center gap-2">
        <Layers size={11} style={{ color: 'var(--text3)' }} />
        <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
          {selectedProjectId
            ? projects.find((p) => p.id === selectedProjectId)?.name ?? 'Project'
            : 'All'}
        </span>
      </div>
    </div>
  )
}