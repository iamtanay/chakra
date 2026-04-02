'use client'

import { useState } from 'react'
import type { Task, Project } from '@/types'
import { Check, Star, RefreshCw, Flame, AlertTriangle } from 'lucide-react'
import {
  recurrenceLabel,
  recurringDueStatus,
  parseLocalDate,
  todayLocal,
  toISODate,
  isWarmStreak,
} from '@/lib/recurrence'

interface TaskCardProps {
  task: Task
  project: Project | undefined
  onCardClick: (task: Task) => void
  onComplete: (task: Task) => void
  /**
   * Called when the user confirms undo on a completed task.
   * Moves the task back to 'Todo'.
   */
  onUndoDone?: (task: Task) => void
  onTodayToggle: (task: Task) => void
  isDragging?: boolean
  /**
   * True when this is a Done task that completed more than 24 h ago and is
   * being shown via the "history" toggle on desktop. Renders the card slightly
   * dimmed so the user can visually distinguish it from tasks completed today.
   */
  isOldCompleted?: boolean
  /**
   * True on mobile. Controls tick-mark appearance:
   * - mobile non-done: hollow circle (always visible, tap to complete)
   * - mobile done: filled teal circle (always visible, tap to undo — 2 taps)
   * - web non-done: filled teal/amber circle on hover only
   * - web done: filled teal circle always visible, click to undo — 2 clicks
   */
  isMobile?: boolean
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
  Development:            'DEV',
  Research:               'RES',
  'Review / QA':          'QA',
  Design:                 'DSN',
  'Journal Writing':      'JNL',
  'Document Generation':  'DOC',
  'Finance & Banking':    'FIN',
  'Bills & Payments':     'BILL',
  'Home & Maintenance':   'HOME',
  'Cleaning & Chores':    'CLN',
  'Health & Wellness':    'HLTH',
  'Errands & Shopping':   'ERR',
  'Family & Social':      'FAM',
  'Travel & Bookings':    'TRV',
  'Legal & Admin':        'LGL',
  'Self Care':            'SLF',
  Reading:                'READ',
  'Note Taking':          'NOTE',
  Practice:               'PRAC',
  Revision:               'REV',
  Assignment:             'ASGN',
  'Exam Prep':            'EXAM',
}

