'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft, Plus, Check, Link2, AlignLeft, ChevronDown, ChevronRight,
  Trash2, MoreHorizontal, ExternalLink, Share2, GripVertical, FolderPlus,
} from 'lucide-react'
import type { Stream, StreamItem, StreamSection, StreamItemType } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => (createClient() as any).from(table)

// ── Derive which item types are allowed for a given stream type ───────────
function allowedItemTypes(streamType: string): StreamItemType[] {
  if (streamType === 'checklist') return ['check']
  if (streamType === 'notes')     return ['note']
  if (streamType === 'links')     return ['link']
  // mixed: all types
  return ['check', 'note', 'link']
}

interface StreamDetailProps {
  stream: Stream
  isOwner: boolean
  canEdit: boolean
  onBack: () => void
  onShare: () => void
}

// ── Check icon ────────────────────────────────────────────────────────────
function CheckBox({ checked, color }: { checked: boolean; color: string }) {
  return (
    <div
      className="w-[18px] h-[18px] rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200"
      style={{
        border:     checked ? 'none' : `1.5px solid var(--border2)`,
        background: checked ? color  : 'var(--bg4)',
        boxShadow:  checked ? `0 0 8px ${color}50` : 'none',
      }}
    >
      {checked && <Check size={11} strokeWidth={3} style={{ color: '#0a0a0a' }} />}
    </div>
  )
}

// ── Item row ──────────────────────────────────────────────────────────────
interface ItemRowProps {
  item: StreamItem
  streamColor: string
  canEdit: boolean
  onToggle: (item: StreamItem) => void
  onUpdate: (item: StreamItem, content: string) => void
  onDelete: (item: StreamItem) => void
  // Fix 5: drag-and-drop reorder props
  onDragStart: (item: StreamItem) => void
  onDragOver:  (item: StreamItem) => void
  onDragEnd:   () => void
  isDragging:  boolean
  isDragOver:  boolean
}

