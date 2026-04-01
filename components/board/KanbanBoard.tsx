'use client'

import { useState } from 'react'
import type { Task, Project, Status } from '@/types'
import { KanbanColumn } from './KanbanColumn'

interface KanbanBoardProps {
  tasks: Task[]
  projects: Project[]
  canWrite: boolean
  onCardClick: (task: Task) => void
  onComplete: (task: Task) => void
  onUndoDone: (task: Task) => void
  onTodayToggle: (task: Task) => void
  onStatusChange: (taskId: string, newStatus: Status) => void
  onAddTask: (status: Status) => void
}

export function KanbanBoard({
  tasks, projects, canWrite,
  onCardClick, onComplete, onUndoDone, onTodayToggle, onStatusChange, onAddTask,
}: KanbanBoardProps) {
  const [draggedTaskId,  setDraggedTaskId]  = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<Status | null>(null)
  const [showOldCompleted, setShowOldCompleted] = useState(false)
  const projectsMap = new Map(projects.map((p) => [p.id, p]))

  const handleDragStart = (taskId: string) => {
    if (!canWrite) return
    setDraggedTaskId(taskId)
  }

  const handleDragOver = (e: React.DragEvent, status: Status) => {
    if (!canWrite) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }

  const handleDragLeave = () => {
    setDragOverStatus(null)
  }

  const handleDrop = (e: React.DragEvent, status: Status) => {
    if (!canWrite) return
    e.preventDefault()
    setDragOverStatus(null)
    if (!draggedTaskId) return
    const task = tasks.find((t) => t.id === draggedTaskId)
    if (task && task.status !== status) {
      if (status === 'Done') {
        onComplete(task)
      } else {
        onStatusChange(draggedTaskId, status)
      }
    }
    setDraggedTaskId(null)
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null)
    setDragOverStatus(null)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {(['Todo', 'In Progress', 'Done'] as const).map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={tasks}
          projects={projectsMap}
          canWrite={canWrite}
          onCardClick={onCardClick}
          onComplete={onComplete}
          onUndoDone={onUndoDone}
          onTodayToggle={onTodayToggle}
          onDragOver={(e) => handleDragOver(e, status)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, status)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          draggedTaskId={draggedTaskId}
          isDragOver={dragOverStatus === status}
          onAddTask={onAddTask}
          showOldCompleted={status === 'Done' ? showOldCompleted : false}
          onToggleOldCompleted={status === 'Done' ? () => setShowOldCompleted((v) => !v) : undefined}
        />
      ))}
    </div>
  )
}
