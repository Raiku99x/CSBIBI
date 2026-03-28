import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import { useDarkMode } from '../contexts/DarkModeContext'
import { supabase } from '../lib/supabase'
import {
  Home, MessageSquare, BookMarked, Grid3X3,
  LogOut, Settings, Check, X, Menu, Search, CalendarClock,
  Bookmark, Heart, Moon, Sun, Info
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 600)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 600)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

export default function Layout({ children, onOpenSearch }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { dark, toggle: toggleDark } = useDarkMode()

  const [showDrawer, setShowDrawer]       = useState(false)
  const [showUserMenu, setShowUserMenu]   = useState(false)
  const [showNotifs, setShowNotifs]       = useState(false)
  const [dmUnread, setDmUnread]           = useState(0)
  const [showSaved, setShowSaved]         = useState(false)
  const [showLiked, setShowLiked]         = useState(false)
  const [showAbout, setShowAbout]         = useState(false)

  const menuRef  = useRef(null)
  const notifRef = useRef(null)
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false)
      if (!isMobile && notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isMobile])

  useEffect(() => {
    document.body.style.overflow = (showDrawer || (showNotifs && isMobile)) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showDrawer, showNotifs, isMobile])

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

  const navItems = [
    { to: '/', icon: Home, label: 'Feed', exact: true },
    { to: '/messages', icon: MessageSquare, label: 'Messages', badge: dmUnread },
    { to: '/announcements', icon: CalendarClock, label: 'Deadlines' },
    { to: '/subjects', icon: BookMarked, label: 'Subjects' },
    { to: '/apps', icon: Grid3X3, label: 'Apps' },
  ]

  // Dark mode color tokens (applied via CSS vars on [data-theme="dark"])
  const dm = dark ? {
    pageBg: '#18191A',
    cardBg: '#242526',
    border: '#3A3B3C',
    textPrimary: '#E4E6EB',
    textSecondary: '#B0B3B8',
    surface: '#3A3B3C',
    headerBg: '#242526',
    drawerBg: '#242526',
  } : {}

  return (
    <div style={{ minHeight: '100vh', background: dark ? '#18191A' : '#E9EBEE', display: 'flex', flexDirection: 'column' }}>

      {/* Drawer backdrop */}
      {showDrawer && (
        <div onClick={() => setShowDrawer(false)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease' }} />
      )}

      {/* Mobile notif backdrop */}
      {showNotifs && isMobile && (
        <div onClick={() => setShowNotifs(false)} style={{ position: 'fixed', inset: 0, zIndex: 98, background: 'rgba(0,0,0,0.45)', animation: 'fadeIn 0.2s ease' }} />
      )}

      {/* ── Drawer ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 290, zIndex: 90,
        background: dark ? '#242526' : 'white',
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        transform: showDrawer ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Drawer header */}
        <div style={{ background: `linear-gradient(135deg, ${RED} 0%, ${BLUE} 100%)`, padding: '48px 20px 24px', position: 'relative' }}>
          <button onClick={() => setShowDrawer(false)} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="white" />
          </button>
          <img src={profile?.avatar_url || dicebearUrl(profile?.display_name)} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.6)', boxShadow: '0 2px 12px rgba(0,0,0,0.2)', marginBottom: 12, display: 'block' }} />
          <p style={{ margin: '0 0 2px', fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.display_name}</p>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12.5, color: 'rgba(255,255,255,0.72)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email}</p>
        </div>

        <div style={{ height: 1, background: dark ? '#3A3B3C' : '#F0F2F5' }} />

        {/* Drawer items */}
        <div style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>

          {/* Profile Settings */}
          <DrawerItem
            dark={dark}
            icon={<Settings size={18} color="#65676B" />}
            label="Profile Settings"
            onClick={() => { setShowDrawer(false); navigate('/profile') }}
          />

          <div style={{ height: 1, background: dark ? '#3A3B3C' : '#F0F2F5', margin: '6px 4px' }} />

          {/* Saved Posts */}
          <DrawerItem
            dark={dark}
            icon={<Bookmark size={18} color="#1A5276" fill="#1A5276" />}
            label="Saved Posts"
            onClick={() => { setShowDrawer(false); setShowSaved(true) }}
          />

          {/* Liked Posts */}
          <DrawerItem
            dark={dark}
            icon={<Heart size={18} color={RED} fill={RED} />}
            label="Liked Posts"
            onClick={() => { setShowDrawer(false); setShowLiked(true) }}
          />

          <div style={{ height: 1, background: dark ? '#3A3B3C' : '#F0F2F5', margin: '6px 4px' }} />

          {/* Dark Mode toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '10px 14px', borderRadius: 10,
            background: 'transparent',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: dark ? '#3A3B3C' : '#F0F2F5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {dark
                ? <Sun size={18} color="#F4C430" />
                : <Moon size={18} color="#65676B" />
              }
            </div>
            <span style={{
              flex: 1,
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 15,
              color: dark ? '#E4E6EB' : '#1c1e21',
            }}>
              {dark ? 'Light Mode' : 'Dark Mode'}
            </span>
            {/* Toggle switch */}
            <button
              onClick={toggleDark}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none',
                background: dark ? RED : '#E4E6EB',
                cursor: 'pointer', position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: dark ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: 'white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

          <div style={{ height: 1, background: dark ? '#3A3B3C' : '#F0F2F5', margin: '6px 4px' }} />

          {/* About */}
          <DrawerItem
            dark={dark}
            icon={<Info size={18} color="#0D7377" />}
            label="About CSB"
            onClick={() => { setShowDrawer(false); setShowAbout(true) }}
          />

          <div style={{ height: 1, background: dark ? '#3A3B3C' : '#F0F2F5', margin: '6px 4px' }} />

          {/* Log Out */}
          <DrawerItem
            dark={dark}
            icon={<LogOut size={18} color={RED} />}
            label="Log Out"
            onClick={handleSignOut}
            danger
          />
        </div>

        <div style={{ padding: '12px 20px 24px', borderTop: `1px solid ${dark ? '#3A3B3C' : '#F0F2F5'}` }}>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 11, color: dark ? '#6A6D70' : '#BCC0C4', textAlign: 'center' }}>
            CSB · v2.3.1 · Computer Science Board
          </p>
        </div>
      </div>

      {/* ── Header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: dark ? '#242526' : 'white', borderBottom: `1px solid ${dark ? '#3A3B3C' : '#E4E6EB'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', height: 52, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>

          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setShowDrawer(true)} style={{ width: 36, height: 36, borderRadius: 9, background: dark ? '#3A3B3C' : '#F4F6F8', border: `1.5px solid ${dark ? '#4A4B4C' : '#E4E6EB'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = dark ? '#4A4B4C' : '#EAECEF'}
              onMouseLeave={e => e.currentTarget.style.background = dark ? '#3A3B3C' : '#F4F6F8'}>
              <Menu size={17} color={dark ? '#B0B3B8' : '#65676B'} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/')}>
              <div style={{ width: 34, height: 34, borderRadius: 8, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 6px rgba(192,57,43,0.2)' }}>
                <img src="/announce.png" alt="CSB" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 19, color: RED, letterSpacing: '-0.5px', lineHeight: 1 }}>CSB</div>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={onOpenSearch} style={{ width: 36, height: 36, borderRadius: 9, background: dark ? '#3A3B3C' : '#F4F6F8', border: `1.5px solid ${dark ? '#4A4B4C' : '#E4E6EB'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = dark ? '#4A4B4C' : '#EAECEF'}
              onMouseLeave={e => e.currentTarget.style.background = dark ? '#3A3B3C' : '#F4F6F8'}>
              <Search size={17} color={dark ? '#B0B3B8' : '#65676B'} />
            </button>

            {/* Bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowNotifs(v => !v); setShowUserMenu(false) }}
                style={{ width: 36, height: 36, borderRadius: 9, background: showNotifs ? '#FADBD8' : (dark ? '#3A3B3C' : '#F4F6F8'), border: `1.5px solid ${showNotifs ? '#F5B7B1' : (dark ? '#4A4B4C' : '#E4E6EB')}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 0.15s' }}>
                <CalendarClock size={17} color={showNotifs ? RED : (dark ? '#B0B3B8' : '#65676B')} strokeWidth={showNotifs ? 2.5 : 2} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, background: RED, color: 'white', fontSize: 9.5, fontWeight: 700, fontFamily: '"Instrument Sans", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid white' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && !isMobile && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 100, animation: 'slideDown 0.18s ease' }}>
                  <NotifPanel
                    notifications={notifications}
                    unreadCount={unreadCount}
                    markAllRead={markAllRead}
                    markRead={markRead}
                    onClose={() => setShowNotifs(false)}
                    navigate={navigate}
                    dark={dark}
                  />
                </div>
              )}
            </div>

            {/* Avatar */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button onClick={() => { setShowUserMenu(v => !v); setShowNotifs(false) }} style={{ width: 36, height: 36, borderRadius: 9, border: `1.5px solid ${showUserMenu ? '#F5B7B1' : (dark ? '#4A4B4C' : '#E4E6EB')}`, background: 'transparent', cursor: 'pointer', padding: 0, overflow: 'hidden', transition: 'border-color 0.15s', flexShrink: 0 }}>
                <img src={profile?.avatar_url || dicebearUrl(profile?.display_name)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
              {showUserMenu && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 220, background: dark ? '#242526' : 'white', borderRadius: 13, border: `1px solid ${dark ? '#3A3B3C' : '#E4E6EB'}`, boxShadow: '0 8px 28px rgba(0,0,0,0.18)', overflow: 'hidden', zIndex: 100, animation: 'slideDown 0.18s ease' }}>
                  <div style={{ padding: '12px 14px', borderBottom: `1px solid ${dark ? '#3A3B3C' : '#F0F2F5'}`, display: 'flex', alignItems: 'center', gap: 9 }}>
                    <img src={profile?.avatar_url || dicebearUrl(profile?.display_name)} style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover' }} alt="" />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: dark ? '#E4E6EB' : '#1c1e21', fontFamily: '"Instrument Sans", system-ui', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.display_name}</p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: dark ? '#B0B3B8' : '#65676B', fontFamily: '"Instrument Sans", system-ui', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email}</p>
                    </div>
                  </div>
                  <div style={{ padding: 5 }}>
                    <MenuAction dark={dark} icon={<Settings size={14} />} label="Profile Settings" onClick={() => { navigate('/profile'); setShowUserMenu(false) }} />
                    <div style={{ height: 1, background: dark ? '#3A3B3C' : '#F0F2F5', margin: '3px 0' }} />
                    <MenuAction dark={dark} icon={<LogOut size={14} />} label="Log Out" onClick={handleSignOut} danger />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile notif sheet */}
      {showNotifs && isMobile && (
        <div style={{ position: 'fixed', left: 0, right: 0, top: 52, zIndex: 99, animation: 'slideDownSheet 0.28s cubic-bezier(0.16,1,0.3,1)' }}>
          <NotifPanel
            notifications={notifications}
            unreadCount={unreadCount}
            markAllRead={markAllRead}
            markRead={markRead}
            onClose={() => setShowNotifs(false)}
            navigate={navigate}
            dark={dark}
            mobile
          />
        </div>
      )}

      {/* Main */}
      <main style={{ flex: 1, maxWidth: 680, margin: '0 auto', width: '100%', paddingBottom: 64 }}>
        {children}
      </main>

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: dark ? 'rgba(36,37,38,0.97)' : 'rgba(255,255,255,0.97)', backdropFilter: 'blur(10px)', borderTop: `1px solid ${dark ? '#3A3B3C' : '#E4E6EB'}`, boxShadow: '0 -1px 8px rgba(0,0,0,0.06)' }}>
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

      {/* Overlays */}
      {showSaved && <SavedPostsPage onClose={() => setShowSaved(false)} />}
      {showLiked && <LikedPostsPage onClose={() => setShowLiked(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      <style>{`
        @keyframes fadeIn     { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideDown  { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideUp    { from { opacity: 0; transform: translateY(6px)  } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideDownSheet { from { opacity: 0; transform: translateY(-100%) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}

function DrawerItem({ icon, label, onClick, danger, dark }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', background: hovered ? (danger ? (dark ? '#3A1A1A' : '#FFF5F5') : (dark ? '#3A3B3C' : '#F7F8FA')) : 'transparent', color: danger ? '#C0392B' : (dark ? '#E4E6EB' : '#1c1e21'), fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 15, borderRadius: 10, transition: 'background 0.12s' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: hovered ? (danger ? (dark ? '#4A2020' : '#FADBD8') : (dark ? '#4A4B4C' : '#EAECEF')) : (dark ? '#3A3B3C' : '#F0F2F5'), display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}>
        {icon}
      </div>
      {label}
    </button>
  )
}

function MenuAction({ icon, label, onClick, danger, dark }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', border: 'none', cursor: 'pointer', textAlign: 'left', background: hovered ? (danger ? '#FFF5F5' : (dark ? '#3A3B3C' : '#F7F8FA')) : 'transparent', color: danger ? '#C0392B' : (dark ? '#E4E6EB' : '#1c1e21'), fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13, borderRadius: 7, transition: 'background 0.12s' }}>
      {icon} {label}
    </button>
  )
}

function NotifPanel({ notifications, unreadCount, markAllRead, markRead, onClose, navigate, dark, mobile }) {
  return (
    <div style={{
      background: dark ? '#242526' : 'white',
      borderRadius: mobile ? '0 0 16px 16px' : 13,
      border: mobile ? 'none' : `1px solid ${dark ? '#3A3B3C' : '#E4E6EB'}`,
      boxShadow: mobile ? '0 8px 32px rgba(0,0,0,0.18)' : '0 8px 24px rgba(0,0,0,0.1)',
      overflow: 'hidden', width: mobile ? '100%' : 310,
      maxHeight: mobile ? '75vh' : 380,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: mobile ? '14px 16px 12px' : '11px 14px 10px', borderBottom: `1px solid ${dark ? '#3A3B3C' : '#F0F2F5'}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <CalendarClock size={15} color="#C0392B" strokeWidth={2.5} />
          <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 700, fontSize: 14, color: dark ? '#E4E6EB' : '#050505' }}>Notifications</span>
          {unreadCount > 0 && <span style={{ background: '#C0392B', color: 'white', fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 10, padding: '1px 6px', borderRadius: 10 }}>{unreadCount}</span>}
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ background: dark ? '#3A3B3C' : '#F0F2F5', border: 'none', cursor: 'pointer', color: dark ? '#B0B3B8' : '#65676B', fontSize: 11, fontWeight: 600, fontFamily: '"Instrument Sans", system-ui', display: 'flex', alignItems: 'center', gap: 3, padding: '4px 9px', borderRadius: 6 }}>
              <Check size={10} /> All read
            </button>
          )}
          <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 6, background: dark ? '#3A3B3C' : '#F0F2F5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={12} color={dark ? '#B0B3B8' : '#65676B'} />
          </button>
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
      style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', background: hovered ? (dark ? '#3A3B3C' : '#F7F8FA') : notif.is_read ? (dark ? '#242526' : 'white') : (dark ? '#2D2020' : '#FFF8F8'), borderLeft: notif.is_read ? '3px solid transparent' : `3px solid #C0392B`, transition: 'background 0.12s' }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: notif.is_read ? (dark ? '#3A3B3C' : '#F0F2F5') : '#FADBD8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{icons[notif.type] || '🔔'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: dark ? '#E4E6EB' : '#1c1e21', fontFamily: '"Instrument Sans", system-ui', lineHeight: 1.4, fontWeight: notif.is_read ? 400 : 600 }}>{notif.message}</p>
        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: dark ? '#8A8D91' : '#65676B', fontFamily: '"Instrument Sans", system-ui' }}>{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</p>
      </div>
      {!notif.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C0392B', flexShrink: 0, marginTop: 7 }} />}
    </button>
  )
}
