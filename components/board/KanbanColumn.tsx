'use client'

import type { Task, Project, Status } from '@/types'
import { TaskCard } from './TaskCard'
import { Plus } from 'lucide-react'

interface KanbanColumnProps {
  status: 'Todo' | 'In Progress' | 'Done'
  tasks: Task[]
  projects: Map<string, Project>
  onCardClick: (task: Task) => void
  onComplete: (task: Task) => void
  onTodayToggle: (task: Task) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onDragStart: (taskId: string) => void
  onDragEnd: () => void
  draggedTaskId: string | null
  isDragOver: boolean
  onAddTask: (status: Status) => void
}

const statusConfig = {
  Todo:          { label: 'TODO',        color: 'var(--col-todo)', dim: 'rgba(69,67,64,0.06)'    },
  'In Progress': { label: 'IN PROGRESS', color: 'var(--col-wip)',  dim: 'rgba(232,162,71,0.05)'  },
  Done:          { label: 'DONE',        color: 'var(--col-done)', dim: 'rgba(45,212,191,0.04)'  },
}

export function KanbanColumn({
  status, tasks, projects,
  onCardClick, onComplete, onTodayToggle,
  onDragOver, onDragLeave, onDrop,
  onDragStart, onDragEnd,
  draggedTaskId, isDragOver,
  onAddTask,
}: KanbanColumnProps) {
  const cfg = statusConfig[status]
  const col = tasks.filter((t) => t.status === status)

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
          <span
            className="font-mono text-xs w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg4)', color: 'var(--text3)' }}
          >
            {col.length}
          </span>
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
          <>
            {col.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  onDragStart(task.id)
                }}
                onDragEnd={onDragEnd}
                style={{ cursor: 'grab' }}
              >
                <TaskCard
                  task={task}
                  project={projects.get(task.project_id)}
                  onCardClick={onCardClick}
                  onComplete={onComplete}
                  onTodayToggle={onTodayToggle}
                  isDragging={draggedTaskId === task.id}
                />
              </div>
            ))}
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
          </>
        )}
      </div>
    </div>
  )
}