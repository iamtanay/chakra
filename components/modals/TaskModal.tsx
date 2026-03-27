'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { PillToggle } from '@/components/ui/PillToggle'
import type { Task, Project, Status, Priority, Category } from '@/types'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { X } from 'lucide-react'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  projects: Project[]
  defaultProjectId?: string
  defaultStatus?: Status
  onSave: (task: Task) => void
  onDelete: (taskId: string) => void
  onCreate: (data: NewTaskData) => void
}

export interface NewTaskData {
  title: string
  description: string | null
  project_id: string
  status: Status
  priority: Priority
  category: Category
  due_date: string | null
  estimated_hours: number | null
  today_flag: boolean
}

const categories: Category[] = [
  'Document Generation', 'Journal Writing', 'Research',
  'Development', 'Review / QA', 'Design',
]
const priorities: Priority[] = ['High', 'Medium', 'Low']
const statuses: Status[]     = ['Todo', 'In Progress', 'Done']

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: '12px',
  outline: 'none', background: 'var(--bg4)', border: '1px solid var(--border)',
  color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontSize: '14px',
  appearance: 'none', cursor: 'pointer',
}

const fieldLabel = (text: string) => (
  <label
    className="block font-mono text-xs uppercase tracking-widest mb-2"
    style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}
  >
    {text}
  </label>
)

// ── Mobile-only Task Sheet ──────────────────────────────────────────
interface MobileTaskSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

