// lib/notifications/buildPayload.ts
//
// Crafts the push notification payloads.
// This is where the "world-class" wording lives.
//
// Design principles:
//   - Concise. Push notifications are glanceable, not reports.
//   - Warm but purposeful. Not robotic, not over-enthusiastic.
//   - Prioritised. High-priority tasks appear first.
//   - Contextual. The message adapts to how many tasks there are.

import type { TaskRow, PushPayload } from './types'

// ── Priority sort order ───────────────────────────────────────────────────────
const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }

function sortByPriority(tasks: TaskRow[]): TaskRow[] {
  return [...tasks].sort(
    (a, b) => (PRIORITY_ORDER[a.priority ?? 'Low'] ?? 2) - (PRIORITY_ORDER[b.priority ?? 'Low'] ?? 2)
  )
}

// ── Time-aware greeting ───────────────────────────────────────────────────────
// (Hour is already IST on the server since we compute it here from UTC)
function morningGreeting(): string {
  // We're always called at ~11 AM IST, but keep it flexible
  const greetings = [
    'Good morning.',
    'Morning.',
    'A new day.',
  ]
  return greetings[new Date().getDay() % greetings.length]!
}

// ── Task line formatter ───────────────────────────────────────────────────────
function formatTaskLine(task: TaskRow): string {
  const priorityMarker = task.priority === 'High' ? '↑ ' : ''
  const projectName    = task.projects?.name ? ` · ${task.projects.name}` : ''
  return `${priorityMarker}${task.title}${projectName}`
}

// ── Morning payload ───────────────────────────────────────────────────────────
//
// Examples:
//
//   1 task:
//     Title: "One thing on your plate today."
//     Body:  "↑ Write the Q2 report · Work"
//
//   2–3 tasks:
//     Title: "3 tasks waiting for you today."
//     Body:  "↑ Finalise proposal · Work\nReview PR · Dev\nJournal entry · Personal"
//
//   4+ tasks:
//     Title: "6 tasks today — let's get moving."
//     Body:  "↑ Finalise proposal · Work\nReview PR · Dev\n+ 4 more"

export function buildMorningPayload(tasks: TaskRow[]): PushPayload {
  const sorted  = sortByPriority(tasks)
  const count   = sorted.length
  const MAX_LINES = 3

  let title: string
  if (count === 1) {
    title = 'One thing on your plate today.'
  } else if (count <= 3) {
    title = `${count} tasks waiting for you today.`
  } else {
    title = `${count} tasks today — let's get moving.`
  }

  const shown    = sorted.slice(0, MAX_LINES)
  const overflow = count - shown.length
  const lines    = shown.map(formatTaskLine)
  if (overflow > 0) {
    lines.push(`+ ${overflow} more`)
  }

  const body = lines.join('\n')

  return {
    title,
    body,
    type:  'morning',
    badge: '/icon-192.png',
    data:  { url: '/today' },
  }
}

// ── Evening payload ───────────────────────────────────────────────────────────
//
// Cases handled:
//
//   A. Only unlogged completed tasks:
//     "You wrapped up 2 tasks — log your hours before the day closes."
//     Body: the task titles
//
//   B. Only still-pending today tasks:
//     "2 tasks didn't make it today."
//     Body: task titles — gentle, not guilt-tripping
//
//   C. Both unlogged + still pending:
//     "End of day check-in."
//     Body: combined message
//
//   D. Nothing to do (handled upstream, not called) — just in case:
//     Skipped.

export function buildEveningPayload(
  unlogged:     TaskRow[],
  stillPending: TaskRow[],
): PushPayload {
  const uCount = unlogged.length
  const pCount = stillPending.length

  // ── Case A: only unlogged ──────────────────────────────────────────────────
  if (uCount > 0 && pCount === 0) {
    const title = uCount === 1
      ? 'One task completed — log your time before the day closes.'
      : `You wrapped up ${uCount} tasks — log your hours before the day closes.`

    const lines = sortByPriority(unlogged).slice(0, 3).map((t) => `✓ ${t.title}`)
    if (uCount > 3) lines.push(`+ ${uCount - 3} more`)

    return {
      title,
      body:  lines.join('\n'),
      type:  'evening',
      badge: '/icon-192.png',
      data:  { url: '/today' },
    }
  }

  // ── Case B: only still-pending ────────────────────────────────────────────
  if (uCount === 0 && pCount > 0) {
    const sorted = sortByPriority(stillPending)
    const title  = pCount === 1
      ? 'One task left unfinished today.'
      : `${pCount} tasks didn't make it today.`

    const lines = sorted.slice(0, 3).map(formatTaskLine)
    if (pCount > 3) lines.push(`+ ${pCount - 3} more`)

    return {
      title,
      body:  lines.join('\n'),
      type:  'evening',
      badge: '/icon-192.png',
      data:  { url: '/today' },
    }
  }

  // ── Case C: both ──────────────────────────────────────────────────────────
  const parts: string[] = []

  if (uCount > 0) {
    const label = uCount === 1 ? '1 task to log' : `${uCount} tasks to log`
    parts.push(label)
    sortByPriority(unlogged).slice(0, 2).forEach((t) => parts.push(`  ✓ ${t.title}`))
  }

  if (pCount > 0) {
    const label = pCount === 1 ? '1 still pending' : `${pCount} still pending`
    parts.push(label)
    sortByPriority(stillPending).slice(0, 2).forEach((t) => parts.push(`  · ${t.title}`))
  }

  return {
    title: 'End of day check-in.',
    body:  parts.join('\n'),
    type:  'evening',
    badge: '/icon-192.png',
    data:  { url: '/today' },
  }
}
