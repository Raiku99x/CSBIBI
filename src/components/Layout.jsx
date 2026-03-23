import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import {
  Home, MessageSquare, Bell, BookMarked, Grid3X3,
  LogOut, Settings, Check, ChevronDown, X
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','5C4A7A','6B5B8A','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','4A3A7A','3E3068']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

const RED = '#C0392B'
const BLUE = '#1A5276'

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
    <div style={{ minHeight: '100vh', background: '#EEF0F3', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'white',
        borderBottom: '1px solid #E4E6EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <div style={{
          maxWidth: 700, margin: '0 auto',
          height: 58, padding: '0 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>

          {/* ── Logo ── */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}
            onClick={() => navigate('/')}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(192,57,43,0.25)',
            }}>
              <img src="/announce.png" alt="CSB" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{
                fontFamily: '"Bricolage Grotesque", system-ui',
                fontWeight: 800, fontSize: 20,
                color: RED, letterSpacing: '-0.5px', lineHeight: 1,
              }}>CSB</div>
              <div style={{
                fontFamily: '"Instrument Sans", system-ui',
                fontWeight: 600, fontSize: 9.5,
                color: BLUE, letterSpacing: '0.9px',
                textTransform: 'uppercase', lineHeight: 1, marginTop: 1,
              }}>Computer Science Board</div>
            </div>
          </div>

          {/* ── Right Actions ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

            {/* Notification Bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowNotifs(v => !v); setShowUserMenu(false) }}
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: showNotifs ? '#FADBD8' : '#F4F6F8',
                  border: `1.5px solid ${showNotifs ? '#F5B7B1' : '#E4E6EB'}`,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', transition: 'all 0.15s',
                }}
              >
                <Bell size={18} color={showNotifs ? RED : '#65676B'} strokeWidth={showNotifs ? 2.5 : 2} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 18, height: 18, borderRadius: 9,
                    background: RED, color: 'white',
                    fontSize: 10, fontWeight: 700, fontFamily: '"Instrument Sans", system-ui',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px', border: '2px solid white',
                    animation: 'scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
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

            {/* User Menu */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowUserMenu(v => !v); setShowNotifs(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 10px 4px 4px',
                  borderRadius: 10,
                  border: `1.5px solid ${showUserMenu ? '#F5B7B1' : '#E4E6EB'}`,
                  background: showUserMenu ? '#FADBD8' : '#F4F6F8',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <img
                  src={profile?.avatar_url || dicebearUrl(profile?.display_name)}
                  alt="avatar"
                  style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }}
                />
                <span style={{
                  fontFamily: '"Instrument Sans", system-ui',
                  fontWeight: 600, fontSize: 13, color: '#1c1e21',
                  maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {profile?.display_name?.split(' ')[0]}
                </span>
                <ChevronDown size={13} color="#65676B" style={{
                  transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.2s',
                }} />
              </button>

              {showUserMenu && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 10px)',
                  width: 230, background: 'white',
                  borderRadius: 14, border: '1px solid #E4E6EB',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
                  overflow: 'hidden', zIndex: 100,
                  animation: 'slideDown 0.2s ease',
                }}>
                  {/* Profile header in menu */}
                  <div style={{
                    padding: '14px 16px',
                    background: 'linear-gradient(135deg, #fff 0%, #FFF8F8 100%)',
                    borderBottom: '1px solid #F0F2F5',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <img
                      src={profile?.avatar_url || dicebearUrl(profile?.display_name)}
                      style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover' }}
                      alt=""
                    />
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        margin: 0, fontWeight: 700, fontSize: 14,
                        color: '#1c1e21', fontFamily: '"Instrument Sans", system-ui',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {profile?.display_name}
                      </p>
                      <p style={{
                        margin: '1px 0 0', fontSize: 11.5, color: '#65676B',
                        fontFamily: '"Instrument Sans", system-ui',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {profile?.email}
                      </p>
                    </div>
                  </div>
                  <div style={{ padding: 6 }}>
                    <MenuAction
                      icon={<Settings size={15} />}
                      label="Profile Settings"
                      onClick={() => { navigate('/profile'); setShowUserMenu(false) }}
                    />
                    <div style={{ height: 1, background: '#F0F2F5', margin: '4px 0' }} />
                    <MenuAction
                      icon={<LogOut size={15} />}
                      label="Log Out"
                      onClick={handleSignOut}
                      danger
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={{
        flex: 1,
        maxWidth: 700, margin: '0 auto',
        width: '100%',
        padding: '0 12px',
        paddingBottom: 80,
      }}>
        {children}
      </main>

      {/* ── Bottom Nav ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid #E4E6EB',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          maxWidth: 700, margin: '0 auto',
          height: 58, display: 'flex', alignItems: 'center',
          paddingBottom: 'env(safe-area-inset-bottom)',
          padding: '0 4px',
        }}>
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact} style={{ flex: 1, textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 3, padding: '8px 4px',
                  position: 'relative',
                }}>
                  {/* Active indicator dot */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: 4, left: '50%',
                      transform: 'translateX(-50%)',
                      width: 24, height: 2.5, borderRadius: 2,
                      background: RED,
                      animation: 'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    }} />
                  )}
                  <div style={{
                    width: 36, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 8,
                    background: isActive ? '#FADBD8' : 'transparent',
                    transition: 'background 0.15s',
                  }}>
                    <Icon
                      size={20}
                      color={isActive ? RED : '#65676B'}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: isActive ? 700 : 500,
                    color: isActive ? RED : '#8A8D91',
                    fontFamily: '"Instrument Sans", system-ui',
                    letterSpacing: 0.1,
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
        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.9); } to { opacity:1; transform:scale(1); } }
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
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
        background: hovered ? (danger ? '#FFF5F5' : '#F7F8FA') : 'transparent',
        color: danger ? RED : '#1c1e21',
        fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13.5,
        borderRadius: 8,
        transition: 'background 0.12s',
      }}>
      {icon} {label}
    </button>
  )
}

