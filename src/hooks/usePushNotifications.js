// src/hooks/usePushNotifications.js
import { useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const { user } = useAuth()

  const isSupported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window

  const registerServiceWorker = useCallback(async () => {
    if (!isSupported) return null
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready
      return reg
    } catch (err) {
      console.error('SW registration failed:', err)
      return null
    }
  }, [isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported || !user) return false
    try {
      const reg = await registerServiceWorker()
      if (!reg) return false

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return false

      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const json = subscription.toJSON()

      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      }, { onConflict: 'user_id,endpoint' })

      // Mark that we asked
      await supabase.from('profiles')
        .update({ push_permission_asked: true })
        .eq('id', user.id)

      return true
    } catch (err) {
      console.error('Push subscribe error:', err)
      return false
    }
  }, [user, isSupported, registerServiceWorker])

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) return
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (!reg) return
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await supabase.from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint)
      }
    } catch (err) {
      console.error('Push unsubscribe error:', err)
    }
  }, [user, isSupported])

  // Register SW on mount
  useEffect(() => {
    if (isSupported && user) registerServiceWorker()
  }, [user, isSupported, registerServiceWorker])

  // Handle SW navigation messages
  useEffect(() => {
    if (!isSupported) return
    const handler = (event) => {
      if (event.data?.type === 'NAVIGATE') {
        window.location.href = event.data.url
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [isSupported])

  return { subscribe, unsubscribe, isSupported }
}