function ItemRow({ item, streamColor, canEdit, onToggle, onUpdate, onDelete, onDragStart, onDragOver, onDragEnd, isDragging, isDragOver }: ItemRowProps) {
  const [editing,  setEditing]  = useState(false)
  const [val,      setVal]      = useState(item.content)
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef  = useRef<HTMLDivElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  useEffect(() => {
    if (!menuOpen) return
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuOpen])

  const commit = () => {
    setEditing(false)
    const trimmed = val.trim()
    if (trimmed && trimmed !== item.content) onUpdate(item, trimmed)
    else setVal(item.content)
  }

  const displayText = item.type === 'link'
    ? (item.link_title || item.link_url || item.content)
    : item.content

  return (
    <div
      draggable={canEdit}
      onDragStart={() => canEdit && onDragStart(item)}
      onDragOver={e => { e.preventDefault(); canEdit && onDragOver(item) }}
      onDragEnd={onDragEnd}
      className="flex items-center gap-2 px-2 py-2 rounded-xl group/row transition-all duration-150"
      style={{
        background: isDragOver ? `${streamColor}10` : 'transparent',
        border: isDragOver ? `1px dashed ${streamColor}50` : '1px solid transparent',
        opacity: isDragging ? 0.4 : 1,
        cursor: canEdit ? 'default' : 'default',
      }}
    >
      <GripVertical
        size={13}
        className={`transition-opacity duration-150 flex-shrink-0 ${canEdit ? 'cursor-grab active:cursor-grabbing opacity-0 group-hover/row:opacity-30' : 'opacity-0'}`}
        style={{ color: 'var(--text3)' }}
      />

      {/* Checkbox / indicator */}
      {item.type === 'check' ? (
        <button
          onClick={() => canEdit && onToggle(item)}
          disabled={!canEdit}
          className="flex-shrink-0"
        >
          <CheckBox checked={item.checked} color={streamColor} />
        </button>
      ) : (
        <div className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
          {item.type === 'link'
            ? <Link2     size={12} style={{ color: 'var(--text3)' }} />
            : <AlignLeft size={12} style={{ color: 'var(--text3)' }} />
          }
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter')  commit()
              if (e.key === 'Escape') { setEditing(false); setVal(item.content) }
            }}
            className="w-full bg-transparent outline-none font-mono"
            style={{ color: 'var(--text)', fontSize: '13px' }}
          />
        ) : (
          <span
            className="font-mono block truncate transition-all duration-200"
            style={{
              color:          item.checked ? 'var(--text3)' : 'var(--text2)',
              textDecoration: item.checked ? 'line-through' : 'none',
              fontSize:       '13px',
              cursor:         canEdit && item.type !== 'link' ? 'text' : 'default',
            }}
            onClick={() => canEdit && item.type !== 'link' && setEditing(true)}
          >
            {displayText || <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Empty item</span>}
          </span>
        )}
      </div>

      {/* Fix 3: External link opens the actual URL directly */}
      {item.type === 'link' && item.link_url && (
        <a
          href={item.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity duration-150"
          style={{ color: 'var(--text3)' }}
          onClick={e => e.stopPropagation()}
        >
          <ExternalLink size={12} />
        </a>
      )}

      {/* Row menu */}
      {canEdit && (
        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(p => !p)}
            className="w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all duration-150"
            style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
          >
            <MoreHorizontal size={12} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-20"
              style={{
                background: 'var(--bg3)',
                border:     '1px solid var(--border2)',
                boxShadow:  '0 8px 24px rgba(0,0,0,0.4)',
                minWidth:   '120px',
              }}
            >
              <button
                onClick={() => { onDelete(item); setMenuOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--bg4)]"
                style={{ color: 'var(--rose)' }}
              >
                <Trash2 size={12} />
                <span className="font-syne text-xs font-500">Delete</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Quick add bar ─────────────────────────────────────────────────────────
interface QuickAddProps {
  streamColor: string
  // Fix 1: only show pill types allowed by the stream type
  allowedTypes: StreamItemType[]
  onAdd: (content: string, type: StreamItemType) => void
  autoFocusOnMount?: boolean
}

function QuickAdd({ streamColor, allowedTypes, onAdd, autoFocusOnMount }: QuickAddProps) {
  const [val,  setVal]  = useState('')
  const [type, setType] = useState<StreamItemType>(allowedTypes[0] ?? 'check')
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync selected type when allowedTypes changes
  useEffect(() => {
    if (!allowedTypes.includes(type)) setType(allowedTypes[0] ?? 'check')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedTypes.join(',')])

  useEffect(() => {
    if (autoFocusOnMount) inputRef.current?.focus()
  }, [autoFocusOnMount])

  const submit = () => {
    const t = val.trim()
    if (!t) return
    onAdd(t, type)
    setVal('')
  }

  const allTypes: { value: StreamItemType; Icon: React.ElementType; label: string }[] = [
    { value: 'check', Icon: Check,     label: 'Task' },
    { value: 'note',  Icon: AlignLeft, label: 'Note' },
    { value: 'link',  Icon: Link2,     label: 'Link' },
  ]
  // Only show pills for allowed types
  const visibleTypes = allTypes.filter(t => allowedTypes.includes(t.value))

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-150"
      style={{
        background: 'var(--bg3)',
        border:     '1px solid var(--border)',
      }}
    >
      {/* Type pills — hidden when only one option */}
      {visibleTypes.length > 1 && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {visibleTypes.map(({ value, Icon }) => (
            <button
              key={value}
              onClick={() => setType(value)}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150"
              title={value}
              style={{
                background: type === value ? `${streamColor}20` : 'transparent',
                color:      type === value ? streamColor         : 'var(--text3)',
                border:     type === value ? `1px solid ${streamColor}40` : '1px solid transparent',
              }}
            >
              <Icon size={11} />
            </button>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder={
          type === 'link' ? 'Paste a URL...'  :
          type === 'note' ? 'Add a note...'   :
          'Add an item...'
        }
        className="flex-1 bg-transparent outline-none font-mono"
        style={{ color: 'var(--text)', fontSize: '13px' }}
      />

      <button
        onClick={submit}
        disabled={!val.trim()}
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150"
        style={{
          background: val.trim() ? streamColor : 'var(--bg4)',
          color:      val.trim() ? '#0a0a0a'   : 'var(--text3)',
        }}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

// ── Section block ─────────────────────────────────────────────────────────
interface SectionBlockProps {
  section: StreamSection
  items: StreamItem[]
  stream: Stream
  canEdit: boolean
  allowedTypes: StreamItemType[]
  onToggle: (item: StreamItem) => void
  onUpdate: (item: StreamItem, content: string) => void
  onDelete: (item: StreamItem) => void
  onAdd: (content: string, type: StreamItemType, sectionId?: string) => void
  onToggleCollapse: (section: StreamSection) => void
  // Fix 5: drag props
  onDragStart: (item: StreamItem) => void
  onDragOver:  (item: StreamItem) => void
  onDragEnd:   () => void
  draggingId:  string | null
  dragOverId:  string | null
}

function SectionBlock({
  section, items, stream, canEdit, allowedTypes,
  onToggle, onUpdate, onDelete, onAdd, onToggleCollapse,
  onDragStart, onDragOver, onDragEnd, draggingId, dragOverId,
}: SectionBlockProps) {
  const doneCount = items.filter(i => i.checked).length

  return (
    <div className="mb-5">
      <button
        onClick={() => onToggleCollapse(section)}
        className="flex items-center gap-2 px-2 py-1.5 w-full text-left mb-1 rounded-lg transition-colors duration-150"
        style={{ color: 'var(--text3)' }}
      >
        {section.collapsed
          ? <ChevronRight size={13} />
          : <ChevronDown  size={13} />
        }
        <span className="font-mono text-xs uppercase tracking-widest flex-1 text-left" style={{ letterSpacing: '0.1em' }}>
          {section.title}
        </span>
        {doneCount > 0 && (
          <span className="font-mono" style={{ color: 'var(--text3)', fontSize: '10px' }}>
            {doneCount} done
          </span>
        )}
      </button>

      {!section.collapsed && (
        <>
          <div className="space-y-0.5">
            {items.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                streamColor={stream.color}
                canEdit={canEdit}
                onToggle={onToggle}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                isDragging={draggingId === item.id}
                isDragOver={dragOverId === item.id}
              />
            ))}
          </div>
          {canEdit && (
            <div className="mt-2">
              <QuickAdd
                streamColor={stream.color}
                allowedTypes={allowedTypes}
                onAdd={(c, t) => onAdd(c, t, section.id)}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────
export function StreamDetail({ stream, isOwner, canEdit, onBack, onShare }: StreamDetailProps) {
  const [items,           setItems]           = useState<StreamItem[]>([])
  const [sections,        setSections]        = useState<StreamSection[]>([])
  const [loading,         setLoading]         = useState(true)
  const [doneExpanded,    setDoneExpanded]    = useState(false)
  const [addingSection,   setAddingSection]   = useState(false)
  const [newSectionName,  setNewSectionName]  = useState('')
  // Fix 5: drag-and-drop reorder state
  const [draggingId,      setDraggingId]      = useState<string | null>(null)
  const [dragOverId,      setDragOverId]      = useState<string | null>(null)
  const sectionInputRef = useRef<HTMLInputElement>(null)

  const allowed = allowedItemTypes(stream.type)

  const loadData = useCallback(async () => {
    const [{ data: iData }, { data: sData }] = await Promise.all([
      db('stream_items').select('*').eq('stream_id', stream.id).order('position'),
      db('stream_sections').select('*').eq('stream_id', stream.id).order('position'),
    ])
    setItems((iData || []) as StreamItem[])
    setSections((sData || []) as StreamSection[])
    setLoading(false)
  }, [stream.id])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (addingSection) sectionInputRef.current?.focus()
  }, [addingSection])

  const handleToggle = async (item: StreamItem) => {
    const next = !item.checked
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: next } : i))
    await db('stream_items').update({ checked: next }).eq('id', item.id)
  }

  const handleUpdate = async (item: StreamItem, content: string) => {
    if (!content) return
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, content } : i))
    await db('stream_items').update({ content }).eq('id', item.id)
  }

  const handleDelete = async (item: StreamItem) => {
    setItems(prev => prev.filter(i => i.id !== item.id))
    await db('stream_items').delete().eq('id', item.id)
  }

  const handleAdd = async (content: string, type: StreamItemType, sectionId?: string) => {
    const position = items.filter(i => i.section_id === (sectionId ?? null)).length

    // Fix 3: ensure link URLs have a protocol so they open directly, not relative
    let linkUrl: string | null = null
    if (type === 'link') {
      linkUrl = content.match(/^https?:\/\//i) ? content : `https://${content}`
    }

    const { data } = await db('stream_items').insert({
      stream_id:  stream.id,
      section_id: sectionId ?? null,
      content:    type === 'link' ? '' : content,
      type,
      position,
      link_url:   linkUrl,
      link_title: type === 'link' ? content : null,
    }).select().single()
    if (data) setItems(prev => [...prev, data as StreamItem])
  }

  const handleToggleCollapse = async (section: StreamSection) => {
    const next = !section.collapsed
    setSections(prev => prev.map(s => s.id === section.id ? { ...s, collapsed: next } : s))
    await db('stream_sections').update({ collapsed: next }).eq('id', section.id)
  }

  // Fix 6: actually create sections
  const handleAddSection = async () => {
    const title = newSectionName.trim()
    if (!title) { setAddingSection(false); return }
    const position = sections.length
    const { data } = await db('stream_sections').insert({
      stream_id: stream.id,
      title,
      position,
      collapsed: false,
    }).select().single()
    if (data) setSections(prev => [...prev, data as StreamSection])
    setNewSectionName('')
    setAddingSection(false)
  }

  // Fix 5: drag-and-drop reorder handlers
  const handleDragStart = (item: StreamItem) => {
    setDraggingId(item.id)
  }

  const handleDragOver = (item: StreamItem) => {
    if (item.id !== draggingId) setDragOverId(item.id)
  }

  const handleDragEnd = async () => {
    if (!draggingId || !dragOverId || draggingId === dragOverId) {
      setDraggingId(null)
      setDragOverId(null)
      return
    }

    setItems(prev => {
      const dragging = prev.find(i => i.id === draggingId)
      const target   = prev.find(i => i.id === dragOverId)
      if (!dragging || !target) return prev

      // Only reorder within the same section
      if (dragging.section_id !== target.section_id) return prev

      const next = [...prev]
      const fromIdx = next.findIndex(i => i.id === draggingId)
      const toIdx   = next.findIndex(i => i.id === dragOverId)
      next.splice(fromIdx, 1)
      next.splice(toIdx, 0, dragging)

      // Reassign positions
      const updated = next.map((item, idx) => ({ ...item, position: idx }))

      // Persist new positions to DB (fire-and-forget)
      updated.forEach(item => {
        db('stream_items').update({ position: item.position }).eq('id', item.id)
      })

      return updated
    })

    setDraggingId(null)
    setDragOverId(null)
  }

  const unsectionedItems  = items.filter(i => !i.section_id)
  const activeUnsectioned = unsectionedItems.filter(i => !i.checked)
  const doneAll           = items.filter(i => i.checked)
  const totalActive       = items.filter(i => !i.checked).length

  // Fix 2: progress only for checklist streams
  const isChecklist = stream.type === 'checklist'
  const pct         = items.length > 0 ? Math.round((doneAll.length / items.length) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: 'var(--text3)' }}>
        <span className="font-mono text-xs">Loading stream...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150"
          style={{ color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--border)' }}
        >
          <ArrowLeft size={15} />
        </button>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{
              backgroundColor: stream.color,
              boxShadow:       `0 0 10px ${stream.color}80`,
            }}
          />
          <h1 className="font-syne font-700 text-base truncate" style={{ color: 'var(--text)' }}>
            {stream.name}
          </h1>
        </div>

        {/* Fix 2: % only for checklist */}
        {isChecklist && items.length > 0 && (
          <span className="font-mono text-sm font-600 flex-shrink-0" style={{ color: stream.color }}>
            {pct}%
          </span>
        )}

        {(isOwner || canEdit) && (
          <button
            onClick={onShare}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150"
            style={{ color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--border)' }}
          >
            <Share2 size={14} />
          </button>
        )}
      </div>

      {/* Fix 2: progress bar only for checklist */}
      {isChecklist && items.length > 0 && (
        <div style={{ height: '2px', background: 'var(--bg4)' }}>
          <div
            className="h-full transition-all duration-700"
            style={{
              width:     `${pct}%`,
              background: stream.color,
              boxShadow:  `0 0 8px ${stream.color}60`,
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 max-w-2xl mx-auto">

          {/* Stats row */}
          {items.length > 0 && (
            <div
              className="flex items-center gap-4 mb-4 px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
            >
              <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                <span style={{ color: 'var(--text2)', fontWeight: 600 }}>{totalActive}</span> remaining
              </span>
              <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                <span style={{ color: stream.color, fontWeight: 600 }}>{doneAll.length}</span> done
              </span>
            </div>
          )}

          {/* Fix 6: Sections from stream_sections table */}
          {sections.map(section => (
            <SectionBlock
              key={section.id}
              section={section}
              items={items.filter(i => i.section_id === section.id && !i.checked)}
              stream={stream}
              canEdit={canEdit}
              allowedTypes={allowed}
              onToggle={handleToggle}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onAdd={handleAdd}
              onToggleCollapse={handleToggleCollapse}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              draggingId={draggingId}
              dragOverId={dragOverId}
            />
          ))}

          {/* Unsectioned active items */}
          {activeUnsectioned.length > 0 && (
            <div className="space-y-0.5 mb-4">
              {activeUnsectioned.map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  streamColor={stream.color}
                  canEdit={canEdit}
                  onToggle={handleToggle}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  isDragging={draggingId === item.id}
                  isDragOver={dragOverId === item.id}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {items.length === 0 && sections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: `${stream.color}15`, border: `1px solid ${stream.color}30` }}
              >
                <Plus size={22} style={{ color: stream.color }} />
              </div>
              <p className="font-syne text-sm font-600" style={{ color: 'var(--text2)' }}>
                Nothing here yet
              </p>
              <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
                Add your first item below
              </p>
            </div>
          )}

          {/* Done section (collapsible) */}
          {doneAll.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setDoneExpanded(p => !p)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg w-full text-left mb-1 transition-colors duration-150"
                style={{ color: 'var(--text3)' }}
              >
                {doneExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                <span className="font-mono text-xs" style={{ fontSize: '11px' }}>
                  {doneAll.length} completed
                </span>
              </button>
              {doneExpanded && (
                <div className="space-y-0.5">
                  {doneAll.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      streamColor={stream.color}
                      canEdit={canEdit}
                      onToggle={handleToggle}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      isDragging={draggingId === item.id}
                      isDragOver={dragOverId === item.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fix 6: Add section inline form */}
          {canEdit && addingSection && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl mt-4 transition-all duration-150"
              style={{ background: 'var(--bg3)', border: `1px solid ${stream.color}60` }}
            >
              <input
                ref={sectionInputRef}
                value={newSectionName}
                onChange={e => setNewSectionName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  handleAddSection()
                  if (e.key === 'Escape') { setAddingSection(false); setNewSectionName('') }
                }}
                placeholder="Section name..."
                className="flex-1 bg-transparent outline-none font-mono"
                style={{ color: 'var(--text)', fontSize: '13px' }}
              />
              <button
                onClick={handleAddSection}
                disabled={!newSectionName.trim()}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150"
                style={{
                  background: newSectionName.trim() ? stream.color : 'var(--bg4)',
                  color:      newSectionName.trim() ? '#0a0a0a'    : 'var(--text3)',
                }}
              >
                <Check size={13} />
              </button>
            </div>
          )}

          {/* Quick add + Add section button */}
          {canEdit && (
            <div className="mt-5 space-y-2">
              <QuickAdd
                streamColor={stream.color}
                allowedTypes={allowed}
                onAdd={(c, t) => handleAdd(c, t)}
              />
              {!addingSection && (
                <button
                  onClick={() => setAddingSection(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl w-full text-left transition-all duration-150"
                  style={{ color: 'var(--text3)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = 'var(--bg3)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <FolderPlus size={13} />
                  <span className="font-mono text-xs">Add section</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
