// public/sw.js
// Chakra — Push Notification Service Worker
//
// Handles two notification types:
//   type: "morning"  → 11:00 AM IST — pending tasks for the day
//   type: "evening"  → 08:00 PM IST — reminder to log completed work
//
// The service worker is intentionally minimal. All data formatting
// happens server-side; the SW just renders what it receives.

const APP_URL = self.location.origin

// ── Push event ─────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    console.error('[SW] Failed to parse push payload', event.data.text())
    return
  }

  const { title, body, type, badge, data } = payload

  const options = {
    body,
    icon:    '/icon-192.png',
    badge:   badge || '/icon-192.png',
    tag:     type,           // replaces any prior notification of the same type
    renotify: false,         // don't vibrate again if tag already exists
    silent:  false,
    data:    data || {},
    // iOS Safari (16.4+) respects these
    timestamp: Date.now(),
    actions: type === 'morning'
      ? [{ action: 'open', title: 'Open Chakra' }]
      : [{ action: 'open', title: 'Log now' }],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ── Notification click ──────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const action = event.action
  const data   = event.notification.data || {}
  const url    = (action === 'open' || !action) ? (data.url || APP_URL) : APP_URL

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If the app is already open, navigate it to the target url and focus it
      for (const client of windowClients) {
        if (client.url.startsWith(APP_URL) && 'focus' in client) {
          return client.navigate(url).then((c) => c.focus())
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// ── Activate: take control immediately ─────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})