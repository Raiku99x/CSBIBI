import { APP_VERSION, APP_COHORT } from '../version'
import { useState, useRef, useEffect, createContext, useContext } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import { useDarkMode } from '../contexts/DarkModeContext'
import { usePresence } from '../hooks/usePresence'
import { useRole } from '../hooks/useRole'
import { useModMode } from '../hooks/useModMode'
import { supabase } from '../lib/supabase'
import {
  Home, MessageSquare, BookMarked, Grid3X3,
  LogOut, Settings, Check, X, Menu, Search, CalendarClock, Bell,
  Bookmark, Heart, Moon, Sun, Info, MoreHorizontal,
  EyeOff, Eye, Send, Shield, Crown, ChevronRight
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import SavedPostsPage from '../pages/SavedPostsPage'
import LikedPostsPage from '../pages/LikedPostsPage'
import AboutModal from './AboutModal'
import AdminDashboard from '../pages/AdminDashboard'
import UserProfilePage from '../pages/UserProfilePage'
import MessagesPage from '../pages/MessagesPage'

// ── Shared avatar utility (single source of truth) ────────────
const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','922B21','C0392B']
export function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

const RED  = '#C0392B'
const BLUE = '#1A5276'
const DESKTOP_BP = 1024

export const NavVisibilityContext = createContext({ hideNav: false, setHideNav: () => {} })
export function useNavVisibility() { return useContext(NavVisibilityContext) }

function useIsDesktop() {
  const [v, setV] = useState(() => window.innerWidth >= DESKTOP_BP)
  useEffect(() => {
    const fn = () => setV(window.innerWidth >= DESKTOP_BP)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return v
}

function useForceLogout(profile, signOut, navigate) {
  useEffect(() => {
    if (!profile?.id) return
    let channel = null
    supabase.auth.getSession().then(({ data }) => {
      const sessionCreatedAt = data?.session?.created_at
        ? new Date(data.session.created_at)
        : new Date(0)
      channel = supabase
        .channel('force-logout-' + profile.id)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` },
          async (payload) => {
            const flaggedAt = payload.new?.force_logout_at
            const previousFlaggedAt = payload.old?.force_logout_at
            if (!flaggedAt || flaggedAt === previousFlaggedAt) return
            const flagTime = new Date(flaggedAt)
            if (flagTime > sessionCreatedAt) {
              await supabase.auth.signOut()
              navigate('/auth')
            }
          }
        )
        .subscribe()
    })
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [profile?.id, signOut, navigate])
}

// Desktop sidebar nav
function getDesktopNavItems() {
  return [
    { to: '/',              icon: Home,          label: 'Feed',      exact: true },
    { to: '/announcements', icon: CalendarClock, label: 'Deadlines' },
    { to: '/subjects',      icon: BookMarked,    label: 'Subjects'  },
    { to: '/apps',          icon: Grid3X3,       label: 'Apps'      },
  ]
}

// Bottom nav — 4 items on mobile (removed Messages — accessible via header button)
function getBottomNavItems() {
  return [
    { to: '/',              icon: Home,          label: 'Feed',      exact: true },
    { to: '/announcements', icon: CalendarClock, label: 'Deadlines' },
    { to: '/subjects',      icon: BookMarked,    label: 'Subjects'  },
    { to: '/apps',          icon: Grid3X3,       label: 'Apps'      },
  ]
}

function ModChip({ isSuperadmin }) {
  return (
    <div style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:20,background:isSuperadmin?'linear-gradient(135deg,#F4C430,#E6A817)':'linear-gradient(135deg,#1A5276,#0D7377)',boxShadow:isSuperadmin?'0 2px 8px rgba(244,196,48,0.4)':'0 2px 8px rgba(13,115,119,0.35)' }}>
      {isSuperadmin ? <Crown size={11} color="white"/> : <Shield size={11} color="white"/>}
      <span style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:10.5,color:'white',letterSpacing:0.4 }}>
        {isSuperadmin ? 'ADMIN' : 'MOD'}
      </span>
    </div>
  )
}

// ── LeftSidebar extracted OUTSIDE Layout so it doesn't re-create on every render ──
function LeftSidebar({
  onClose, isDesktop, profile, dark, colors,
  desktopNavItems, dmUnread,
  isModerator, isSuperadmin, modMode, toggleModMode,
  openMessages, navigate, handleSignOut, handleOpenOwnProfile,
  showSaved, setShowSaved, setShowLiked, setShowAbout, setShowDashboard,
}) {
  const borderCol  = colors.border
  const textPri    = colors.textPri
  const textSec    = colors.textSec
  const textMut    = colors.textMut
  const surfaceBg  = colors.surface
  const dividerCol = colors.divider

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%' }}>
      {!isDesktop && (
        <div style={{ display:'flex',justifyContent:'flex-end',padding:'12px 12px 0' }}>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:'50%',background:surfaceBg,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <X size={16} color={textSec}/>
          </button>
        </div>
      )}
      <div className="csb-sidebar-scroll" style={{ flex:1,overflowY:'auto',padding:isDesktop?'12px 10px':'8px 10px' }}>

        {/* Profile card */}
        <button
          onClick={handleOpenOwnProfile}
          style={{ width:'100%',padding:'12px 10px',marginBottom:8,display:'flex',alignItems:'center',gap:12,background:dark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.03)',border:`1.5px solid ${borderCol}`,borderRadius:12,cursor:'pointer',textAlign:'left',transition:'background 0.15s, border-color 0.15s' }}
          onMouseEnter={e=>{ e.currentTarget.style.background=dark?'rgba(255,255,255,0.08)':'#F0F2F5'; e.currentTarget.style.borderColor=dark?'#4A4B4C':'#CED0D4' }}
          onMouseLeave={e=>{ e.currentTarget.style.background=dark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.03)'; e.currentTarget.style.borderColor=borderCol }}
        >
          <img src={profile?.avatar_url || dicebearUrl(profile?.display_name)} alt="avatar"
            style={{ width:40,height:40,borderRadius:11,objectFit:'cover',flexShrink:0,border:`1.5px solid ${dividerCol}` }}/>
          <div style={{ minWidth:0,flex:1 }}>
            <div style={{ display:'flex',alignItems:'center',gap:5,flexWrap:'wrap' }}>
              <p style={{ margin:0,fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:14,color:textPri,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                {profile?.display_name}
              </p>
              {profile?.role==='superadmin'&&<span style={{ display:'inline-flex',alignItems:'center',gap:3,background:'#FEF9C3',color:'#92400E',border:'1px solid #FDE68A',borderRadius:10,padding:'1px 6px',fontSize:10,fontWeight:700,fontFamily:'"Instrument Sans",system-ui',flexShrink:0 }}><Crown size={9}/> Admin</span>}
              {profile?.role==='moderator'&&<span style={{ display:'inline-flex',alignItems:'center',gap:3,background:'#EBF5FB',color:BLUE,border:'1px solid #AED6F1',borderRadius:10,padding:'1px 6px',fontSize:10,fontWeight:700,fontFamily:'"Instrument Sans",system-ui',flexShrink:0 }}><Shield size={9}/> Mod</span>}
            </div>
            <p style={{ margin:'2px 0 0',fontFamily:'"Instrument Sans",system-ui',fontSize:11,color:textMut,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{profile?.email}</p>
          </div>
          <ChevronRight size={14} color={textMut} style={{ flexShrink:0 }}/>
        </button>

        <div style={{ height:1,background:dividerCol,margin:'0 4px 8px' }}/>

        {/* Desktop navigation links */}
        {isDesktop && (
          <>
            <div style={{ marginBottom:4 }}>
              {desktopNavItems.map(({ to, icon: Icon, label, exact }) => (
                <NavLink key={to} to={to} end={exact} style={{ textDecoration:'none' }}>
                  {({ isActive }) => (
                    <div style={{ display:'flex',alignItems:'center',gap:11,padding:'8px 10px',borderRadius:10,marginBottom:2,cursor:'pointer',background:isActive?(dark?'rgba(192,57,43,0.15)':'#FFF0EF'):'transparent',transition:'background 0.12s' }}
                      onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.background=dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)' }}
                      onMouseLeave={e=>{ if(!isActive) e.currentTarget.style.background='transparent' }}>
                      <div style={{ width:32,height:32,borderRadius:9,flexShrink:0,background:isActive?'#FADBD8':surfaceBg,display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.12s' }}>
                        <Icon size={16} color={isActive?RED:textSec} strokeWidth={isActive?2.5:2}/>
                      </div>
                      <span style={{ flex:1,fontFamily:'"Instrument Sans",system-ui',fontWeight:isActive?700:600,fontSize:14,color:isActive?RED:textPri }}>{label}</span>
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
            <div style={{ height:1,background:dividerCol,margin:'4px 4px 8px' }}/>
          </>
        )}

        {/* Personal */}
        <div style={{ marginBottom:4 }}>
          <p style={{ margin:'4px 10px 4px',fontFamily:'"Instrument Sans",system-ui',fontSize:10,fontWeight:700,color:textMut,textTransform:'uppercase',letterSpacing:0.8 }}>Personal</p>
          <SidebarBtn dark={dark} surfaceBg={surfaceBg} textPri={textPri} icon={<Settings size={16} color={textSec}/>} label="Profile Settings" onClick={()=>{ onClose?.(); navigate('/profile') }}/>
          <SidebarBtn dark={dark} surfaceBg={surfaceBg} textPri={textPri} icon={<Bookmark size={16} color={BLUE} fill={BLUE}/>} label="Saved Posts" onClick={()=>{ onClose?.(); setShowSaved(true) }}/>
          <SidebarBtn dark={dark} surfaceBg={surfaceBg} textPri={textPri} icon={<Heart size={16} color={RED} fill={RED}/>} label="Liked Posts" onClick={()=>{ onClose?.(); setShowLiked(true) }}/>
        </div>

        <div style={{ height:1,background:dividerCol,margin:'4px 4px 8px' }}/>

        {(isModerator||isSuperadmin)&&(
          <>
            <div style={{ marginBottom:4 }}>
              <p style={{ margin:'4px 10px 4px',fontFamily:'"Instrument Sans",system-ui',fontSize:10,fontWeight:700,color:textMut,textTransform:'uppercase',letterSpacing:0.8 }}>{isSuperadmin?'Admin':'Moderator'}</p>
              <div style={{ display:'flex',alignItems:'center',gap:11,padding:'8px 10px',borderRadius:10,marginBottom:2 }}>
                <div style={{ width:32,height:32,borderRadius:9,flexShrink:0,background:modMode?(isSuperadmin?'#FEF9C3':'#EBF5FB'):surfaceBg,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  {isSuperadmin?<Crown size={16} color={modMode?'#92400E':textSec}/>:<Shield size={16} color={modMode?BLUE:textSec}/>}
                </div>
                <span style={{ flex:1,fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:14,color:textPri }}>{modMode?'Mod Mode ON':'Mod Mode OFF'}</span>
                <button onClick={toggleModMode} style={{ width:40,height:22,borderRadius:11,border:'none',background:modMode?(isSuperadmin?'#F4C430':BLUE):'#CED0D4',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0 }}>
                  <div style={{ position:'absolute',top:3,left:modMode?21:3,width:16,height:16,borderRadius:'50%',background:'white',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'left 0.2s' }}/>
                </button>
              </div>
              {modMode&&<p style={{ margin:'0 10px 6px',fontFamily:'"Instrument Sans",system-ui',fontSize:11,color:isSuperadmin?'#92400E':BLUE,lineHeight:1.4 }}>{isSuperadmin?'👑 Admin controls active':'🛡️ Mod controls active'}</p>}
              {modMode&&<SidebarBtn dark={dark} surfaceBg={surfaceBg} textPri={textPri} icon={isSuperadmin?<Crown size={16} color="#92400E"/>:<Shield size={16} color={BLUE}/>} label={isSuperadmin?'Admin Dashboard':'Mod Dashboard'} onClick={()=>{ onClose?.(); setShowDashboard(true) }}/>}
            </div>
            <div style={{ height:1,background:dividerCol,margin:'4px 4px 8px' }}/>
          </>
        )}

        {/* Preferences */}
        <div style={{ marginBottom:4 }}>
          <p style={{ margin:'4px 10px 4px',fontFamily:'"Instrument Sans",system-ui',fontSize:10,fontWeight:700,color:textMut,textTransform:'uppercase',letterSpacing:0.8 }}>Preferences</p>
          <DarkModeToggle dark={dark} colors={colors} surfaceBg={surfaceBg} textPri={textPri} textSec={textSec}/>
          <SidebarBtn dark={dark} surfaceBg={surfaceBg} textPri={textPri} icon={<Info size={16} color="#0D7377"/>} label="About CSB" onClick={()=>{ onClose?.(); setShowAbout(true) }}/>
        </div>

        <div style={{ height:1,background:dividerCol,margin:'4px 4px 8px' }}/>
        <div style={{ marginBottom:8 }}>
          <SidebarBtn dark={dark} surfaceBg={surfaceBg} textPri={textPri} icon={<LogOut size={16} color={RED}/>} label="Log Out" onClick={handleSignOut} danger/>
        </div>
        <p style={{ margin:'4px 0 12px',fontFamily:'"Instrument Sans",system-ui',fontSize:10.5,color:textMut,textAlign:'center' }}>
          CSB · {APP_VERSION} · {APP_COHORT}
        </p>
      </div>
    </div>
  )
}

// Extracted so it doesn't re-render inside LeftSidebar on every keystroke
function DarkModeToggle({ dark, colors, surfaceBg, textPri, textSec }) {
  const { toggle: toggleDark } = useDarkMode()
  return (
    <div style={{ display:'flex',alignItems:'center',gap:11,padding:'8px 10px',borderRadius:10,marginBottom:2 }}>
      <div style={{ width:32,height:32,borderRadius:9,flexShrink:0,background:surfaceBg,display:'flex',alignItems:'center',justifyContent:'center' }}>
        {dark?<Sun size={16} color="#F4C430"/>:<Moon size={16} color={textSec}/>}
      </div>
      <span style={{ flex:1,fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:14,color:textPri }}>
        {dark ? 'Dark Mode' : 'Light Mode'}
      </span>
      <button onClick={toggleDark} style={{ width:40,height:22,borderRadius:11,border:'none',background:dark?RED:'#CED0D4',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0 }}>
        <div style={{ position:'absolute',top:3,left:dark?21:3,width:16,height:16,borderRadius:'50%',background:'white',boxShadow:'0 1px 3px rgba(0,0,0,0.2)',transition:'left 0.2s' }}/>
      </button>
    </div>
  )
}

export default function Layout({ children, onOpenSearch }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const { dark, colors } = useDarkMode()
  const { isModerator, isSuperadmin } = useRole()
  const { modMode, toggleModMode } = useModMode()
  const [hideNav, setHideNav] = useState(false)

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

  const [showDrawer,     setShowDrawer]     = useState(false)
  const [showNotifs,     setShowNotifs]     = useState(false)
  const [dmUnread,       setDmUnread]       = useState(0)
  const [showSaved,      setShowSaved]      = useState(false)
  const [showLiked,      setShowLiked]      = useState(false)
  const [showAbout,      setShowAbout]      = useState(false)
  const [showDashboard,  setShowDashboard]  = useState(false)
  const [selfMenuOpen,   setSelfMenuOpen]   = useState(false)
  const [showOwnProfile, setShowOwnProfile] = useState(false)
  const [showMessages,       setShowMessages]   = useState(false)
  const [messagesDMTarget,   setMessagesDMTarget] = useState(null)

  const notifRef    = useRef(null)
  const selfMenuRef = useRef(null)
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()
  const desktopNavItems = getDesktopNavItems()
  const bottomNavItems  = getBottomNavItems()

  useForceLogout(profile, signOut, navigate)

  useEffect(() => {
    if (!showNotifs || unreadCount === 0) return
    const t = setTimeout(markAllRead, 1500)
    return () => clearTimeout(t)
  }, [showNotifs]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // FIX #1: openMessages now correctly accepts a full partner object OR a userId string
  // so the DM target is always forwarded properly to MessagesPage
  function openMessages(dmTarget) {
    setMessagesDMTarget(dmTarget || null)
    setShowMessages(true)
    setDmUnread(0)
  }

  async function handleSignOut() {
    setShowDrawer(false)
    await signOut()
    navigate('/auth')
  }

  function handleOpenOwnProfile() {
    setShowDrawer(false)
    setShowOwnProfile(true)
  }

  const pageBg     = colors.pageBg
  const cardBg     = colors.cardBg
  const borderCol  = colors.border
  const textPri    = colors.textPri
  const textSec    = colors.textSec
  const textMut    = colors.textMut
  const surfaceBg  = colors.surface
  const dividerCol = colors.divider

  // Shared props for LeftSidebar
  const sidebarProps = {
    isDesktop, profile, dark, colors,
    desktopNavItems, dmUnread,
    isModerator, isSuperadmin, modMode, toggleModMode,
    openMessages, navigate, handleSignOut, handleOpenOwnProfile,
    showSaved, setShowSaved, setShowLiked, setShowAbout, setShowDashboard,
  }

  return (
    <NavVisibilityContext.Provider value={{ hideNav, setHideNav }}>
      <div style={{ minHeight:'100vh',background:pageBg,display:'flex',flexDirection:'column' }}>

        {/* Drawer backdrop */}
        {!isDesktop && showDrawer && (
          <div onClick={()=>setShowDrawer(false)} style={{ position:'fixed',inset:0,zIndex:80,background:'rgba(0,0,0,0.5)',animation:'fadeIn 0.2s ease' }}/>
        )}

        {/* Notification backdrop (mobile) */}
        {!isDesktop && showNotifs && (
          <div onClick={()=>setShowNotifs(false)} style={{ position:'fixed',inset:0,zIndex:98,background:'rgba(0,0,0,0.2)',animation:'fadeIn 0.2s ease' }}/>
        )}

        {/* Drawer (mobile) */}
        {!isDesktop && (
          <div style={{ position:'fixed',top:0,left:0,bottom:0,width:300,zIndex:90,background:colors.sidebarBg,boxShadow:'4px 0 24px rgba(0,0,0,0.15)',transform:showDrawer?'translateX(0)':'translateX(-100%)',transition:'transform 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
            <LeftSidebar {...sidebarProps} onClose={()=>setShowDrawer(false)}/>
          </div>
        )}

        {/* Header */}
        <header style={{ position:'sticky',top:0,zIndex:40,background:colors.headerBg,borderBottom:`1px solid ${borderCol}`,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)' }}>
          <div style={{ height:52,padding:'0 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8 }}>

            {/* Left: hamburger + logo */}
            <div style={{ display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
              {!isDesktop&&(
                <button onClick={()=>setShowDrawer(true)} style={{ width:36,height:36,borderRadius:9,background:surfaceBg,border:`1.5px solid ${borderCol}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <Menu size={17} color={textSec}/>
                </button>
              )}
              <div style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer' }} onClick={()=>navigate('/')}>
                <div style={{ width:34,height:34,borderRadius:8,overflow:'hidden',flexShrink:0,boxShadow:'0 2px 6px rgba(192,57,43,0.2)' }}>
                  <img src="/announce.png" alt="CSB" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                </div>
                <span style={{ fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:19,color:RED,letterSpacing:'-0.5px',lineHeight:1 }}>CSB</span>
              </div>
              {modMode&&<ModChip isSuperadmin={isSuperadmin}/>}
            </div>

            {/* Right: search + bell + messages (mobile) */}
            <div style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
              <button onClick={onOpenSearch} style={{ width:36,height:36,borderRadius:9,background:surfaceBg,border:`1.5px solid ${borderCol}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <Search size={17} color={textSec}/>
              </button>

              {/* Bell */}
              <div ref={notifRef} style={{ position:'relative' }}>
                <button
                  onClick={()=>setShowNotifs(v=>!v)}
                  style={{ width:36,height:36,borderRadius:9,background:showNotifs?'#FADBD8':surfaceBg,border:`1.5px solid ${showNotifs?'#F5B7B1':borderCol}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',transition:'all 0.15s' }}>
                  <Bell size={17} color={showNotifs?RED:textSec} strokeWidth={showNotifs?2.5:2}/>
                  {unreadCount>0&&(
                    <span style={{ position:'absolute',top:-4,right:-4,minWidth:17,height:17,borderRadius:9,background:RED,color:'white',fontSize:9.5,fontWeight:700,fontFamily:'"Instrument Sans",system-ui',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 3px',border:'2px solid white' }}>
                      {unreadCount>9?'9+':unreadCount}
                    </span>
                  )}
                </button>

                {showNotifs&&isDesktop&&(
                  <div style={{ position:'absolute',right:0,top:'calc(100% + 8px)',zIndex:100,animation:'slideDown 0.18s ease' }}>
                    <NotifPanel
                      notifications={notifications} unreadCount={unreadCount}
                      markAllRead={markAllRead} markRead={markRead}
                      onClose={()=>setShowNotifs(false)} navigate={navigate}
                      dark={dark} cardBg={cardBg} borderCol={borderCol}
                      textPri={textPri} textSec={textSec} textMut={textMut} surfaceBg={surfaceBg}
                    />
                  </div>
                )}
              </div>

              {/* Messages button — header */}
                <button
                  onClick={() => openMessages()}
                  style={{ width:36,height:36,borderRadius:9,background:showMessages?'#FADBD8':surfaceBg,border:`1.5px solid ${showMessages?'#F5B7B1':borderCol}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative',transition:'all 0.15s' }}
                >
                  <MessageSquare size={17} color={showMessages?RED:textSec} strokeWidth={showMessages?2.5:2}/>
                  {dmUnread > 0 && (
                    <span style={{ position:'absolute',top:-4,right:-4,minWidth:17,height:17,borderRadius:9,background:RED,color:'white',fontSize:9.5,fontWeight:700,fontFamily:'"Instrument Sans",system-ui',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 3px',border:'2px solid white' }}>
                      {dmUnread>9?'9+':dmUnread}
                    </span>
                  )}
                </button>
            </div>
          </div>
        </header>

        {/* Mobile notification panel — FIX: slides DOWN from header, not up */}
        {showNotifs&&!isDesktop&&(
          <div style={{ position:'fixed',left:0,right:0,top:52,bottom:0,zIndex:99,display:'flex',flexDirection:'column',animation:'slideDownPanel 0.28s cubic-bezier(0.16,1,0.3,1)' }}>
            <NotifPanel
              notifications={notifications} unreadCount={unreadCount}
              markAllRead={markAllRead} markRead={markRead}
              onClose={()=>setShowNotifs(false)} navigate={navigate}
              dark={dark} cardBg={cardBg} borderCol={borderCol}
              textPri={textPri} textSec={textSec} textMut={textMut} surfaceBg={surfaceBg}
              mobile
            />
          </div>
        )}

        {/* Desktop 3-col layout */}
        {isDesktop ? (
          <div style={{ display:'flex',flex:1,width:'100%',maxWidth:1400,margin:'0 auto' }}>
            <aside className="csb-sidebar-scroll" style={{ width:280,flexShrink:0,position:'sticky',top:52,height:'calc(100vh - 52px)',background:colors.sidebarBg,overflowY:'auto' }}>
              <LeftSidebar {...sidebarProps}/>
            </aside>
            <main style={{ flex:1,minWidth:0,background:pageBg,paddingBottom:32 }}>
              <div style={{ maxWidth:680,margin:'0 auto' }}>{children}</div>
            </main>
            <aside className="csb-sidebar-scroll" style={{ width:280,flexShrink:0,position:'sticky',top:52,height:'calc(100vh - 52px)',background:pageBg,overflowY:'auto',paddingTop:12 }}>
              <div style={{ padding:'0 10px' }}>
                <div style={{ display:'flex',alignItems:'center',gap:7,padding:'4px 4px 10px' }}>
                  <div style={{ width:8,height:8,borderRadius:'50%',background:colors.online,boxShadow:`0 0 0 2px ${colors.online}40`,flexShrink:0 }}/>
                  <span style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:12,color:textSec,textTransform:'uppercase',letterSpacing:0.6 }}>ONLINE</span>
                  <span style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:11,color:textMut }}>· {onlineUsers.length+(appearOffline?0:1)}</span>
                </div>
                <OnlineRow avatar={profile?.avatar_url||dicebearUrl(profile?.display_name)} name={profile?.display_name}
                  sublabel={appearOffline?'Appearing offline':'Online'} sublabelColor={appearOffline?textMut:colors.online} dotColor={appearOffline?colors.textMut:colors.online}
                  isSelf dark={dark} colors={colors} textPri={textPri} textMut={textMut} surfaceBg={surfaceBg} pageBg={pageBg}
                  rightSlot={
                    <div ref={selfMenuRef} style={{ position:'relative' }}>
                      <button onClick={()=>setSelfMenuOpen(v=>!v)}
                        style={{ width:28,height:28,borderRadius:7,background:selfMenuOpen?surfaceBg:'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.12s' }}
                        onMouseEnter={e=>e.currentTarget.style.background=surfaceBg}
                        onMouseLeave={e=>{ if(!selfMenuOpen) e.currentTarget.style.background='transparent' }}>
                        <MoreHorizontal size={15} color={textSec}/>
                      </button>
                      {selfMenuOpen&&(
                        <div style={{ position:'absolute',right:0,top:'calc(100% + 4px)',width:190,background:cardBg,borderRadius:10,border:`1px solid ${borderCol}`,boxShadow:'0 6px 20px rgba(0,0,0,0.13)',overflow:'hidden',zIndex:50,animation:'slideDown 0.15s ease' }}>
                          <button onClick={()=>{ toggleAppearOffline(); setSelfMenuOpen(false) }}
                            style={{ width:'100%',display:'flex',alignItems:'center',gap:9,padding:'10px 13px',border:'none',cursor:'pointer',background:'transparent',fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:13,color:textPri,textAlign:'left' }}
                            onMouseEnter={e=>e.currentTarget.style.background=surfaceBg}
                            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            {appearOffline?<><Eye size={14} color={colors.online}/> Show as online</>:<><EyeOff size={14} color={textSec}/> Appear offline</>}
                          </button>
                        </div>
                      )}
                    </div>
                  }
                />
                {onlineUsers.length>0&&<div style={{ height:1,background:dividerCol,margin:'8px 4px' }}/>}
                {onlineUsers.length===0
                  ?<div style={{ padding:'20px 4px',textAlign:'center' }}><p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:13,color:textMut }}>No one else online</p></div>
                  :onlineUsers.map(u=>(
                    <OnlineRow key={u.id} avatar={u.avatar_url||dicebearUrl(u.display_name)} name={u.display_name}
                      sublabel="Online" sublabelColor={colors.online} dotColor={colors.online}
                      dark={dark} colors={colors} textPri={textPri} textMut={textMut} surfaceBg={surfaceBg} pageBg={pageBg}
                      rightSlot={<DMBtn onClick={()=>openMessages(u)} surfaceBg={surfaceBg}/>}
                    />
                  ))
                }
                <p style={{ margin:'16px 4px 0',fontFamily:'"Instrument Sans",system-ui',fontSize:10.5,color:textMut }}>Only active users shown</p>
              </div>
            </aside>
          </div>
        ) : (
          <main style={{ flex:1,maxWidth:680,margin:'0 auto',width:'100%',paddingBottom:hideNav?0:64 }}>
            {children}
          </main>
        )}

        {/* Mobile bottom nav — 4 items, better tap targets */}
        {!isDesktop&&!hideNav&&(
          <nav style={{ position:'fixed',bottom:0,left:0,right:0,zIndex:40,background:colors.navBg,backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',borderTop:`1px solid ${borderCol}`,boxShadow:'0 -1px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ maxWidth:680,margin:'0 auto',height:52,display:'flex',alignItems:'center',paddingBottom:'env(safe-area-inset-bottom)' }}>
              {bottomNavItems.map(({ to, icon: Icon, label, exact }) => (
                <NavLink key={to} to={to} end={exact} style={{ flex:1,textDecoration:'none' }}>
                  {({ isActive }) => (
                    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,padding:'6px 4px',position:'relative' }}>
                      {isActive&&<div style={{ position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:20,height:2.5,borderRadius:2,background:RED }}/>}
                      <div style={{ width:34,height:26,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:7,background:isActive?'#FADBD8':'transparent',transition:'background 0.15s' }}>
                        <Icon size={19} color={isActive?RED:textSec} strokeWidth={isActive?2.5:2}/>
                      </div>
                      <span style={{ fontSize:9.5,fontWeight:isActive?700:500,color:isActive?RED:textSec,fontFamily:'"Instrument Sans",system-ui' }}>{label}</span>
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
        )}

        {showSaved     && <SavedPostsPage onClose={()=>setShowSaved(false)}/>}
        {showLiked     && <LikedPostsPage onClose={()=>setShowLiked(false)}/>}
        {showAbout     && <AboutModal     onClose={()=>setShowAbout(false)}/>}
        {showDashboard && <AdminDashboard onClose={()=>setShowDashboard(false)}/>}

        {showOwnProfile && profile?.id && (
          <UserProfilePage
            userId={profile.id}
            onClose={() => setShowOwnProfile(false)}
          />
        )}

        {/* FIX #2: MessagesOverlay height fixed — no longer subtracts header inside modal */}
        {showMessages && (
          <MessagesOverlay
            onClose={() => { setShowMessages(false); setMessagesDMTarget(null) }}
            initialDMTarget={messagesDMTarget}
          />
        )}

        <style>{`
          @keyframes fadeIn         { from{opacity:0}to{opacity:1} }
          @keyframes slideDown      { from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)} }
          @keyframes slideDownPanel { from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)} }
          @keyframes messagesIn     { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
          .csb-sidebar-scroll::-webkit-scrollbar { width:4px; }
          .csb-sidebar-scroll::-webkit-scrollbar-track { background:transparent; }
          .csb-sidebar-scroll::-webkit-scrollbar-thumb { background:#C8CAD0; border-radius:4px; }
          .csb-sidebar-scroll::-webkit-scrollbar-thumb:hover { background:#B0B3B8; }
          .csb-sidebar-scroll { scrollbar-width:thin; scrollbar-color:#C8CAD0 transparent; }
        `}</style>
      </div>
    </NavVisibilityContext.Provider>
  )
}

// ── Messages overlay ──────────────────────────────────────────
// FIX #2: MessagesPage now fills the full overlay (inset:0) correctly.
// We pass asModal=true so MessagesPage skips its own height calculation
// and uses 100% of the container instead.
function MessagesOverlay({ onClose, initialDMTarget }) {
  const { user, profile } = useAuth()

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:70,background:'rgba(0,0,0,0.4)',animation:'fadeIn 0.18s ease' }}/>
      <div style={{
        position:'fixed',inset:0,zIndex:71,
        maxWidth:680,margin:'0 auto',
        display:'flex',flexDirection:'column',
        animation:'messagesIn 0.25s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* FIX #1: initialDMTarget forwarded correctly as a full partner object */}
        <MessagesPage
          asModal
          onClose={onClose}
          initialDMTarget={initialDMTarget}
        />
      </div>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────
function OnlineRow({ avatar, name, sublabel, sublabelColor, dotColor, isSelf, dark, colors, textPri, textMut, surfaceBg, pageBg, rightSlot }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ display:'flex',alignItems:'center',gap:10,padding:'7px 6px',borderRadius:10,marginBottom:2,background:hovered?surfaceBg:'transparent',transition:'background 0.12s' }}
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
      <div style={{ position:'relative',flexShrink:0 }}>
        <img src={avatar} style={{ width:36,height:36,borderRadius:10,objectFit:'cover',display:'block' }} alt=""/>
        <div style={{ position:'absolute',bottom:-1,right:-1,width:11,height:11,borderRadius:'50%',background:dotColor,border:`2px solid ${hovered?surfaceBg:pageBg}` }}/>
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,color:textPri,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
          {name}{isSelf&&<span style={{ fontWeight:500,fontSize:10.5,color:textMut,marginLeft:5 }}>You</span>}
        </p>
        <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:10.5,fontWeight:600,color:sublabelColor }}>{sublabel}</p>
      </div>
      {rightSlot}
    </div>
  )
}

function DMBtn({ onClick, surfaceBg }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick}
      style={{ width:30,height:30,borderRadius:8,background:hovered?'#FADBD8':surfaceBg,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background 0.12s' }}
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
      <Send size={13} color={hovered?RED:'#8A8D91'}/>
    </button>
  )
}

function SidebarBtn({ icon, label, onClick, danger, dark, surfaceBg, textPri }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{ width:'100%',display:'flex',alignItems:'center',gap:11,padding:'8px 10px',border:'none',cursor:'pointer',textAlign:'left',background:hovered?(danger?(dark?'rgba(192,57,43,0.12)':'#FFF5F5'):'rgba(0,0,0,0.05)'):'transparent',color:danger?RED:textPri,fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:14,borderRadius:10,transition:'background 0.12s',marginBottom:2 }}>
      <div style={{ width:32,height:32,borderRadius:9,flexShrink:0,background:hovered?(danger?(dark?'rgba(192,57,43,0.2)':'#FADBD8'):(dark?'rgba(255,255,255,0.08)':'#D8DADF')):surfaceBg,display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.12s' }}>
        {icon}
      </div>
      {label}
    </button>
  )
}

function NotifPanel({ notifications, unreadCount, markAllRead, markRead, onClose, navigate, dark, cardBg, borderCol, textPri, textSec, textMut, surfaceBg, mobile }) {
  return (
    <div style={{ background:cardBg,borderRadius:mobile?'0':13,border:mobile?'none':`1px solid ${borderCol}`,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',overflow:'hidden',width:mobile?'100%':310,height:mobile?'100%':undefined,maxHeight:mobile?'100%':380,display:'flex',flexDirection:'column' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:mobile?'14px 16px 12px':'11px 14px 10px',borderBottom:`1px solid ${borderCol}`,flexShrink:0 }}>
        <div style={{ display:'flex',alignItems:'center',gap:7 }}>
          <Bell size={15} color={RED} strokeWidth={2.5}/>
          <span style={{ fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:700,fontSize:14,color:textPri }}>Notifications</span>
          {unreadCount>0&&<span style={{ background:RED,color:'white',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:10,padding:'1px 6px',borderRadius:10 }}>{unreadCount}</span>}
        </div>
        <div style={{ display:'flex',gap:5 }}>
          {unreadCount>0&&<button onClick={markAllRead} style={{ background:surfaceBg,border:'none',cursor:'pointer',color:textSec,fontSize:11,fontWeight:600,fontFamily:'"Instrument Sans",system-ui',display:'flex',alignItems:'center',gap:3,padding:'4px 9px',borderRadius:6 }}><Check size={10}/> All read</button>}
          <button onClick={onClose} style={{ width:24,height:24,borderRadius:6,background:surfaceBg,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={12} color={textSec}/></button>
        </div>
      </div>
      <div style={{ overflowY:'auto',flex:1 }}>
        {notifications.length===0
          ?<div style={{ padding:'32px 16px',textAlign:'center',color:textSec,fontSize:13,fontFamily:'"Instrument Sans",system-ui' }}><div style={{ fontSize:28,marginBottom:6 }}>🔔</div>You're all caught up!</div>
          :notifications.map(n=><NotifItem key={n.id} notif={n} onRead={markRead} onClose={onClose} navigate={navigate} dark={dark} cardBg={cardBg} borderCol={borderCol} textPri={textPri} textSec={textSec} surfaceBg={surfaceBg}/>)
        }
      </div>
      {mobile&&<div style={{ height:'env(safe-area-inset-bottom)',flexShrink:0 }}/>}
    </div>
  )
}

function NotifItem({ notif, onRead, onClose, navigate, cardBg, textPri, textSec, surfaceBg }) {
  const [hovered, setHovered] = useState(false)
  const icons = {
    announcement:'📢', tag:'🏷️', whisper:'💬', system_dm:'📨',
    like:'❤️', comment:'💬', deadline:'📅', reminder:'🔔',
    material:'📁', mute:'🔇', ban:'🚫', role:'🛡️',
  }
  function handleClick() {
    onRead(notif.id)
    onClose()
    if (notif.post_id) navigate(`/?post=${notif.post_id}`)
  }
  return (
    <button onClick={handleClick} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{ width:'100%',display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',border:'none',cursor:'pointer',textAlign:'left',background:hovered?surfaceBg:notif.is_read?cardBg:'rgba(192,57,43,0.06)',borderLeft:notif.is_read?'3px solid transparent':`3px solid ${RED}`,transition:'background 0.12s' }}>
      <div style={{ width:32,height:32,borderRadius:9,flexShrink:0,background:notif.is_read?surfaceBg:'rgba(192,57,43,0.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15 }}>
        {icons[notif.type]||'🔔'}
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <p style={{ margin:0,fontSize:12.5,color:textPri,fontFamily:'"Instrument Sans",system-ui',lineHeight:1.4,fontWeight:notif.is_read?400:600 }}>{notif.message}</p>
        <p style={{ margin:'2px 0 0',fontSize:10.5,color:textSec,fontFamily:'"Instrument Sans",system-ui' }}>{formatDistanceToNow(new Date(notif.created_at),{addSuffix:true})}</p>
      </div>
      {!notif.is_read&&<div style={{ width:7,height:7,borderRadius:'50%',background:RED,flexShrink:0,marginTop:7 }}/>}
    </button>
  )
}
