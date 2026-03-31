// app/api/cron/notify-evening/route.ts
//
// Triggered at 14:30 UTC = 08:00 PM IST every day via Vercel Cron.
//
// What it does:
//   1. Fetches all push subscriptions
//   2. Checks if the user has any tasks done today without actual_hours logged
//      OR any today_flag tasks that are still not Done
//      OR any tasks due today (due_date / next_due_date) that are still not Done
//      OR any tasks overdue within 48 hours that are still not Done
//   3. Sends a "time to log" reminder if warranted; skips if the day is clean.
//
// Overdue filter: tasks overdue by more than 48 hours are excluded from
// notifications to reduce noise — those are already known to the user.

import { NextResponse }                    from 'next/server'
import webpush                             from 'web-push'
import { createClient }                    from '@supabase/supabase-js'
import { buildEveningPayload }             from '@/lib/notifications/buildPayload'
import type { PushSubscriptionRow, TaskRow } from '@/lib/notifications/types'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL!}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true if a task's due date falls within the 48-hour overdue window.
 *
 * A task is included when:
 *   - due today (diff === 0 days), OR
 *   - overdue but the due date was at most 2 calendar days ago (diff ≤ 48 h)
 *
 * Tasks overdue by more than 48 h are excluded — reminding about them every
 * evening adds noise without actionable urgency.
 *
 * today_flag tasks with no due date are always included (caller responsibility).
 */
function isWithin48hOverdue(task: TaskRow, todayISO: string): boolean {
  const dueISO = task.next_due_date ?? task.due_date
  if (!dueISO) return true // no due date → include (handled by caller for today_flag)

  // Parse as local midnight to avoid UTC-offset surprises
  const dueDate   = new Date(`${dueISO}T00:00:00`)
  const todayDate = new Date(`${todayISO}T00:00:00`)

  const diffMs  = todayDate.getTime() - dueDate.getTime()
  const diffHrs = diffMs / (1000 * 60 * 60)

  // Include if: due today (diff ≤ 0) OR overdue within 48 hours (0 < diff ≤ 48)
  return diffHrs <= 48
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()
  const results  = { sent: 0, skipped: 0, failed: 0 }

  try {
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')

    if (subsError) throw subsError
    if (!subs || subs.length === 0) {
      return NextResponse.json({ message: 'No subscribers', ...results })
    }

    const todayISO   = new Date().toISOString().split('T')[0]
    const todayStart = `${todayISO}T00:00:00.000Z`
    const todayEnd   = `${todayISO}T23:59:59.999Z`

    // Cutoff: 2 calendar days ago — tasks older than this are excluded
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 2)
    const cutoffISO  = cutoffDate.toISOString().split('T')[0]

    // ── Query 1: Tasks completed today (to check if hours were logged) ────────
    const { data: doneTodayRaw, error: doneError } = await supabase
      .from('tasks')
      .select('id, title, actual_hours, completed_at, today_flag, due_date, next_due_date, project_id, projects(name, color)')
      .eq('status', 'Done')
      .gte('completed_at', todayStart)
      .lte('completed_at', todayEnd)

    if (doneError) throw doneError

    // ── Query 2: today_flag tasks still not done ──────────────────────────────
    const { data: stillPendingRaw, error: pendingError } = await supabase
      .from('tasks')
      .select('id, title, status, priority, today_flag, due_date, next_due_date, project_id, projects(name, color)')
      .eq('today_flag', true)
      .neq('status', 'Done')

    if (pendingError) throw pendingError

    // ── Query 3: Tasks due within the 48h window that are still not done ──────
    //    Fetches from cutoff date forward; JS filter applies the precise 48h check.
    //    Excludes today_flag=true to avoid double-counting with Query 2.
    const { data: duePendingRaw, error: dueError } = await supabase
      .from('tasks')
      .select('id, title, status, priority, today_flag, due_date, next_due_date, project_id, projects(name, color)')
      .or(
        [
          `due_date.gte.${cutoffISO}`,
          `next_due_date.gte.${cutoffISO}`,
        ].join(',')
      )
      .neq('status', 'Done')
      .eq('today_flag', false) // avoid double-counting tasks already in Query 2

    if (dueError) throw dueError

    const doneToday        = (doneTodayRaw    || []) as unknown as TaskRow[]
    const todayFlagPending = (stillPendingRaw  || []) as unknown as TaskRow[]
    const duePendingAll    = (duePendingRaw    || []) as unknown as TaskRow[]

    // Apply precise 48h overdue filter to due-date tasks
    const duePendingFiltered = duePendingAll.filter((t) => isWithin48hOverdue(t, todayISO))

    // Apply 48h filter to today_flag tasks that also have a due date
    // (today_flag tasks with no due date are always included)
    const todayFlagPendingFiltered = todayFlagPending.filter((t) => {
      if (!t.due_date && !t.next_due_date) return true // no due date → always include
      return isWithin48hOverdue(t, todayISO)
    })

    // Merge pending (no duplicates: today_flag=false vs true, filtered above)
    const stillPending = [...todayFlagPendingFiltered, ...duePendingFiltered]

    // Unlogged = completed today but no actual_hours recorded
    const unlogged = doneToday.filter((t) => t.actual_hours == null)

    // Skip if there's nothing actionable
    if (unlogged.length === 0 && stillPending.length === 0) {
      return NextResponse.json({ message: 'Nothing to remind', ...results })
    }

    const sendPromises = (subs as PushSubscriptionRow[]).map(async (sub) => {
      try {
        const payload = buildEveningPayload(unlogged, stillPending)

        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys:     { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
          { TTL: 7200 } // deliver within 2 hours or drop
        )
        results.sent++
      } catch (err: unknown) {
        if (isGoneError(err)) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
          console.log('[Cron/Evening] Removed expired subscription:', sub.endpoint)
        } else {
          console.error('[Cron/Evening] Send failed for', sub.endpoint, err)
        }
        results.failed++
      }
    })

    await Promise.allSettled(sendPromises)

    console.log('[Cron/Evening] Done:', results)
    return NextResponse.json({ success: true, ...results })

  } catch (err) {
    console.error('[Cron/Evening] Fatal error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function isGoneError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    (err as { statusCode: number }).statusCode === 410
  )
}
