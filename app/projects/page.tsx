'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { Logo } from '@/components/ui/Logo'
import { Plus } from 'lucide-react'
import type { Project, Task } from '@/types'

// ---------------------------------------------------------------------------
// Typed helper — sidesteps the `never` row-type issue that occurs when
// createClient() is instantiated without a Database generic parameter.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => (createClient() as any).from(table)
// ---------------------------------------------------------------------------

export default function ProjectsPage() {
  const [projects,       setProjects]       = useState<Project[]>([])
  const [tasks,          setTasks]          = useState<Task[]>([])
  const [loading,        setLoading]        = useState(true)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showModal,      setShowModal]      = useState(false)
  const [logoSpin,       setLogoSpin]       = useState<'once' | 'fast' | 'loop' | null>('once')

  useEffect(() => {
    const t = setTimeout(() => setLogoSpin(null), 600)
    return () => clearTimeout(t)
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [{ data: pd }, { data: td }] = await Promise.all([
      db('projects').select('*'),
      db('tasks').select('*'),
    ])
    setProjects((pd || []) as Project[])
    setTasks((td || []) as Task[])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const groupedProjects = useMemo(() => ({
    Work:     projects.filter((p) => p.type === 'Work'),
    Study:    projects.filter((p) => p.type === 'Study'),
    Personal: projects.filter((p) => p.type === 'Personal'),
  }), [projects])

  const getStats = (pid: string) => {
    const pt = tasks.filter((t) => t.project_id === pid)
    return { total: pt.length, completed: pt.filter((t) => t.status === 'Done').length }
  }

  const handleSave = async (project: Project) => {
    try {
      setLogoSpin('loop')
      if (editingProject) {
        setProjects(projects.map((p) => p.id === project.id ? project : p))
        await db('projects')
          .update({ name: project.name, type: project.type, color: project.color })
          .eq('id', project.id)
      } else {
        const { data } = await db('projects')
          .insert([{ name: project.name, type: project.type, color: project.color }])
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg)' }}>
        <Logo size={40} spin="loop" />
      </div>
    )
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar projects={projects} selectedProjectId={null} onProjectSelect={() => {}} />

      <div className="flex-1 md:ml-[var(--sidebar-w)] flex flex-col pb-14 md:pb-0 overflow-hidden">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-5 md:px-8 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <Logo size={22} spin={logoSpin} />
            <h1
              className="font-syne font-800 text-lg uppercase tracking-widest"
              style={{ color: 'var(--text)', letterSpacing: '0.15em' }}
            >
              Projects
            </h1>
          </div>
          <button
            onClick={() => { setEditingProject(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-syne font-600 text-sm transition-all duration-150"
            style={{ background: 'var(--amber)', color: '#0a0a0a' }}
          >
            <Plus size={16} />
            New
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 md:p-8">
          <div className="max-w-4xl mx-auto">
            {projects.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-20 rounded-2xl"
                style={{ border: '1.5px dashed var(--border2)' }}
              >
                <p className="font-syne text-sm" style={{ color: 'var(--text3)' }}>
                  No projects yet.
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
                              onEdit={(proj) => { setEditingProject(proj); setShowModal(true) }}
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
      </div>

      <BottomNav />

      <ProjectModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingProject(null) }}
        project={editingProject}
        onSave={handleSave}
        onDelete={handleDelete}
        canDelete={editingProject ? tasks.filter((t) => t.project_id === editingProject.id).length === 0 : true}
      />
    </div>
  )
}