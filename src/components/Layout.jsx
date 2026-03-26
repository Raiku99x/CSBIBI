import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import { supabase } from '../lib/supabase'
import {
  Home, MessageSquare, Bell, BookMarked, Grid3X3,
  LogOut, Settings, Check, X, Menu, Search
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','922B21','C0392B']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

const RED  = '#C0392B'
const BLUE = '#1A5276'

export default function Layout({ children, onOpenSearch }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [showDrawer, setShowDrawer]     = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifs, setShowNotifs]     = useState(false)
  const [dmUnread, setDmUnread]         = useState(0)
  const menuRef  = useRef(null)
  const notifRef = useRef(null)
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setShowUserMenu(false)
      // For notifs on desktop, close on outside click
      // On mobile it renders as a backdrop sheet so this doesn't matter
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    document.body.style.overflow = showDrawer ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showDrawer])

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
    { to: '/announcements', icon: Bell, label: 'Announce' },
    { to: '/subjects', icon: BookMarked, label: 'Subjects' },
    { to: '/apps', icon: Grid3X3, label: 'Apps' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#E9EBEE', display: 'flex', flexDirection: 'column' }}>

      {/* Drawer Backdrop */}
      {showDrawer && (
        <div onClick={() => setShowDrawer(false)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.45)', animation: 'fadeIn 0.2s ease' }} />
      )}

      {/* Notification backdrop (mobile) — sits below the panel */}
      {showNotifs && (
        <div
          onClick={() => setShowNotifs(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 95,
            background: 'rgba(0,0,0,0.4)',
            animation: 'fadeIn 0.2s ease',
            // only visible on mobile; hidden on desktop via the panel's own outside-click
            display: 'block',
          }}
          className="notif-mobile-backdrop"
        />
      )}

      {/* Slide-out Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 280, zIndex: 90,
        background: 'white', boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
        transform: showDrawer ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ background: `linear-gradient(135deg, ${RED} 0%, ${BLUE} 100%)`, padding: '48px 20px 24px', position: 'relative' }}>
          <button onClick={() => setShowDrawer(false)} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="white" />
          </button>
          <img src={profile?.avatar_url || dicebearUrl(profile?.display_name)} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.6)', boxShadow: '0 2px 12px rgba(0,0,0,0.2)', marginBottom: 12, display: 'block' }} />
          <p style={{ margin: '0 0 2px', fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.display_name}</p>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12.5, color: 'rgba(255,255,255,0.72)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email}</p>
        </div>
        <div style={{ height: 1, background: '#F0F2F5' }} />
        <div style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <DrawerItem icon={<Settings size={18} color="#65676B" />} label="Profile Settings" onClick={() => { setShowDrawer(false); navigate('/profile') }} />
          <div style={{ height: 1, background: '#F0F2F5', margin: '6px 4px' }} />
          <DrawerItem icon={<LogOut size={18} color={RED} />} label="Log Out" onClick={handleSignOut} danger />
        </div>
        <div style={{ padding: '12px 20px 24px', borderTop: '1px solid #F0F2F5' }}>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 11, color: '#BCC0C4', textAlign: 'center' }}>CSB · Computer Science Board</p>
        </div>
      </div>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'white', borderBottom: '1px solid #E4E6EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', height: 52, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>

          {/* Left: Hamburger + Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setShowDrawer(true)} style={{ width: 36, height: 36, borderRadius: 9, background: '#F4F6F8', border: '1.5px solid #E4E6EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#EAECEF'}
              onMouseLeave={e => e.currentTarget.style.background = '#F4F6F8'}>
              <Menu size={17} color="#65676B" />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/')}>
              <div style={{ width: 34, height: 34, borderRadius: 8, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 6px rgba(192,57,43,0.2)' }}>
                <img src="/announce.png" alt="CSB" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 19, color: RED, letterSpacing: '-0.5px', lineHeight: 1 }}>CSB</div>
            </div>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

            {/* Search */}
            <button onClick={onOpenSearch} style={{ width: 36, height: 36, borderRadius: 9, background: '#F4F6F8', border: '1.5px solid #E4E6EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#EAECEF'}
              onMouseLeave={e => e.currentTarget.style.background = '#F4F6F8'}>
              <Search size={17} color="#65676B" />
            </button>

            {/* Bell — ref used for desktop dropdown outside-click only */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowNotifs(v => !v); setShowUserMenu(false) }}
                style={{ width: 36, height: 36, borderRadius: 9, background: showNotifs ? '#FADBD8' : '#F4F6F8', border: `1.5px solid ${showNotifs ? '#F5B7B1' : '#E4E6EB'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 0.15s' }}>
                <Bell size={17} color={showNotifs ? RED : '#65676B'} strokeWidth={showNotifs ? 2.5 : 2} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, background: RED, color: 'white', fontSize: 9.5, fontWeight: 700, fontFamily: '"Instrument Sans", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid white' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Desktop dropdown — only rendered above 600px via CSS */}
              {showNotifs && (
                <div className="notif-desktop-panel">
                  <NotifPanel
                    notifications={notifications}
                    unreadCount={unreadCount}
                    markAllRead={markAllRead}
                    markRead={markRead}
                    onClose={() => setShowNotifs(false)}
                    navigate={navigate}
                  />
                </div>
              )}
            </div>

            {/* Avatar only */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button onClick={() => { setShowUserMenu(v => !v); setShowNotifs(false) }} style={{ width: 36, height: 36, borderRadius: 9, border: `1.5px solid ${showUserMenu ? '#F5B7B1' : '#E4E6EB'}`, background: 'transparent', cursor: 'pointer', padding: 0, overflow: 'hidden', transition: 'border-color 0.15s', flexShrink: 0 }}>
                <img src={profile?.avatar_url || dicebearUrl(profile?.display_name)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
              {showUserMenu && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 220, background: 'white', borderRadius: 13, border: '1px solid #E4E6EB', boxShadow: '0 8px 28px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 100, animation: 'slideDown 0.18s ease' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #F0F2F5', display: 'flex', alignItems: 'center', gap: 9 }}>
                    <img src={profile?.avatar_url || dicebearUrl(profile?.display_name)} style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover' }} alt="" />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5, color: '#1c1e21', fontFamily: '"Instrument Sans", system-ui', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.display_name}</p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: '#65676B', fontFamily: '"Instrument Sans", system-ui', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email}</p>
                    </div>
                  </div>
                  <div style={{ padding: 5 }}>
                    <MenuAction icon={<Settings size={14} />} label="Profile Settings" onClick={() => { navigate('/profile'); setShowUserMenu(false) }} />
                    <div style={{ height: 1, background: '#F0F2F5', margin: '3px 0' }} />
                    <MenuAction icon={<LogOut size={14} />} label="Log Out" onClick={handleSignOut} danger />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile notification sheet — bottom sheet on small screens */}
      {showNotifs && (
        <div className="notif-mobile-sheet" style={{ zIndex: 96 }}>
          <NotifPanel
            notifications={notifications}
            unreadCount={unreadCount}
            markAllRead={markAllRead}
            markRead={markRead}
            onClose={() => setShowNotifs(false)}
            navigate={navigate}
            mobile
          />
        </div>
      )}

      {/* Main */}
      <main style={{ flex: 1, maxWidth: 680, margin: '0 auto', width: '100%', paddingBottom: 64 }}>
        {children}
      </main>

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(10px)', borderTop: '1px solid #E4E6EB', boxShadow: '0 -1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', height: 52, display: 'flex', alignItems: 'center', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {navItems.map(({ to, icon: Icon, label, exact, badge }) => (
            <NavLink key={to} to={to} end={exact} style={{ flex: 1, textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '6px 4px', position: 'relative' }}>
                  {isActive && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 2.5, borderRadius: 2, background: RED }} />}
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: 34, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: isActive ? '#FADBD8' : 'transparent', transition: 'background 0.15s' }}>
                      <Icon size={19} color={isActive ? RED : '#65676B'} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    {badge > 0 && (
                      <div style={{ position: 'absolute', top: -4, right: -5, minWidth: 16, height: 16, borderRadius: 8, background: RED, color: 'white', fontSize: 9, fontWeight: 700, fontFamily: '"Instrument Sans", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '1.5px solid white' }}>
                        {badge > 9 ? '9+' : badge}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 9.5, fontWeight: isActive ? 700 : 500, color: isActive ? RED : '#8A8D91', fontFamily: '"Instrument Sans", system-ui' }}>{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(100%) } to { opacity: 1; transform: translateY(0) } }

        /* Desktop: show as dropdown, hide mobile sheet */
        .notif-desktop-panel {
          display: block;
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          z-index: 100;
        }
        .notif-mobile-sheet {
          display: none;
        }
        .notif-mobile-backdrop {
          display: none;
        }

        /* Mobile: hide dropdown, show bottom sheet + backdrop */
        @media (max-width: 600px) {
          .notif-desktop-panel {
            display: none !important;
          }
          .notif-mobile-sheet {
            display: block;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            animation: slideUp 0.28s cubic-bezier(0.16,1,0.3,1);
          }
          .notif-mobile-backdrop {
            display: block;
          }
        }
      `}</style>
    </div>
  )
}

