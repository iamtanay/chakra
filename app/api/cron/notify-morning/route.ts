// app/api/cron/notify-morning/route.ts
//
// Triggered at 05:30 UTC = 11:00 AM IST every day via Vercel Cron.
//
// What it does:
//   1. Fetches all push subscriptions from Supabase
//   2. For each subscriber, queries THEIR pending tasks for today
//      (tasks in projects they own OR are a member of)
//   3. Sends a tailored "morning briefing" push notification
//
// Security: guarded by CRON_SECRET — Vercel automatically sets the
// Authorization header when it invokes the route; we validate it.

import { NextResponse }                   from 'next/server'
import webpush                            from 'web-push'
import { createClient }                   from '@supabase/supabase-js'
import { buildMorningPayload }            from '@/lib/notifications/buildPayload'
import type { PushSubscriptionRow, TaskRow } from '@/lib/notifications/types'

// ── Supabase admin client (bypasses RLS) ─────────────────────────────────────
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ── VAPID setup ───────────────────────────────────────────────────────────────
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL!}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true if a task is overdue within the 48-hour window.
 * Tasks are included in notifications only if their due date is:
 *   - today (not yet overdue), OR
 *   - up to 48 hours in the past (overdue but recent enough to remind)
 *
 * Tasks overdue by more than 48 hours are excluded — they become noise
 * and the user is already aware of them.
 */
function isWithin48hOverdue(task: TaskRow, todayISO: string): boolean {
  // Recurring tasks manage their own schedule via next_due_date — only include
  // them if they match today exactly (handled by the query/caller), not as overdue.
  if (task.is_recurring) return false

  // Use due_date only — next_due_date is a future recurring cycle, not an overdue date
  const dueISO: string | null | undefined = task.due_date
  if (!dueISO) return false

  const dueDate   = new Date(`${dueISO}T00:00:00`)
  const todayDate = new Date(`${todayISO}T00:00:00`)

  const diffMs   = todayDate.getTime() - dueDate.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  // Include only if overdue by 1 or 2 days — strictly in the past, not future
  return diffDays >= 1 && diffDays <= 2
}

/**
 * Returns true if the given userId has access to the project —
 * either as owner or as a member.
 */
function userCanAccessProject(
  userId: string,
  project: { owner_id: string } | null | undefined,
  memberProjectIds: Set<string>,
  projectId: string,
): boolean {
  if (!project) return false
  if (project.owner_id === userId) return true
  return memberProjectIds.has(projectId)
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  // Validate Vercel cron secret
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()
  const results  = { sent: 0, skipped: 0, failed: 0 }

  try {
    // 1. Fetch all subscriptions (each user may have multiple devices)
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')

    if (subsError) throw subsError
    if (!subs || subs.length === 0) {
      return NextResponse.json({ message: 'No subscribers', ...results })
    }

    // 2. Get unique user IDs across all subscriptions
    const userIds = [...new Set((subs as PushSubscriptionRow[]).map((s) => s.user_id))]

    // 3. Compute the 48-hour cutoff date (YYYY-MM-DD, 2 days ago)
    //    Tasks with due_date / next_due_date earlier than this are excluded.
    const todayISO   = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 2)
    const cutoffISO  = cutoffDate.toISOString().split('T')[0]  // 2 days ago YYYY-MM-DD

    // 4. Fetch today's pending tasks + overdue tasks within 48 h.
    //    Include owner_id from projects so we can filter per-user.
    //    Query: status != Done AND (today_flag = true
    //                               OR due_date between cutoff and today
    //                               OR next_due_date between cutoff and today)
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        status,
        priority,
        today_flag,
        due_date,
        next_due_date,
        is_recurring,
        project_id,
        projects ( name, color, owner_id )
      `)
      .neq('status', 'Done')
      .or(
        [
          'today_flag.eq.true',
          `due_date.gte.${cutoffISO}`,
          `next_due_date.gte.${cutoffISO}`,
        ].join(',')
      )

    if (tasksError) throw tasksError

    // 5. Apply the JS date filter:
    //    - today_flag tasks → always include
    //    - tasks due today (due_date or next_due_date === today) → always include
    //    - tasks with a past due_date → only include if overdue by 1–2 days
    const allFetched   = (tasks || []) as unknown as TaskRow[]
    const pendingTasks = allFetched.filter((t) => {
      if (t.today_flag) return true
      const effectiveDate = t.next_due_date ?? t.due_date
      if (effectiveDate === todayISO) return true
      return isWithin48hOverdue(t, todayISO ?? '')
    })

    // 6. Fetch project memberships for all subscriber users in one query.
    //    This gives us the set of project_ids each user is a member of
    //    (not counting projects they own — those are checked via owner_id).
    const { data: memberships, error: membershipsError } = await supabase
      .from('project_members')
      .select('user_id, project_id')
      .in('user_id', userIds)

    if (membershipsError) throw membershipsError

    // Build a map: userId → Set<projectId> for O(1) membership lookups
    const membershipMap = new Map<string, Set<string>>()
    for (const row of memberships ?? []) {
      if (!membershipMap.has(row.user_id)) {
        membershipMap.set(row.user_id, new Set())
      }
      membershipMap.get(row.user_id)!.add(row.project_id)
    }

    // 7. Fan-out: send one notification per subscription, filtered to that user's tasks
    const sendPromises = (subs as PushSubscriptionRow[]).map(async (sub) => {
      try {
        const memberProjectIds = membershipMap.get(sub.user_id) ?? new Set<string>()

        // Filter tasks to only those the subscriber can access:
        //   - they own the project (projects.owner_id === sub.user_id), OR
        //   - they are a member of the project
        const userTasks = pendingTasks.filter((t) => {
          const proj = t.projects as { name: string; color: string; owner_id: string } | null
          return userCanAccessProject(sub.user_id, proj, memberProjectIds, t.project_id)
        })

        // Skip if nothing to report for this user
        if (userTasks.length === 0) {
          results.skipped++
          return
        }

        const payload = buildMorningPayload(userTasks)

        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys:     { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
          { TTL: 3600 } // deliver within 1 hour or drop
        )
        results.sent++
      } catch (err: unknown) {
        // 410 Gone = subscription expired; clean it up
        if (isGoneError(err)) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
          console.log('[Cron/Morning] Removed expired subscription:', sub.endpoint)
        } else {
          console.error('[Cron/Morning] Send failed for', sub.endpoint, err)
        }
        results.failed++
      }
    })

    await Promise.allSettled(sendPromises)

    console.log('[Cron/Morning] Done:', results)
    return NextResponse.json({ success: true, ...results })

  } catch (err) {
    console.error('[Cron/Morning] Fatal error:', err)
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
