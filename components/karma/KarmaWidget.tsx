'use client'

/**
 * KarmaWidget — daily ritual checklist with a karma streak score.
 *
 * Props:
 *   compact   — true on Home page (shows score pill + collapsed list)
 *               false on Today page (full checklist always expanded)
 *   userId    — from supabase auth, needed for DB ops
 *
 * Data model:
 *   karma_rituals  — user's configured habits (label, emoji, position)
 *   karma_logs     — one row per (ritual_id, log_date) when ticked
 *
 * Karma score = consecutive days where all rituals were done.
 * Today counts as complete only if every ritual is ticked.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Settings, Plus, Trash2, X, Flame, Sparkles, ChevronDown } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => (createClient() as any).from(table)

interface Ritual {
  id: string
  label: string
  emoji: string
  position: number
}

const DEFAULT_RITUALS: Omit<Ritual, 'id'>[] = [
  { emoji: '🧘', label: 'Meditate',    position: 0 },
  { emoji: '🏋️', label: 'Workout',     position: 1 },
  { emoji: '📖', label: 'Read',        position: 2 },
  { emoji: '🌿', label: 'Go outside',  position: 3 },
  { emoji: '💧', label: 'Drink water', position: 4 },
  { emoji: '✍️', label: 'Reflect',     position: 5 },
]

// Curated icon palette grouped by theme
const ICON_PALETTE = [
  '🧘', '🧠', '📿', '🌬️', '✨', '🔮', '☯️', '🌸',
  '🏋️', '🤸', '🚴', '🏃', '💪', '🧗', '🤽', '⛹️',
  '💧', '🥗', '🍎', '☕', '🫖', '🥤', '🍵', '🌾',
  '📖', '✍️', '🎯', '💡', '📚', '🎓', '🔬', '🗺️',
  '🌿', '🌳', '🌻', '🌊', '🌙', '☀️', '🌱', '🍃',
  '❤️', '🫂', '🗣️', '📞', '🙏', '🤝', '💌', '🎁',
  '🎨', '🎵', '🎸', '✏️', '📷', '🎬', '🖊️', '🎭',
  '📋', '⏰', '🗂️', '✅', '🎪', '🚀', '⚡', '🔥',
]

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function prevDateISO(iso: string, days = 1) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function computeStreak(
  rituals: Ritual[],
  logs: { ritual_id: string; log_date: string }[],
): number {
  if (rituals.length === 0) return 0
  const ritualIds = new Set(rituals.map((r) => r.id))
  const byDate: Record<string, Set<string>> = {}
  for (const log of logs) {
    if (!ritualIds.has(log.ritual_id)) continue
    const dateKey = log.log_date
    if (!byDate[dateKey]) {
      byDate[dateKey] = new Set<string>()
    }
    byDate[dateKey]!.add(log.ritual_id)
  }
  const completeDates = new Set(
    Object.entries(byDate)
      .filter(([, ids]) => ids.size >= ritualIds.size)
      .map(([date]) => date)
  )
  let streak = 0
  let cursor = todayISO()
  if (!completeDates.has(cursor)) cursor = prevDateISO(cursor)
  while (completeDates.has(cursor)) {
    streak++
    cursor = prevDateISO(cursor)
  }
  return streak
}

// ── Icon Picker ───────────────────────────────────────────────────────────────

interface IconPickerProps {
  value: string
  onChange: (emoji: string) => void
}

function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ left: 0, bottom: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({
        left: rect.left,
        bottom: window.innerHeight - rect.top + 8,
      })
    }
    setOpen((p) => !p)
  }

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-lg relative transition-all duration-150"
        style={{
          background: 'var(--bg4)',
          border: open ? '1px solid var(--violet)' : '1px solid var(--border)',
          boxShadow: open ? '0 0 0 2px rgba(167,139,250,0.2)' : undefined,
        }}
        title="Pick an icon"
      >
        <span>{value || '✦'}</span>
        <ChevronDown
          size={8}
          className="absolute bottom-1 right-1"
          style={{
            color: 'var(--text3)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[81] rounded-2xl p-3"
            style={{
              left: pos.left,
              bottom: pos.bottom,
              background: 'var(--bg2)',
              border: '1px solid var(--border2)',
              width: '244px',
              boxShadow: '0 -8px 48px rgba(0,0,0,0.5)',
            }}
          >
            <div className="grid grid-cols-8 gap-0.5 mb-2">
              {ICON_PALETTE.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => { onChange(icon); setOpen(false) }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-base transition-all duration-100"
                  style={{
                    background: value === icon ? 'rgba(167,139,250,0.2)' : 'transparent',
                    border: value === icon ? '1px solid rgba(167,139,250,0.4)' : '1px solid transparent',
                  }}
                  onMouseEnter={(e) => { if (value !== icon) e.currentTarget.style.background = 'var(--bg4)' }}
                  onMouseLeave={(e) => { if (value !== icon) e.currentTarget.style.background = 'transparent' }}
                >
                  {icon}
                </button>
              ))}
            </div>
            <div
              className="flex items-center gap-2 pt-2"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <span className="font-mono text-xs flex-shrink-0" style={{ color: 'var(--text3)' }}>custom</span>
              <input
                placeholder="paste emoji"
                maxLength={2}
                className="flex-1 text-sm rounded-lg px-2 py-1 outline-none"
                style={{
                  background: 'var(--bg4)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                onChange={(e) => { if (e.target.value) onChange(e.target.value) }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  rituals: Ritual[]
  onClose: () => void
  onSave: (updated: Ritual[]) => void
  userId: string
}

function EditModal({ rituals, onClose, onSave, userId }: EditModalProps) {
  const [list,     setList]     = useState<Ritual[]>([...rituals])
  const [newEmoji, setNewEmoji] = useState('✦')
  const [newLabel, setNewLabel] = useState('')
  const [saving,   setSaving]   = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')

  const addRitual = () => {
    const label = newLabel.trim()
    if (!label) return
    setList((prev) => [...prev, {
      id: `new-${Date.now()}`, label,
      emoji: newEmoji.trim() || '✦', position: prev.length,
    }])
    setNewLabel('')
    setNewEmoji('✦')
  }

  const handleSave = async () => {
    setSaving(true)
    const toInsert = list.filter((r) => r.id.startsWith('new-'))
    const toKeep   = list.filter((r) => !r.id.startsWith('new-'))
    const toDelete = rituals.filter((r) => !list.find((l) => l.id === r.id)).map((r) => r.id)

    if (toDelete.length) await db('karma_rituals').delete().in('id', toDelete)
    let inserted: Ritual[] = []
    if (toInsert.length) {
      const { data } = await db('karma_rituals').insert(
        toInsert.map((r, i) => ({ user_id: userId, label: r.label, emoji: r.emoji, position: toKeep.length + i }))
      ).select()
      inserted = data || []
    }
    await Promise.all(toKeep.map((r, i) => db('karma_rituals').update({ position: i }).eq('id', r.id)))
    onSave([...toKeep, ...inserted])
    setSaving(false)
    onClose()
  }

  const inner = (
    <div className="flex flex-col gap-3">
      {/* Ritual list */}
      <div className="space-y-1.5">
        {list.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl group"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
          >
            <span className="text-base w-6 text-center flex-shrink-0">{r.emoji}</span>
            <span className="flex-1 font-syne text-sm truncate" style={{ color: 'var(--text)' }}>{r.label}</span>
            <button
              onClick={() => setList((p) => p.filter((x) => x.id !== r.id))}
              className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0"
              style={{ color: 'var(--text3)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)' }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {list.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-6 rounded-xl"
            style={{ background: 'var(--bg3)', border: '1px dashed var(--border2)' }}
          >
            <span className="text-2xl mb-1">🌱</span>
            <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>No rituals yet. Add one below.</p>
          </div>
        )}
      </div>

      {/* Add row */}
      <div
        className="flex items-center gap-2 p-2.5 rounded-xl"
        style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
      >
        <IconPicker value={newEmoji} onChange={setNewEmoji} />
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addRitual() }}
          placeholder="New ritual name…"
          className="flex-1 text-sm font-syne outline-none px-3 py-2 rounded-lg min-w-0"
          style={{ background: 'var(--bg4)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
        <button
          onClick={addRitual}
          className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 transition-all duration-150"
          style={{ background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid rgba(232,162,71,0.25)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--amber)'; e.currentTarget.style.color = '#0a0a0a' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--amber-dim)'; e.currentTarget.style.color = 'var(--amber)' }}
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-xl font-syne font-600 text-sm transition-all duration-150"
        style={{ background: 'var(--amber)', color: '#0a0a0a', opacity: saving ? 0.6 : 1 }}
      >
        {saving ? 'Saving…' : 'Save rituals'}
      </button>
    </div>
  )

  // ── Mobile: bottom sheet ──────────────────────────────────────────────────
  if (isMobile) return (
    <div
      className="fixed inset-0 z-[70] animate-fadeIn md:hidden"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="fixed bottom-0 left-0 right-0 rounded-t-3xl flex flex-col"
        style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border2)', maxHeight: '92vh' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--bg5)' }} />
        </div>
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={13} style={{ color: 'var(--violet)' }} />
            <h2 className="font-syne font-700 text-base" style={{ color: 'var(--text)' }}>Daily Rituals</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
          >
            <X size={15} />
          </button>
        </div>
        <div className="overflow-y-auto p-5 flex-1">{inner}</div>
      </div>
    </div>
  )

  // ── Desktop: tight centered modal ─────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full rounded-2xl overflow-hidden flex flex-col"
        style={{
          maxWidth: '380px',
          maxHeight: '78vh',
          background: 'var(--bg2)',
          border: '1px solid var(--border2)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={13} style={{ color: 'var(--violet)' }} />
            <h2 className="font-syne font-700 text-sm tracking-wide" style={{ color: 'var(--text)' }}>
              Daily Rituals
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150"
            style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)' }}
          >
            <X size={14} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex-1">{inner}</div>
      </div>
    </div>
  )
}

