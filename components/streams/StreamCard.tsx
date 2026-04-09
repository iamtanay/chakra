'use client'

import { Waves, Pin, Archive, MoreHorizontal, Users, Trash2, Check, AlignLeft, Link2, Layers, AlertTriangle, Share2 } from 'lucide-react'
import type { Stream, StreamItem } from '@/types'
import { useState, useRef, useEffect } from 'react'

interface StreamCardProps {
  stream: Stream
  items: StreamItem[]
  memberCount: number
  isOwner: boolean
  onClick: () => void
  onPin: (stream: Stream) => void
  onArchive: (stream: Stream) => void
  onDelete: (stream: Stream) => void
  onShare?: (stream: Stream) => void
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 2)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function TypeIcon({ type }: { type: string }) {
  const props = { size: 10, style: { color: 'var(--text3)', flexShrink: 0 as const } }
  if (type === 'checklist') return <Check    {...props} />
  if (type === 'notes')     return <AlignLeft {...props} />
  if (type === 'links')     return <Link2     {...props} />
  return <Layers {...props} />
}

export function StreamCard({
  stream, items, memberCount, isOwner,
  onClick, onPin, onArchive, onDelete, onShare,
}: StreamCardProps) {
  const [menuOpen,         setMenuOpen]         = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const totalItems  = items.length
  const doneItems   = items.filter(i => i.checked).length
  const activeItems = totalItems - doneItems
  const hasProgress = totalItems > 0
  // Fix 2: percentage & progress bar only for checklist streams
  const showProgress = hasProgress && stream.type === 'checklist'
  const pct          = hasProgress ? Math.round((doneItems / totalItems) * 100) : 0

  useEffect(() => {
    if (!menuOpen) { setConfirmingDelete(false); return }
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmingDelete) {
      onDelete(stream)
      setMenuOpen(false)
    } else {
      setConfirmingDelete(true)
    }
  }

  return (
    // Fix 5: overflow-hidden on card wrapper so accent line doesn't bleed left
    <div
      className="relative rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer group"
      style={{
        background: 'var(--bg2)',
        border:     '1px solid var(--border)',
      }}
      onClick={onClick}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${stream.color}, ${stream.color}40, transparent)` }}
      />

      {/* Hover glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(ellipse at top left, ${stream.color}0d 0%, transparent 65%)` }}
      />

      <div className="p-4 pt-5 relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
              style={{
                backgroundColor: stream.color,
                boxShadow:       `0 0 8px ${stream.color}80`,
              }}
            />
            <h3
              className="font-syne font-700 text-sm truncate"
              style={{ color: 'var(--text)' }}
            >
              {stream.name}
            </h3>
            {stream.pinned && (
              <Pin size={10} style={{ color: 'var(--amber)', flexShrink: 0 }} />
            )}
          </div>

          {/* Fix 7: Share button visible on hover */}
          {onShare && (
            <button
              onClick={e => { e.stopPropagation(); onShare(stream) }}
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-150"
              style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
              title="Share"
            >
              <Share2 size={12} />
            </button>
          )}

          {/* Menu */}
          <div
            ref={menuRef}
            className="relative flex-shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setMenuOpen(p => !p)}
              className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150"
              style={{
                color:      'var(--text3)',
                background: menuOpen ? 'var(--bg4)' : 'var(--bg3)',
                border:     `1px solid ${menuOpen ? 'var(--border2)' : 'transparent'}`,
              }}
            >
              <MoreHorizontal size={14} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 rounded-xl z-30 overflow-hidden"
                style={{
                  background: 'var(--bg3)',
                  border:     '1px solid var(--border2)',
                  boxShadow:  '0 8px 32px rgba(0,0,0,0.5)',
                  minWidth:   '160px',
                  width:      'max-content',
                }}
              >
                <button
                  onClick={e => { e.stopPropagation(); onPin(stream); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--bg4)]"
                  style={{ color: stream.pinned ? 'var(--amber)' : 'var(--text2)' }}
                >
                  <Pin size={13} />
                  <span className="font-syne text-xs font-500">
                    {stream.pinned ? 'Unpin' : 'Pin to top'}
                  </span>
                </button>

                {isOwner && (
                  <>
                    <div style={{ height: '1px', background: 'var(--border)' }} />
                    <button
                      onClick={e => { e.stopPropagation(); onArchive(stream); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--bg4)]"
                      style={{ color: 'var(--text2)' }}
                    >
                      <Archive size={13} />
                      <span className="font-syne text-xs font-500">Archive</span>
                    </button>

                    <div style={{ height: '1px', background: 'var(--border)' }} />

                    <button
                      onClick={handleDeleteClick}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-all duration-150"
                      style={{
                        color:      'var(--rose)',
                        background: confirmingDelete ? 'rgba(248,113,113,0.08)' : 'transparent',
                      }}
                    >
                      {confirmingDelete
                        ? <AlertTriangle size={13} />
                        : <Trash2 size={13} />
                      }
                      <span className="font-syne text-xs font-600">
                        {confirmingDelete ? 'Tap again to confirm' : 'Delete'}
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Type badge + progress % (checklist only) */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <span
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono"
            style={{
              background:    'var(--bg4)',
              border:        '1px solid var(--border)',
              color:         'var(--text3)',
              fontSize:      '10px',
              letterSpacing: '0.03em',
            }}
          >
            <TypeIcon type={stream.type} />
            {stream.type}
          </span>

          {/* Fix 2: only show % for checklist */}
          {showProgress && (
            <span className="font-mono text-xs font-600" style={{ color: stream.color, fontSize: '11px' }}>
              {pct}%
            </span>
          )}
        </div>

        {/* Progress bar — checklist only */}
        {showProgress && (
          <div className="mb-3">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg4)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width:     `${pct}%`,
                  background: stream.color,
                  boxShadow:  `0 0 6px ${stream.color}60`,
                }}
              />
            </div>
          </div>
        )}

        {/* Item preview — Fix 4: only checklist streams show checkboxes */}
        {activeItems > 0 ? (
          <div className="mb-3 space-y-1.5">
            {items
              .filter(i => !i.checked)
              .slice(0, 2)
              .map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  {/* Only render checkbox square for checklist type */}
                  {stream.type === 'checklist' ? (
                    <div
                      className="w-3.5 h-3.5 rounded-sm border flex-shrink-0"
                      style={{ borderColor: 'var(--border2)', background: 'var(--bg4)' }}
                    />
                  ) : stream.type === 'links' ? (
                    <Link2 size={10} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  ) : stream.type === 'notes' ? (
                    <AlignLeft size={10} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  ) : (
                    // mixed / tasks: show icon based on item type
                    item.type === 'link'  ? <Link2     size={10} style={{ color: 'var(--text3)', flexShrink: 0 }} /> :
                    item.type === 'note'  ? <AlignLeft size={10} style={{ color: 'var(--text3)', flexShrink: 0 }} /> :
                                            <div className="w-3.5 h-3.5 rounded-sm border flex-shrink-0" style={{ borderColor: 'var(--border2)', background: 'var(--bg4)' }} />
                  )}
                  <span
                    className="font-mono truncate"
                    style={{ color: 'var(--text2)', fontSize: '11px' }}
                  >
                    {item.content || item.link_title || item.link_url || '—'}
                  </span>
                </div>
              ))}
            {activeItems > 2 && (
              <p className="font-mono" style={{ color: 'var(--text3)', fontSize: '10px', paddingLeft: '22px' }}>
                +{activeItems - 2} more
              </p>
            )}
          </div>
        ) : totalItems === 0 ? (
          <p className="mb-3 font-mono" style={{ color: 'var(--text3)', fontSize: '11px' }}>
            Nothing yet — tap to add items
          </p>
        ) : null}

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-2.5"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <span className="font-mono" style={{ color: 'var(--text3)', fontSize: '10px' }}>
              {activeItems} active
              {doneItems > 0 && ` · ${doneItems} done`}
            </span>
            {memberCount > 0 && (
              <span className="flex items-center gap-1 font-mono" style={{ color: 'var(--text3)', fontSize: '10px' }}>
                <Users size={9} />
                {memberCount + 1}
              </span>
            )}
          </div>
          <span className="font-mono" style={{ color: 'var(--text3)', fontSize: '10px' }}>
            {timeAgo(stream.updated_at)}
          </span>
        </div>
      </div>
    </div>
  )
}
