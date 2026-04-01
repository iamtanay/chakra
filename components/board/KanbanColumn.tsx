'use client'

import { useMemo } from 'react'
import type { Task, Project, Status } from '@/types'
import { TaskCard } from './TaskCard'
import { Plus, History } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface KanbanColumnProps {
  status: 'Todo' | 'In Progress' | 'Done'
  tasks: Task[]
  projects: Map<string, Project>
  canWrite: boolean
  onCardClick: (task: Task) => void
  onComplete: (task: Task) => void
  onUndoDone: (task: Task) => void
  onTodayToggle: (task: Task) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onDragStart: (taskId: string) => void
  onDragEnd: () => void
  draggedTaskId: string | null
  isDragOver: boolean
  onAddTask: (status: Status) => void
  // Done-column specific
  showOldCompleted?: boolean
  onToggleOldCompleted?: () => void
}

const statusConfig = {
  Todo:          { label: 'TODO',        color: 'var(--col-todo)', dim: 'rgba(69,67,64,0.06)'    },
  'In Progress': { label: 'IN PROGRESS', color: 'var(--col-wip)',  dim: 'rgba(232,162,71,0.05)'  },
  Done:          { label: 'DONE',        color: 'var(--col-done)', dim: 'rgba(45,212,191,0.04)'  },
}

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
const DONE_TTL_MS = 24 * 60 * 60 * 1000

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDate = a.next_due_date ?? a.due_date
    const bDate = b.next_due_date ?? b.due_date
    if (aDate && bDate) {
      const diff = aDate.localeCompare(bDate)
      if (diff !== 0) return diff
    } else if (aDate) return -1
    else if (bDate) return 1
    return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
  })
}

function isOlderThan24h(task: Task): boolean {
  if (!task.completed_at) return false
  return Date.now() - new Date(task.completed_at).getTime() > DONE_TTL_MS
}

