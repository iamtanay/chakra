'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Input } from '@/components/ui/Input'
import { PillToggle } from '@/components/ui/PillToggle'
import type { Project, ProjectType, Task } from '@/types'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { RefreshCw, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { recurrenceLabel, parseLocalDate } from '@/lib/recurrence'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project | null
  onSave: (project: Project) => void
  onDelete: (projectId: string) => void
  canDelete: boolean
  /** True if the current user owns this project */
  isOwner: boolean
  /** True if the current user can edit (owner or editor) */
  canEdit: boolean
  // Recurring task props — only relevant when editing an existing project
  recurringTasks?: Task[]
  onEditRecurringTask?: (task: Task) => void
  onDeleteRecurringTask?: (taskId: string) => void
}

const projectTypes: ProjectType[] = ['Work', 'Study', 'Personal']
const colors = [
  '#e8a247', '#f87171', '#2dd4bf', '#60a5fa',
  '#a78bfa', '#f472b6', '#34d399', '#fb923c',
]

function fieldLabel(text: string) {
  return (
    <label
      className="block font-mono text-xs uppercase tracking-widest mb-2"
      style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}
    >
      {text}
    </label>
  )
}

/** Format YYYY-MM-DD for display, timezone-safe. */
function formatDate(iso: string): string {
  const d = parseLocalDate(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Recurring task row ──────────────────────────────────────────────────────

interface RecurringRowProps {
  task: Task
  canEdit: boolean
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
}

function RecurringRow({ task, canEdit, onEdit, onDelete }: RecurringRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(task.id)
    } else {
      setConfirmDelete(true)
    }
  }

  useEffect(() => { setConfirmDelete(false) }, [task.id])

  const nextDue = task.next_due_date ? formatDate(task.next_due_date) : null

  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
      style={{
        background: 'var(--bg4)',
        border: confirmDelete ? '1px solid var(--rose)' : '1px solid var(--border)',
        transition: 'border-color 150ms ease',
      }}
    >
      {/* Left: info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <RefreshCw size={10} style={{ color: 'var(--amber)', flexShrink: 0 }} strokeWidth={2.5} />
          <span
            className="font-syne text-sm font-600 truncate"
            style={{ color: 'var(--text)' }}
          >
            {task.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
            {recurrenceLabel(task)}
          </span>
          {nextDue && (
            <>
              <span className="font-mono text-xs" style={{ color: 'var(--border2)' }}>·</span>
              <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                Next {nextDue}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right: actions — only for editors/owners */}
      {canEdit && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {confirmDelete ? (
            <>
              <button
                onClick={handleDelete}
                className="px-2.5 py-1.5 rounded-lg font-mono text-xs font-600 transition-all duration-150"
                style={{ background: 'var(--rose)', color: '#0a0a0a' }}
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1.5 rounded-lg font-mono text-xs transition-all duration-150"
                style={{ background: 'var(--bg5)', color: 'var(--text3)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onEdit(task)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                style={{ background: 'var(--bg5)', color: 'var(--text3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--amber)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)' }}
                title="Edit recurring task"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={handleDelete}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                style={{ background: 'var(--bg5)', color: 'var(--text3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--col-high)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)' }}
                title="Delete recurring task"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ProjectModal ───────────────────────────────────────────────────────

export function ProjectModal({
  isOpen, onClose, project, onSave, onDelete, canDelete,
  isOwner, canEdit,
  recurringTasks = [],
  onEditRecurringTask,
  onDeleteRecurringTask,
}: ProjectModalProps) {
  const [name,          setName]          = useState('')
  const [type,          setType]          = useState<ProjectType>('Work')
  const [color,         setColor]         = useState('#e8a247')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [recurringOpen, setRecurringOpen] = useState(false)

  const isMobile = useMediaQuery('(max-width: 768px)')

  useEffect(() => {
    if (project) { setName(project.name); setType(project.type); setColor(project.color) }
    else         { setName(''); setType('Work'); setColor('#e8a247') }
    setDeleteConfirm(false)
    setRecurringOpen(false)
  }, [project, isOpen])

  const handleSave = () => {
    if (!name.trim() || !canEdit) return
    onSave({
      id:         project?.id || '',
      name:       name.trim(),
      type,
      color,
      created_at: project?.created_at || new Date().toISOString(),
      owner_id:   project?.owner_id   || '',
    })
    onClose()
  }

  const handleDelete = () => {
    if (!isOwner || !project) return
    if (deleteConfirm) { onDelete(project.id); setDeleteConfirm(false); onClose() }
    else setDeleteConfirm(true)
  }

  const hasRecurring = recurringTasks.length > 0

  // ── Viewer mode: read-only display ─────────────────────────────────────────
  if (project && !canEdit) {
    const viewerContent = (
      <div className="space-y-5">
        <div
          className="px-4 py-3 rounded-xl"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
        >
          <p className="font-mono text-xs uppercase tracking-widest mb-1"
             style={{ color: 'var(--text3)' }}>Project</p>
          <p className="font-syne font-700 text-base" style={{ color: 'var(--text)' }}>{project.name}</p>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 px-4 py-3 rounded-xl" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <p className="font-mono text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text3)' }}>Type</p>
            <p className="font-syne text-sm" style={{ color: 'var(--text)' }}>{project.type}</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <div className="w-5 h-5 rounded-md" style={{ background: project.color }} />
          </div>
        </div>

        {/* Recurring tasks — read-only */}
        {hasRecurring && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button
              onClick={() => setRecurringOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 transition-all duration-150"
              style={{
                background:   recurringOpen ? 'var(--bg4)' : 'var(--bg3)',
                borderBottom: recurringOpen ? '1px solid var(--border)' : 'none',
              }}
            >
              <div className="flex items-center gap-2">
                <RefreshCw size={13} style={{ color: 'var(--amber)' }} strokeWidth={2.5} />
                <span className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--amber)', letterSpacing: '0.1em' }}>
                  Recurring tasks
                </span>
                <span className="font-mono text-xs w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(232,162,71,0.15)', color: 'var(--amber)' }}>
                  {recurringTasks.length}
                </span>
              </div>
              {recurringOpen
                ? <ChevronUp  size={14} style={{ color: 'var(--text3)' }} />
                : <ChevronDown size={14} style={{ color: 'var(--text3)' }} />}
            </button>
            {recurringOpen && (
              <div className="p-3 space-y-2" style={{ background: 'var(--bg3)' }}>
                {recurringTasks.map((task) => (
                  <RecurringRow
                    key={task.id}
                    task={task}
                    canEdit={false}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <p className="font-mono text-xs text-center" style={{ color: 'var(--text3)' }}>
          You have view-only access to this project.
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-syne font-600 text-sm"
          style={{ background: 'var(--bg4)', color: 'var(--text2)', border: '1px solid var(--border)' }}
        >
          Close
        </button>
      </div>
    )

    const title = project.name
    if (isMobile) return <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>{viewerContent}</BottomSheet>
    return <Modal isOpen={isOpen} onClose={onClose} title={title}>{viewerContent}</Modal>
  }

  // ── Editor / Owner mode ────────────────────────────────────────────────────
  const content = (
    <div className="space-y-5">
      <Input
        label="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Portfolio Site"
        autoFocus={!isMobile}
      />

      <PillToggle label="Type" options={projectTypes} value={type} onChange={setType} />

      <div>
        {fieldLabel('Color')}
        <div className="grid grid-cols-8 gap-2">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="aspect-square rounded-lg transition-all duration-150"
              style={{
                backgroundColor: c,
                border:    color === c ? `2px solid ${c}` : '2px solid transparent',
                outline:   color === c ? `2px solid var(--bg2)` : 'none',
                outlineOffset: '2px',
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
                boxShadow: color === c ? `0 0 12px ${c}60` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Recurring tasks — only shown when editing an existing project */}
      {project && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <button
            onClick={() => setRecurringOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 transition-all duration-150"
            style={{
              background:   recurringOpen ? 'var(--bg4)' : 'var(--bg3)',
              borderBottom: recurringOpen ? '1px solid var(--border)' : 'none',
            }}
          >
            <div className="flex items-center gap-2">
              <RefreshCw
                size={13}
                style={{ color: hasRecurring ? 'var(--amber)' : 'var(--text3)' }}
                strokeWidth={2.5}
              />
              <span
                className="font-mono text-xs uppercase tracking-widest"
                style={{
                  color:         hasRecurring ? 'var(--amber)' : 'var(--text3)',
                  letterSpacing: '0.1em',
                }}
              >
                Recurring tasks
              </span>
              {hasRecurring && (
                <span
                  className="font-mono text-xs w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(232,162,71,0.15)', color: 'var(--amber)' }}
                >
                  {recurringTasks.length}
                </span>
              )}
            </div>
            {recurringOpen
              ? <ChevronUp  size={14} style={{ color: 'var(--text3)' }} />
              : <ChevronDown size={14} style={{ color: 'var(--text3)' }} />}
          </button>

          {recurringOpen && (
            <div className="p-3 space-y-2" style={{ background: 'var(--bg3)' }}>
              {hasRecurring ? (
                recurringTasks.map((task) => (
                  <RecurringRow
                    key={task.id}
                    task={task}
                    canEdit={canEdit}
                    onEdit={onEditRecurringTask ?? (() => {})}
                    onDelete={onDeleteRecurringTask ?? (() => {})}
                  />
                ))
              ) : (
                <div className="py-4 text-center">
                  <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                    No recurring tasks in this project.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleSave}
          className="flex-1 py-3 rounded-xl font-syne font-600 text-sm"
          style={{ background: 'var(--amber)', color: '#0a0a0a' }}
        >
          Save
        </button>
        {/* Delete — owner only, shown when editing */}
        {project && isOwner && (
          <button
            onClick={handleDelete}
            disabled={!canDelete && !deleteConfirm}
            className="flex-1 py-3 rounded-xl font-syne text-sm transition-all duration-150"
            style={{
              background: deleteConfirm ? 'var(--rose)' : 'var(--bg4)',
              color:      deleteConfirm ? '#0a0a0a'     : 'var(--text2)',
              border:     deleteConfirm ? 'none'         : '1px solid var(--border)',
              opacity:    !canDelete && !deleteConfirm ? 0.4 : 1,
            }}
          >
            {deleteConfirm ? 'Confirm' : 'Delete project'}
          </button>
        )}
      </div>

      {project && isOwner && !canDelete && !deleteConfirm && (
        <p className="font-mono text-xs text-center" style={{ color: 'var(--text3)' }}>
          Move or delete tasks first.
        </p>
      )}
      {deleteConfirm && (
        <p className="font-mono text-xs text-center" style={{ color: 'var(--col-high)' }}>
          This cannot be undone.
        </p>
      )}
    </div>
  )

  const title = project ? 'Edit project' : 'New project'
  if (isMobile) return <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>{content}</BottomSheet>
  return <Modal isOpen={isOpen} onClose={onClose} title={title}>{content}</Modal>
}
