'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { BottomSheet } from '@/components/ui/BottomSheet'
import type { Task } from '@/types'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { recurrenceLabel } from '@/lib/recurrence'

interface CompleteModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  onConfirm: (hours: number | null, note: string | null) => void
}

const TIME_CHIPS = [
  { label: '15m', hours: 0.25 },
  { label: '30m', hours: 0.5  },
  { label: '1h',  hours: 1    },
  { label: '2h',  hours: 2    },
  { label: '3h',  hours: 3    },
  { label: '4h+', hours: 4    },
]

const NOTE_MAX_LENGTH = 200

export function CompleteModal({ isOpen, onClose, task, onConfirm }: CompleteModalProps) {
  // ── Step 1: hour logging ──────────────────────────────────────────────────
  const [customHours, setCustomHours] = useState('')
  const [showCustom,  setShowCustom]  = useState(false)
  const [selectedHours, setSelectedHours] = useState<number | null>(null)
  const [hoursConfirmed, setHoursConfirmed] = useState(false)

  // ── Step 2: Traces (completion note) ─────────────────────────────────────
  const [note, setNote] = useState('')

  const isMobile    = useMediaQuery('(max-width: 768px)')

  if (!task) return null

  const isRecurring = task.is_recurring
  const accentColor = isRecurring ? 'var(--amber)' : 'var(--teal)'
  const accentShadow = isRecurring
    ? '0 0 12px rgba(232,162,71,0.3)'
    : '0 0 12px rgba(45,212,191,0.3)'

  // ── Reset all state when closed ───────────────────────────────────────────
  const handleClose = () => {
    setCustomHours('')
    setShowCustom(false)
    setSelectedHours(null)
    setHoursConfirmed(false)
    setNote('')
    onClose()
  }

  // ── Step 1 → Step 2: hours chosen ────────────────────────────────────────
  const advanceToNote = (hours: number | null) => {
    setSelectedHours(hours)
    setHoursConfirmed(true)
    setShowCustom(false)
    setCustomHours('')
  }

  const handleChip = (hours: number) => advanceToNote(hours)

  const handleCustomConfirm = () => {
    const h = parseFloat(customHours)
    advanceToNote(!isNaN(h) && h > 0 ? h : null)
  }

  const handleSkipHours = () => advanceToNote(null)

  // ── Step 2: final confirm ─────────────────────────────────────────────────
  const handleFinalConfirm = () => {
    onConfirm(selectedHours, note.trim() || null)
    handleClose()
  }

  const handleSkipNote = () => {
    onConfirm(selectedHours, null)
    handleClose()
  }

  // ── Task summary block (shared across steps) ──────────────────────────────
  const taskSummary = (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: isRecurring ? 'rgba(232,162,71,0.07)' : 'rgba(45,212,191,0.07)',
        border:     isRecurring ? '1px solid rgba(232,162,71,0.25)' : '1px solid rgba(45,212,191,0.2)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        {isRecurring
          ? <RefreshCw size={14} style={{ color: 'var(--amber)' }} />
          : <CheckCircle2 size={14} style={{ color: 'var(--teal)' }} />
        }
        <span
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: isRecurring ? 'var(--amber)' : 'var(--teal)' }}
        >
          {isRecurring ? 'Complete cycle' : 'Completing'}
        </span>
      </div>
      <p className="font-syne font-600 text-sm" style={{ color: 'var(--text)' }}>
        {task.title}
      </p>
      {isRecurring && (
        <p className="font-mono text-xs mt-1" style={{ color: 'var(--text3)' }}>
          {recurrenceLabel(task)} · This cycle will advance to the next occurrence.
        </p>
      )}
      {task.estimated_hours && (
        <p className="font-mono text-xs mt-1" style={{ color: 'var(--text3)' }}>
          Est. {task.estimated_hours}h
        </p>
      )}
    </div>
  )

  // ── Step 1 content: log hours ─────────────────────────────────────────────
  const step1Content = (
    <div className="space-y-6">
      {taskSummary}

      <p className="font-syne text-sm" style={{ color: 'var(--text2)' }}>
        How long did this {isRecurring ? 'cycle' : ''} actually take?
      </p>

      {!showCustom ? (
        <div>
          {/* 3×2 chip grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {TIME_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleChip(chip.hours)}
                className="py-3 rounded-xl font-mono text-sm font-600 transition-all duration-150"
                style={{
                  background: 'var(--bg4)',
                  color:      'var(--text2)',
                  border:     '1px solid var(--border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background  = accentColor
                  e.currentTarget.style.color       = '#080909'
                  e.currentTarget.style.borderColor = accentColor
                  e.currentTarget.style.boxShadow   = accentShadow
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background  = 'var(--bg4)'
                  e.currentTarget.style.color       = 'var(--text2)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.boxShadow   = 'none'
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCustom(true)}
              className="flex-1 py-2.5 rounded-xl font-mono text-xs transition-all duration-150"
              style={{ background: 'var(--bg4)', color: 'var(--text3)', border: '1px solid var(--border)' }}
            >
              Custom
            </button>
            <button
              onClick={handleSkipHours}
              className="flex-1 py-2.5 rounded-xl font-mono text-xs transition-all duration-150"
              style={{ background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)' }}
            >
              Skip
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="number"
            step="0.25"
            min="0"
            value={customHours}
            onChange={(e) => setCustomHours(e.target.value)}
            placeholder="e.g. 1.5"
            autoFocus
            className="w-full px-4 py-3 rounded-xl outline-none font-mono text-sm"
            style={{
              background: 'var(--bg4)',
              border:     '1px solid var(--border2)',
              color:      'var(--text)',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = accentColor)}
            onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border2)')}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCustomConfirm() }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCustomConfirm}
              className="flex-1 py-3 rounded-xl font-syne font-600 text-sm"
              style={{ background: accentColor, color: '#080909' }}
            >
              Confirm
            </button>
            <button
              onClick={() => { setShowCustom(false); setCustomHours('') }}
              className="flex-1 py-3 rounded-xl font-syne text-sm"
              style={{ background: 'var(--bg4)', color: 'var(--text2)', border: '1px solid var(--border)' }}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // ── Step 2 content: Traces note ───────────────────────────────────────────
  const step2Content = (
    <div className="space-y-6">
      {taskSummary}

      {/* Show the logged hours as a small confirmation */}
      {selectedHours !== null && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'var(--bg4)', border: '1px solid var(--border)' }}
        >
          <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>Logged:</span>
          <span className="font-mono text-xs font-600" style={{ color: accentColor }}>
            {selectedHours}h
          </span>
        </div>
      )}

      <div>
        <p className="font-syne text-sm mb-3" style={{ color: 'var(--text2)' }}>
          How did it go? <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>(optional)</span>
        </p>
        <textarea
          value={note}
          onChange={(e) => {
            // Hard cap at NOTE_MAX_LENGTH characters
            if (e.target.value.length <= NOTE_MAX_LENGTH) {
              setNote(e.target.value)
            }
          }}
          placeholder="What did you actually do? Any blockers?"
          rows={3}
          autoFocus
          className="w-full px-4 py-3 rounded-xl outline-none resize-none font-syne text-sm transition-all duration-150"
          style={{
            background: 'var(--bg4)',
            border:     '1px solid var(--border)',
            color:      'var(--text)',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = accentColor)}
          onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        <div className="flex justify-end mt-1">
          <span
            className="font-mono text-xs"
            style={{ color: note.length > NOTE_MAX_LENGTH * 0.85 ? 'var(--amber)' : 'var(--text3)' }}
          >
            {note.length}/{NOTE_MAX_LENGTH}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleFinalConfirm}
          className="flex-1 py-3 rounded-xl font-syne font-600 text-sm transition-all duration-150"
          style={{ background: accentColor, color: '#080909' }}
        >
          {note.trim() ? 'Save & Complete' : 'Complete'}
        </button>
        <button
          onClick={handleSkipNote}
          className="flex-1 py-3 rounded-xl font-syne text-sm transition-all duration-150"
          style={{ background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)' }}
        >
          Skip
        </button>
      </div>
    </div>
  )

  // Show step 1 until hours are confirmed, then show step 2 (Traces)
  const content       = hoursConfirmed ? step2Content : step1Content
  const title         = hoursConfirmed ? 'Traces' : (isRecurring ? 'Complete cycle' : 'Log time')

  if (isMobile) {
    return <BottomSheet isOpen={isOpen} onClose={handleClose} title={title}>{content}</BottomSheet>
  }
  return <Modal isOpen={isOpen} onClose={handleClose} title={title}>{content}</Modal>
}