function MobileTaskSheet({ isOpen, onClose, title, children }: MobileTaskSheetProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 md:hidden animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="fixed bottom-0 left-0 right-0 rounded-t-3xl sheet-enter flex flex-col"
        style={{
          background:    'var(--bg2)',
          borderTop:     '1px solid var(--border2)',
          boxShadow:     '0 -16px 60px rgba(0,0,0,0.5)',
          maxHeight:     '58vh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--bg5)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {title && (
            <h2 className="font-syne font-700 text-base" style={{ color: 'var(--text)' }}>
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center ml-auto"
            style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="overflow-y-auto p-5 flex-1"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export function TaskModal({
  isOpen, onClose, task, projects,
  defaultProjectId, defaultStatus,
  onSave, onDelete, onCreate,
}: TaskModalProps) {
  const isCreating = task === null
  const firstProjectId = defaultProjectId || projects[0]?.id || ''

  const [title,          setTitle]          = useState('')
  const [description,    setDescription]    = useState('')
  const [projectId,      setProjectId]      = useState(firstProjectId)
  const [status,         setStatus]         = useState<Status>(defaultStatus || 'Todo')
  const [priority,       setPriority]       = useState<Priority>('Medium')
  const [category,       setCategory]       = useState<Category>('Development')
  const [dueDate,        setDueDate]        = useState('')
  const [estHours,       setEstHours]       = useState('')
  const [todayFlag,      setTodayFlag]      = useState(false)
  const [deleteConfirm,  setDeleteConfirm]  = useState(false)

  const isMobile = useMediaQuery('(max-width: 768px)')

  useEffect(() => {
    if (!isOpen) return
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setProjectId(task.project_id)
      setStatus(task.status)
      setPriority(task.priority)
      setCategory(task.category)
      setDueDate(task.due_date || '')
      setEstHours(task.estimated_hours?.toString() || '')
      setTodayFlag(task.today_flag)
      setDeleteConfirm(false)
    } else {
      setTitle('')
      setDescription('')
      setProjectId(defaultProjectId || projects[0]?.id || '')
      setStatus(defaultStatus || 'Todo')
      setPriority('Medium')
      setCategory('Development')
      setDueDate('')
      setEstHours('')
      setTodayFlag(false)
      setDeleteConfirm(false)
    }
  }, [isOpen, task, defaultProjectId, defaultStatus])

  if (!isOpen) return null
  if (projects.length === 0) {
    const msg = (
      <div className="py-8 text-center">
        <p className="font-syne text-sm mb-1" style={{ color: 'var(--text2)' }}>No projects yet.</p>
        <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>Create a project first.</p>
      </div>
    )
    const title_ = 'Add task'
    if (isMobile) return <MobileTaskSheet isOpen={isOpen} onClose={onClose} title={title_}>{msg}</MobileTaskSheet>
    return <Modal isOpen={isOpen} onClose={onClose} title={title_}>{msg}</Modal>
  }

  const handleSubmit = () => {
    if (!title.trim()) return
    if (isCreating) {
      onCreate({
        title:           title.trim(),
        description:     description.trim() || null,
        project_id:      projectId,
        status,
        priority,
        category,
        due_date:        dueDate || null,
        estimated_hours: estHours ? parseFloat(estHours) : null,
        today_flag:      todayFlag,
      })
    } else {
      onSave({
        ...task!,
        title:           title.trim(),
        description:     description.trim() || null,
        project_id:      projectId,
        status,
        priority,
        category,
        due_date:        dueDate || null,
        estimated_hours: estHours ? parseFloat(estHours) : null,
        today_flag:      todayFlag,
      })
    }
    onClose()
  }

  const handleDelete = () => {
    if (deleteConfirm) { onDelete(task!.id); onClose() }
    else setDeleteConfirm(true)
  }

  const content = (
    <div className="space-y-4">
      {/* Title — no autoFocus on mobile to avoid keyboard popup */}
      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs doing?"
        autoFocus={!isMobile}
      />

      {/* Description */}
      <div>
        {fieldLabel('Description')}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes…"
          rows={3}
          className="w-full px-4 py-3 rounded-xl outline-none resize-none font-syne text-sm transition-all duration-150"
          style={{ background: 'var(--bg4)', border: '1px solid var(--border)', color: 'var(--text)' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--amber)')}
          onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* Project */}
      <div>
        {fieldLabel('Project')}
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={selectStyle}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Category */}
      <div>
        {fieldLabel('Category')}
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)} style={selectStyle}>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Priority */}
      <PillToggle label="Priority" options={priorities} value={priority} onChange={setPriority} />

      {/* Due date + hours — 2 cols on desktop, stacked on mobile */}
      <div className={isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-3'}>
        {/* No wrapper div or style prop — globals.css handles iOS date overflow */}
        <Input
          label="Due date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <Input
          label="Est. hours"
          type="number"
          step="0.5"
          min="0"
          value={estHours}
          onChange={(e) => setEstHours(e.target.value)}
          placeholder="0"
        />
      </div>

      {/* Status (edit mode only) */}
      {!isCreating && (
        <PillToggle label="Status" options={statuses} value={status} onChange={setStatus} />
      )}

      {/* Today toggle */}
      <div className="flex items-center gap-3 pt-1">
        <div
          className="relative w-10 h-5 rounded-full cursor-pointer transition-all duration-200"
          style={{ background: todayFlag ? 'var(--amber)' : 'var(--bg5)' }}
          onClick={() => setTodayFlag(!todayFlag)}
        >
          <div
            className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
            style={{ background: 'var(--text)', left: todayFlag ? '22px' : '2px' }}
          />
        </div>
        <span className="font-syne text-sm" style={{ color: 'var(--text2)' }}>
          Mark for today
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="flex-1 py-3 rounded-xl font-syne font-600 text-sm transition-all duration-150"
          style={{
            background: title.trim() ? 'var(--amber)' : 'var(--bg5)',
            color:      title.trim() ? '#0a0a0a'      : 'var(--text3)',
            cursor:     title.trim() ? 'pointer'       : 'not-allowed',
          }}
        >
          {isCreating ? 'Add task' : 'Save changes'}
        </button>

        {!isCreating && (
          <button
            onClick={handleDelete}
            className="flex-1 py-3 rounded-xl font-syne text-sm transition-all duration-150"
            style={{
              background: deleteConfirm ? 'var(--rose)' : 'var(--bg4)',
              color:      deleteConfirm ? '#0a0a0a'     : 'var(--text2)',
              border:     deleteConfirm ? 'none'         : '1px solid var(--border)',
            }}
          >
            {deleteConfirm ? 'Confirm delete' : 'Delete'}
          </button>
        )}
      </div>

      {deleteConfirm && (
        <p className="font-mono text-xs text-center" style={{ color: 'var(--col-high)' }}>
          This cannot be undone.
        </p>
      )}
    </div>
  )

  const modalTitle = isCreating ? 'Add task' : 'Edit task'
  if (isMobile) return <MobileTaskSheet isOpen={isOpen} onClose={onClose} title={modalTitle}>{content}</MobileTaskSheet>
  return <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>{content}</Modal>
}
