'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'
import { PageTopBar } from '@/components/layout/PageTopBar'
import { DailyPulse } from '@/components/layout/DailyPulse'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { MobileBoard } from '@/components/board/MobileBoard'
import { ListView } from '@/components/views/ListView'
import { CalendarView } from '@/components/views/CalendarView'
import { TaskModal, type NewTaskData } from '@/components/modals/TaskModal'
import { CompleteModal } from '@/components/modals/CompleteModal'
import { Logo } from '@/components/ui/Logo'
import { ProjectSwitcher } from '@/components/ui/ProjectSwitcher'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useView } from '@/lib/viewContext'
import { Plus, LayoutDashboard, List, CalendarDays } from 'lucide-react'
import type { Task, Project, Status, ProjectMember } from '@/types'
import {
  shouldShowRecurringTask,
  advanceRecurringCycle,
  computeInitialNextDueDate,
  toISODate,
  todayLocal,
} from '@/lib/recurrence'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => (createClient() as any).from(table)

const VIEW_LABELS = {
  kanban:   { label: 'Board',    Icon: LayoutDashboard },
  list:     { label: 'List',     Icon: List            },
  calendar: { label: 'Calendar', Icon: CalendarDays    },
} as const

export default function ViewsPage() {
  const isMobile     = useMediaQuery('(max-width: 768px)')
  const searchParams = useSearchParams()
  const router       = useRouter()
  const { view, setView } = useView()

  // Always open Canvas in board view
  useEffect(() => {
    setView('kanban')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [tasks,         setTasks]         = useState<Task[]>([])
  const [projects,      setProjects]      = useState<Project[]>([])
  const [members,       setMembers]       = useState<ProjectMember[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)

  const [modalOpen,     setModalOpen]     = useState(false)
  const [editingTask,   setEditingTask]   = useState<Task | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<Status>('Todo')

  const [completingTask, setCompletingTask] = useState<Task | null>(null)
  const [logoSpin,       setLogoSpin]       = useState<'once' | 'fast' | 'loop' | null>('once')

  useEffect(() => {
    const t = setTimeout(() => setLogoSpin(null), 600)
    return () => clearTimeout(t)
  }, [])

  // URL-driven project selection — applies to all views
  const selectedProjectId = searchParams.get('project') ?? null

  const setSelectedProjectId = (id: string | null) => {
    if (id) {
      router.push(`/canvas?project=${id}`)
    } else {
      router.push('/canvas')
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const [
        { data: pd, error: pe },
        { data: td, error: te },
        { data: md },
      ] = await Promise.all([
        db('projects').select('*'),
        db('tasks').select('*'),
        db('project_members').select('*'),
      ])

      if (pe) throw pe
      if (te) throw te

      setProjects((pd || []) as Project[])
      setTasks((td || []) as Task[])
      setMembers((md || []) as ProjectMember[])
    } catch (err) {
      console.error('Views load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData().catch(console.error) }, [])

  const isOwnerOf = (project: Project): boolean =>
    !!currentUserId && project.owner_id === currentUserId

  const canWriteToProject = (project: Project): boolean => {
    if (isOwnerOf(project)) return true
    if (!currentUserId) return false
    return members.some(
      (m) => m.project_id === project.id && m.user_id === currentUserId && m.role === 'editor'
    )
  }

  const canWrite = useMemo(() => {
    if (!selectedProjectId) {
      return projects.some((p) => canWriteToProject(p))
    }
    const selected = projects.find((p) => p.id === selectedProjectId)
    if (!selected) return false
    return canWriteToProject(selected)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, projects, members, currentUserId])

  const taskModalCanWrite = useMemo(() => {
    if (editingTask) {
      const project = projects.find((p) => p.id === editingTask.project_id)
      if (!project) return false
      return canWriteToProject(project)
    }
    return canWrite
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTask, projects, members, currentUserId, canWrite])

  // Project filter applies to ALL views
  const filteredTasks = useMemo(() => {
    const today = todayLocal()
    const projectFiltered = selectedProjectId
      ? tasks.filter((t) => t.project_id === selectedProjectId)
      : tasks
    return projectFiltered.filter((t) => {
      if (!t.is_recurring) return true
      return shouldShowRecurringTask(t, today)
    })
  }, [tasks, selectedProjectId])

  const openCreateModal = (status: Status = 'Todo') => {
    if (!canWrite) return
    setEditingTask(null)
    setDefaultStatus(status)
    setModalOpen(true)
  }

  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingTask(null)
  }

  const handleTaskCreate = async (data: NewTaskData) => {
    if (!currentUserId) return
    try {
      setLogoSpin('loop')

      let nextDueDate = data.next_due_date
      if (data.is_recurring && !nextDueDate && data.recurrence_frequency) {
        const partial = {
          is_recurring:            true,
          recurrence_frequency:    data.recurrence_frequency,
          recurrence_day_of_week:  data.recurrence_day_of_week,
          recurrence_day_of_month: data.recurrence_day_of_month,
          recurrence_month:        data.recurrence_month,
        } as Parameters<typeof computeInitialNextDueDate>[0]
        nextDueDate = toISODate(computeInitialNextDueDate(partial))
      }

      const insertPayload = {
        title:                   data.title,
        description:             data.description,
        project_id:              data.project_id,
        status:                  data.status,
        priority:                data.priority,
        category:                data.category,
        due_date:                data.due_date,
        estimated_hours:         data.estimated_hours,
        today_flag:              data.today_flag,
        actual_hours:            null,
        completed_at:            null,
        is_recurring:            data.is_recurring,
        recurrence_frequency:    data.recurrence_frequency,
        recurrence_day_of_week:  data.recurrence_day_of_week,
        recurrence_day_of_month: data.recurrence_day_of_month,
        recurrence_month:        data.recurrence_month,
        last_completed_cycle:    null,
        next_due_date:           nextDueDate,
        current_streak:          0,
        completion_note:         null,
      }

      const { data: inserted, error } = await db('tasks')
        .insert([insertPayload])
        .select()
        .single()

      if (error) throw error
      setTasks((prev) => [...prev, inserted as Task])
      setLogoSpin('fast')
      setTimeout(() => setLogoSpin(null), 400)
    } catch (err) {
      console.error('Error creating task:', err)
      loadData()
      setLogoSpin(null)
    }
  }

  const handleTaskSave = async (updatedTask: Task) => {
    try {
      setLogoSpin('loop')
      setTasks((prev) => prev.map((t) => t.id === updatedTask.id ? updatedTask : t))
      const { actual_hours, completed_at, completion_note, ...updateData } = updatedTask
      await db('tasks').update(updateData).eq('id', updatedTask.id)
      setLogoSpin(null)
    } catch (err) {
      console.error('Error saving task:', err)
      loadData()
      setLogoSpin(null)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      setLogoSpin('loop')
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      await db('tasks').delete().eq('id', taskId)
      setLogoSpin(null)
    } catch (err) {
      console.error('Error deleting task:', err)
      loadData()
      setLogoSpin(null)
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: Status) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    if (task.is_recurring && newStatus === 'Done') return
    const project = projects.find((p) => p.id === task.project_id)
    if (project && !canWriteToProject(project)) return

    try {
      setLogoSpin('loop')
      setTasks((prev) =>
        prev.map((t) => t.id === taskId ? { ...t, status: newStatus, completed_at: null } : t)
      )
      await db('tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'Done' ? new Date().toISOString() : null,
          actual_hours: null,
          completed_by: newStatus === 'Done' ? currentUserId : null,
        })
        .eq('id', taskId)
      setLogoSpin(null)
    } catch (err) {
      console.error('Error updating status:', err)
      loadData()
      setLogoSpin(null)
    }
  }

  const handleTaskComplete = (task: Task) => {
    const project = projects.find((p) => p.id === task.project_id)
    if (project && !canWriteToProject(project)) return
    setCompletingTask(task)
  }

  const handleUndoDone = async (task: Task) => {
    if (task.is_recurring) return
    const project = projects.find((p) => p.id === task.project_id)
    if (project && !canWriteToProject(project)) return

    try {
      setLogoSpin('loop')
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: 'Todo' as const, completed_at: null, actual_hours: null, completion_note: null, completed_by: null }
            : t
        )
      )
      await db('tasks')
        .update({ status: 'Todo', completed_at: null, actual_hours: null, completion_note: null, completed_by: null })
        .eq('id', task.id)
      setLogoSpin(null)
    } catch (err) {
      console.error('Error undoing task completion:', err)
      loadData()
      setLogoSpin(null)
    }
  }

  const handleCompleteConfirm = async (hours: number | null, note: string | null) => {
    if (!completingTask) return
    const task = completingTask
    setCompletingTask(null)

    try {
      setLogoSpin('loop')

      if (task.is_recurring) {
        const advanced = advanceRecurringCycle(task)
        const dbUpdate = {
          status:               advanced.status,
          actual_hours:         null,
          completed_at:         null,
          today_flag:           false,
          last_completed_cycle: advanced.last_completed_cycle,
          next_due_date:        advanced.next_due_date,
          current_streak:       advanced.current_streak,
          completion_note:      null,
        }
        setTasks((prev) => prev.map((t) => t.id === task.id ? advanced : t))
        await db('tasks').update(dbUpdate).eq('id', task.id)
      } else {
        const now = new Date().toISOString()
        const updated: Task = {
          ...task,
          status:          'Done',
          actual_hours:    hours,
          completed_at:    now,
          completion_note: note,
          completed_by:    currentUserId,
        }
        setTasks((prev) => prev.map((t) => t.id === task.id ? updated : t))
        await db('tasks')
          .update({
            status:          'Done',
            actual_hours:    hours,
            completed_at:    now,
            completion_note: note,
            completed_by:    currentUserId,
          })
          .eq('id', task.id)
      }

      setLogoSpin('fast')
      setTimeout(() => setLogoSpin(null), 400)
    } catch (err) {
      console.error('Error completing task:', err)
      loadData()
      setLogoSpin(null)
    }
  }

  const handleTodayToggle = async (task: Task) => {
    const project = projects.find((p) => p.id === task.project_id)
    if (project && !canWriteToProject(project)) return

    try {
      setTasks((prev) =>
        prev.map((t) => t.id === task.id ? { ...t, today_flag: !t.today_flag } : t)
      )
      await db('tasks').update({ today_flag: !task.today_flag }).eq('id', task.id)
    } catch (err) {
      console.error('Error toggling today:', err)
      loadData()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <Logo size={48} spin="loop" />
      </div>
    )
  }

  const hasProjects = projects.length > 0
  const { label: viewLabel } = VIEW_LABELS[view]

  // View switcher — desktop only
  const ViewSwitcher = (
    <div
      className="hidden md:flex rounded-xl overflow-hidden"
      style={{ background: 'var(--bg3)', border: '1px solid var(--border)', gap: '1px' }}
    >
      {(Object.entries(VIEW_LABELS) as [keyof typeof VIEW_LABELS, typeof VIEW_LABELS[keyof typeof VIEW_LABELS]][]).map(([key, { label, Icon }]) => {
        const active = view === key
        return (
          <button
            key={key}
            onClick={() => setView(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 transition-all duration-200 font-syne text-xs font-600"
            style={{
              background: active ? 'var(--bg5)' : 'transparent',
              color: active ? 'var(--amber)' : 'var(--text3)',
              borderRadius: '8px',
            }}
            title={label}
          >
            <Icon size={13} />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )

  return (
    <AppShell
      projects={projects}
      selectedProjectId={selectedProjectId}
      onProjectSelect={setSelectedProjectId}
    >
      {/* Unified top bar — consistent for ALL views */}
      <PageTopBar
        title={viewLabel}
        logoSpin={logoSpin}
        actions={
          <>
            {/* View switcher — desktop only */}
            {ViewSwitcher}

            {/* Project filter — always shown for all views */}
            {hasProjects && (
              <ProjectSwitcher
                projects={projects}
                selectedProjectId={selectedProjectId}
                onProjectSelect={setSelectedProjectId}
                compact={isMobile}
                dropdownAlign="right"
              />
            )}

            {/* Add task — always shown for all views */}
            {canWrite && (
              <button
                onClick={() => openCreateModal('Todo')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-syne font-600 text-sm transition-all duration-150"
                style={{ background: 'var(--amber)', color: '#0a0a0a' }}
              >
                <Plus size={15} strokeWidth={2.5} />
                <span className="hidden sm:inline">Add task</span>
              </button>
            )}
          </>
        }
      />

      {/* DailyPulse — shown for ALL views */}
      <DailyPulse tasks={tasks} projects={projects} selectedProjectId={selectedProjectId} />

      {/* Content area */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {!hasProjects ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="font-syne text-sm" style={{ color: 'var(--text3)' }}>
              No spaces yet.
            </p>
            <a
              href="/spaces"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-syne font-600 text-sm"
              style={{ background: 'var(--amber)', color: '#0a0a0a' }}
            >
              <Plus size={15} />
              Create a space
            </a>
          </div>
        ) : view === 'kanban' ? (
          isMobile ? (
            <MobileBoard
              tasks={filteredTasks}
              projects={projects}
              canWrite={canWrite}
              onCardClick={openEditModal}
              onComplete={handleTaskComplete}
              onUndoDone={handleUndoDone}
              onTodayToggle={handleTodayToggle}
              onStatusChange={handleStatusChange}
              onAddTask={openCreateModal}
            />
          ) : (
            <KanbanBoard
              tasks={filteredTasks}
              projects={projects}
              canWrite={canWrite}
              onCardClick={openEditModal}
              onComplete={handleTaskComplete}
              onUndoDone={handleUndoDone}
              onTodayToggle={handleTodayToggle}
              onStatusChange={handleStatusChange}
              onAddTask={openCreateModal}
            />
          )
        ) : view === 'list' ? (
          <ListView
            tasks={filteredTasks}
            projects={projects}
            canWrite={canWrite}
            selectedProjectId={selectedProjectId}
            onCardClick={openEditModal}
            onComplete={handleTaskComplete}
            onUndoDone={handleUndoDone}
            onTodayToggle={handleTodayToggle}
            onStatusChange={handleStatusChange}
            onAddTask={openCreateModal}
          />
        ) : (
          <CalendarView
            tasks={filteredTasks}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onCardClick={openEditModal}
            onAddTask={openCreateModal}
            canWrite={canWrite}
          />
        )}
      </div>

      <TaskModal
        isOpen={modalOpen}
        onClose={closeModal}
        task={editingTask}
        projects={projects}
        allTasks={tasks}
        canWrite={taskModalCanWrite}
        defaultProjectId={selectedProjectId ?? undefined}
        defaultStatus={defaultStatus}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
        onCreate={handleTaskCreate}
      />

      <CompleteModal
        isOpen={completingTask !== null}
        onClose={() => setCompletingTask(null)}
        task={completingTask}
        onConfirm={handleCompleteConfirm}
      />
    </AppShell>
  )
}
