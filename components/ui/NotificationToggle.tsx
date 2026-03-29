// components/ui/NotificationToggle.tsx
//
// A self-contained settings toggle for push notifications.
// Drop this anywhere in your settings/sidebar UI.
//
// Shows:
//   - Bell icon with status label
//   - Subtle enable/disable button
//   - Contextual help text (iOS PWA instructions, denied state, etc.)

'use client'

import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'
import { usePushNotifications, type PushPermission } from '@/hooks/usePushNotifications'

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusIcon({ permission, isSubscribed, isLoading }: {
  permission: PushPermission
  isSubscribed: boolean
  isLoading: boolean
}) {
  if (isLoading) return <Loader2 size={15} className="animate-spin" style={{ color: 'var(--text3)' }} />
  if (isSubscribed) return <BellRing size={15} style={{ color: 'var(--amber)' }} />
  if (permission === 'denied') return <BellOff size={15} style={{ color: 'var(--rose)' }} />
  return <Bell size={15} style={{ color: 'var(--text3)' }} />
}

function helpText(permission: PushPermission, isSubscribed: boolean): string | null {
  if (isSubscribed) return 'You\'ll receive a morning briefing at 11 AM and an evening reminder at 8 PM.'
  if (permission === 'denied') return 'Notifications are blocked. Reset permission in your browser settings.'
  if (permission === 'needs-pwa') return 'Add Chakra to your home screen first, then enable notifications.'
  if (permission === 'unsupported') return 'Your browser doesn\'t support push notifications.'
  return 'Get a daily briefing of pending tasks and an evening log reminder.'
}

// ── Main component ─────────────────────────────────────────────────────────────

export function NotificationToggle() {
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications()

  const unavailable = permission === 'unsupported' || permission === 'denied' || permission === 'needs-pwa'
  const help = helpText(permission, isSubscribed)

  const handleToggle = () => {
    if (isLoading || unavailable) return
    if (isSubscribed) {
      unsubscribe()
    } else {
      subscribe()
    }
  }

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2.5"
      style={{
        background:   'var(--bg3)',
        border:       '1px solid var(--border)',
      }}
    >
      {/* Row: icon + label + toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <StatusIcon
            permission={permission}
            isSubscribed={isSubscribed}
            isLoading={isLoading}
          />
          <span
            className="font-syne text-xs font-medium"
            style={{ color: 'var(--text)' }}
          >
            Notifications
          </span>
        </div>

        {/* Toggle pill */}
        <button
          onClick={handleToggle}
          disabled={isLoading || unavailable}
          aria-label={isSubscribed ? 'Disable notifications' : 'Enable notifications'}
          className="relative flex-shrink-0 rounded-full transition-all duration-200"
          style={{
            width:      '36px',
            height:     '20px',
            background: isSubscribed
              ? 'var(--amber)'
              : 'var(--bg5)',
            opacity:    (isLoading || unavailable) ? 0.4 : 1,
            cursor:     (isLoading || unavailable) ? 'not-allowed' : 'pointer',
            border:     '1px solid var(--border2)',
          }}
        >
          <span
            className="absolute top-0.5 rounded-full transition-all duration-200"
            style={{
              width:      '14px',
              height:     '14px',
              background: 'var(--text)',
              left:       isSubscribed ? 'calc(100% - 16px)' : '2px',
            }}
          />
        </button>
      </div>

      {/* Help text */}
      {help && (
        <p
          className="font-mono text-xs leading-relaxed"
          style={{ color: 'var(--text3)' }}
        >
          {help}
        </p>
      )}
    </div>
  )
}