function NotifPanel({ notifications, unreadCount, markAllRead, markRead, onClose, navigate }) {
  return (
    <div style={{
      position: 'absolute', right: 0, top: 'calc(100% + 10px)',
      width: 330, background: 'white',
      borderRadius: 14, border: '1px solid #E4E6EB',
      boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
      overflow: 'hidden', zIndex: 100,
      animation: 'slideDown 0.2s ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 12px',
        borderBottom: '1px solid #F0F2F5',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={16} color={RED} strokeWidth={2.5} />
          <span style={{
            fontFamily: '"Bricolage Grotesque", system-ui',
            fontWeight: 700, fontSize: 15, color: '#050505',
          }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span style={{
              background: RED, color: 'white',
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 10,
              padding: '1px 6px', borderRadius: 10,
            }}>
              {unreadCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{
              background: '#F0F2F5', border: 'none', cursor: 'pointer',
              color: '#65676B', fontSize: 11.5, fontWeight: 600,
              fontFamily: '"Instrument Sans", system-ui',
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 6,
              transition: 'background 0.1s',
            }}>
              <Check size={11} /> All read
            </button>
          )}
          <button onClick={onClose} style={{
            width: 26, height: 26, borderRadius: 6,
            background: '#F0F2F5', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={13} color="#65676B" />
          </button>
        </div>
      </div>

      <div style={{ maxHeight: 340, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{
            padding: '36px 16px', textAlign: 'center',
            color: '#65676B', fontSize: 13.5,
            fontFamily: '"Instrument Sans", system-ui',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
            You're all caught up!
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
        padding: '12px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
        background: hovered ? '#F7F8FA' : notif.is_read ? 'white' : '#FFF8F8',
        borderLeft: notif.is_read ? '3px solid transparent' : `3px solid ${RED}`,
        transition: 'background 0.12s',
      }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: notif.is_read ? '#F0F2F5' : '#FADBD8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17,
      }}>
        {icons[notif.type] || '🔔'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 13, color: '#1c1e21',
          fontFamily: '"Instrument Sans", system-ui', lineHeight: 1.4,
          fontWeight: notif.is_read ? 400 : 600,
        }}>
          {notif.message}
        </p>
        <p style={{
          margin: '3px 0 0', fontSize: 11, color: '#65676B',
          fontFamily: '"Instrument Sans", system-ui',
        }}>
          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notif.is_read && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: RED, flexShrink: 0, marginTop: 8,
        }} />
      )}
    </button>
  )
}
