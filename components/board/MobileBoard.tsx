'use client'

import { useState, useRef } from 'react'
import type { Task, Project, Status } from '@/types'
import { TaskCard } from './TaskCard'
import { Plus } from 'lucide-react'

interface MobileBoardProps {
  tasks: Task[]
  projects: Project[]
  onCardClick: (task: Task) => void
  onComplete: (task: Task) => void
  onTodayToggle: (task: Task) => void
  onStatusChange: (taskId: string, newStatus: Status) => void
  onAddTask: (status: Status) => void
}

const STATUS_LIST: Status[] = ['Todo', 'In Progress', 'Done']
const statusConfig: Record<Status, { label: string; color: string }> = {
  'Todo':         { label: 'TODO', color: 'var(--col-todo)' },
  'In Progress':  { label: 'WIP',  color: 'var(--col-wip)'  },
  'Done':         { label: 'DONE', color: 'var(--col-done)' },
}

export function MobileBoard({
  tasks, projects,
  onCardClick, onComplete, onTodayToggle, onStatusChange, onAddTask,
}: MobileBoardProps) {
  const [activeStatus, setActiveStatus] = useState<Status>('Todo')
  const [swipeState, setSwipeState] = useState<{ taskId: string; distance: number } | null>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const projectsMap = new Map(projects.map((p) => [p.id, p]))
  const col = tasks.filter((t) => t.status === activeStatus)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent, taskId: string) => {
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault()
      setSwipeState({ taskId, distance: dx })
    }
  }

  const handleTouchEnd = (taskId: string) => {
    const dist = swipeState?.distance ?? 0
    if (Math.abs(dist) > 72) {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        if (dist > 0) {
          if (activeStatus === 'Todo') onStatusChange(taskId, 'In Progress')
          else if (activeStatus === 'In Progress') onComplete(task)
        } else {
          if (activeStatus === 'In Progress') onStatusChange(taskId, 'Todo')
          else if (activeStatus === 'Done')    onStatusChange(taskId, 'In Progress')
        }
      }
    }
    setSwipeState(null)
  }

  return (
    <div>
      {/* Tab strip */}
      <div
        className="flex gap-2 sticky top-0 z-10 pt-3 pb-2.5 px-1"
        style={{ background: 'var(--bg)' }}
      >
        {STATUS_LIST.map((status) => {
          const active = activeStatus === status
          const count  = tasks.filter((t) => t.status === status).length
          const cfg    = statusConfig[status]
          return (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className="flex-1 py-2.5 rounded-lg font-mono text-xs font-600 tracking-widest transition-all duration-150"
              style={{
                background:    active ? 'var(--bg4)' : 'var(--bg3)',
                color:         active ? cfg.color    : 'var(--text3)',
                border:        active ? `1px solid ${cfg.color}` : '1px solid var(--border)',
                letterSpacing: '0.1em',
              }}
            >
              {cfg.label}&nbsp;·&nbsp;{count}
            </button>
          )
        })}
      </div>

      {/* Cards */}
      <div className="space-y-2.5 pb-28 px-1">
        {col.length === 0 ? (
          <button
            onClick={() => onAddTask(activeStatus)}
            className="w-full flex flex-col items-center justify-center h-36 rounded-xl gap-2 transition-all duration-150"
            style={{ border: '1.5px dashed var(--border2)' }}
          >
            <Plus size={18} style={{ color: 'var(--text3)' }} />
            <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
              Add task
            </span>
          </button>
        ) : (
          <>
            {col.map((task) => {
              const swiping   = swipeState?.taskId === task.id
              const dist      = swiping ? swipeState!.distance : 0
              const pct       = Math.min(Math.abs(dist) / 72, 1)
              const rightSwipe = dist > 0
              const hintColor  = rightSwipe
                ? (activeStatus === 'Todo' ? 'var(--col-wip)' : 'var(--col-done)')
                : (activeStatus === 'Done' ? 'var(--col-wip)' : 'var(--col-todo)')

              return (
                <div
                  key={task.id}
                  className="relative overflow-hidden rounded-xl"
                  onTouchStart={handleTouchStart}
                  onTouchMove={(e) => handleTouchMove(e, task.id)}
                  onTouchEnd={() => handleTouchEnd(task.id)}
                >
                  {Math.abs(dist) > 6 && (
                    <div
                      className="absolute inset-0 flex items-center justify-center rounded-xl z-0"
                      style={{ background: hintColor, opacity: pct * 0.7 }}
                    />
                  )}
                  <div
                    className="relative z-10"
                    style={{
                      transform:  `translateX(${dist}px)`,
                      transition: swiping ? 'none' : 'transform 200ms ease',
                    }}
                  >
                    <TaskCard
                      task={task}
                      project={projectsMap.get(task.project_id)}
                      onCardClick={onCardClick}
                      onComplete={onComplete}
                      onTodayToggle={onTodayToggle}
                    />
                  </div>
                </div>
              )
            })}

            {/* Add more at bottom */}
            <button
              onClick={() => onAddTask(activeStatus)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-150"
              style={{ border: '1px dashed var(--border2)', color: 'var(--text3)' }}
            >
              <Plus size={14} />
              <span className="font-mono text-xs">Add task</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
