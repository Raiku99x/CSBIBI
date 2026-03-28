import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import { useDarkMode } from '../contexts/DarkModeContext'
import { usePresence } from '../hooks/usePresence'
import { supabase } from '../lib/supabase'
import {
  Home, MessageSquare, BookMarked, Grid3X3,
  LogOut, Settings, Check, X, Menu, Search, CalendarClock,
  Bookmark, Heart, Moon, Sun, Info, MoreHorizontal,
  EyeOff, Eye, Send
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import SavedPostsPage from '../pages/SavedPostsPage'
import LikedPostsPage from '../pages/LikedPostsPage'
import AboutModal from './AboutModal'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','922B21','C0392B']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

const RED  = '#C0392B'
const BLUE = '#1A5276'
const DESKTOP_BP = 1024

function useIsDesktop() {
  const [v, setV] = useState(() => window.innerWidth >= DESKTOP_BP)
  useEffect(() => {
    const fn = () => setV(window.innerWidth >= DESKTOP_BP)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return v
}

function getNavItems(dmUnread) {
  return [
    { to: '/',              icon: Home,          label: 'Feed',      exact: true },
    { to: '/messages',      icon: MessageSquare, label: 'Messages',  badge: dmUnread },
    { to: '/announcements', icon: CalendarClock, label: 'Deadlines' },
    { to: '/subjects',      icon: BookMarked,    label: 'Subjects'  },
    { to: '/apps',          icon: Grid3X3,       label: 'Apps'      },
  ]
}

export default function Layout({ children, onOpenSearch }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const { dark, toggle: toggleDark } = useDarkMode()

  const [appearOffline, setAppearOffline] = useState(() => {
    try { return localStorage.getItem('csb_appear_offline') === 'true' } catch { return false }
  })
  function toggleAppearOffline() {
    setAppearOffline(v => {
      const next = !v
      try { localStorage.setItem('csb_appear_offline', next) } catch {}
      return next
    })
  }

  const { onlineUsers } = usePresence(profile?.id, profile, appearOffline)

  const [showDrawer,   setShowDrawer]   = useState(false)
  const [showNotifs,   setShowNotifs]   = useState(false)
  const [dmUnread,     setDmUnread]     = useState(0)
  const [showSaved,    setShowSaved]    = useState(false)
  const [showLiked,    setShowLiked]    = useState(false)
  const [showAbout,    setShowAbout]    = useState(false)
  const [selfMenuOpen, setSelfMenuOpen] = useState(false)

  const notifRef    = useRef(null)
  const selfMenuRef = useRef(null)
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()
  const navItems = getNavItems(dmUnread)

  useEffect(() => {
    function h(e) {
      if (notifRef.current    && !notifRef.current.contains(e.target))    setShowNotifs(false)
      if (selfMenuRef.current && !selfMenuRef.current.contains(e.target)) setSelfMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    const lock = !isDesktop && (showDrawer || showNotifs)
    document.body.style.overflow = lock ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showDrawer, showNotifs, isDesktop])

  useEffect(() => {
    if (!profile) return
    supabase.from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', profile.id).eq('is_read', false)
      .then(({ count }) => setDmUnread(count || 0))
    const ch = supabase.channel('dm-badge-' + profile.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${profile.id}` }, () => setDmUnread(c => c + 1))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${profile.id}` }, async () => {
        const { count } = await supabase.from('direct_messages').select('id', { count: 'exact', head: true }).eq('receiver_id', profile.id).eq('is_read', false)
        setDmUnread(count || 0)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile])

  async function handleSignOut() {
    setShowDrawer(false)
    await signOut()
    navigate('/auth')
  }

  // ── Personal sidebar content (no nav links) ──────────────
  function PersonalSidebar({ onClose }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Profile card */}
        <div style={{
          background: `linear-gradient(135deg, ${RED} 0%, ${BLUE} 100%)`,
          padding: isDesktop ? '20px 16px 16px' : '48px 20px 22px',
          position: 'relative', flexShrink: 0,
          borderRadius: isDesktop ? '0 0 16px 16px' : 0,
          margin: isDesktop ? '0 8px' : 0,
        }}>
          {!isDesktop && (
            <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color="white" />
            </button>
          )}
          <img src={profile?.avatar_url || dicebearUrl(profile?.display_name)} alt="avatar"
            style={{ width: isDesktop ? 52 : 62, height: isDesktop ? 52 : 62, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.55)', boxShadow: '0 2px 12px rgba(0,0,0,0.2)', marginBottom: 10, display: 'block' }} />
          <p style={{ margin: '0 0 2px', fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: isDesktop ? 15 : 17, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.display_name}
          </p>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 11.5, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.email}
          </p>
        </div>

        {/* Scrollable personal items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
          <SectionLabel dark={dark} label="Personal" />
          <SidebarBtn dark={dark} icon={<Settings size={17} color="#65676B" />}          label="Profile Settings" onClick={() => { onClose?.(); navigate('/profile') }} />
          <SidebarBtn dark={dark} icon={<Bookmark  size={17} color={BLUE} fill={BLUE} />} label="Saved Posts"      onClick={() => { onClose?.(); setShowSaved(true) }} />
          <SidebarBtn dark={dark} icon={<Heart     size={17} color={RED}  fill={RED}  />} label="Liked Posts"      onClick={() => { onClose?.(); setShowLiked(true) }} />

          <Divider dark={dark} />
          <SectionLabel dark={dark} label="Preferences" />

          {/* Dark mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 10, marginBottom: 2 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: dark ? '#3A3B3C' : '#E9EBEE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {dark ? <Sun size={17} color="#F4C430" /> : <Moon size={17} color="#65676B" />}
            </div>
            <span style={{ flex: 1, fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 14, color: dark ? '#E4E6EB' : '#1c1e21' }}>
              {dark ? 'Light Mode' : 'Dark Mode'}
            </span>
            <button onClick={toggleDark} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: dark ? RED : '#CED0D4', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 3, left: dark ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
            </button>
          </div>

          <Divider dark={dark} />
          <SidebarBtn dark={dark} icon={<Info   size={17} color="#0D7377" />} label="About CSB" onClick={() => { onClose?.(); setShowAbout(true) }} />
          <Divider dark={dark} />
          <SidebarBtn dark={dark} icon={<LogOut size={17} color={RED}     />} label="Log Out"   onClick={handleSignOut} danger />
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px 14px', flexShrink: 0 }}>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 10.5, color: dark ? '#6A6D70' : '#BCC0C4', textAlign: 'center' }}>
            CSB · v2.3.1 · BSCS '29
          </p>
        </div>
      </div>
    )
  }

  // ── BG colors ────────────────────────────────────────────
  const pageBg   = dark ? '#18191A' : '#E9EBEE'
  const sidebarBg = dark ? '#18191A' : '#E9EBEE'   // blends with center bg
  const headerBg  = dark ? '#242526' : 'white'
  const borderCol = dark ? '#3A3B3C' : '#E4E6EB'

  return (
    <div style={{ minHeight: '100vh', background: pageBg, display: 'flex', flexDirection: 'column' }}>

      {/* ── MOBILE BACKDROPS ── */}
      {!isDesktop && showDrawer && (
        <div onClick={() => setShowDrawer(false)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease' }} />
      )}
      {!isDesktop && showNotifs && (
        <div onClick={() => setShowNotifs(false)} style={{ position: 'fixed', inset: 0, zIndex: 98, background: 'rgba(0,0,0,0.45)', animation: 'fadeIn 0.2s ease' }} />
      )}

      {/* ── MOBILE DRAWER (personal only) ── */}
      {!isDesktop && (
        <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 290, zIndex: 90, background: dark ? '#242526' : 'white', boxShadow: '4px 0 24px rgba(0,0,0,0.18)', transform: showDrawer ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
          <PersonalSidebar onClose={() => setShowDrawer(false)} />
        </div>
      )}

      {/* ── HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: headerBg, borderBottom: `1px solid ${borderCol}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ height: 52, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, maxWidth: isDesktop ? 'none' : 680, margin: '0 auto' }}>

          {/* LEFT — Logo (+ hamburger on mobile) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {!isDesktop && (
              <button onClick={() => setShowDrawer(true)} style={{ width: 36, height: 36, borderRadius: 9, background: dark ? '#3A3B3C' : '#F4F6F8', border: `1.5px solid ${borderCol}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Menu size={17} color={dark ? '#B0B3B8' : '#65676B'} />
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/')}>
              <div style={{ width: 34, height: 34, borderRadius: 8, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 6px rgba(192,57,43,0.2)' }}>
                <img src="/announce.png" alt="CSB" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 19, color: RED, letterSpacing: '-0.5px', lineHeight: 1 }}>CSB</div>
            </div>
          </div>

          {/* CENTER — Nav links on desktop only */}
          {isDesktop && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {navItems.map(({ to, icon: Icon, label, exact, badge }) => (
                <NavLink key={to} to={to} end={exact} style={{ textDecoration: 'none', position: 'relative' }}>
                  {({ isActive }) => (
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 18px', borderRadius: 10, cursor: 'pointer',
                        background: isActive ? (dark ? '#3A1A1A' : '#FFF0EF') : 'transparent',
                        transition: 'background 0.12s',
                      }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = dark ? '#2A2B2C' : '#F0F2F5' }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                      >
                        <Icon size={17} color={isActive ? RED : (dark ? '#B0B3B8' : '#65676B')} strokeWidth={isActive ? 2.5 : 2} />
                        <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: isActive ? 700 : 600, fontSize: 13.5, color: isActive ? RED : (dark ? '#B0B3B8' : '#65676B'), whiteSpace: 'nowrap' }}>
                          {label}
                        </span>
                        {badge > 0 && (
                          <span style={{ minWidth: 17, height: 17, borderRadius: 9, background: RED, color: 'white', fontSize: 9.5, fontWeight: 700, fontFamily: '"Instrument Sans", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                            {badge > 9 ? '9+' : badge}
                          </span>
                        )}
                      </div>
                      {/* Active underline */}
                      {isActive && (
                        <div style={{ position: 'absolute', bottom: -1, left: '50%', transform: 'translateX(-50%)', width: 24, height: 2.5, borderRadius: 2, background: RED }} />
                      )}
                    </div>
                  )}
                </NavLink>
              ))}
            </nav>
          )}

          {/* RIGHT — Search, notif, avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button onClick={onOpenSearch} style={{ width: 36, height: 36, borderRadius: 9, background: dark ? '#3A3B3C' : '#F4F6F8', border: `1.5px solid ${borderCol}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={17} color={dark ? '#B0B3B8' : '#65676B'} />
            </button>

            {/* Bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={() => setShowNotifs(v => !v)}
                style={{ width: 36, height: 36, borderRadius: 9, background: showNotifs ? '#FADBD8' : (dark ? '#3A3B3C' : '#F4F6F8'), border: `1.5px solid ${showNotifs ? '#F5B7B1' : borderCol}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 0.15s' }}>
                <CalendarClock size={17} color={showNotifs ? RED : (dark ? '#B0B3B8' : '#65676B')} strokeWidth={showNotifs ? 2.5 : 2} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, background: RED, color: 'white', fontSize: 9.5, fontWeight: 700, fontFamily: '"Instrument Sans", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid white' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 100, animation: 'slideDown 0.18s ease' }}>
                  <NotifPanel notifications={notifications} unreadCount={unreadCount} markAllRead={markAllRead} markRead={markRead} onClose={() => setShowNotifs(false)} navigate={navigate} dark={dark} />
                </div>
              )}
            </div>

            {/* Avatar — clicking opens drawer on mobile, does nothing extra on desktop (sidebar is always visible) */}
            {!isDesktop && (
              <button onClick={() => setShowDrawer(true)} style={{ width: 36, height: 36, borderRadius: 9, border: `1.5px solid ${borderCol}`, background: 'transparent', cursor: 'pointer', padding: 0, overflow: 'hidden', flexShrink: 0 }}>
                <img src={profile?.avatar_url || dicebearUrl(profile?.display_name)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            )}

            {/* On desktop, show avatar as a static chip — no dropdown needed since sidebar is always visible */}
            {isDesktop && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', borderRadius: 22, background: dark ? '#3A3B3C' : '#F4F6F8', border: `1.5px solid ${borderCol}` }}>
                <img src={profile?.avatar_url || dicebearUrl(profile?.display_name)} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', display: 'block', flexShrink: 0 }} />
                <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13, color: dark ? '#E4E6EB' : '#050505', whiteSpace: 'nowrap', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {profile?.display_name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile notif sheet */}
        {showNotifs && !isDesktop && (
          <div style={{ position: 'fixed', left: 0, right: 0, top: 52, zIndex: 99, animation: 'slideDownSheet 0.28s cubic-bezier(0.16,1,0.3,1)' }}>
            <NotifPanel notifications={notifications} unreadCount={unreadCount} markAllRead={markAllRead} markRead={markRead} onClose={() => setShowNotifs(false)} navigate={navigate} dark={dark} mobile />
          </div>
        )}
      </header>

      {/* ── DESKTOP 3-COLUMN (Facebook-style blended) ── */}
      {isDesktop ? (
        <div style={{ display: 'flex', flex: 1, width: '100%', maxWidth: 1400, margin: '0 auto' }}>

          {/* LEFT — personal sidebar, blends with bg */}
          <aside style={{
            width: 280, flexShrink: 0,
            position: 'sticky', top: 52,
            height: 'calc(100vh - 52px)',
            background: sidebarBg,    // same as page bg — blends
            overflowY: 'auto',
            paddingTop: 12,
          }}>
            <PersonalSidebar />
          </aside>

          {/* CENTER FEED */}
          <main style={{ flex: 1, minWidth: 0, background: pageBg, paddingBottom: 32 }}>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              {children}
            </div>
          </main>

          {/* RIGHT — Online users, blends with bg */}
          <aside style={{
            width: 280, flexShrink: 0,
            position: 'sticky', top: 52,
            height: 'calc(100vh - 52px)',
            background: sidebarBg,
            overflowY: 'auto',
            paddingTop: 12,
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Online panel card */}
            <div style={{
              margin: '0 8px',
              background: dark ? '#242526' : 'white',
              borderRadius: 12,
              border: `1px solid ${borderCol}`,
              overflow: 'hidden',
              flex: 1,
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Header */}
              <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${dark ? '#3A3B3C' : '#F0F2F5'}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 0 2px rgba(34,197,94,0.25)', flexShrink: 0 }} />
                <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 700, fontSize: 14, color: dark ? '#E4E6EB' : '#050505', flex: 1 }}>Online</span>
                <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 12, color: dark ? '#6A6D70' : '#BCC0C4' }}>
                  {onlineUsers.length + (appearOffline ? 0 : 1)}
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
                {/* Self row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 10, marginBottom: 4, background: dark ? '#2A2B2C' : '#F7F8FA' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img src={profile?.avatar_url || dicebearUrl(profile?.display_name)} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', display: 'block' }} alt="" />
                    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: '50%', background: appearOffline ? '#8A8D91' : '#22C55E', border: `2px solid ${dark ? '#2A2B2C' : '#F7F8FA'}` }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13, color: dark ? '#E4E6EB' : '#050505', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {profile?.display_name}
                      <span style={{ fontWeight: 500, fontSize: 10.5, color: dark ? '#6A6D70' : '#BCC0C4', marginLeft: 5 }}>You</span>
                    </p>
                    <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 10.5, fontWeight: 600, color: appearOffline ? '#8A8D91' : '#22C55E' }}>
                      {appearOffline ? 'Appearing offline' : 'Online'}
                    </p>
                  </div>
                  {/* 3-dot */}
                  <div ref={selfMenuRef} style={{ position: 'relative' }}>
                    <button onClick={() => setSelfMenuOpen(v => !v)}
                      style={{ width: 28, height: 28, borderRadius: 7, background: selfMenuOpen ? (dark ? '#3A3B3C' : '#E4E6EB') : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = dark ? '#3A3B3C' : '#E4E6EB'}
                      onMouseLeave={e => { if (!selfMenuOpen) e.currentTarget.style.background = 'transparent' }}>
                      <MoreHorizontal size={15} color={dark ? '#B0B3B8' : '#65676B'} />
                    </button>
                    {selfMenuOpen && (
                      <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', width: 195, background: dark ? '#2E2F30' : 'white', borderRadius: 10, border: `1px solid ${borderCol}`, boxShadow: '0 6px 20px rgba(0,0,0,0.15)', overflow: 'hidden', zIndex: 50, animation: 'slideDown 0.15s ease' }}>
                        <button
                          onClick={() => { toggleAppearOffline(); setSelfMenuOpen(false) }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', border: 'none', cursor: 'pointer', background: 'transparent', fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13, color: dark ? '#E4E6EB' : '#1c1e21', textAlign: 'left' }}
                          onMouseEnter={e => e.currentTarget.style.background = dark ? '#3A3B3C' : '#F7F8FA'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {appearOffline
                            ? <><Eye    size={14} color="#22C55E" /> Show as online</>
                            : <><EyeOff size={14} color="#8A8D91" /> Appear offline</>
                          }
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {onlineUsers.length > 0 && <div style={{ height: 1, background: dark ? '#3A3B3C' : '#F0F2F5', margin: '4px 4px 8px' }} />}

                {onlineUsers.length === 0 ? (
                  <div style={{ padding: '20px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 26, marginBottom: 6 }}>👥</div>
                    <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12.5, color: dark ? '#6A6D70' : '#BCC0C4' }}>No one else online</p>
                  </div>
                ) : (
                  onlineUsers.map(u => (
                    <OnlineUserRow key={u.id} user={u} dark={dark}
                      onDM={() => navigate('/messages', { state: { openDM: u.id } })} />
                  ))
                )}
              </div>

              <div style={{ padding: '10px 14px', borderTop: `1px solid ${dark ? '#3A3B3C' : '#F0F2F5'}`, flexShrink: 0 }}>
                <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 10.5, color: dark ? '#6A6D70' : '#BCC0C4', textAlign: 'center' }}>Only active users shown</p>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        /* ── MOBILE ── */
        <main style={{ flex: 1, maxWidth: 680, margin: '0 auto', width: '100%', paddingBottom: 64 }}>
          {children}
        </main>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      {!isDesktop && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: dark ? 'rgba(36,37,38,0.97)' : 'rgba(255,255,255,0.97)', backdropFilter: 'blur(10px)', borderTop: `1px solid ${borderCol}`, boxShadow: '0 -1px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', height: 52, display: 'flex', alignItems: 'center', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {navItems.map(({ to, icon: Icon, label, exact, badge }) => (
              <NavLink key={to} to={to} end={exact} style={{ flex: 1, textDecoration: 'none' }}>
                {({ isActive }) => (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '6px 4px', position: 'relative' }}>
                    {isActive && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 2.5, borderRadius: 2, background: RED }} />}
                    <div style={{ position: 'relative' }}>
                      <div style={{ width: 34, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: isActive ? '#FADBD8' : 'transparent', transition: 'background 0.15s' }}>
                        <Icon size={19} color={isActive ? RED : (dark ? '#B0B3B8' : '#65676B')} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      {badge > 0 && (
                        <div style={{ position: 'absolute', top: -4, right: -5, minWidth: 16, height: 16, borderRadius: 8, background: RED, color: 'white', fontSize: 9, fontWeight: 700, fontFamily: '"Instrument Sans", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '1.5px solid white' }}>
                          {badge > 9 ? '9+' : badge}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: isActive ? 700 : 500, color: isActive ? RED : (dark ? '#8A8D91' : '#8A8D91'), fontFamily: '"Instrument Sans", system-ui' }}>{label}</span>
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      {showSaved && <SavedPostsPage onClose={() => setShowSaved(false)} />}
      {showLiked && <LikedPostsPage onClose={() => setShowLiked(false)} />}
      {showAbout && <AboutModal     onClose={() => setShowAbout(false)} />}

      <style>{`
        @keyframes fadeIn         { from{opacity:0}to{opacity:1} }
        @keyframes slideDown      { from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)} }
        @keyframes slideDownSheet { from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}

// ── Online user row ───────────────────────────────────────────
function OnlineUserRow({ user, dark, onDM }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 10, marginBottom: 2, background: hovered ? (dark ? '#2E2F30' : '#F7F8FA') : 'transparent', transition: 'background 0.12s' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.display_name||'U')}&backgroundColor=0D7377&textColor=ffffff`}
          style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', display: 'block' }} alt="" />
        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: '50%', background: '#22C55E', border: `2px solid ${dark ? '#242526' : 'white'}` }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13, color: dark ? '#E4E6EB' : '#050505', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.display_name}</p>
        <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 10.5, color: '#22C55E', fontWeight: 600 }}>Online</p>
      </div>
      {hovered && (
        <button onClick={onDM} title="Send message"
          style={{ width: 30, height: 30, borderRadius: 8, background: dark ? '#3A3B3C' : '#E4E6EB', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FADBD8'; e.stopPropagation() }}
          onMouseLeave={e => { e.currentTarget.style.background = dark ? '#3A3B3C' : '#E4E6EB' }}>
          <Send size={13} color={RED} />
        </button>
      )}
    </div>
  )
}

function SidebarBtn({ icon, label, onClick, danger, dark }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', border: 'none', cursor: 'pointer', textAlign: 'left', background: hovered ? (danger ? (dark ? '#3A1A1A' : '#FFF5F5') : (dark ? '#3A3B3C' : '#E4E6EB')) : 'transparent', color: danger ? RED : (dark ? '#E4E6EB' : '#1c1e21'), fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 14, borderRadius: 10, transition: 'background 0.12s', marginBottom: 2 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: hovered ? (danger ? (dark ? '#4A2020' : '#FADBD8') : (dark ? '#4A4B4C' : '#CED0D4')) : (dark ? '#3A3B3C' : '#E4E6EB'), display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}>
        {icon}
      </div>
      {label}
    </button>
  )
}

function SectionLabel({ label, dark }) {
  return <p style={{ margin: '8px 10px 4px', fontFamily: '"Instrument Sans", system-ui', fontSize: 10, fontWeight: 700, color: dark ? '#6A6D70' : '#8A8D91', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</p>
}

function Divider({ dark }) {
  return <div style={{ height: 1, background: dark ? '#3A3B3C' : '#D4D6DA', margin: '8px 4px' }} />
}

function NotifPanel({ notifications, unreadCount, markAllRead, markRead, onClose, navigate, dark, mobile }) {
  return (
    <div style={{ background: dark ? '#242526' : 'white', borderRadius: mobile ? '0 0 16px 16px' : 13, border: mobile ? 'none' : `1px solid ${dark ? '#3A3B3C' : '#E4E6EB'}`, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', width: mobile ? '100%' : 310, maxHeight: mobile ? '75vh' : 380, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: mobile ? '14px 16px 12px' : '11px 14px 10px', borderBottom: `1px solid ${dark ? '#3A3B3C' : '#F0F2F5'}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <CalendarClock size={15} color={RED} strokeWidth={2.5} />
          <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 700, fontSize: 14, color: dark ? '#E4E6EB' : '#050505' }}>Notifications</span>
          {unreadCount > 0 && <span style={{ background: RED, color: 'white', fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 10, padding: '1px 6px', borderRadius: 10 }}>{unreadCount}</span>}
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {unreadCount > 0 && <button onClick={markAllRead} style={{ background: dark ? '#3A3B3C' : '#F0F2F5', border: 'none', cursor: 'pointer', color: dark ? '#B0B3B8' : '#65676B', fontSize: 11, fontWeight: 600, fontFamily: '"Instrument Sans", system-ui', display: 'flex', alignItems: 'center', gap: 3, padding: '4px 9px', borderRadius: 6 }}><Check size={10} /> All read</button>}
          <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 6, background: dark ? '#3A3B3C' : '#F0F2F5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} color={dark ? '#B0B3B8' : '#65676B'} /></button>
        </div>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0
          ? <div style={{ padding: '32px 16px', textAlign: 'center', color: dark ? '#B0B3B8' : '#65676B', fontSize: 13, fontFamily: '"Instrument Sans", system-ui' }}><div style={{ fontSize: 28, marginBottom: 6 }}>🔔</div>You're all caught up!</div>
          : notifications.map(n => <NotifItem key={n.id} notif={n} onRead={markRead} onClose={onClose} navigate={navigate} dark={dark} />)
        }
      </div>
      {mobile && <div style={{ height: 'env(safe-area-inset-bottom)', flexShrink: 0 }} />}
    </div>
  )
}

function NotifItem({ notif, onRead, onClose, navigate, dark }) {
  const [hovered, setHovered] = useState(false)
  const icons = { announcement: '📢', tag: '🏷️', whisper: '💬' }
  function handleClick() { onRead(notif.id); onClose(); if (notif.post_id) navigate(`/?post=${notif.post_id}`) }
  return (
    <button onClick={handleClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', background: hovered ? (dark ? '#3A3B3C' : '#F7F8FA') : notif.is_read ? (dark ? '#242526' : 'white') : (dark ? '#2D2020' : '#FFF8F8'), borderLeft: notif.is_read ? '3px solid transparent' : `3px solid ${RED}`, transition: 'background 0.12s' }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: notif.is_read ? (dark ? '#3A3B3C' : '#F0F2F5') : '#FADBD8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{icons[notif.type] || '🔔'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: dark ? '#E4E6EB' : '#1c1e21', fontFamily: '"Instrument Sans", system-ui', lineHeight: 1.4, fontWeight: notif.is_read ? 400 : 600 }}>{notif.message}</p>
        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: dark ? '#8A8D91' : '#65676B', fontFamily: '"Instrument Sans", system-ui' }}>{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</p>
      </div>
      {!notif.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: RED, flexShrink: 0, marginTop: 7 }} />}
    </button>
  )
}
