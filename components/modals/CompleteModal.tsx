'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { BottomSheet } from '@/components/ui/BottomSheet'
import type { Task } from '@/types'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { CheckCircle2 } from 'lucide-react'

interface CompleteModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  onConfirm: (hours: number | null) => void
}

const TIME_CHIPS = [
  { label: '15m', hours: 0.25 },
  { label: '30m', hours: 0.5  },
  { label: '1h',  hours: 1    },
  { label: '2h',  hours: 2    },
  { label: '3h',  hours: 3    },
  { label: '4h+', hours: 4    },
]

export function CompleteModal({ isOpen, onClose, task, onConfirm }: CompleteModalProps) {
  const [customHours, setCustomHours] = useState('')
  const [showCustom,  setShowCustom]  = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')

  if (!task) return null

  const handleChip = (hours: number) => { onConfirm(hours); setShowCustom(false); setCustomHours('') }
  const handleCustom = () => {
    const h = parseFloat(customHours)
    if (!isNaN(h) && h > 0) { onConfirm(h); setShowCustom(false); setCustomHours('') }
  }
  const handleSkip = () => { onConfirm(null); setShowCustom(false); setCustomHours('') }

  const content = (
    <div className="space-y-6">
      {/* Task display */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: 'rgba(45,212,191,0.07)', border: '1px solid rgba(45,212,191,0.2)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 size={14} style={{ color: 'var(--teal)' }} />
          <span className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--teal)' }}>
            Completing
          </span>
        </div>
        <p className="font-syne font-600 text-sm" style={{ color: 'var(--text)' }}>
          {task.title}
        </p>
        {task.estimated_hours && (
          <p className="font-mono text-xs mt-1" style={{ color: 'var(--text3)' }}>
            Est. {task.estimated_hours}h
          </p>
        )}
      </div>

      {/* Question */}
      <p className="font-syne text-sm" style={{ color: 'var(--text2)' }}>
        How long did this actually take?
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
                  e.currentTarget.style.background   = 'var(--teal)'
                  e.currentTarget.style.color        = '#080909'
                  e.currentTarget.style.borderColor  = 'var(--teal)'
                  e.currentTarget.style.boxShadow    = '0 0 12px rgba(45,212,191,0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background   = 'var(--bg4)'
                  e.currentTarget.style.color        = 'var(--text2)'
                  e.currentTarget.style.borderColor  = 'var(--border)'
                  e.currentTarget.style.boxShadow    = 'none'
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
              onClick={handleSkip}
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
          />
          <div className="flex gap-2">
            <button
              onClick={handleCustom}
              className="flex-1 py-3 rounded-xl font-syne font-600 text-sm"
              style={{ background: 'var(--teal)', color: '#080909' }}
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

  if (isMobile) {
    return <BottomSheet isOpen={isOpen} onClose={onClose} title="Log time">{content}</BottomSheet>
  }
  return <Modal isOpen={isOpen} onClose={onClose} title="Log time">{content}</Modal>
}
