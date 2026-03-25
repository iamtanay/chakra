'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Input } from '@/components/ui/Input'
import { PillToggle } from '@/components/ui/PillToggle'
import type { Project, ProjectType } from '@/types'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project | null
  onSave: (project: Project) => void
  onDelete: (projectId: string) => void
  canDelete: boolean
}

const projectTypes: ProjectType[] = ['Work', 'Study', 'Personal']
const colors = [
  '#e8a247', '#f87171', '#2dd4bf', '#60a5fa',
  '#a78bfa', '#f472b6', '#34d399', '#fb923c',
]

export function ProjectModal({ isOpen, onClose, project, onSave, onDelete, canDelete }: ProjectModalProps) {
  const [name,          setName]          = useState('')
  const [type,          setType]          = useState<ProjectType>('Work')
  const [color,         setColor]         = useState('#e8a247')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')

  useEffect(() => {
    if (project) { setName(project.name); setType(project.type); setColor(project.color) }
    else         { setName(''); setType('Work'); setColor('#e8a247') }
    setDeleteConfirm(false)
  }, [project, isOpen])

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ id: project?.id || '', name: name.trim(), type, color, created_at: project?.created_at || new Date().toISOString() })
    onClose()
  }

  const handleDelete = () => {
    if (deleteConfirm && project) { onDelete(project.id); setDeleteConfirm(false); onClose() }
    else setDeleteConfirm(true)
  }

  const fieldLabel = (text: string) => (
    <label className="block font-mono text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}>
      {text}
    </label>
  )

  const content = (
    <div className="space-y-5">
      <Input
        label="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Portfolio Site"
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

      <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleSave}
          className="flex-1 py-3 rounded-xl font-syne font-600 text-sm"
          style={{ background: 'var(--amber)', color: '#0a0a0a' }}
        >
          Save
        </button>
        {project && (
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
            {deleteConfirm ? 'Confirm' : 'Delete'}
          </button>
        )}
      </div>

      {project && !canDelete && !deleteConfirm && (
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
