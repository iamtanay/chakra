'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Layers } from 'lucide-react'
import type { Project } from '@/types'

interface ProjectSwitcherProps {
  projects: Project[]
  selectedProjectId: string | null
  onProjectSelect: (id: string | null) => void
  compact?: boolean
  dropdownAlign?: 'left' | 'right'
}

export function ProjectSwitcher({
  projects,
  selectedProjectId,
  onProjectSelect,
  compact = false,
  dropdownAlign = 'left',
}: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : null

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const groupedProjects: Record<string, Project[]> = {
    Work:     projects.filter((p) => p.type === 'Work'),
    Study:    projects.filter((p) => p.type === 'Study'),
    Personal: projects.filter((p) => p.type === 'Personal'),
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl transition-all duration-150"
        style={{
          padding: compact ? '6px 10px' : '7px 12px',
          background: open ? 'var(--bg4)' : 'var(--bg3)',
          border: `1px solid ${open ? 'var(--border2)' : 'var(--border)'}`,
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.borderColor = 'var(--border2)' }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        {selected ? (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: selected.color, boxShadow: `0 0 5px ${selected.color}88` }}
          />
        ) : (
          <Layers size={12} style={{ color: 'var(--text3)' }} />
        )}
        <span
          className="font-cinzel text-xs tracking-[0.12em] uppercase"
          style={{
            color: selected ? 'var(--text)' : 'var(--text2)',
            maxWidth: compact ? 90 : 130,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selected ? selected.name : 'All projects'}
        </span>
        <ChevronDown
          size={11}
          style={{
            color: 'var(--text3)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
          }}
        />
      </button>

      {open && (
        <div
          className="absolute animate-slideUp"
          style={{
            top: 'calc(100% + 6px)',
            ...(dropdownAlign === 'right' ? { right: 0 } : { left: 0 }),
            width: 'min(220px, calc(100vw - 24px))',
            zIndex: 9999,
            background: 'var(--bg3)',
            border: '1px solid var(--border2)',
            borderRadius: 14,
            boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* All projects */}
          <div className="px-2 pt-2">
            <button
              onClick={() => { onProjectSelect(null); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-100"
              style={{ background: selectedProjectId === null ? 'var(--bg5)' : 'transparent' }}
              onMouseEnter={(e) => { if (selectedProjectId !== null) e.currentTarget.style.background = 'var(--bg4)' }}
              onMouseLeave={(e) => { if (selectedProjectId !== null) e.currentTarget.style.background = 'transparent' }}
            >
              <Layers size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <span className="font-cinzel text-xs tracking-[0.1em] uppercase flex-1 text-left" style={{ color: 'var(--text)' }}>
                All Projects
              </span>
              {selectedProjectId === null && <Check size={12} style={{ color: 'var(--amber)' }} />}
            </button>
          </div>

          <div className="mx-3 my-1.5" style={{ height: 1, background: 'var(--border)' }} />

          <div className="px-2 pb-2">
            {Object.entries(groupedProjects).map(([type, list]) => {
              if (list.length === 0) return null
              return (
                <div key={type}>
                  <div
                    className="px-3 pt-2 pb-1 font-mono tracking-[0.14em] uppercase"
                    style={{ color: 'var(--text3)', fontSize: 10 }}
                  >
                    {type}
                  </div>
                  {list.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => { onProjectSelect(project.id); setOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-100"
                      style={{ background: selectedProjectId === project.id ? 'var(--bg5)' : 'transparent' }}
                      onMouseEnter={(e) => { if (selectedProjectId !== project.id) e.currentTarget.style.background = 'var(--bg4)' }}
                      onMouseLeave={(e) => { if (selectedProjectId !== project.id) e.currentTarget.style.background = 'transparent' }}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: project.color,
                          boxShadow: selectedProjectId === project.id ? `0 0 5px ${project.color}88` : 'none',
                        }}
                      />
                      <span
                        className="font-syne text-xs font-500 flex-1 text-left truncate"
                        style={{ color: selectedProjectId === project.id ? 'var(--text)' : 'var(--text2)' }}
                      >
                        {project.name}
                      </span>
                      {selectedProjectId === project.id && <Check size={12} style={{ color: 'var(--amber)' }} />}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
