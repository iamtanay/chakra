'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { PillToggle } from '@/components/ui/PillToggle'
import type { Task, Project, Status, Priority, Category, RecurrenceFrequency } from '@/types'
import { getCategoriesForProjectType, getDefaultCategoryForProjectType } from '@/types'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { X, RefreshCw } from 'lucide-react'
import {
  computeInitialNextDueDate,
  toISODate,
  recurrenceLabel,
} from '@/lib/recurrence'
import { getDriftSuggestion } from '@/lib/insights'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  projects: Project[]
  allTasks: Task[]
  defaultProjectId?: string
  defaultStatus?: Status
  /** Whether the current user can create/edit/delete tasks in this context */
  canWrite: boolean
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
  is_recurring: boolean
  recurrence_frequency: RecurrenceFrequency | null
  recurrence_day_of_week: number | null
  recurrence_day_of_month: number | null
  recurrence_month: number | null
  next_due_date: string | null
  last_completed_cycle: null
}

const priorities: Priority[] = ['High', 'Medium', 'Low']
const statuses: Status[]     = ['Todo', 'In Progress', 'Done']

const FREQ_OPTIONS: RecurrenceFrequency[] = ['daily', 'weekly', 'monthly', 'annual']

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: '12px',
  outline: 'none', background: 'var(--bg4)', border: '1px solid var(--border)',
  color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontSize: '14px',
  appearance: 'none', cursor: 'pointer',
}

const readOnlySelectStyle: React.CSSProperties = {
  ...selectStyle,
  cursor: 'default',
  opacity: 0.7,
  pointerEvents: 'none',
}

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

// ── Mobile-only Task Sheet ──────────────────────────────────────────────────

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
      className="fixed inset-0 z-[70] md:hidden animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="fixed bottom-0 left-0 right-0 rounded-t-3xl sheet-enter flex flex-col"
        style={{
          background:    'var(--bg2)',
          borderTop:     '1px solid var(--border2)',
          boxShadow:     '0 -16px 60px rgba(0,0,0,0.5)',
          maxHeight:     '90vh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--bg5)' }} />
        </div>
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

// ── Recurrence anchor picker ────────────────────────────────────────────────

interface AnchorPickerProps {
  frequency: RecurrenceFrequency
  dayOfWeek: number
  dayOfMonth: number
  month: number
  readOnly: boolean
  onDayOfWeek: (v: number) => void
  onDayOfMonth: (v: number) => void
  onMonth: (v: number) => void
}