// ── Main Widget ───────────────────────────────────────────────────────────────

interface KarmaWidgetProps {
  userId: string
  compact?: boolean
}

export function KarmaWidget({ userId, compact = false }: KarmaWidgetProps) {
  const [rituals,    setRituals]    = useState<Ritual[]>([])
  const [todayLogs,  setTodayLogs]  = useState<Set<string>>(new Set())
  const [recentLogs, setRecentLogs] = useState<{ ritual_id: string; log_date: string }[]>([])
  const [streak,     setStreak]     = useState(0)
  const [editing,    setEditing]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [seeded,     setSeeded]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const today  = todayISO()
    const cutoff = prevDateISO(today, 60)
    const [{ data: rData }, { data: lData }] = await Promise.all([
      db('karma_rituals').select('*').eq('user_id', userId).order('position'),
      db('karma_logs').select('ritual_id, log_date')
        .eq('user_id', userId).gte('log_date', cutoff).lte('log_date', today),
    ])
    let ritualList: Ritual[] = rData || []
    if (ritualList.length === 0 && !seeded) {
      setSeeded(true)
      const { data: ins } = await db('karma_rituals').insert(
        DEFAULT_RITUALS.map((r) => ({ ...r, user_id: userId }))
      ).select()
      ritualList = ins || []
    }
    const logs: { ritual_id: string; log_date: string }[] = lData || []
    setRituals(ritualList)
    setRecentLogs(logs)
    setTodayLogs(new Set(logs.filter((l) => l.log_date === today).map((l) => l.ritual_id)))
    setStreak(computeStreak(ritualList, logs))
    setLoading(false)
  }, [userId, seeded])

  useEffect(() => { load() }, [load])

  const toggle = async (ritualId: string) => {
    const today   = todayISO()
    const already = todayLogs.has(ritualId)
    setTodayLogs((prev) => { const n = new Set(prev); already ? n.delete(ritualId) : n.add(ritualId); return n })
    if (already) {
      await db('karma_logs').delete().eq('ritual_id', ritualId).eq('log_date', today).eq('user_id', userId)
    } else {
      await db('karma_logs').insert({ user_id: userId, ritual_id: ritualId, log_date: today })
    }
    const updated = already
      ? recentLogs.filter((l) => !(l.ritual_id === ritualId && l.log_date === today))
      : [...recentLogs, { ritual_id: ritualId, log_date: today }]
    setRecentLogs(updated)
    setStreak(computeStreak(rituals, updated))
  }

  const completedCount = rituals.filter((r) => todayLogs.has(r.id)).length
  const allDone = rituals.length > 0 && completedCount === rituals.length

  if (loading) return null

  const streakBadge = streak > 0 && (
    <span
      className="flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-full"
      style={{
        background: streak >= 7 ? 'var(--amber)'    : 'var(--amber-dim)',
        color:      streak >= 7 ? '#0a0a0a'          : 'var(--amber)',
        border:     streak >= 7 ? 'none'             : '1px solid rgba(232,162,71,0.25)',
      }}
    >
      {streak >= 7 && <Flame size={9} strokeWidth={2} />}
      {streak}d
    </span>
  )

  // ── Compact / Home ─────────────────────────────────────────────────────────
  if (compact) return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={13} style={{ color: 'var(--violet)' }} />
          <span className="font-syne font-700 text-sm uppercase tracking-widest" style={{ color: 'var(--text)', letterSpacing: '0.12em' }}>Karma</span>
          {streakBadge}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="w-7 h-7 flex items-center justify-center rounded-lg"
          style={{ color: 'var(--text3)', background: 'var(--bg4)' }}
          title="Configure rituals"
        >
          <Settings size={12} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {rituals.map((r) => {
          const done = todayLogs.has(r.id)
          return (
            <button key={r.id} onClick={() => toggle(r.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-syne text-xs font-500 transition-all duration-150"
              style={{
                background: done ? 'rgba(167,139,250,0.12)' : 'var(--bg4)',
                color:      done ? 'var(--violet)'          : 'var(--text3)',
                border:     done ? '1px solid rgba(167,139,250,0.25)' : '1px solid var(--border)',
                textDecoration: done ? 'line-through' : 'none',
                opacity:    done ? 0.75 : 1,
              }}>
              <span>{r.emoji}</span>{r.label}
            </button>
          )
        })}
      </div>

      {rituals.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
              {completedCount}/{rituals.length} today
            </span>
            {allDone && <span className="font-mono text-xs" style={{ color: 'var(--violet)' }}>✦ full karma</span>}
          </div>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg5)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(completedCount / rituals.length) * 100}%`,
                background: allDone
                  ? 'linear-gradient(90deg, var(--violet) 0%, var(--amber) 100%)'
                  : 'var(--violet)',
                boxShadow: allDone ? '0 0 8px rgba(167,139,250,0.4)' : undefined,
              }} />
          </div>
        </div>
      )}

      {editing && <EditModal rituals={rituals} onClose={() => setEditing(false)}
        onSave={(u) => { setRituals(u); setEditing(false) }} userId={userId} />}
    </div>
  )

  // ── Full / Today ───────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>

      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <Sparkles size={14} style={{ color: 'var(--violet)' }} />
          <span className="font-syne font-700 text-sm uppercase tracking-widest" style={{ color: 'var(--text)', letterSpacing: '0.12em' }}>Daily Karma</span>
          {streakBadge}
        </div>
        <div className="flex items-center gap-2">
          {rituals.length > 0 && (
            <span className="font-mono text-xs" style={{ color: allDone ? 'var(--violet)' : 'var(--text3)' }}>
              {completedCount}/{rituals.length}
            </span>
          )}
          <button
            onClick={() => setEditing(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ color: 'var(--text3)', background: 'var(--bg4)' }}
          >
            <Settings size={12} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {rituals.map((r) => {
          const done = todayLogs.has(r.id)
          return (
            <button key={r.id} onClick={() => toggle(r.id)}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-left"
              style={{
                background: done ? 'rgba(167,139,250,0.07)' : 'var(--bg3)',
                border:     done ? '1px solid rgba(167,139,250,0.2)' : '1px solid var(--border)',
              }}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
                style={{
                  background: done ? 'var(--violet)' : 'transparent',
                  border:     done ? 'none'          : '2px solid var(--border2)',
                  boxShadow:  done ? '0 0 10px rgba(167,139,250,0.3)' : 'none',
                }}>
                {done && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#0a0a0a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-base">{r.emoji}</span>
              <span
                className="flex-1 font-syne font-500 text-sm transition-all duration-200"
                style={{ color: done ? 'var(--text3)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}
              >
                {r.label}
              </span>
              {done && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: 'var(--violet)', boxShadow: '0 0 6px rgba(167,139,250,0.5)' }} />}
            </button>
          )
        })}

        {allDone && (
          <div
            className="flex items-center justify-center gap-2 py-3 rounded-xl mt-1"
            style={{
              background: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(232,162,71,0.06) 100%)',
              border: '1px solid rgba(167,139,250,0.15)',
            }}>
            <Sparkles size={12} style={{ color: 'var(--violet)' }} />
            <span className="font-syne text-xs font-600" style={{ color: 'var(--violet)' }}>Full karma achieved</span>
            <Sparkles size={12} style={{ color: 'var(--amber)' }} />
          </div>
        )}
      </div>

      {rituals.length > 0 && (
        <div className="h-0.5 w-full" style={{ background: 'var(--bg5)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${(completedCount / rituals.length) * 100}%`,
              background: allDone
                ? 'linear-gradient(90deg, var(--violet) 0%, var(--amber) 100%)'
                : 'var(--violet)',
              boxShadow: allDone ? '0 0 8px rgba(167,139,250,0.5)' : undefined,
            }} />
        </div>
      )}

      {editing && <EditModal rituals={rituals} onClose={() => setEditing(false)}
        onSave={(u) => { setRituals(u); setEditing(false) }} userId={userId} />}
    </div>
  )
}
