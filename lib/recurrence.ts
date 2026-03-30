/**
 * lib/recurrence.ts
 *
 * Pure, side-effect-free utilities for recurring task logic.
 * No React, no Supabase — easy to unit-test.
 *
 * Terminology
 * ───────────
 * "anchor"  — the user-defined day/month spec (day_of_week, day_of_month, etc.)
 * "cycle"   — one occurrence period (e.g. "March 2026" for a monthly task)
 * "next_due_date" — the date this cycle's task should be finished by
 */

import type { Task, RecurrenceFrequency } from '@/types'

// ── Lead times (days before next_due_date that the task appears on the board) ──

export const LEAD_DAYS: Record<RecurrenceFrequency, number> = {
  daily:   0,   // appears on the due day itself
  weekly:  2,   // appears 2 days before
  monthly: 7,   // appears a week before
  annual:  30,  // appears a month before
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Parse an ISO date string (YYYY-MM-DD) into a local-midnight Date.
 *  NEVER uses `new Date(str)` directly because that parses as UTC midnight
 *  and then local-timezone offset shifts the visible date by ±1 day. */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)   // months are 0-indexed
}

/** Format a Date to YYYY-MM-DD using local timezone (no UTC shift). */
export function toISODate(date: Date): string {
  const y  = date.getFullYear()
  const m  = String(date.getMonth() + 1).padStart(2, '0')
  const d  = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Today at local midnight, detached from clock time. */
export function todayLocal(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

// ── Core computation: given a task, what is the NEXT due date after `after`? ──

/**
 * Returns the next occurrence date STRICTLY AFTER `after`.
 *
 * For each frequency we walk forward one step from `after`:
 *
 *   daily   → after + 1 day
 *   weekly  → find the next occurrence of task.recurrence_day_of_week after `after`
 *   monthly → find the next occurrence of task.recurrence_day_of_month after `after`
 *   annual  → find the next occurrence of (recurrence_month, recurrence_day_of_month) after `after`
 *
 * Edge cases handled:
 *   • Monthly day > days in target month → clamp to last day of that month
 *   • Annual Feb 29 in non-leap year → March 1 of that year
 *   • Weekly: if today IS that day_of_week, next occurrence is 7 days away (not today)
 */
export function computeNextDueDate(task: Task, after: Date): Date {
  const freq = task.recurrence_frequency
  if (!freq) throw new Error('computeNextDueDate called on non-recurring task')

  switch (freq) {
    case 'daily': {
      const next = new Date(after)
      next.setDate(next.getDate() + 1)
      return next
    }

    case 'weekly': {
      const dow    = task.recurrence_day_of_week ?? 0   // 0 = Sunday
      const result = new Date(after)
      result.setDate(result.getDate() + 1)              // start strictly after `after`
      while (result.getDay() !== dow) {
        result.setDate(result.getDate() + 1)
      }
      return result
    }

    case 'monthly': {
      const targetDay = task.recurrence_day_of_month ?? 1
      // Try this month first
      const candidate = new Date(after.getFullYear(), after.getMonth(), targetDay)
      if (candidate > after) return clampToMonthEnd(candidate)
      // Otherwise next month
      const next = new Date(after.getFullYear(), after.getMonth() + 1, targetDay)
      return clampToMonthEnd(next)
    }

    case 'annual': {
      const targetMonth = (task.recurrence_month ?? 1) - 1   // 0-indexed
      const targetDay   = task.recurrence_day_of_month ?? 1
      // Try this year
      const candidate = new Date(after.getFullYear(), targetMonth, targetDay)
      if (candidate > after) return clampToMonthEnd(candidate)
      // Otherwise next year
      const next = new Date(after.getFullYear() + 1, targetMonth, targetDay)
      return clampToMonthEnd(next)
    }

    default:
      throw new Error(`Unknown recurrence frequency: ${freq}`)
  }
}

/** Clamp a date's day to the last valid day of its own month.
 *  e.g. Feb 31 → Feb 28/29, Apr 31 → Apr 30 */
function clampToMonthEnd(date: Date): Date {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  if (date.getDate() > lastDay) {
    return new Date(date.getFullYear(), date.getMonth(), lastDay)
  }
  return date
}

// ── First due date when a recurring task is first created ──────────────────

/**
 * Compute the FIRST next_due_date for a brand-new recurring task.
 *
 * We use today as `after` so the task's first occurrence is the
 * next scheduled date from today. If today happens to land exactly
 * on the anchor (e.g. it's Monday and the weekly task is set to Monday)
 * we include today itself as the first occurrence so it shows immediately.
 */
export function computeInitialNextDueDate(task: Omit<Task, 'id' | 'created_at' | 'next_due_date' | 'last_completed_cycle'>): Date {
  const freq = task.recurrence_frequency
  if (!freq) throw new Error('computeInitialNextDueDate called on non-recurring task')

  const today = todayLocal()

  switch (freq) {
    case 'daily':
      return today

    case 'weekly': {
      const dow    = task.recurrence_day_of_week ?? 0
      const result = new Date(today)
      while (result.getDay() !== dow) {
        result.setDate(result.getDate() + 1)
      }
      return result
    }

    case 'monthly': {
      const targetDay = task.recurrence_day_of_month ?? 1
      const candidate = new Date(today.getFullYear(), today.getMonth(), targetDay)
      const clamped   = clampToMonthEnd(candidate)
      if (clamped >= today) return clamped
      const next = new Date(today.getFullYear(), today.getMonth() + 1, targetDay)
      return clampToMonthEnd(next)
    }

    case 'annual': {
      const targetMonth = (task.recurrence_month ?? 1) - 1
      const targetDay   = task.recurrence_day_of_month ?? 1
      const candidate   = new Date(today.getFullYear(), targetMonth, targetDay)
      const clamped     = clampToMonthEnd(candidate)
      if (clamped >= today) return clamped
      const next = new Date(today.getFullYear() + 1, targetMonth, targetDay)
      return clampToMonthEnd(next)
    }

    default:
      throw new Error(`Unknown recurrence frequency: ${freq}`)
  }
}

// ── Visibility: should this recurring task appear on the board today? ────────

/**
 * Returns true if a recurring task should be visible on the board right now.
 *
 * Visibility window:
 *   today >= next_due_date - leadDays
 *
 * Additionally, a task that is overdue (next_due_date < today and not yet
 * completed this cycle) is ALWAYS visible — carry-forward behaviour.
 *
 * A task whose current cycle status is 'Done' is hidden until the next cycle
 * enters its lead window (handled by the fact that after completing we
 * immediately advance next_due_date).
 */
export function shouldShowRecurringTask(task: Task, today: Date = todayLocal()): boolean {
  if (!task.is_recurring) return true   // non-recurring: always shown (board filters by status)
  if (!task.next_due_date) return false  // misconfigured task — hide it

  const dueDate  = parseLocalDate(task.next_due_date)
  const freq     = task.recurrence_frequency
  if (!freq) return false

  const lead       = LEAD_DAYS[freq]
  const windowOpen = new Date(dueDate)
  windowOpen.setDate(windowOpen.getDate() - lead)

  return today >= windowOpen
}

// ── Cycle completion: advance a task to its next cycle ──────────────────────

/**
 * Returns a new Task object with state advanced to the next recurrence cycle.
 *
 * Called after the user confirms completion of the current cycle.
 * The returned object is ready to be saved to the database.
 *
 * What changes:
 *   - last_completed_cycle  = today (ISO date string)
 *   - next_due_date         = next occurrence after today
 *   - status                = 'Todo'
 *   - actual_hours          = null  (reset for new cycle)
 *   - completed_at          = null  (reset for new cycle)
 *   - today_flag            = false (reset for new cycle)
 *   - completion_note       = null  (reset for new cycle — Traces are per-cycle)
 *   - current_streak        = incremented if completed on time, reset to 0 if overdue
 */
export function advanceRecurringCycle(task: Task): Task {
  const today    = todayLocal()
  const nextDate = computeNextDueDate(task, today)

  // ── Momentum: determine if this cycle was completed on time ──────────────
  // "On time" means today <= next_due_date (i.e. not overdue).
  // If next_due_date is null (should never happen for a valid recurring task),
  // we treat it as on-time to avoid accidentally resetting a streak.
  const isOnTime = task.next_due_date
    ? today <= parseLocalDate(task.next_due_date)
    : true

  const newStreak = isOnTime ? (task.current_streak ?? 0) + 1 : 0

  return {
    ...task,
    last_completed_cycle: toISODate(today),
    next_due_date:        toISODate(nextDate),
    status:               'Todo',
    actual_hours:         null,
    completed_at:         null,
    today_flag:           false,
    completion_note:      null,   // Traces reset per cycle
    current_streak:       newStreak,
  }
}

// ── Display helpers ───────────────────────────────────────────────────────────

/** Human-readable label for a frequency, e.g. "Every Monday" */
export function recurrenceLabel(task: Task): string {
  const freq = task.recurrence_frequency
  if (!freq) return ''

  const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  switch (freq) {
    case 'daily':
      return 'Every day'
    case 'weekly': {
      const dow = task.recurrence_day_of_week ?? 0
      return `Every ${DAYS[dow]}`
    }
    case 'monthly': {
      const dom = task.recurrence_day_of_month ?? 1
      return `Every ${ordinal(dom)} of month`
    }
    case 'annual': {
      const mon = task.recurrence_month ?? 1
      const dom = task.recurrence_day_of_month ?? 1
      return `Every ${MONTHS[mon - 1]} ${ordinal(dom)}`
    }
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th')
}

/** Returns 'overdue' | 'due-soon' | 'upcoming' | 'normal' for badge colouring */
export function recurringDueStatus(task: Task, today: Date = todayLocal()): 'overdue' | 'due-soon' | 'upcoming' | 'normal' {
  if (!task.next_due_date) return 'normal'
  const due  = parseLocalDate(task.next_due_date)
  const diff = Math.floor((due.getTime() - today.getTime()) / 86_400_000)

  if (diff < 0)  return 'overdue'
  if (diff === 0) return 'due-soon'
  if (diff <= 2)  return 'due-soon'
  return 'normal'
}

// ── Momentum: streak display helpers ─────────────────────────────────────────

/** Threshold above which a streak gets "warm" visual treatment on the board. */
export const STREAK_WARM_THRESHOLD = 3

/**
 * Returns true if the streak count is high enough to merit a visual highlight.
 * Used by TaskCard and TodayView to add amber glow/border treatment.
 */
export function isWarmStreak(streak: number): boolean {
  return streak >= STREAK_WARM_THRESHOLD
}
