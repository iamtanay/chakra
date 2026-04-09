'use client'

import { useState, useEffect } from 'react'
import { X, Check, AlignLeft, Link2, Layers, Waves } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { StreamType } from '@/types'

const ACCENT_COLORS = [
  { label: 'Amber',  value: '#e8a247' },
  { label: 'Teal',   value: '#2dd4bf' },
  { label: 'Violet', value: '#a78bfa' },
  { label: 'Rose',   value: '#f87171' },
  { label: 'Blue',   value: '#60a5fa' },
  { label: 'Green',  value: '#34d399' },
]

const STREAM_TYPES: { value: StreamType; label: string; desc: string; Icon: React.ElementType }[] = [
  { value: 'checklist', label: 'Checklist', desc: 'Track tasks & to-dos',           Icon: Check     },
  { value: 'notes',     label: 'Notes',     desc: 'Text blocks & thoughts',         Icon: AlignLeft },
  { value: 'links',     label: 'Links',     desc: 'URLs & reading list',            Icon: Link2     },
  { value: 'mixed',     label: 'Mixed',     desc: 'Any combo of item types',        Icon: Layers    },
]

interface StreamCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, color: string, type: StreamType) => Promise<void>
}

function Content({ onClose, onCreate }: Omit<StreamCreateModalProps, 'isOpen'>) {
  const [name,   setName]   = useState('')
  const [color,  setColor]  = useState('#e8a247')
  const [type,   setType]   = useState<StreamType>('mixed')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    const t = name.trim()
    if (!t) return
    setSaving(true)
    await onCreate(t, color, type)
    setSaving(false)
    onClose()
  }

  return (
    <div className="p-5 space-y-5">
      {/* Name */}
      <div>
        <label className="block font-mono text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}>
          Stream name
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          placeholder="e.g. Weekly Goals, Reading List..."
          autoFocus
          maxLength={60}
          className="w-full px-3 py-2.5 rounded-xl font-syne text-sm outline-none transition-all duration-150"
          style={{
            background: 'var(--bg4)',
            border:     '1px solid var(--border)',
            color:      'var(--text)',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = color }}
          onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />
      </div>

      {/* Accent color */}
      <div>
        <label className="block font-mono text-xs uppercase tracking-widest mb-2.5" style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}>
          Accent color
        </label>
        <div className="flex items-center gap-2.5 flex-wrap">
          {ACCENT_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className="w-8 h-8 rounded-full transition-all duration-150 flex items-center justify-center"
              style={{
                background:    c.value,
                boxShadow:     color === c.value ? `0 0 14px ${c.value}90` : 'none',
                outline:       color === c.value ? `2px solid ${c.value}` : '2px solid transparent',
                outlineOffset: '2px',
                transform:     color === c.value ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {color === c.value && <Check size={12} strokeWidth={3} style={{ color: '#0a0a0a' }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Type */}
      <div>
        <label className="block font-mono text-xs uppercase tracking-widest mb-2.5" style={{ color: 'var(--text3)', letterSpacing: '0.1em' }}>
          Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {STREAM_TYPES.map(({ value, label, desc, Icon }) => {
            const active = type === value
            return (
              <button
                key={value}
                onClick={() => setType(value)}
                className="flex items-start gap-2.5 p-3 rounded-xl text-left transition-all duration-150"
                style={{
                  background: active ? `${color}15`  : 'var(--bg3)',
                  border:     `1px solid ${active ? color + '60' : 'var(--border)'}`,
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: active ? color     : 'var(--bg4)',
                    color:      active ? '#0a0a0a' : 'var(--text3)',
                  }}
                >
                  <Icon size={14} />
                </div>
                <div>
                  <p className="font-syne text-xs font-600" style={{ color: active ? color : 'var(--text)' }}>
                    {label}
                  </p>
                  <p className="font-mono" style={{ color: 'var(--text3)', fontSize: '10px', lineHeight: '1.4' }}>{desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl font-syne text-sm font-500 transition-colors duration-150"
          style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          className="flex-1 py-2.5 rounded-xl font-syne text-sm font-600 transition-all duration-150"
          style={{
            background: name.trim() ? color     : 'var(--bg4)',
            color:      name.trim() ? '#0a0a0a' : 'var(--text3)',
            opacity:    saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Creating...' : 'Create Stream'}
        </button>
      </div>
    </div>
  )
}

export function StreamCreateModal({ isOpen, onClose, onCreate }: StreamCreateModalProps) {
  const isMobile = useMediaQuery('(max-width: 767px)')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // ── Mobile: bottom sheet ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-[70] animate-fadeIn"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          className="fixed bottom-0 left-0 right-0 rounded-t-3xl sheet-enter flex flex-col overflow-hidden"
          style={{
            background:    'var(--bg2)',
            borderTop:     '1px solid var(--border2)',
            boxShadow:     '0 -16px 60px rgba(0,0,0,0.5)',
            maxHeight:     '92vh',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--bg5)' }} />
          </div>
          <div
            className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--amber-dim)', border: '1px solid var(--amber)' }}
              >
                <Waves size={15} style={{ color: 'var(--amber)' }} />
              </div>
              <div>
                <h2 className="font-syne font-700 text-base" style={{ color: 'var(--text)' }}>New Stream</h2>
                <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>A living collection</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
            >
              <X size={16} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            <Content onClose={onClose} onCreate={onCreate} />
          </div>
        </div>
      </div>
    )
  }

  // ── Desktop: centered modal ───────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md flex flex-col rounded-2xl overflow-hidden animate-scaleIn"
        style={{
          background: 'var(--bg2)',
          border:     '1px solid var(--border2)',
          boxShadow:  '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--amber-dim)', border: '1px solid rgba(232,162,71,0.3)' }}
            >
              <Waves size={16} style={{ color: 'var(--amber)' }} />
            </div>
            <div>
              <h2 className="font-syne font-700 text-base" style={{ color: 'var(--text)' }}>New Stream</h2>
              <p className="font-mono text-xs" style={{ color: 'var(--text3)' }}>A living collection of thoughts & intentions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
            style={{ color: 'var(--text3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)' }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto">
          <Content onClose={onClose} onCreate={onCreate} />
        </div>
      </div>
    </div>
  )
}
