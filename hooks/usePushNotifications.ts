// hooks/usePushNotifications.ts
//
// Manages the full lifecycle of Web Push subscriptions for Chakra.
//
// Responsibilities:
//   1. Register the service worker (once, on mount)
//   2. Expose `subscribe()` and `unsubscribe()` for the UI
//   3. Persist the subscription to Supabase (upsert on register, delete on revoke)
//   4. Expose `permission` and `isSubscribed` so the UI can render correctly
//
// iOS notes:
//   - Push is only available in PWA mode (home-screen app), not Safari browser
//   - The permission prompt will only fire from a user gesture
//   - We detect PWA mode via `window.navigator.standalone`

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'

// The VAPID public key from your environment (injected at build time)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

// ── Helpers ──────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager'  in window &&
    'Notification' in window
  )
}

// On iOS, push only works when running as an installed PWA
function isIosPwaCapable(): boolean {
  if (typeof window === 'undefined') return false
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  if (!isIos) return true // non-iOS: no restriction
  // @ts-expect-error — standalone is an Apple extension
  return Boolean(navigator.standalone)
}

// ── Types ────────────────────────────────────────────────────────────────────

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported' | 'needs-pwa'

export interface UsePushNotificationsReturn {
  permission:    PushPermission
  isSubscribed:  boolean
  isLoading:     boolean
  subscribe:     () => Promise<void>
  unsubscribe:   () => Promise<void>
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission,   setPermission]   = useState<PushPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading,    setIsLoading]    = useState(true)
  const swReg = useRef<ServiceWorkerRegistration | null>(null)

  // ── Initialise on mount ───────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      if (!isPushSupported()) {
        setPermission('unsupported')
        setIsLoading(false)
        return
      }

      if (!isIosPwaCapable()) {
        setPermission('needs-pwa')
        setIsLoading(false)
        return
      }

      // Current browser permission state
      const current = Notification.permission as NotificationPermission
      if (current === 'denied') {
        setPermission('denied')
        setIsLoading(false)
        return
      }

      try {
        // Register (or retrieve existing) service worker
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        swReg.current = reg

        // Check if we already have an active push subscription
        const existing = await reg.pushManager.getSubscription()
        if (existing) {
          setIsSubscribed(true)
          setPermission('granted')
        } else {
          setPermission(current === 'granted' ? 'granted' : 'default')
        }
      } catch (err) {
        console.error('[Push] SW registration failed:', err)
        setPermission('unsupported')
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [])

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const subscribe = useCallback(async () => {
    if (!isPushSupported() || !isIosPwaCapable()) return

    setIsLoading(true)
    try {
      // Register SW if not yet done
      if (!swReg.current) {
        swReg.current = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      }

      // This triggers the browser permission prompt (must be called from a gesture)
      const sub = await swReg.current.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      })

      const json    = sub.toJSON()
      const keys    = json.keys as { p256dh: string; auth: string }
      const ua      = navigator.userAgent.substring(0, 200)

      // Persist to Supabase — upsert on endpoint collision
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await (supabase as any)
        .from('push_subscriptions')
        .upsert(
          {
            user_id:    user.id,
            endpoint:   json.endpoint!,
            p256dh:     keys.p256dh,
            auth:       keys.auth,
            user_agent: ua,
          },
          { onConflict: 'endpoint' }
        )

      if (error) throw error

      setIsSubscribed(true)
      setPermission('granted')
    } catch (err: unknown) {
      // User dismissed the prompt
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setPermission('denied')
      } else {
        console.error('[Push] Subscribe failed:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ── Unsubscribe ───────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    try {
      const reg = swReg.current
      if (!reg) return

      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint

        // Remove from browser
        await sub.unsubscribe()

        // Remove from Supabase
        const supabase = createClient()
        await (supabase as any)
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint)
      }

      setIsSubscribed(false)
      setPermission('default')
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe }
}