function formatDueDate(iso: string): string {
  const d = parseLocalDate(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatCompletedAt(iso: string): string {
  const d    = new Date(iso)
  const now  = Date.now()
  const diff = now - d.getTime()
  const hrs  = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hrs / 24)

  if (days === 0) return `${hrs}h ago`
  if (days === 1) return 'yesterday'
  if (days < 7)  return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TaskCard({
  task,
  project,
  onCardClick,
  onComplete,
  onUndoDone,
  onTodayToggle,
  isDragging     = false,
  isOldCompleted = false,
  isMobile       = false,
}: TaskCardProps) {
  const [hovered,     setHovered]     = useState(false)
  const [pendingUndo, setPendingUndo] = useState(false)

  const today  = todayLocal()
  const isDone = task.status === 'Done'

  const displayDate = task.next_due_date || task.due_date

  const isOverdue =
    displayDate &&
    parseLocalDate(displayDate) < today &&
    !isDone

  const dueStatus = task.is_recurring ? recurringDueStatus(task, today) : null

  const todayStr   = toISODate(new Date())
  const isDueToday = (task.next_due_date ?? task.due_date) === todayStr
  const isInToday  = task.today_flag || isDueToday

  const streak     = task.current_streak ?? 0
  const warmStreak = task.is_recurring && isWarmStreak(streak)

  const abbr   = categoryAbbr[task.category] ?? task.category?.slice(0, 3).toUpperCase() ?? '—'
  const pColor = priorityColors[task.priority] ?? 'var(--text3)'
  const pBg    = priorityBg[task.priority]    ?? 'transparent'

  const dateColor = (() => {
    if (task.is_recurring) {
      if (dueStatus === 'overdue')  return 'var(--col-high)'
      if (dueStatus === 'due-soon') return 'var(--amber)'
      return 'var(--text3)'
    }
    return isOverdue ? 'var(--col-high)' : 'var(--text3)'
  })()

  const cardBorder = isOverdue
    ? 'rgba(248,113,113,0.5)'
    : warmStreak
      ? 'rgba(232,162,71,0.35)'
      : task.is_recurring
        ? 'rgba(232,162,71,0.18)'
        : 'var(--border)'

  const buttonVisible =
    !isOldCompleted &&
    (isDone || isMobile || hovered)

  const getButtonStyle = (): React.CSSProperties => {
    if (isDone) {
      if (pendingUndo) {
        return {
          background: 'var(--rose, #f43f5e)',
          boxShadow:  '0 0 12px rgba(244,63,94,0.4)',
          border:     'none',
        }
      }
      return {
        background: 'var(--teal)',
        boxShadow:  '0 0 12px rgba(45,212,191,0.35)',
        border:     'none',
      }
    }
    if (isMobile) {
      return {
        background: 'transparent',
        border:     '2px solid var(--teal)',
        boxShadow:  'none',
      }
    }
    if (task.is_recurring) {
      return {
        background: 'var(--amber)',
        boxShadow:  '0 0 12px rgba(232,162,71,0.35)',
        border:     'none',
      }
    }
    return {
      background: 'var(--teal)',
      boxShadow:  '0 0 12px rgba(45,212,191,0.35)',
      border:     'none',
    }
  }

  /**
   * Core action logic — called by both onClick and onTouchEnd.
   * Kept free of any React.MouseEvent / React.TouchEvent types so it
   * can be invoked cleanly from either handler without type issues.
   */
  const handleActionClick = () => {
    if (isDone) {
      if (pendingUndo) {
        setPendingUndo(false)
        onUndoDone?.(task)
      } else {
        setPendingUndo(true)
      }
    } else {
      onComplete(task)
    }
  }

  const renderButtonIcon = () => {
    if (isDone) {
      return <Check size={14} style={{ color: '#fff' }} strokeWidth={2.5} />
    }
    if (isMobile) {
      return <Check size={14} style={{ color: 'var(--teal)' }} strokeWidth={2.5} />
    }
    if (task.is_recurring) {
      return <RefreshCw size={13} style={{ color: '#080909' }} strokeWidth={2.5} />
    }
    return <Check size={14} style={{ color: '#080909' }} strokeWidth={2.5} />
  }

  const buttonTitle = isDone
    ? pendingUndo ? 'Tap again to confirm undo' : 'Tap to undo'
    : task.is_recurring
      ? 'Complete this cycle'
      : 'Mark complete'

  return (
    <div
      onClick={() => {
        // Tapping card body while pending → cancel undo instead of opening modal
        if (pendingUndo) { setPendingUndo(false); return }
        onCardClick(task)
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPendingUndo(false) }}
      className={`relative rounded-xl cursor-pointer card-lift ${isDragging ? 'opacity-30 scale-95' : ''}`}
      style={{
        background: isOverdue ? 'color-mix(in srgb, var(--bg3) 92%, rgba(248,113,113,0.5))' : 'var(--bg3)',
        border:     `1px solid ${cardBorder}`,
        overflow:   'hidden',
        boxShadow:  isOverdue
          ? '0 0 0 0 transparent'
          : warmStreak ? '0 0 16px rgba(232,162,71,0.10)' : undefined,
        opacity:    isOldCompleted ? 0.55 : 1,
        transition: 'opacity 150ms ease',
      }}
    >
      {/* Priority accent bar */}
      <div
        className="h-0.5 w-full absolute top-0 left-0"
        style={{
          background: `linear-gradient(90deg, ${pColor} 0%, transparent 70%)`,
          opacity: isOldCompleted ? 0.4 : 0.8,
        }}
      />

      {/* Overdue left stripe */}
      {isOverdue && (
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5"
          style={{ background: 'var(--col-high)' }}
        />
      )}

      <div className="p-4 pt-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category badge */}
            <span
              className="font-mono text-xs px-2 py-0.5 rounded font-500"
              style={{
                color:         pColor,
                background:    pBg,
                letterSpacing: '0.05em',
              }}
            >
              {abbr}
            </span>

            {/* Recurring badge */}
            {task.is_recurring && (
              <span
                className="flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-full"
                style={{
                  color:         'var(--amber)',
                  background:    'rgba(232,162,71,0.1)',
                  letterSpacing: '0.03em',
                }}
              >
                <RefreshCw size={9} strokeWidth={2.5} />
                {task.recurrence_frequency}
              </span>
            )}

            {/* Momentum streak badge */}
            {task.is_recurring && streak > 0 && (
              <span
                className="flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-full"
                style={{
                  color:         warmStreak ? '#080909'      : 'var(--text3)',
                  background:    warmStreak ? 'var(--amber)' : 'var(--bg5)',
                  border:        warmStreak ? 'none'          : '1px solid var(--border)',
                  letterSpacing: '0.03em',
                }}
                title={`${streak} cycle${streak === 1 ? '' : 's'} in a row`}
              >
                {warmStreak && <Flame size={9} strokeWidth={2} />}
                {streak}
              </span>
            )}

            {/* Space pill */}
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

          {/* Today star */}
          {isInToday ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (task.today_flag) onTodayToggle(task)
              }}
              className="flex-shrink-0"
              title={task.today_flag ? 'Remove from today' : 'Due today'}
              style={{ cursor: task.today_flag ? 'pointer' : 'default' }}
            >
              <Star
                size={13}
                fill={task.today_flag ? 'var(--amber)' : 'none'}
                strokeWidth={task.today_flag ? 0 : 2}
                style={{ color: 'var(--amber)' }}
              />
            </button>
          ) : (
            hovered && !isOldCompleted && !isDone && (
              <button
                onClick={(e) => { e.stopPropagation(); onTodayToggle(task) }}
                className="flex-shrink-0 opacity-30 hover:opacity-70 transition-opacity"
                title="Add to today"
              >
                <Star size={13} style={{ color: 'var(--text3)' }} />
              </button>
            )
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
        <div
          className="flex items-center justify-between mt-3 pt-3"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pColor }} />
            <span className="font-mono text-xs" style={{ color: 'var(--text3)' }}>
              {task.priority}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isOldCompleted && task.completed_at ? (
              <span className="font-mono text-xs" style={{ color: 'var(--text3)', opacity: 0.7 }}>
                {formatCompletedAt(task.completed_at)}
              </span>
            ) : isDone && task.completed_at ? (
              <span className="font-mono text-xs" style={{ color: 'var(--col-done)', opacity: 0.85 }}>
                ✓ {formatCompletedAt(task.completed_at)}
              </span>
            ) : (
              displayDate && (
                isOverdue ? (
                  <span
                    className="flex items-center gap-1 font-mono text-xs px-1.5 py-0.5 rounded"
                    style={{
                      color:      'var(--col-high)',
                      background: 'rgba(248,113,113,0.12)',
                      border:     '1px solid rgba(248,113,113,0.25)',
                    }}
                  >
                    <AlertTriangle size={9} strokeWidth={2.5} />
                    {formatDueDate(displayDate)}
                  </span>
                ) : (
                  <span className="font-mono text-xs" style={{ color: dateColor }}>
                    {formatDueDate(displayDate)}
                  </span>
                )
              )
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

      {/*
        Undo nudge — appears left of the tick when pendingUndo is true.
        pointer-events-none keeps it from intercepting taps on the card.
        right-12 keeps it clear of the button (w-8 + right-3 + gap).
      */}
      {isDone && pendingUndo && (
        <div
          className="absolute right-12 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg pointer-events-none"
          style={{
            background: 'rgba(244,63,94,0.12)',
            border:     '1px solid rgba(244,63,94,0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            className="font-syne font-600"
            style={{ color: 'var(--rose, #f43f5e)', fontSize: 11 }}
          >
            Undo?
          </span>
        </div>
      )}

      {/*
        Action button — always rendered so opacity/scale transitions are smooth.

        Behaviour:
          isOldCompleted        → hidden (opacity 0, pointer-events none)
          isDone, first tap     → teal → rose, shows "Undo?" nudge
          isDone, second tap    → confirms undo, calls onUndoDone
          isMobile + !done      → hollow circle, always visible
          web + !done + hovered → filled, visible on hover only
      */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleActionClick()
        }}
        onTouchEnd={(e) => {
          // preventDefault stops the browser from also firing a synthetic
          // click event after touchend — without this, the first tap would
          // set pendingUndo=true and the synthesised click would immediately
          // call handleActionClick again, confirming the undo in one touch.
          e.preventDefault()
          e.stopPropagation()
          handleActionClick()
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150"
        style={{
          ...getButtonStyle(),
          opacity:       isOldCompleted ? 0 : buttonVisible ? 1 : 0,
          transform:     `translateY(-50%) scale(${isOldCompleted || !buttonVisible ? 0.75 : 1})`,
          pointerEvents: isOldCompleted || !buttonVisible ? 'none' : 'auto',
        }}
        title={buttonTitle}
        aria-label={buttonTitle}
        tabIndex={isOldCompleted || !buttonVisible ? -1 : 0}
      >
        {renderButtonIcon()}
      </button>
    </div>
  )
}
