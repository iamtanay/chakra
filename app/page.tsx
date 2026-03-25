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
import type { Task, Project, Status } from '@/types'

// ---------------------------------------------------------------------------
// Typed helper — sidesteps the `never` row-type issue that occurs when
// createClient() is instantiated without a Database generic parameter.
// Using `any` here is intentional and scoped only to this one abstraction.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => (createClient() as any).from(table)

export default function BoardPage() {
  const isMobile = useMediaQuery('(max-width: 768px)')

  const [tasks,             setTasks]             = useState<Task[]>([])
  const [projects,          setProjects]          = useState<Project[]>([])
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
      const [{ data: pd, error: pe }, { data: td, error: te }] = await Promise.all([
        db('projects').select('*'),
        db('tasks').select('*'),
      ])
      if (pe) throw pe
      if (te) throw te
      setProjects((pd || []) as Project[])
      setTasks((td || []) as Task[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filteredTasks = useMemo(() => {
    if (!selectedProjectId) return tasks
    return tasks.filter((t) => t.project_id === selectedProjectId)
  }, [tasks, selectedProjectId])

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const openCreateModal = (status: Status = 'Todo') => {
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
    try {
      setLogoSpin('loop')
      const { data: inserted, error } = await db('tasks')
        .insert([{
          title:           data.title,
          description:     data.description,
          project_id:      data.project_id,
          status:          data.status,
          priority:        data.priority,
          category:        data.category,
          due_date:        data.due_date,
          estimated_hours: data.estimated_hours,
          today_flag:      data.today_flag,
          actual_hours:    null,
          completed_at:    null,
        }])
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
      const { actual_hours, completed_at, ...updateData } = updatedTask
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

  const handleTaskComplete = (task: Task) => setCompletingTask(task)

  const handleCompleteConfirm = async (hours: number | null) => {
    if (!completingTask) return
    try {
      setLogoSpin('loop')
      const now = new Date().toISOString()
      const updated: Task = {
        ...completingTask,
        status:       'Done',
        actual_hours: hours,
        completed_at: now,
      }
      setTasks((prev) => prev.map((t) => t.id === completingTask.id ? updated : t))
      await db('tasks')
        .update({ status: 'Done', actual_hours: hours, completed_at: now })
        .eq('id', completingTask.id)
      setLogoSpin('fast')
      setTimeout(() => setLogoSpin(null), 400)
    } catch (err) {
      console.error('Error completing task:', err)
      loadData()
      setLogoSpin(null)
    } finally {
      setCompletingTask(null)
    }
  }

  const handleTodayToggle = async (task: Task) => {
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

          {/* ── Mobile top bar ── */}
          <div
            className="md:hidden flex items-center justify-between px-4 py-3"
            style={{
              borderBottom: '1px solid var(--border)',
              background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <Logo size={24} spin={logoSpin} />
              <span
                className="font-cinzel tracking-[0.25em] uppercase"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 70%, #FF4500 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Chakra
              </span>
            </div>

            {hasProjects && (
              <ProjectSwitcher
                projects={projects}
                selectedProjectId={selectedProjectId}
                onProjectSelect={setSelectedProjectId}
                compact
              />
            )}
          </div>

          <DailyPulse tasks={tasks} projects={projects} selectedProjectId={selectedProjectId} />

          {/* ── Desktop board header ── */}
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
              <button
                onClick={() => openCreateModal('Todo')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-syne font-600 text-sm transition-all duration-150"
                style={{ background: 'var(--amber)', color: '#0a0a0a' }}
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Add task</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Board area ── */}
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
              onCardClick={openEditModal}
              onComplete={handleTaskComplete}
              onTodayToggle={handleTodayToggle}
              onStatusChange={handleStatusChange}
              onAddTask={openCreateModal}
            />
          ) : (
            <KanbanBoard
              tasks={filteredTasks}
              projects={projects}
              onCardClick={openEditModal}
              onComplete={handleTaskComplete}
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