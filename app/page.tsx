'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { DailyPulse } from '@/components/layout/DailyPulse'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { MobileBoard } from '@/components/board/MobileBoard'
import { TaskModal, type NewTaskData } from '@/components/modals/TaskModal'
import { CompleteModal } from '@/components/modals/CompleteModal'
import { Logo } from '@/components/ui/Logo'
import { ProjectSwitcher } from '@/components/ui/ProjectSwitcher'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Plus } from 'lucide-react'
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

export default function BoardPage() {
  const isMobile = useMediaQuery('(max-width: 768px)')

  const [tasks,             setTasks]             = useState<Task[]>([])
  const [projects,          setProjects]          = useState<Project[]>([])
  const [members,           setMembers]           = useState<ProjectMember[]>([])
  const [currentUserId,     setCurrentUserId]     = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [loading,           setLoading]           = useState(true)

  const [modalOpen,         setModalOpen]         = useState(false)
  const [editingTask,       setEditingTask]        = useState<Task | null>(null)
  const [defaultStatus,     setDefaultStatus]      = useState<Status>('Todo')

  const [completingTask,    setCompletingTask]    = useState<Task | null>(null)
  const [logoSpin,          setLogoSpin]          = useState<'once' | 'fast' | 'loop' | null>('once')

  useEffect(() => {
    const t = setTimeout(() => setLogoSpin(null), 600)
    return () => clearTimeout(t)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Local cache hit — no network round trip
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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // ── Permission helpers ──────────────────────────────────────────────────────

  /** True if current user owns the given project. */
  const isOwnerOf = (project: Project): boolean =>
    !!currentUserId && project.owner_id === currentUserId

  /**
   * True if current user can write to the given project.
   * Owners always can; members with role='editor' can too.
   */
  const canWriteToProject = (project: Project): boolean => {
    if (isOwnerOf(project)) return true
    if (!currentUserId) return false
    return members.some(
      (m) => m.project_id === project.id && m.user_id === currentUserId && m.role === 'editor'
    )
  }

  /**
   * Derived canWrite for the currently selected view:
   * - No project selected ("All Projects"): true — RLS already filters out
   *   viewer-only projects from task writes server-side. We show all tasks
   *   but the individual task modal will reflect correct permissions per task.
   *   We return true here so the Add Task button is visible; RLS is the
   *   safety net for the write.
   * - Specific project selected: check that project's permissions.
   */
  const canWrite = useMemo(() => {
    if (!selectedProjectId) {
      // "All Projects" — check if there's at least one project the user can write to.
      // We show the global Add Task button only if they can write somewhere.
      return projects.some((p) => canWriteToProject(p))
    }
    const selected = projects.find((p) => p.id === selectedProjectId)
    if (!selected) return false
    return canWriteToProject(selected)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, projects, members, currentUserId])

  /**
   * When a task is open in the modal, its canWrite depends on which project
   * it belongs to, not the current filter selection.
   */
  const taskModalCanWrite = useMemo(() => {
    if (editingTask) {
      const project = projects.find((p) => p.id === editingTask.project_id)
      if (!project) return false
      return canWriteToProject(project)
    }
    // Creating a new task — canWrite is based on selected project context
    return canWrite
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTask, projects, members, currentUserId, canWrite])

  // Filtered tasks for board display
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

  // ── Modal helpers ──────────────────────────────────────────────────────────

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

  // ── CRUD handlers ──────────────────────────────────────────────────────────

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
    // Block status drag to Done for recurring tasks (must go through CompleteModal)
    if (task.is_recurring && newStatus === 'Done') return
    // Block if viewer
    const project = projects.find((p) => p.id === task.project_id)
    if (project && !canWriteToProject(project)) return

    try {
      setLogoSpin('loop')
      setTasks((prev) =>
        prev.map((t) => t.id === taskId ? { ...t, status: newStatus, completed_at: null } : t)
      )
      await db('tasks')
        .update({ status: newStatus, completed_at: null, actual_hours: null })
        .eq('id', taskId)
      setLogoSpin(null)
    } catch (err) {
      console.error('Error updating status:', err)
      loadData()
      setLogoSpin(null)
    }
  }

  const handleTaskComplete = (task: Task) => {
    // Guard: only writers can complete tasks
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
            ? { ...t, status: 'Todo' as const, completed_at: null, actual_hours: null, completion_note: null }
            : t
        )
      )
      await db('tasks')
        .update({ status: 'Todo', completed_at: null, actual_hours: null, completion_note: null })
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
        }
        setTasks((prev) => prev.map((t) => t.id === task.id ? updated : t))
        await db('tasks')
          .update({
            status:          'Done',
            actual_hours:    hours,
            completed_at:    now,
            completion_note: note,
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

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <Logo size={48} spin="loop" />
      </div>
    )
  }

  const hasProjects = projects.length > 0

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectSelect={setSelectedProjectId}
      />

      <div className="flex-1 md:ml-[var(--sidebar-w)] flex flex-col pb-14 md:pb-0 overflow-hidden">
        <div className="flex-shrink-0">

          {/* Mobile top bar */}
          <div
            className="md:hidden flex items-center justify-between px-4 py-3"
            style={{
              borderBottom: '1px solid var(--border)',
              background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <Logo size={24} spin={logoSpin} />
              <span className="logo-text" style={{ fontSize: 13 }}>Chakra</span>
            </div>

            {hasProjects && (
              <ProjectSwitcher
                projects={projects}
                selectedProjectId={selectedProjectId}
                onProjectSelect={setSelectedProjectId}
                compact
                dropdownAlign="right"
              />
            )}
          </div>

          <DailyPulse tasks={tasks} projects={projects} selectedProjectId={selectedProjectId} />

          {/* Desktop board header */}
          {hasProjects && (
            <div
              className="hidden md:flex items-center justify-between px-5 md:px-6 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <Logo size={18} spin={logoSpin} />
                <ProjectSwitcher
                  projects={projects}
                  selectedProjectId={selectedProjectId}
                  onProjectSelect={setSelectedProjectId}
                />
              </div>
              {/* Add task button — only shown when user can write */}
              {canWrite && (
                <button
                  onClick={() => openCreateModal('Todo')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-syne font-600 text-sm transition-all duration-150"
                  style={{ background: 'var(--amber)', color: '#0a0a0a' }}
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>Add task</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Board area */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {!hasProjects ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="font-syne text-sm" style={{ color: 'var(--text3)' }}>
                No projects yet.
              </p>
              <a
                href="/projects"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-syne font-600 text-sm"
                style={{ background: 'var(--amber)', color: '#0a0a0a' }}
              >
                <Plus size={15} />
                Create a project
              </a>
            </div>
          ) : isMobile ? (
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
          )}
        </div>
      </div>

      <BottomNav />

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
    </div>
  )
}
