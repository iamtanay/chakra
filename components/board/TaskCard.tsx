'use client'

import { useState } from 'react'
import type { Task, Project } from '@/types'
import { Check, Star } from 'lucide-react'

interface TaskCardProps {
  task: Task
  project: Project | undefined
  onCardClick: (task: Task) => void
  onComplete: (task: Task) => void
  onTodayToggle: (task: Task) => void
  isDragging?: boolean
}

const priorityColors: Record<string, string> = {
  High:   'var(--col-high)',
  Medium: 'var(--col-medium)',
  Low:    'var(--col-low)',
}
const priorityBg: Record<string, string> = {
  High:   'rgba(248,113,113,0.1)',
  Medium: 'rgba(232,162,71,0.1)',
  Low:    'rgba(96,165,250,0.1)',
}

const categoryAbbr: Record<string, string> = {
  Development: 'DEV',
  Research:    'RES',
  QA:          'QA',
  Design:      'DSN',
  Writing:     'WRT',
  Review:      'REV',
  Meeting:     'MTG',
}

export function TaskCard({
  task,
  project,
  onCardClick,
  onComplete,
  onTodayToggle,
  isDragging = false,
}: TaskCardProps) {
  const [hovered, setHovered] = useState(false)

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'Done'

  const abbr = categoryAbbr[task.category] ?? task.category?.slice(0, 3).toUpperCase() ?? '—'
  const pColor = priorityColors[task.priority] ?? 'var(--text3)'
  const pBg    = priorityBg[task.priority]    ?? 'transparent'

  return (
    <div
      onClick={() => onCardClick(task)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative rounded-xl cursor-pointer card-lift ${isDragging ? 'opacity-30 scale-95' : ''}`}
      style={{
        background:   'var(--bg3)',
        border:       '1px solid var(--border)',
        overflow:     'hidden',
      }}
    >
      {/* Priority accent bar */}
      <div
        className="h-0.5 w-full absolute top-0 left-0"
        style={{
          background: `linear-gradient(90deg, ${pColor} 0%, transparent 70%)`,
          opacity: 0.8,
        }}
      />

      <div className="p-4 pt-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category badge */}
            <span
              className="font-mono text-xs px-2 py-0.5 rounded font-500"
              style={{
                color:      pColor,
                background: pBg,
                letterSpacing: '0.05em',
              }}
            >
              {abbr}
            </span>

            {/* Project pill */}
            {project && (
              <span
                className="font-syne text-xs px-2 py-0.5 rounded-full font-500"
                style={{
                  color:      project.color,
                  background: `${project.color}18`,
                }}
              >
                {project.name}
              </span>
            )}
          </div>

          {/* Today flag */}
          {task.today_flag && (
            <button
              onClick={(e) => { e.stopPropagation(); onTodayToggle(task) }}
              className="flex-shrink-0"
            >
              <Star
                size={13}
                fill="var(--amber)"
                style={{ color: 'var(--amber)' }}
              />
            </button>
          )}
          {!task.today_flag && hovered && (
            <button
              onClick={(e) => { e.stopPropagation(); onTodayToggle(task) }}
              className="flex-shrink-0 opacity-30 hover:opacity-70 transition-opacity"
            >
              <Star size={13} style={{ color: 'var(--text3)' }} />
            </button>
          )}
        </div>

        {/* Title */}
        <h3
          className="font-syne font-600 text-sm leading-snug mb-1.5 line-clamp-2"
          style={{ color: 'var(--text)' }}
        >
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <p
            className="font-syne text-xs leading-relaxed mb-3 line-clamp-2"
            style={{ color: 'var(--text3)' }}
          >
            {task.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: pColor }}
            />
            <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
              {task.priority}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {task.due_date && (
              <span
                className="font-mono text-xs"
                style={{ color: isOverdue ? 'var(--col-high)' : 'var(--text3)' }}
              >
                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {task.estimated_hours && (
              <span
                className="font-mono text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'var(--bg5)', color: 'var(--text3)' }}
              >
                {task.estimated_hours}h
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Complete button — always visible on mobile, hover on desktop */}
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(task) }}
        className={`
          absolute right-3 top-1/2 -translate-y-1/2
          w-8 h-8 rounded-full flex items-center justify-center
          transition-all duration-150
          md:opacity-0 md:scale-75 opacity-100 scale-100
          ${hovered ? 'md:opacity-100 md:scale-100' : ''}
        `}
        style={{
          background: 'var(--teal)',
          boxShadow: '0 0 12px rgba(45,212,191,0.35)',
        }}
        title="Mark complete"
      >
        <Check size={14} style={{ color: '#080909' }} strokeWidth={2.5} />
      </button>
    </div>
  )
}
