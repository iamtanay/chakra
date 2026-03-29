// app/api/cron/notify-morning/route.ts
//
// Triggered at 05:30 UTC = 11:00 AM IST every day via Vercel Cron.
//
// What it does:
//   1. Fetches all push subscriptions from Supabase
//   2. For each user, queries their pending tasks for today
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
    // 1. Fetch all subscriptions (up to 10 users, each may have multiple devices)
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')

    if (subsError) throw subsError
    if (!subs || subs.length === 0) {
      return NextResponse.json({ message: 'No subscribers', ...results })
    }

    // 2. Get unique user IDs
    const userIds = [...new Set((subs as PushSubscriptionRow[]).map((s) => s.user_id))]

    // 3. Fetch today's pending tasks for each user
    //    "Today's tasks" = today_flag = true OR (due_date = today AND status != Done)
    const todayISO = new Date().toISOString().split('T')[0] // YYYY-MM-DD

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
        projects ( name, color )
      `)
      .neq('status', 'Done')
      .or(`today_flag.eq.true,due_date.eq.${todayISO},next_due_date.eq.${todayISO}`)

    if (tasksError) throw tasksError

    // 4. Fan-out: send one notification per subscription
    //    (All users share the same task pool — when the app becomes multi-user,
    //     add user_id to tasks and filter per user here.)
    const pendingTasks = (tasks || []) as unknown as TaskRow[]

    const sendPromises = (subs as PushSubscriptionRow[]).map(async (sub) => {
      try {
        // Find this user's tasks
        // Single-user today: all tasks belong to the one user.
        // Multi-user future: filter by sub.user_id once tasks have a user_id column.
        const userTasks = pendingTasks // replace with: pendingTasks.filter(t => t.user_id === sub.user_id)

        // Skip if nothing to report
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
