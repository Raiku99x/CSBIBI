import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Megaphone } from 'lucide-react'

const RED  = '#C0392B'
const BLUE = '#1A5276'

export default function SystemBanner() {
  const [banners, setBanners] = useState([])
  const [dismissed, setDismissed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('csb_dismissed_banners') || '[]')) }
    catch { return new Set() }
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('system_notifications')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
      if (data) setBanners(data)
    }
    load()

    // Realtime — new banners appear instantly
    const ch = supabase.channel('system-banners')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_notifications' }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  function dismiss(id) {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(id)
      try { localStorage.setItem('csb_dismissed_banners', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  const visible = banners.filter(b => !dismissed.has(b.id))
  if (visible.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 0 2px' }}>
      {visible.map(banner => (
        <BannerItem key={banner.id} banner={banner} onDismiss={() => dismiss(banner.id)} />
      ))}
    </div>
  )
}

function BannerItem({ banner, onDismiss }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 14px',
      background: `linear-gradient(135deg, ${RED} 0%, ${BLUE} 100%)`,
      margin: '0',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle dot pattern overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}/>

      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <Megaphone size={14} color="white"/>
      </div>

      <p style={{ flex: 1, margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 13.5, fontWeight: 600, color: 'white', lineHeight: 1.4, position: 'relative' }}>
        {banner.message}
      </p>

      <button
        onClick={onDismiss}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ width: 24, height: 24, borderRadius: '50%', background: hovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.12s', position: 'relative' }}
      >
        <X size={12} color="white"/>
      </button>
    </div>
  )
}
