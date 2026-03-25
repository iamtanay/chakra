'use client'

import type { Project } from '@/types'
import { Pencil } from 'lucide-react'
import { useState } from 'react'

interface ProjectCardProps {
  project: Project
  taskCount: number
  completedCount: number
  onEdit: (project: Project) => void
}

const typeColors: Record<string, string> = {
  Work:     'var(--amber)',
  Study:    'var(--violet)',
  Personal: 'var(--teal)',
}

export function ProjectCard({ project, taskCount, completedCount, onEdit }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false)
  const pct = taskCount > 0 ? (completedCount / taskCount) * 100 : 0
  const tColor = typeColors[project.type] ?? 'var(--text3)'

  return (
    <div
      className="relative rounded-xl overflow-hidden card-lift"
      style={{
        background: 'var(--bg3)',
        border:     '1px solid var(--border)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Color bar */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${project.color} 0%, transparent 80%)`,
        }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Icon box */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: `${project.color}18`,
                border:     `1px solid ${project.color}30`,
              }}
            >
              <span
                className="font-syne font-800 text-base"
                style={{ color: project.color }}
              >
                {project.name.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-syne font-700 text-sm" style={{ color: 'var(--text)' }}>
                {project.name}
              </h3>
              <span
                className="font-mono text-xs"
                style={{ color: tColor }}
              >
                {project.type}
              </span>
            </div>
          </div>

          {/* Edit button — visible on hover */}
          <button
            onClick={() => onEdit(project)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
            style={{
              background:  hovered ? 'var(--bg5)' : 'transparent',
              color:       'var(--text3)',
              opacity:     hovered ? 1 : 0,
              transform:   hovered ? 'scale(1)' : 'scale(0.8)',
            }}
          >
            <Pencil size={13} />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
            {completedCount}/{taskCount} tasks
          </span>
          <span
            className="font-mono text-xs font-600"
            style={{ color: project.color }}
          >
            {Math.round(pct)}%
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--bg5)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width:      `${pct}%`,
              background: project.color,
              boxShadow:  `0 0 8px ${project.color}60`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
