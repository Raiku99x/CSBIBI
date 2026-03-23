import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import {
  Home, MessageSquare, Bell, BookMarked, Grid3X3,
  LogOut, Settings, Check, ChevronDown
} from 'lucide-react'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','5C4A7A','6B5B8A','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','4A3A7A','3E3068']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}
import { formatDistanceToNow } from 'date-fns'

const BRAND_PRIMARY = '#C0392B'
const BRAND_BLUE    = '#1A5276'

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const menuRef = useRef(null)
  const notifRef = useRef(null)
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/auth')
  }

  const navItems = [
    { to: '/', icon: Home, label: 'Feed', exact: true },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/announcements', icon: Bell, label: 'Announce' },
    { to: '/subjects', icon: BookMarked, label: 'Subjects' },
    { to: '/apps', icon: Grid3X3, label: 'Apps' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F4F6F8', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'white',
        borderBottom: '1px solid #EBEBEB',
        boxShadow: '0 1px 0 rgba(192,57,43,0.18), 0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          maxWidth: 680, margin: '0 auto',
          height: 56, padding: '0 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Real logo image */}
            <img
              src="/announce.png"
              alt="CSB Logo"
              style={{
                width: 38, height: 38,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(192,57,43,0.35)',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{
                fontFamily: '"Bricolage Grotesque", system-ui',
                fontWeight: 800, fontSize: 22,
                color: BRAND_PRIMARY, letterSpacing: '-0.5px',
              }}>CSB</span>
              <span style={{
                fontFamily: '"Instrument Sans", system-ui',
                fontWeight: 600, fontSize: 9,
                color: BRAND_BLUE, letterSpacing: '0.8px', textTransform: 'uppercase',
              }}>Computer Science Board</span>
            </div>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowNotifs(!showNotifs); setShowUserMenu(false) }}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: showNotifs ? '#FADBD8' : '#F4F6F8',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', transition: 'background 0.15s',
                }}
              >
                <Bell size={20} color={showNotifs ? BRAND_PRIMARY : '#65676B'} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    minWidth: 16, height: 16, borderRadius: 8,
                    background: BRAND_PRIMARY, color: 'white',
                    fontSize: 10, fontWeight: 700, fontFamily: '"Instrument Sans", system-ui',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', border: '2px solid white',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <NotifPanel
                  notifications={notifications}
                  unreadCount={unreadCount}
                  markAllRead={markAllRead}
                  markRead={markRead}
                  onClose={() => setShowNotifs(false)}
                  navigate={navigate}
                />
              )}
            </div>

            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 8px 4px 4px',
                  borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: showUserMenu ? '#FADBD8' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <img
                  src={profile?.avatar_url || dicebearUrl(profile?.display_name)}
                  alt="avatar"
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', background: '#E4E6EB' }}
                />
                <ChevronDown size={14} color="#65676B" />
              </button>

              {showUserMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  width: 220, background: 'white',
                  borderRadius: 12, border: '1px solid #DADDE1',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  overflow: 'hidden', zIndex: 100,
                  animation: 'slideDown 0.2s ease',
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0F2F5', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                      src={profile?.avatar_url || dicebearUrl(profile?.display_name)}
                      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                      alt=""
                    />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#1c1e21', fontFamily: '"Instrument Sans", system-ui', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {profile?.display_name}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: '#65676B', fontFamily: '"Instrument Sans", system-ui', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {profile?.email}
                      </p>
                    </div>
                  </div>
                  <MenuAction icon={<Settings size={16} />} label="Profile Settings" onClick={() => { navigate('/profile'); setShowUserMenu(false) }} />
                  <MenuAction icon={<LogOut size={16} />} label="Log Out" onClick={handleSignOut} danger />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ flex: 1, maxWidth: 680, margin: '0 auto', width: '100%', paddingBottom: 80 }}>
        {children}
      </main>

      {/* ── Bottom Nav ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'white',
        borderTop: '1px solid #EBEBEB',
        boxShadow: '0 -1px 0 rgba(192,57,43,0.15), 0 -2px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{
          maxWidth: 680, margin: '0 auto',
          height: 56, display: 'flex', alignItems: 'center',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact} style={{ flex: 1, textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 3, padding: '6px 0',
                  borderTop: isActive ? `2px solid ${BRAND_PRIMARY}` : '2px solid transparent',
                  marginTop: -1, transition: 'all 0.15s ease',
                }}>
                  <Icon size={22} color={isActive ? BRAND_PRIMARY : '#65676B'} strokeWidth={isActive ? 2.5 : 2} />
                  <span style={{
                    fontSize: 10, fontWeight: isActive ? 700 : 500,
                    color: isActive ? BRAND_PRIMARY : '#65676B',
                    fontFamily: '"Instrument Sans", system-ui', letterSpacing: 0.1,
                  }}>
                    {label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

function MenuAction({ icon, label, onClick, danger }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
        background: hovered ? (danger ? '#FFF5F5' : '#F7F8FA') : 'transparent',
        color: danger ? '#C0392B' : '#1c1e21',
        fontFamily: '"Instrument Sans", system-ui', fontWeight: 500, fontSize: 14,
        transition: 'background 0.12s',
      }}>
      {icon} {label}
    </button>
  )
}

function NotifPanel({ notifications, unreadCount, markAllRead, markRead, onClose, navigate }) {
  return (
    <div style={{
      position: 'absolute', right: 0, top: 'calc(100% + 8px)',
      width: 320, background: 'white',
      borderRadius: 12, border: '1px solid #DADDE1',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      overflow: 'hidden', zIndex: 100,
      animation: 'slideDown 0.2s ease',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: `2px solid ${BRAND_PRIMARY}`,
        background: `linear-gradient(135deg, ${BRAND_PRIMARY}, ${BRAND_BLUE})`,
      }}>
        <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 700, fontSize: 16, color: 'white' }}>
          Notifications
        </span>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer',
            color: 'white', fontSize: 12, fontWeight: 600,
            fontFamily: '"Instrument Sans", system-ui',
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 20,
          }}>
            <Check size={12} /> Mark all read
          </button>
        )}
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#65676B', fontSize: 14, fontFamily: '"Instrument Sans", system-ui' }}>
            No notifications yet
          </div>
        ) : notifications.map(n => (
          <NotifItem key={n.id} notif={n} onRead={markRead} onClose={onClose} navigate={navigate} />
        ))}
      </div>
    </div>
  )
}

function NotifItem({ notif, onRead, onClose, navigate }) {
  const [hovered, setHovered] = useState(false)
  const icons = { announcement: '📢', tag: '🏷️', whisper: '💬' }
  function handleClick() {
    onRead(notif.id)
    onClose()
    if (notif.post_id) navigate(`/?post=${notif.post_id}`)
  }
  return (
    <button onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '10px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
        background: hovered ? '#F7F8FA' : notif.is_read ? 'white' : '#FADBD8',
        transition: 'background 0.12s',
      }}>
      <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{icons[notif.type] || '🔔'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#1c1e21', fontFamily: '"Instrument Sans", system-ui', lineHeight: 1.4 }}>{notif.message}</p>
        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#65676B', fontFamily: '"Instrument Sans", system-ui' }}>
          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notif.is_read && <div style={{ width: 10, height: 10, borderRadius: '50%', background: BRAND_PRIMARY, flexShrink: 0, marginTop: 6 }} />}
    </button>
  )
}
