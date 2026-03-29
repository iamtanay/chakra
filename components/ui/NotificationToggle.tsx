'use client'

import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'
import { usePushNotifications, type PushPermission } from '@/hooks/usePushNotifications'

function StatusIcon({ permission, isSubscribed, isLoading }: {
  permission: PushPermission
  isSubscribed: boolean
  isLoading: boolean
}) {
  if (isLoading)           return <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text3)' }} />
  if (isSubscribed)        return <BellRing size={16} style={{ color: 'var(--amber)' }} />
  if (permission === 'denied') return <BellOff size={16} style={{ color: 'var(--text3)' }} />
  return <Bell size={16} style={{ color: 'var(--text3)' }} />
}

function helpText(permission: PushPermission): string {
  if (permission === 'denied')       return 'Notifications blocked. Reset in browser settings.'
  if (permission === 'needs-pwa')    return 'Add Chakra to home screen first.'
  if (permission === 'unsupported')  return 'Not supported in this browser.'
  return 'Morning briefing at 11 AM · Evening reminder at 8 PM.'
}

export function NotificationToggle() {
  const { permission, isSubscribed, isLoading, justSubscribed, subscribe, unsubscribe } = usePushNotifications()

  const unavailable = permission === 'unsupported' || permission === 'denied' || permission === 'needs-pwa'

  const handleToggle = () => {
    if (isLoading || unavailable) return
    if (isSubscribed) unsubscribe()
    else subscribe()
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center justify-between px-4 py-3.5 rounded-xl"
        style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <StatusIcon permission={permission} isSubscribed={isSubscribed} isLoading={isLoading} />
          <span className="font-syne text-sm font-500" style={{ color: 'var(--text)' }}>
            {isSubscribed ? 'Notifications on' : 'Notifications'}
          </span>
        </div>

        <div
          className="relative w-12 h-6 rounded-full transition-colors duration-300 flex-shrink-0"
          style={{
            background: isSubscribed ? 'var(--amber)' : 'var(--bg5)',
            opacity:    (isLoading || unavailable) ? 0.4 : 1,
            cursor:     (isLoading || unavailable) ? 'not-allowed' : 'pointer',
          }}
          onClick={handleToggle}
        >
          <div
            className="absolute top-1 w-4 h-4 rounded-full transition-all duration-300"
            style={{
              background: '#fff',
              left:       isSubscribed ? '28px' : '4px',
              boxShadow:  '0 1px 3px rgba(0,0,0,0.3)',
            }}
          />
        </div>
      </div>

      {/* Only shown for 3s after a manual subscribe, or persistently for error states */}
      {(justSubscribed || unavailable) && (
        <p
          className="font-mono text-xs px-1 leading-relaxed"
          style={{ color: 'var(--text3)' }}
        >
          {helpText(permission)}
        </p>
      )}
    </div>
  )
}