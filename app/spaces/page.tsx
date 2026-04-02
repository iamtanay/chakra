'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { AppShell } from '@/components/layout/AppShell'
import { PageTopBar } from '@/components/layout/PageTopBar'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { ShareModal } from '@/components/projects/ShareModal'
import { TaskModal } from '@/components/modals/TaskModal'
import { Logo } from '@/components/ui/Logo'
import { Plus } from 'lucide-react'
import type { Project, Task, ProjectMember } from '@/types'
import type { NewTaskData } from '@/components/modals/TaskModal'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => (createClient() as any).from(table)

export default function ProjectsPage() {

  const [projects,       setProjects]       = useState<Project[]>([])
  const [tasks,          setTasks]          = useState<Task[]>([])
  const [members,        setMembers]        = useState<ProjectMember[]>([])
  const [currentUserId,  setCurrentUserId]  = useState<string | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showModal,      setShowModal]      = useState(false)
  const [sharingProject, setSharingProject] = useState<Project | null>(null)
  const [logoSpin,       setLogoSpin]       = useState<'once' | 'fast' | 'loop' | null>('once')

  const [editingTask,   setEditingTask]   = useState<Task | null>(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLogoSpin(null), 600)
    return () => clearTimeout(t)
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id ?? null
      setCurrentUserId(uid)

      const [
        { data: pd },
        { data: td },
        { data: md },
      ] = await Promise.all([
        db('projects').select('*'),
        db('tasks').select('*'),
        db('project_members').select('*'),
      ])

      setProjects((pd || []) as Project[])
      setTasks((td || []) as Task[])
      setMembers((md || []) as ProjectMember[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // ── Permission helpers ────────────────────────────────────────────────────

  const isOwnerOf = (project: Project): boolean =>
    !!currentUserId && project.owner_id === currentUserId

  const canEditProject = (project: Project): boolean => {
    if (isOwnerOf(project)) return true
    if (!currentUserId) return false
    return members.some(
      (m) => m.project_id === project.id && m.user_id === currentUserId && m.role === 'editor'
    )
  }

  const groupedProjects = useMemo(() => ({
    Work:     projects.filter((p) => p.type === 'Work'),
    Study:    projects.filter((p) => p.type === 'Study'),
    Personal: projects.filter((p) => p.type === 'Personal'),
  }), [projects])

  const getStats = (pid: string) => {
    const pt = tasks.filter((t) => t.project_id === pid)
    return { total: pt.length, completed: pt.filter((t) => t.status === 'Done').length }
  }

  // ── Project CRUD ──────────────────────────────────────────────────────────

  const handleSave = async (project: Project) => {
    if (!currentUserId) return
    try {
      setLogoSpin('loop')
      if (editingProject) {
        setProjects(projects.map((p) => p.id === project.id ? project : p))
        await db('projects')
          .update({ name: project.name, type: project.type, color: project.color })
          .eq('id', project.id)
      } else {
        const { data } = await db('projects')
          .insert([{
            name:     project.name,
            type:     project.type,
            color:    project.color,
            owner_id: currentUserId,
          }])
          .select()
        setProjects([...projects, (data?.[0] as Project) || project])
      }
    } catch { loadData() }
    finally { setLogoSpin(null); setEditingProject(null); setShowModal(false) }
  }

  const handleDelete = async (pid: string) => {
    try {
      setLogoSpin('loop')
      setProjects(projects.filter((p) => p.id !== pid))
      await db('projects').delete().eq('id', pid)
    } catch { loadData() }
    finally { setLogoSpin(null); setEditingProject(null); setShowModal(false) }
  }

  // ── Task helpers (for recurring tasks inside ProjectModal) ────────────────

  const handleEditRecurringTask = (task: Task) => {
    setShowModal(false)
    setEditingTask(task)
    setTaskModalOpen(true)
  }

  const handleTaskSave = async (updatedTask: Task) => {
    try {
      setLogoSpin('loop')
      setTasks((prev) => prev.map((t) => t.id === updatedTask.id ? updatedTask : t))
      const { actual_hours, completed_at, completion_note, ...updateData } = updatedTask
      await db('tasks').update(updateData).eq('id', updatedTask.id)
    } catch { loadData() }
    finally { setLogoSpin(null) }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      setLogoSpin('loop')
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      await db('tasks').delete().eq('id', taskId)
    } catch { loadData() }
    finally { setLogoSpin(null) }
  }

  const handleTaskCreate = async (_data: NewTaskData) => { /* no-op from projects page */ }

  const closeTaskModal = () => {
    setTaskModalOpen(false)
    setEditingTask(null)
    if (editingProject) setShowModal(true)
  }

  const taskModalCanWrite = useMemo(() => {
    if (!editingTask) return false
    const project = projects.find((p) => p.id === editingTask.project_id)
    if (!project) return false
    return canEditProject(project)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTask, projects, members, currentUserId])

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <Logo size={40} spin="loop" />
      </div>
    )
  }

  return (
    <AppShell projects={projects} selectedProjectId={null} onProjectSelect={() => {}}>
      {/* ── Unified top bar ── */}
      <PageTopBar
        title="Spaces"
        logoSpin={logoSpin}
        actions={
          <button
            onClick={() => { setEditingProject(null); setShowModal(true) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-syne font-600 text-sm transition-all duration-150"
            style={{ background: 'var(--amber)', color: '#0a0a0a' }}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">New space</span>
            <span className="sm:hidden">New</span>
          </button>
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-5 md:p-8">
        <div className="max-w-4xl mx-auto">
          {projects.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-20 rounded-2xl"
              style={{ border: '1.5px dashed var(--border2)' }}
            >
              <p className="font-syne text-sm" style={{ color: 'var(--text3)' }}>
                No spaces yet.
              </p>
              <p className="font-mono text-xs mt-1" style={{ color: 'var(--text3)', opacity: 0.6 }}>
                Create one to begin.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedProjects).map(([type, list]) => {
                if (list.length === 0) return null
                return (
                  <div key={type}>
                    <div className="flex items-center gap-3 mb-4">
                      <span
                        className="font-mono text-xs uppercase tracking-widest"
                        style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
                      >
                        {type}
                      </span>
                      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                      <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                        {list.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {list.map((p) => {
                        const s = getStats(p.id)
                        return (
                          <ProjectCard
                            key={p.id}
                            project={p}
                            taskCount={s.total}
                            completedCount={s.completed}
                            isOwner={isOwnerOf(p)}
                            onEdit={(proj) => {
                              setEditingProject(proj)
                              setShowModal(true)
                            }}
                            onShare={(proj) => setSharingProject(proj)}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Project modal — create / edit */}
      <ProjectModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingProject(null) }}
        project={editingProject}
        onSave={handleSave}
        onDelete={handleDelete}
        canDelete={
          editingProject
            ? tasks.filter((t) => t.project_id === editingProject.id).length === 0
            : true
        }
        isOwner={editingProject ? isOwnerOf(editingProject) : true}
        canEdit={editingProject ? canEditProject(editingProject) : true}
        recurringTasks={
          editingProject
            ? tasks.filter((t) => t.project_id === editingProject.id && t.is_recurring)
            : []
        }
        onEditRecurringTask={handleEditRecurringTask}
        onDeleteRecurringTask={handleTaskDelete}
      />

      {/* Share modal — owner only */}
      <ShareModal
        isOpen={sharingProject !== null}
        onClose={() => setSharingProject(null)}
        project={sharingProject}
      />

      {/* Task modal — for editing recurring tasks from within ProjectModal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={closeTaskModal}
        task={editingTask}
        projects={projects}
        allTasks={tasks}
        canWrite={taskModalCanWrite}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
        onCreate={handleTaskCreate}
      />
    </AppShell>
  )
}
