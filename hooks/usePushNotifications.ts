'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

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

function isIosPwaCapable(): boolean {
  if (typeof window === 'undefined') return false
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  if (!isIos) return true
  // @ts-expect-error — standalone is an Apple extension
  return Boolean(navigator.standalone)
}

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported' | 'needs-pwa'

export interface UsePushNotificationsReturn {
  permission:     PushPermission
  isSubscribed:   boolean
  isLoading:      boolean
  justSubscribed: boolean
  subscribe:      () => Promise<void>
  unsubscribe:    () => Promise<void>
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission,     setPermission]    = useState<PushPermission>('default')
  const [isSubscribed,   setIsSubscribed]  = useState(false)
  const [isLoading,      setIsLoading]     = useState(true)
  const [justSubscribed, setJustSubscribed] = useState(false)
  const swReg = useRef<ServiceWorkerRegistration | null>(null)

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

      const current = Notification.permission as NotificationPermission
      if (current === 'denied') {
        setPermission('denied')
        setIsLoading(false)
        return
      }

      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        swReg.current = reg

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

  const subscribe = useCallback(async () => {
    if (!isPushSupported() || !isIosPwaCapable()) return

    setIsLoading(true)
    try {
      if (!swReg.current) {
        swReg.current = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      }

      const sub = await swReg.current.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      })

      const json = sub.toJSON()
      const keys = json.keys as { p256dh: string; auth: string }
      const ua   = navigator.userAgent.substring(0, 200)

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
      setJustSubscribed(true)
      setTimeout(() => setJustSubscribed(false), 3000)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setPermission('denied')
      } else {
        console.error('[Push] Subscribe failed:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    try {
      const reg = swReg.current
      if (!reg) return

      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        const supabase = createClient()
        await (supabase as any)
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', endpoint)
      }

      setIsSubscribed(false)
      setJustSubscribed(false)
      setPermission('default')
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { permission, isSubscribed, isLoading, justSubscribed, subscribe, unsubscribe }
}