function AnchorPicker({
  frequency, dayOfWeek, dayOfMonth, month, readOnly,
  onDayOfWeek, onDayOfMonth, onMonth,
}: AnchorPickerProps) {
  function maxDaysInMonth(m: number) {
    return new Date(2023, m, 0).getDate()
  }

  if (frequency === 'daily') return null

  if (frequency === 'weekly') {
    return (
      <div>
        {fieldLabel('Repeats on')}
        <div className="grid grid-cols-7 gap-1">
          {DAY_NAMES.map((name, idx) => (
            <button
              key={name}
              onClick={() => !readOnly && onDayOfWeek(idx)}
              disabled={readOnly}
              className="py-2 rounded-lg font-mono text-xs transition-all duration-150"
              style={{
                background: dayOfWeek === idx ? 'var(--amber)' : 'var(--bg4)',
                color:      dayOfWeek === idx ? '#0a0a0a'      : 'var(--text3)',
                border:     dayOfWeek === idx ? 'none' : '1px solid var(--border)',
                cursor:     readOnly ? 'default' : 'pointer',
              }}
            >
              {name.slice(0, 2)}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (frequency === 'monthly') {
    const days = Array.from({ length: 31 }, (_, i) => i + 1)
    return (
      <div>
        {fieldLabel('Day of month')}
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => (
            <button
              key={d}
              onClick={() => !readOnly && onDayOfMonth(d)}
              disabled={readOnly}
              className="py-2 rounded-lg font-mono text-xs transition-all duration-150"
              style={{
                background: dayOfMonth === d ? 'var(--amber)' : 'var(--bg4)',
                color:      dayOfMonth === d ? '#0a0a0a'      : 'var(--text3)',
                border:     dayOfMonth === d ? 'none' : '1px solid var(--border)',
                cursor:     readOnly ? 'default' : 'pointer',
              }}
            >
              {d}
            </button>
          ))}
        </div>
        <p className="font-mono text-xs mt-2" style={{ color: 'var(--text3)' }}>
          Days beyond the month end will fall on the last day of that month.
        </p>
      </div>
    )
  }

  if (frequency === 'annual') {
    const maxDay     = maxDaysInMonth(month)
    const clampedDay = Math.min(dayOfMonth, maxDay)
    const days       = Array.from({ length: maxDay }, (_, i) => i + 1)

    return (
      <div className="space-y-4">
        <div>
          {fieldLabel('Month')}
          <select
            value={month}
            onChange={(e) => !readOnly && onMonth(Number(e.target.value))}
            disabled={readOnly}
            style={readOnly ? readOnlySelectStyle : selectStyle}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          {fieldLabel('Day')}
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => (
              <button
                key={d}
                onClick={() => !readOnly && onDayOfMonth(d)}
                disabled={readOnly}
                className="py-2 rounded-lg font-mono text-xs transition-all duration-150"
                style={{
                  background: clampedDay === d ? 'var(--amber)' : 'var(--bg4)',
                  color:      clampedDay === d ? '#0a0a0a'      : 'var(--text3)',
                  border:     clampedDay === d ? 'none' : '1px solid var(--border)',
                  cursor:     readOnly ? 'default' : 'pointer',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ── Drift suggestion badge ──────────────────────────────────────────────────

interface DriftHintProps {
  category: Category
  estimatedHours: number
  allTasks: Task[]
}

function DriftHint({ category, estimatedHours, allTasks }: DriftHintProps) {
  const suggestion = useMemo(
    () => getDriftSuggestion(category, allTasks, estimatedHours),
    [category, estimatedHours, allTasks]
  )

  if (!suggestion) return null

  const { adjustedHours, ratio } = suggestion
  const faster = ratio < 1.0

  return (
    <p
      className="font-mono text-xs mt-2 leading-relaxed"
      style={{ color: faster ? 'var(--teal)' : 'var(--amber)' }}
    >
      Based on your history, this will likely take around{' '}
      <span style={{ fontWeight: 600 }}>{adjustedHours}h</span>
      {faster
        ? ` — your ${category} tasks often finish faster than estimated.`
        : ` — your ${category} tasks often take longer than estimated.`
      }
    </p>
  )
}

// ── Main TaskModal ──────────────────────────────────────────────────────────

export function TaskModal({
  isOpen, onClose, task, projects, allTasks,
  defaultProjectId, defaultStatus, canWrite,
  onSave, onDelete, onCreate,
}: TaskModalProps) {
  const isCreating = task === null

  const [title,         setTitle]         = useState('')
  const [description,   setDescription]   = useState('')
  const [projectId,     setProjectId]     = useState(defaultProjectId || projects[0]?.id || '')
  const [status,        setStatus]        = useState<Status>(defaultStatus || 'Todo')
  const [priority,      setPriority]      = useState<Priority>('Medium')
  const [category,      setCategory]      = useState<Category>(() => {
    const initProject = projects.find((p) => p.id === (defaultProjectId || projects[0]?.id))
    return initProject ? getDefaultCategoryForProjectType(initProject.type) : 'Development'
  })
  const [dueDate,       setDueDate]       = useState('')
  const [estHours,      setEstHours]      = useState('')
  const [todayFlag,     setTodayFlag]     = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const [isRecurring,    setIsRecurring]    = useState(false)
  const [frequency,      setFrequency]      = useState<RecurrenceFrequency>('weekly')
  const [dayOfWeek,      setDayOfWeek]      = useState<number>(1)
  const [dayOfMonth,     setDayOfMonth]     = useState<number>(1)
  const [recurringMonth, setRecurringMonth] = useState<number>(1)

  const isMobile = useMediaQuery('(max-width: 768px)')

  const selectedProject     = projects.find((p) => p.id === projectId)
  const availableCategories = selectedProject
    ? getCategoriesForProjectType(selectedProject.type)
    : getCategoriesForProjectType('Work')

  useEffect(() => {
    if (frequency === 'annual') {
      const max = new Date(2023, recurringMonth, 0).getDate()
      if (dayOfMonth > max) setDayOfMonth(max)
    }
  }, [recurringMonth, frequency, dayOfMonth])

  useEffect(() => {
    if (!isOpen) return
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setProjectId(task.project_id)
      setStatus(task.status)
      setPriority(task.priority)
      const taskProject  = projects.find((p) => p.id === task.project_id)
      const validCats    = taskProject ? getCategoriesForProjectType(taskProject.type) : getCategoriesForProjectType('Work')
      setCategory(validCats.includes(task.category as any) ? task.category : getDefaultCategoryForProjectType(taskProject?.type ?? 'Work'))
      setDueDate(task.due_date || '')
      setEstHours(task.estimated_hours?.toString() || '')
      setTodayFlag(task.today_flag)
      setDeleteConfirm(false)

      const rec = task.is_recurring
      setIsRecurring(rec)
      if (rec && task.recurrence_frequency) {
        setFrequency(task.recurrence_frequency)
        setDayOfWeek(task.recurrence_day_of_week ?? 1)
        setDayOfMonth(task.recurrence_day_of_month ?? 1)
        setRecurringMonth(task.recurrence_month ?? 1)
      }
    } else {
      setTitle('')
      setDescription('')
      setProjectId(defaultProjectId || projects[0]?.id || '')
      setStatus(defaultStatus || 'Todo')
      setPriority('Medium')
      const resetProject = projects.find((p) => p.id === (defaultProjectId || projects[0]?.id))
      setCategory(resetProject ? getDefaultCategoryForProjectType(resetProject.type) : 'Development')
      setDueDate('')
      setEstHours('')
      setTodayFlag(false)
      setDeleteConfirm(false)
      setIsRecurring(false)
      setFrequency('weekly')
      setDayOfWeek(1)
      setDayOfMonth(1)
      setRecurringMonth(1)
    }
  }, [isOpen, task, defaultProjectId, defaultStatus, projects])

  if (!isOpen) return null

  if (projects.length === 0) {
    const msg = (
      <div className="py-8 text-center">
        <p className="font-syne text-sm mb-1" style={{ color: 'var(--text2)' }}>No spaces yet.</p>
        <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>Create a project first.</p>
      </div>
    )
    if (isMobile) return <MobileTaskSheet isOpen={isOpen} onClose={onClose} title="Add task">{msg}</MobileTaskSheet>
    return <Modal isOpen={isOpen} onClose={onClose} title="Add task">{msg}</Modal>
  }

  function buildRecurringAnchor() {
    switch (frequency) {
      case 'daily':
        return { recurrence_day_of_week: null, recurrence_day_of_month: null, recurrence_month: null }
      case 'weekly':
        return { recurrence_day_of_week: dayOfWeek, recurrence_day_of_month: null, recurrence_month: null }
      case 'monthly':
        return { recurrence_day_of_week: null, recurrence_day_of_month: dayOfMonth, recurrence_month: null }
      case 'annual':
        return { recurrence_day_of_week: null, recurrence_day_of_month: dayOfMonth, recurrence_month: recurringMonth }
    }
  }

  const handleSubmit = () => {
    if (!title.trim() || !canWrite) return

    if (isCreating) {
      let nextDueDate: string | null = null

      if (isRecurring) {
        const partial = {
          is_recurring:            true,
          recurrence_frequency:    frequency,
          recurrence_day_of_week:  frequency === 'weekly' ? dayOfWeek : null,
          recurrence_day_of_month: (frequency === 'monthly' || frequency === 'annual') ? dayOfMonth : null,
          recurrence_month:        frequency === 'annual' ? recurringMonth : null,
        } as Parameters<typeof computeInitialNextDueDate>[0]
        nextDueDate = toISODate(computeInitialNextDueDate(partial))
      }

      const anchor = isRecurring ? buildRecurringAnchor() : {
        recurrence_day_of_week: null, recurrence_day_of_month: null, recurrence_month: null,
      }

      onCreate({
        title:           title.trim(),
        description:     description.trim() || null,
        project_id:      projectId,
        status,
        priority,
        category,
        due_date:        isRecurring ? null : (dueDate || null),
        estimated_hours: estHours ? parseFloat(estHours) : null,
        today_flag:      todayFlag,
        is_recurring:    isRecurring,
        recurrence_frequency: isRecurring ? frequency : null,
        ...anchor,
        next_due_date:        isRecurring ? nextDueDate : (dueDate || null),
        last_completed_cycle: null,
      })
    } else {
      let nextDueDate = task!.next_due_date

      if (isRecurring && task!.is_recurring) {
        const anchorChanged =
          task!.recurrence_frequency    !== frequency ||
          task!.recurrence_day_of_week  !== (frequency === 'weekly' ? dayOfWeek : null) ||
          task!.recurrence_day_of_month !== ((frequency === 'monthly' || frequency === 'annual') ? dayOfMonth : null) ||
          task!.recurrence_month        !== (frequency === 'annual' ? recurringMonth : null)

        if (anchorChanged) {
          const partial = {
            is_recurring: true,
            recurrence_frequency: frequency,
            recurrence_day_of_week: frequency === 'weekly' ? dayOfWeek : null,
            recurrence_day_of_month: (frequency === 'monthly' || frequency === 'annual') ? dayOfMonth : null,
            recurrence_month: frequency === 'annual' ? recurringMonth : null,
          } as Parameters<typeof computeInitialNextDueDate>[0]
          nextDueDate = toISODate(computeInitialNextDueDate(partial))
        }
      } else if (!isRecurring) {
        nextDueDate = dueDate || null
      }

      const anchor = isRecurring ? buildRecurringAnchor() : {
        recurrence_day_of_week: null, recurrence_day_of_month: null, recurrence_month: null,
      }

      onSave({
        ...task!,
        title:           title.trim(),
        description:     description.trim() || null,
        project_id:      projectId,
        status,
        priority,
        category,
        due_date:        isRecurring ? null : (dueDate || null),
        estimated_hours: estHours ? parseFloat(estHours) : null,
        today_flag:      todayFlag,
        is_recurring:    isRecurring,
        recurrence_frequency: isRecurring ? frequency : null,
        ...anchor,
        next_due_date:        nextDueDate,
        last_completed_cycle: isRecurring ? task!.last_completed_cycle : null,
      })
    }

    onClose()
  }

  const handleDelete = () => {
    if (!canWrite) return
    if (deleteConfirm) { onDelete(task!.id); onClose() }
    else setDeleteConfirm(true)
  }

  function recurringPreview(): string {
    if (!isRecurring) return ''
    const partial = {
      is_recurring: true,
      recurrence_frequency: frequency,
      recurrence_day_of_week: frequency === 'weekly' ? dayOfWeek : null,
      recurrence_day_of_month: (frequency === 'monthly' || frequency === 'annual') ? dayOfMonth : null,
      recurrence_month: frequency === 'annual' ? recurringMonth : null,
    } as Parameters<typeof computeInitialNextDueDate>[0]
    try {
      const next      = computeInitialNextDueDate(partial)
      const formatted = next.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const label     = recurrenceLabel({ ...partial } as any)
      return `${label} · Next: ${formatted}`
    } catch {
      return ''
    }
  }

  const estHoursNum   = estHours ? parseFloat(estHours) : 0
  const showDriftHint = !isNaN(estHoursNum) && estHoursNum > 0

  const showCompletionNote =
    !isCreating &&
    task?.status === 'Done' &&
    task?.completion_note

  // Viewer note — shown at top when read-only and editing an existing task
  const viewerNote = !canWrite && !isCreating ? (
    <div
      className="px-3 py-2.5 rounded-xl mb-2"
      style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
    >
      <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
        You have view-only access — changes are disabled.
      </p>
    </div>
  ) : null

  const content = (
    <div className="space-y-4">
      {viewerNote}

      {/* Title */}
      <Input
        label="Title"
        value={title}
        onChange={canWrite ? (e) => setTitle(e.target.value) : undefined}
        placeholder="What needs doing?"
        autoFocus={!isMobile && canWrite}
        readOnly={!canWrite}
      />

      {/* Description */}
      <div>
        {fieldLabel('Description')}
        <textarea
          value={description}
          onChange={canWrite ? (e) => setDescription(e.target.value) : undefined}
          readOnly={!canWrite}
          placeholder={canWrite ? 'Optional notes…' : ''}
          rows={3}
          className="w-full px-4 py-3 rounded-xl outline-none resize-none font-syne text-sm transition-all duration-150"
          style={{
            background: 'var(--bg4)',
            border:     '1px solid var(--border)',
            color:      'var(--text)',
            cursor:     canWrite ? 'text' : 'default',
            opacity:    canWrite ? 1 : 0.7,
          }}
          onFocus={canWrite ? (e) => (e.currentTarget.style.borderColor = 'var(--amber)') : undefined}
          onBlur={canWrite  ? (e) => (e.currentTarget.style.borderColor = 'var(--border)') : undefined}
        />
      </div>

      {/* Project */}
      <div>
        {fieldLabel('Space')}
        <select
          value={projectId}
          onChange={canWrite ? (e) => {
            const newProjectId = e.target.value
            setProjectId(newProjectId)
            const newProject = projects.find((p) => p.id === newProjectId)
            if (newProject) {
              const validCats = getCategoriesForProjectType(newProject.type)
              if (!validCats.includes(category as any)) {
                setCategory(getDefaultCategoryForProjectType(newProject.type))
              }
            }
          } : undefined}
          disabled={!canWrite}
          style={canWrite ? selectStyle : readOnlySelectStyle}
        >
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Category */}
      <div>
        {fieldLabel('Category')}
        <select
          value={category}
          onChange={canWrite ? (e) => setCategory(e.target.value as Category) : undefined}
          disabled={!canWrite}
          style={canWrite ? selectStyle : readOnlySelectStyle}
        >
          {availableCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Priority */}
      <PillToggle
        label="Priority"
        options={priorities}
        value={priority}
        onChange={canWrite ? setPriority : () => {}}
        disabled={!canWrite}
      />

      {/* Recurring toggle */}
      <div
        className="rounded-xl p-4 space-y-4"
        style={{ background: 'var(--bg3)', border: `1px solid ${isRecurring ? 'var(--amber)' : 'var(--border)'}` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <RefreshCw size={14} style={{ color: isRecurring ? 'var(--amber)' : 'var(--text3)' }} />
            <span className="font-syne text-sm font-600" style={{ color: isRecurring ? 'var(--amber)' : 'var(--text2)' }}>
              Recurring task
            </span>
          </div>
          <div
            className="relative w-10 h-5 rounded-full transition-all duration-200"
            style={{
              background: isRecurring ? 'var(--amber)' : 'var(--bg5)',
              cursor:     canWrite ? 'pointer' : 'default',
            }}
            onClick={() => canWrite && setIsRecurring(!isRecurring)}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
              style={{ background: 'var(--text)', left: isRecurring ? '22px' : '2px' }}
            />
          </div>
        </div>

        {isRecurring && (
          <div className="space-y-4 pt-1">
            <div>
              {fieldLabel('Frequency')}
              <div className="grid grid-cols-4 gap-1.5">
                {FREQ_OPTIONS.map((f) => (
                  <button
                    key={f}
                    onClick={() => canWrite && setFrequency(f)}
                    disabled={!canWrite}
                    className="py-2 rounded-lg font-mono text-xs capitalize transition-all duration-150"
                    style={{
                      background: frequency === f ? 'var(--amber)' : 'var(--bg4)',
                      color:      frequency === f ? '#0a0a0a'      : 'var(--text3)',
                      border:     frequency === f ? 'none' : '1px solid var(--border)',
                      cursor:     canWrite ? 'pointer' : 'default',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <AnchorPicker
              frequency={frequency}
              dayOfWeek={dayOfWeek}
              dayOfMonth={dayOfMonth}
              month={recurringMonth}
              readOnly={!canWrite}
              onDayOfWeek={setDayOfWeek}
              onDayOfMonth={setDayOfMonth}
              onMonth={setRecurringMonth}
            />

            {canWrite && recurringPreview() && (
              <p className="font-mono text-xs" style={{ color: 'var(--teal)' }}>
                {recurringPreview()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Due date + hours — only for non-recurring */}
      {!isRecurring && (
        <div className={isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-3'}>
          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={canWrite ? (e) => setDueDate(e.target.value) : undefined}
            readOnly={!canWrite}
          />
          <div>
            <Input
              label="Est. hours"
              type="number"
              step="0.5"
              min="0"
              value={estHours}
              onChange={canWrite ? (e) => setEstHours(e.target.value) : undefined}
              placeholder="0"
              readOnly={!canWrite}
            />
            {canWrite && showDriftHint && (
              <DriftHint
                category={category}
                estimatedHours={estHoursNum}
                allTasks={allTasks}
              />
            )}
          </div>
        </div>
      )}

      {/* Est. hours for recurring */}
      {isRecurring && (
        <div>
          <Input
            label="Est. hours per cycle"
            type="number"
            step="0.5"
            min="0"
            value={estHours}
            onChange={canWrite ? (e) => setEstHours(e.target.value) : undefined}
            placeholder="0"
            readOnly={!canWrite}
          />
          {canWrite && showDriftHint && (
            <DriftHint
              category={category}
              estimatedHours={estHoursNum}
              allTasks={allTasks}
            />
          )}
        </div>
      )}

      {/* Status — edit mode only */}
      {!isCreating && (
        <PillToggle
          label="Status"
          options={statuses}
          value={status}
          onChange={canWrite ? setStatus : () => {}}
          disabled={!canWrite}
        />
      )}

      {/* Today toggle */}
      <div className="flex items-center gap-3 pt-1">
        <div
          className="relative w-10 h-5 rounded-full transition-all duration-200"
          style={{
            background: todayFlag ? 'var(--amber)' : 'var(--bg5)',
            cursor:     canWrite ? 'pointer' : 'default',
          }}
          onClick={() => canWrite && setTodayFlag(!todayFlag)}
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

      {/* Traces: completion note (read-only display in edit mode for Done tasks) */}
      {showCompletionNote && (
        <div
          className="px-4 py-3 rounded-xl"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
        >
          <p
            className="font-mono text-xs uppercase tracking-widest mb-1.5"
            style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}
          >
            Traces
          </p>
          <p
            className="font-syne text-sm italic leading-relaxed"
            style={{ color: 'var(--text2)' }}
          >
            {task?.completion_note}
          </p>
        </div>
      )}

      {/* Actions */}
      {canWrite ? (
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
      ) : (
        /* Viewer: just a close button */
        <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-syne font-600 text-sm"
            style={{ background: 'var(--bg4)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            Close
          </button>
        </div>
      )}

      {deleteConfirm && (
        <p className="font-mono text-xs text-center" style={{ color: 'var(--col-high)' }}>
          This cannot be undone.
        </p>
      )}
    </div>
  )

  const modalTitle = isCreating ? 'Add task' : (task?.is_recurring ? 'Edit recurring task' : 'Edit task')
  if (isMobile) return <MobileTaskSheet isOpen={isOpen} onClose={onClose} title={modalTitle}>{content}</MobileTaskSheet>
  return <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>{content}</Modal>
}