function DrawerItem({ icon, label, onClick, danger }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', background: hovered ? (danger ? '#FFF5F5' : '#F7F8FA') : 'transparent', color: danger ? RED : '#1c1e21', fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 15, borderRadius: 10, transition: 'background 0.12s' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: hovered ? (danger ? '#FADBD8' : '#EAECEF') : '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}>
        {icon}
      </div>
      {label}
    </button>
  )
}

function MenuAction({ icon, label, onClick, danger }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', border: 'none', cursor: 'pointer', textAlign: 'left', background: hovered ? (danger ? '#FFF5F5' : '#F7F8FA') : 'transparent', color: danger ? RED : '#1c1e21', fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13, borderRadius: 7, transition: 'background 0.12s' }}>
      {icon} {label}
    </button>
  )
}

function NotifPanel({ notifications, unreadCount, markAllRead, markRead, onClose, navigate, mobile }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: mobile ? '16px 16px 0 0' : 13,
      border: mobile ? 'none' : '1px solid #E4E6EB',
      boxShadow: mobile ? '0 -4px 32px rgba(0,0,0,0.18)' : '0 8px 28px rgba(0,0,0,0.12)',
      overflow: 'hidden',
      width: mobile ? '100%' : 310,
      maxHeight: mobile ? '75vh' : undefined,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Drag handle (mobile only) */}
      {mobile && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E4E6EB' }} />
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: mobile ? '4px 16px 12px' : '11px 14px 10px', borderBottom: '1px solid #F0F2F5', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Bell size={15} color={RED} strokeWidth={2.5} />
          <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 700, fontSize: 14, color: '#050505' }}>Notifications</span>
          {unreadCount > 0 && <span style={{ background: RED, color: 'white', fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 10, padding: '1px 6px', borderRadius: 10 }}>{unreadCount}</span>}
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ background: '#F0F2F5', border: 'none', cursor: 'pointer', color: '#65676B', fontSize: 11, fontWeight: 600, fontFamily: '"Instrument Sans", system-ui', display: 'flex', alignItems: 'center', gap: 3, padding: '4px 9px', borderRadius: 6 }}>
              <Check size={10} /> All read
            </button>
          )}
          <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 6, background: '#F0F2F5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={12} color="#65676B" />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0
          ? <div style={{ padding: '32px 16px', textAlign: 'center', color: '#65676B', fontSize: 13, fontFamily: '"Instrument Sans", system-ui' }}><div style={{ fontSize: 28, marginBottom: 6 }}>🔔</div>You're all caught up!</div>
          : notifications.map(n => <NotifItem key={n.id} notif={n} onRead={markRead} onClose={onClose} navigate={navigate} />)
        }
      </div>

      {/* Safe area padding on mobile */}
      {mobile && <div style={{ height: 'env(safe-area-inset-bottom)', flexShrink: 0 }} />}
    </div>
  )
}

function NotifItem({ notif, onRead, onClose, navigate }) {
  const [hovered, setHovered] = useState(false)
  const icons = { announcement: '📢', tag: '🏷️', whisper: '💬' }
  function handleClick() { onRead(notif.id); onClose(); if (notif.post_id) navigate(`/?post=${notif.post_id}`) }
  return (
    <button onClick={handleClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', background: hovered ? '#F7F8FA' : notif.is_read ? 'white' : '#FFF8F8', borderLeft: notif.is_read ? '3px solid transparent' : `3px solid ${RED}`, transition: 'background 0.12s' }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: notif.is_read ? '#F0F2F5' : '#FADBD8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{icons[notif.type] || '🔔'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: '#1c1e21', fontFamily: '"Instrument Sans", system-ui', lineHeight: 1.4, fontWeight: notif.is_read ? 400 : 600 }}>{notif.message}</p>
        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#65676B', fontFamily: '"Instrument Sans", system-ui' }}>{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</p>
      </div>
      {!notif.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: RED, flexShrink: 0, marginTop: 7 }} />}
    </button>
  )
}
