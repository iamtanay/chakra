// app/api/cron/notify-evening/route.ts
//
// Triggered at 14:30 UTC = 08:00 PM IST every day via Vercel Cron.
//
// What it does:
//   1. Fetches all push subscriptions
//   2. Checks if the user has any tasks done today without actual_hours logged
//      OR any today_flag tasks that are still not Done
//   3. Sends a "time to log" reminder if warranted; skips if the day is clean

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

    const todayISO  = new Date().toISOString().split('T')[0]
    const todayStart = `${todayISO}T00:00:00.000Z`
    const todayEnd   = `${todayISO}T23:59:59.999Z`

    // Tasks completed today (to check if hours were logged)
    const { data: doneTodayRaw, error: doneError } = await supabase
      .from('tasks')
      .select('id, title, actual_hours, completed_at, today_flag, project_id, projects(name, color)')
      .eq('status', 'Done')
      .gte('completed_at', todayStart)
      .lte('completed_at', todayEnd)

    if (doneError) throw doneError

    // Today-flagged tasks still not done
    const { data: stillPendingRaw, error: pendingError } = await supabase
      .from('tasks')
      .select('id, title, status, priority, today_flag, project_id, projects(name, color)')
      .eq('today_flag', true)
      .neq('status', 'Done')

    if (pendingError) throw pendingError

    const doneToday    = (doneTodayRaw    || []) as unknown as TaskRow[]
    const stillPending = (stillPendingRaw || []) as unknown as TaskRow[]

    // Unlogged = completed today but no actual_hours recorded
    const unlogged = doneToday.filter((t) => t.actual_hours == null)

    // Skip if there's nothing actionable
    if (unlogged.length === 0 && stillPending.length === 0) {
      // Perfect day — no notification needed
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