export function KanbanColumn({
  status, tasks, projects, canWrite,
  onCardClick, onComplete, onUndoDone, onTodayToggle,
  onDragOver, onDragLeave, onDrop,
  onDragStart, onDragEnd,
  draggedTaskId, isDragOver,
  onAddTask,
  showOldCompleted = false,
  onToggleOldCompleted,
}: KanbanColumnProps) {
  const cfg = statusConfig[status]
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const allInStatus = useMemo(
    () => sortTasks(tasks.filter((t) => t.status === status)),
    [tasks, status],
  )

  const { visibleTasks, hiddenCount } = useMemo(() => {
    if (status !== 'Done') {
      return { visibleTasks: allInStatus, hiddenCount: 0 }
    }
    const recent: Task[] = []
    const old: Task[]    = []
    for (const t of allInStatus) {
      if (isOlderThan24h(t)) old.push(t)
      else recent.push(t)
    }
    const showOld = isDesktop && showOldCompleted
    return {
      visibleTasks: showOld ? allInStatus : recent,
      hiddenCount:  old.length,
    }
  }, [allInStatus, status, isDesktop, showOldCompleted])

  const col = visibleTasks

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden transition-all duration-150"
      style={{
        background: 'var(--bg2)',
        border:     isDragOver ? `1px solid ${cfg.color}` : '1px solid var(--border)',
        borderTop:  `3px solid ${cfg.color}`,
        minHeight:  '420px',
        boxShadow:  isDragOver ? `0 0 20px ${cfg.color}22` : undefined,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
          <span
            className="font-mono text-xs font-600 tracking-widest uppercase"
            style={{ color: cfg.color, letterSpacing: '0.12em' }}
          >
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Done column: web-only "show history" toggle */}
          {status === 'Done' && isDesktop && hiddenCount > 0 && onToggleOldCompleted && (
            <button
              onClick={onToggleOldCompleted}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all duration-150 font-mono text-xs"
              style={{
                color:      showOldCompleted ? '#0a0a0a'          : 'var(--text3)',
                background: showOldCompleted ? 'var(--col-done)'  : 'var(--bg4)',
                border:     showOldCompleted ? 'none'              : '1px solid var(--border)',
              }}
              title={showOldCompleted ? 'Hide older completed tasks' : `Show ${hiddenCount} older completed task${hiddenCount === 1 ? '' : 's'}`}
            >
              <History size={11} strokeWidth={2} />
              {showOldCompleted ? 'Hide history' : `+${hiddenCount}`}
            </button>
          )}

          <span
            className="font-mono text-xs w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg4)', color: 'var(--text3)' }}
          >
            {col.length}
          </span>

          {/* Add task button — hidden for viewers */}
          {canWrite && (
            <button
              onClick={() => onAddTask(status)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
              style={{ color: 'var(--text3)', background: 'var(--bg4)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--amber)'
                e.currentTarget.style.color      = '#0a0a0a'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg4)'
                e.currentTarget.style.color      = 'var(--text3)'
              }}
              title={`Add task to ${cfg.label}`}
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Cards drop zone */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-2.5"
        style={{
          background: isDragOver ? `${cfg.color}08` : col.length === 0 ? cfg.dim : undefined,
          transition: 'background 150ms ease',
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {col.length === 0 ? (
          canWrite ? (
            <button
              onClick={() => onAddTask(status)}
              className="w-full flex flex-col items-center justify-center h-28 rounded-xl gap-2 transition-all duration-150 group"
              style={{ border: `1.5px dashed ${isDragOver ? cfg.color : 'var(--border2)'}` }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--amber)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = isDragOver ? cfg.color : 'var(--border2)')}
            >
              <Plus
                size={16}
                className="transition-colors duration-150"
                style={{ color: isDragOver ? cfg.color : 'var(--text3)' }}
              />
              <span
                className="font-mono text-xs transition-colors duration-150"
                style={{ color: isDragOver ? cfg.color : 'var(--text3)' }}
              >
                {isDragOver ? 'Drop here' : 'Add task'}
              </span>
            </button>
          ) : (
            // Viewer empty state — no button
            <div
              className="w-full flex flex-col items-center justify-center h-28 rounded-xl gap-2"
              style={{ border: '1.5px dashed var(--border2)' }}
            >
              <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                No tasks
              </span>
            </div>
          )
        ) : (
          <>
            {/* Add task — top of list — hidden for viewers */}
            {canWrite && (
              <button
                onClick={() => onAddTask(status)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all duration-150"
                style={{ color: 'var(--text3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.background = 'var(--bg4)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'transparent' }}
              >
                <Plus size={12} />
                <span className="font-mono text-xs">Add task</span>
              </button>
            )}

            {col.map((task) => {
              const isOldCompleted = status === 'Done' && isOlderThan24h(task)

              return (
                <div
                  key={task.id}
                  draggable={canWrite}
                  onDragStart={canWrite ? (e) => {
                    e.dataTransfer.effectAllowed = 'move'
                    onDragStart(task.id)
                  } : undefined}
                  onDragEnd={canWrite ? onDragEnd : undefined}
                  style={{ cursor: canWrite ? 'grab' : 'default' }}
                >
                  <TaskCard
                    task={task}
                    project={projects.get(task.project_id)}
                    onCardClick={onCardClick}
                    onComplete={onComplete}
                    onUndoDone={onUndoDone}
                    onTodayToggle={onTodayToggle}
                    isDragging={draggedTaskId === task.id}
                    isOldCompleted={isOldCompleted}
                  />
                </div>
              )
            })}

            {status === 'Done' && isDesktop && showOldCompleted && hiddenCount > 0 && (
              <p
                className="text-center font-mono text-xs py-2"
                style={{ color: 'var(--text3)', opacity: 0.5 }}
              >
                showing {hiddenCount} older task{hiddenCount === 1 ? '' : 's'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
