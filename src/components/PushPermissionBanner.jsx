// src/components/PushPermissionBanner.jsx
import { useState, useEffect } from 'react'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { useAuth } from '../contexts/AuthContext'
import { Bell, X } from 'lucide-react'

export default function PushPermissionBanner() {
  const { user, profile } = useAuth()
  const { subscribe, isSupported } = usePushNotifications()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isSupported || !user || !profile) return
    if (profile.push_permission_asked) return
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return
    const key = `csb_push_banner_dismissed_${user.id}`
    if (localStorage.getItem(key)) return
    // Small delay so it doesn't flash immediately
    const t = setTimeout(() => setVisible(true), 2000)
    return () => clearTimeout(t)
  }, [user, profile, isSupported])

  if (!visible || dismissed) return null

  async function handleAllow() {
    setLoading(true)
    const ok = await subscribe()
    setLoading(false)
    setVisible(false)
    if (!ok && user) {
      localStorage.setItem(`csb_push_banner_dismissed_${user.id}`, '1')
    }
  }

  function handleDismiss() {
    setDismissed(true)
    setVisible(false)
    if (user) {
      localStorage.setItem(`csb_push_banner_dismissed_${user.id}`, '1')
    }
  }

  return (
    <div style={{
      margin: '8px 0',
      padding: '12px 14px',
      background: 'linear-gradient(135deg, #1A5276 0%, #0D7377 100%)',
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      animation: 'slideDown 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Dot pattern */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}/>

      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(255,255,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, position: 'relative',
      }}>
        <Bell size={18} color="white"/>
      </div>

      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <p style={{
          margin: 0,
          fontFamily: '"Instrument Sans", system-ui',
          fontWeight: 700, fontSize: 13.5, color: 'white',
        }}>
          Get deadline reminders
        </p>
        <p style={{
          margin: '1px 0 0',
          fontFamily: '"Instrument Sans", system-ui',
          fontSize: 12, color: 'rgba(255,255,255,0.75)',
        }}>
          Be notified when deadlines are due soon or past due
        </p>
      </div>

      <button
        onClick={handleAllow}
        disabled={loading}
        style={{
          padding: '7px 14px', borderRadius: 8, border: 'none',
          background: 'white', color: '#0D7377',
          fontFamily: '"Instrument Sans", system-ui',
          fontWeight: 700, fontSize: 13,
          cursor: loading ? 'not-allowed' : 'pointer',
          flexShrink: 0, position: 'relative',
          opacity: loading ? 0.7 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {loading ? 'Enabling…' : 'Enable'}
      </button>

      <button
        onClick={handleDismiss}
        style={{
          width: 24, height: 24, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, position: 'relative',
        }}
      >
        <X size={12} color="white"/>
      </button>
    </div>
  )
}
