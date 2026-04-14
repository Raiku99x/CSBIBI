import { useSavedPosts } from '../contexts/SavedPostsContext'
import { useRole } from '../hooks/useRole'
import { useModMode } from '../hooks/useModMode'
import { useMuteGate } from '../hooks/useMuteGate'
import { useDarkMode } from '../contexts/DarkModeContext'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { formatDistanceToNow, format, isPast } from 'date-fns'
import {
  FileText, Download, BookOpen, Megaphone,
  Heart, MessageCircle, Share2, X, ChevronLeft, ChevronRight,
  MoreHorizontal, Bookmark, Bell, Clock, AlertCircle, Pencil, Trash2,
  Link, Check, Shield, Crown, Pin, Lock, BadgeCheck,
  MessageCircleMore, Users, Globe, VolumeX
} from 'lucide-react'

import EditPostModal from './EditPostModal'
import CommentsSheet from './CommentsSheet'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','922B21','C0392B']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

const RED  = '#C0392B'
const BLUE = '#1A5276'

function formatTime12(timeStr) {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function getBanner(subType, postType) {
  if (subType === 'deadline')      return { bg: 'linear-gradient(90deg,#B03A2E,#922B21)',    label: 'DEADLINE',      icon: <Clock size={12} color="white" /> }
  if (subType === 'reminder')      return { bg: `linear-gradient(90deg,${RED},#A93226)`,      label: 'REMINDER',      icon: <Bell size={12} color="white" /> }
  if (subType === 'material')      return { bg: `linear-gradient(90deg,${BLUE},#154360)`,     label: 'MATERIAL',      icon: <FileText size={12} color="white" /> }
  if (subType === 'announcement')  return { bg: `linear-gradient(90deg,${RED},${BLUE})`,      label: 'ANNOUNCEMENT',  icon: <Megaphone size={12} color="white" /> }
  if (postType === 'announcement') return { bg: `linear-gradient(90deg,${RED},${BLUE})`,      label: 'ANNOUNCEMENT',  icon: <Megaphone size={12} color="white" /> }
  return null
}

function getQuoteBlockAccent(subType, postType) {
  if (subType === 'deadline')      return '#922B21'
  if (subType === 'reminder')      return '#C0392B'
  if (subType === 'announcement')  return '#C0392B'
  if (postType === 'announcement') return '#C0392B'
  if (subType === 'material')      return '#1A5276'
  return '#65676B'
}

function parsePhotos(photo_url) {
  if (!photo_url) return []
  try { const p = JSON.parse(photo_url); return Array.isArray(p) ? p : [photo_url] }
  catch { return [photo_url] }
}

function parseFiles(file_url, file_name) {
  if (!file_url) return []
  try {
    const urls = JSON.parse(file_url)
    const names = file_name ? JSON.parse(file_name) : []
    if (Array.isArray(urls)) return urls.map((url, i) => ({ url, name: names[i] || 'Attachment' }))
    return [{ url: file_url, name: file_name || 'Attachment' }]
  } catch { return [{ url: file_url, name: file_name || 'Attachment' }] }
}

function parseQuoted(raw) {
  if (!raw) return null
  try {
    const p = JSON.parse(raw)
    if (p.from || p.message) return p
    return null
  } catch { return { from: '', message: raw } }
}

function buildMessengerText(post) {
  const subType   = post.sub_type
  const postType  = post.post_type
  const caption   = post.caption || ''
  const author    = post.profiles?.display_name || 'Unknown'
  const subject   = post.subjects?.name || null
  const annType   = post.announcement_type || null
  const dueDate   = post.due_date || null
  const dueTime   = post.due_time || null
  const shortId   = post.short_id || post.id.replace(/-/g, '').slice(0, 4)
  const shareUrl  = `${window.location.origin}/p/${shortId}`
  const photos    = parsePhotos(post.photo_url)
  const files     = parseFiles(post.file_url, post.file_name)
  const quoted    = parseQuoted(post.quoted_message)

  const isPastDue = dueDate && isPast(
    (() => {
      const [y, m, d] = dueDate.split('-').map(Number)
      const dt = new Date(y, m - 1, d)
      if (dueTime) { const [h, min] = dueTime.split(':').map(Number); dt.setHours(h, min, 0, 0) }
      else dt.setHours(23, 59, 0, 0)
      return dt
    })()
  )

const lines = []
if (subType === 'deadline')             lines.push(`[🚨 𝗗𝗘𝗔𝗗𝗟𝗜𝗡𝗘]${subject ? ` — ${subject}` : ''}`)
else if (subType === 'reminder')        lines.push(`[🔔 𝗥𝗘𝗠𝗜𝗡𝗗𝗘𝗥]${subject ? ` — ${subject}` : ''}`)
else if (subType === 'material')        lines.push(`[📁 𝗠𝗔𝗧𝗘𝗥𝗜𝗔𝗟]${subject ? ` — ${subject}` : ''}`)
else if (subType === 'announcement' || postType === 'announcement') lines.push(`[📢 𝗔𝗡𝗡𝗢𝗨𝗡𝗖𝗘𝗠𝗘𝗡𝗧]${subject ? ` — ${subject}` : ''}`)
else                                    lines.push(`[💬 𝗦𝗧𝗔𝗧𝗨𝗦] — ${author}`)
  
if (annType) lines.push(`Task: ${annType}`)
  if (dueDate) {
    const [y, mo, d] = dueDate.split('-').map(Number)
    const formatted = format(new Date(y, mo - 1, d), 'MMM d, yyyy')
    const timeStr = dueTime ? ` · ${formatTime12(dueTime)}` : ''
    lines.push(`Due: ${formatted}${timeStr}`)
  }
  if (isPastDue) lines.push('PAST DUE')
  if (caption.trim()) { lines.push(''); lines.push(caption.trim()) }
  if (quoted && quoted.message) {
    const divider = '─'.repeat(14)
    lines.push(divider)
    lines.push(`𝗙𝗥𝗢𝗠 ${quoted.from ? quoted.from : 'quoted message'}:`)
    lines.push(`"${quoted.message}"`)
    lines.push(divider)
  }
  if (photos.length > 0) { lines.push(''); lines.push(`${photos.length} photo${photos.length !== 1 ? 's' : ''} attached`) }
  if (files.length > 0) { lines.push(''); lines.push(`${files.length} file${files.length !== 1 ? 's' : ''}:`); files.forEach(f => lines.push(`   • ${f.name}`)) }
  if (subType !== 'status' && postType !== 'status') { lines.push(''); lines.push(`By: ${author}`) }
  lines.push(`Link: ${shareUrl.replace('https://', '')}`)
  return lines.join('\n')
}

function ShareOption({ icon, label, sublabel, onClick, success }) {
  const [hovered, setHovered] = useState(false)
  const { colors } = useDarkMode()
  return (
    <button onClick={onClick}
      onMouseEnter={() => { if (!isTouchDevice) setHovered(true) }}
      onMouseLeave={() => { if (!isTouchDevice) setHovered(false) }}
      style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 12px',border:'none',cursor:'pointer',background:hovered?(success?'rgba(22,163,74,0.08)':colors.surface):'transparent',borderRadius:8,textAlign:'left',transition:'background 0.1s' }}>
      <div style={{ width:34,height:34,borderRadius:9,background:success?'rgba(22,163,74,0.12)':colors.surface,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        {icon}
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,color:success?'#16a34a':colors.textPri }}>{label}</p>
        {sublabel && <p style={{ margin:'1px 0 0',fontFamily:'"Instrument Sans",system-ui',fontSize:11,color:colors.textSec }}>{sublabel}</p>}
      </div>
      {success && <Check size={14} color="#16a34a"/>}
    </button>
  )
}

function ShareSheet({ post, onClose, anchorRef }) {
  const [copiedLink, setCopiedLink]           = useState(false)
  const [copiedMessenger, setCopiedMessenger] = useState(false)
  const { colors } = useDarkMode()
  const sheetRef = useRef()
  const shareUrl = `${window.location.origin}/p/${post.short_id}`

  useEffect(() => {
    function h(e) {
      if (sheetRef.current && !sheetRef.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  async function handleNativeShare() {
    try { await navigator.share({ title:'CSB Post', text:post.caption||'', url:shareUrl }); onClose() } catch {}
  }

  async function handleCopyLink() {
    try { await navigator.clipboard.writeText(shareUrl) } catch {
      const ta = document.createElement('textarea'); ta.value = shareUrl
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopiedLink(true)
    setTimeout(() => { setCopiedLink(false); onClose() }, 1400)
  }

  async function handleCopyMessenger() {
    const text = buildMessengerText(post)
    try { await navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement('textarea'); ta.value = text
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopiedMessenger(true)
    toast.success('Copied! Paste it in Messenger', { duration: 2500 })
    setTimeout(() => { setCopiedMessenger(false); onClose() }, 1600)
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  return (
    <div ref={sheetRef} style={{
      position: 'absolute',
      bottom: 'calc(100% + 4px)',
      ...(isMobile
        ? { right: 0, left: 'auto', transform: 'none' }
        : { left: '50%', transform: 'translateX(-50%)' }
      ),
      width: 230,
      background: colors.cardBg,
      borderRadius: 10,
      border: `1px solid ${colors.border}`,
      boxShadow: '0 -6px 20px rgba(0,0,0,0.15)',
      overflow: 'hidden',
      zIndex: 30,
      animation: isMobile ? 'shareDropUp 0.15s ease' : 'shareDropUpDesktop 0.15s ease',
    }}>
      <div style={{ padding:'11px 14px 8px',borderBottom:`1px solid ${colors.border}`,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <span style={{ fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:700,fontSize:13,color:colors.textPri }}>Share post</span>
        <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',display:'flex',padding:2 }}>
          <X size={13} color={colors.textSec} />
        </button>
      </div>

      <div style={{ padding:6,display:'flex',flexDirection:'column',gap:2 }}>
        {!!navigator.share && (
          <ShareOption icon={<Share2 size={16} color={colors.textSec}/>} label="More options..." onClick={handleNativeShare}/>
        )}
        <ShareOption
          icon={copiedLink ? <Check size={16} color="#16a34a"/> : <Link size={16} color={colors.textSec}/>}
          label={copiedLink ? 'Link copied!' : 'Copy link'}
          sublabel="Share anywhere"
          onClick={handleCopyLink}
          success={copiedLink}
        />
        <div style={{ height:1,background:colors.border,margin:'2px 0' }}/>
        <ShareOption
          icon={copiedMessenger ? <Check size={16} color="#16a34a"/> : <MessageCircleMore size={16} color="#0084FF"/>}
          label={copiedMessenger ? 'Copied!' : 'Copy for Messenger'}
          sublabel="Formatted text + link"
          onClick={handleCopyMessenger}
          success={copiedMessenger}
        />
      </div>
    </div>
  )
}

function Lightbox({ photos, initialIndex, onClose }) {
  const [activeIdx, setActiveIdx] = useState(initialIndex)
  const touchStartX = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setActiveIdx(i => Math.min(i+1, photos.length-1))
      if (e.key === 'ArrowLeft')  setActiveIdx(i => Math.max(i-1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photos.length, onClose])

  function handleTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      if (diff > 0) setActiveIdx(i => Math.min(i+1, photos.length-1))
      else          setActiveIdx(i => Math.max(i-1, 0))
    }
    touchStartX.current = null
  }

  return (
    <div
      style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.96)',display:'flex',alignItems:'center',justifyContent:'center' }}
      onClick={e => { if(e.target===e.currentTarget) onClose() }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button onClick={onClose} style={{ position:'absolute',top:14,right:14,width:38,height:38,borderRadius:9,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.18)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={17} color="white"/></button>
      {photos.length > 1 && (
        <div style={{ position:'absolute',top:18,left:'50%',transform:'translateX(-50%)',background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.18)',color:'white',fontSize:12,fontWeight:600,fontFamily:'"Instrument Sans",system-ui',padding:'4px 12px',borderRadius:20 }}>
          {activeIdx+1}/{photos.length}
        </div>
      )}
      <img
        src={photos[activeIdx]}
        alt={`Photo ${activeIdx + 1} of ${photos.length}`}
        style={{ maxWidth:'92vw',maxHeight:'88vh',objectFit:'contain',borderRadius:8,userSelect:'none',WebkitUserSelect:'none' }}
      />
      {photos.length > 1 && <>
        <button onClick={() => setActiveIdx(i=>Math.max(i-1,0))} disabled={activeIdx===0} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',width:40,height:40,borderRadius:9,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.18)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:activeIdx===0?0.3:1 }}><ChevronLeft size={19} color="white"/></button>
        <button onClick={() => setActiveIdx(i=>Math.min(i+1,photos.length-1))} disabled={activeIdx===photos.length-1} style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',width:40,height:40,borderRadius:9,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.18)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:activeIdx===photos.length-1?0.3:1 }}><ChevronRight size={19} color="white"/></button>
      </>}
    </div>
  )
}

function PhotoGrid({ photos, onPhotoClick }) {
  const display = photos.slice(0, 5)
  const remaining = photos.length - 5
  const wrap = (url, i, style={}) => (
    <div key={i} onClick={() => onPhotoClick(i)} style={{ overflow:'hidden',cursor:'pointer',position:'relative',...style }}
      onMouseEnter={e=>{const img=e.currentTarget.querySelector('img');if(img)img.style.transform='scale(1.03)'}}
      onMouseLeave={e=>{const img=e.currentTarget.querySelector('img');if(img)img.style.transform='scale(1)'}}>
      <img src={url} alt="" loading="lazy" style={{ width:'100%',height:'100%',objectFit:'cover',display:'block',transition:'transform 0.25s ease' }}/>
      {i===4&&remaining>0&&<div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.52)',display:'flex',alignItems:'center',justifyContent:'center' }}><span style={{ color:'white',fontSize:24,fontWeight:800,fontFamily:'"Bricolage Grotesque",system-ui' }}>+{remaining}</span></div>}
    </div>
  )
  const count = display.length
  if (count===1) return <div onClick={()=>onPhotoClick(0)} style={{cursor:'pointer',overflow:'hidden',maxHeight:380}} onMouseEnter={e=>{const img=e.currentTarget.querySelector('img');if(img)img.style.transform='scale(1.02)'}} onMouseLeave={e=>{const img=e.currentTarget.querySelector('img');if(img)img.style.transform='scale(1)'}}><img src={display[0]} style={{width:'100%',maxHeight:380,objectFit:'cover',display:'block',transition:'transform 0.25s ease'}} loading="lazy" alt=""/></div>
  if (count===2) return <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,height:260}}>{display.map((u,i)=>wrap(u,i))}</div>
  if (count===3) return <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gridTemplateRows:'1fr 1fr',gap:2,height:260}}>{wrap(display[0],0,{gridRow:'1/3'})}{wrap(display[1],1)}{wrap(display[2],2)}</div>
  if (count===4) return <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',gap:2,height:260}}>{display.map((u,i)=>wrap(u,i))}</div>
  return <div style={{display:'flex',flexDirection:'column',gap:2}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,height:200}}>{display.slice(0,2).map((u,i)=>wrap(u,i))}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:2,height:130}}>{display.slice(2,5).map((u,i)=>wrap(u,i+2))}</div></div>
}

function QuotedMessageBlock({ from, message, subType, postType, colors }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = message.length > 180
  const displayText = isLong && !expanded ? message.slice(0, 180) + '...' : message
  const accentColor = getQuoteBlockAccent(subType, postType)
  return (
    <div style={{ margin:'8px 0 4px',border:`1px solid ${colors.border}`,borderLeft:`3px solid ${accentColor}`,borderRadius:'0 8px 8px 0',overflow:'hidden',background:'transparent' }}>
      <div style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 4px 5px',borderBottom:`1px solid ${colors.border}` }}>
        <div style={{ width:18,height:18,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/>
          </svg>
        </div>
        <span style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:12,color:accentColor }}>
          {from ? `From ${from}` : 'Quoted message'}
        </span>
        <span style={{ marginLeft:'auto',fontFamily:'"Instrument Sans",system-ui',fontSize:10.5,color:colors.textMut,fontStyle:'italic',paddingRight:4 }}>forwarded</span>
      </div>
      <div style={{ padding:'7px 4px 8px' }}>
        <div style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:13.5,color:colors.textPri,lineHeight:1.55,whiteSpace:'pre-wrap',wordBreak:'break-word' }}>
          {displayText}
          {isLong && (
            <button onClick={() => setExpanded(e => !e)} style={{ background:'none',border:'none',cursor:'pointer',color:accentColor,fontWeight:700,fontSize:13,fontFamily:'"Instrument Sans",system-ui',marginLeft:4,padding:0,verticalAlign:'baseline' }}>
              {expanded ? 'See less' : 'See more'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function GroupMembersModal({ memberIds, onClose, colors }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewingUserId, setViewingUserId] = useState(null)  // ADD THIS
  const modalRef = useRef()

  return (
    <div style={{ position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}>
      <div ref={modalRef} style={{ background:colors.cardBg,borderRadius:14,width:'100%',maxWidth:300,boxShadow:'0 12px 36px rgba(0,0,0,0.18)',overflow:'hidden',animation:'expandIn 0.16s ease' }}>
        {/* header stays the same */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 14px 10px',borderBottom:`1px solid ${colors.border}` }}>
          <div style={{ display:'flex',alignItems:'center',gap:7 }}>
            <Users size={14} color="#7C3AED"/>
            <span style={{ fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:14,color:colors.textPri }}>Group Members</span>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',display:'flex',padding:3,borderRadius:6 }}>
            <X size={14} color={colors.textSec}/>
          </button>
        </div>

        {/* privacy tip stays the same */}
        <div style={{ margin:'0 10px 6px',padding:'5px 9px',background:'#EDE9FE',borderRadius:7,display:'flex',alignItems:'center',gap:5 }}>
          <Lock size={10} color="#7C3AED" style={{ flexShrink:0 }}/>
          <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:10,color:'#5B21B6',lineHeight:1.3 }}>
            Only you and selected members can see this post.
          </p>
        </div>

        <div style={{ padding:'6px 0',maxHeight:260,overflowY:'auto' }}>
          {loading ? (
            <div style={{ padding:'20px 0',textAlign:'center' }}>
              <div style={{ width:18,height:18,borderRadius:'50%',border:'2.5px solid #DDD6FE',borderTopColor:'#7C3AED',animation:'spin 0.7s linear infinite',margin:'0 auto' }}/>
            </div>
          ) : members.length === 0 ? (
            <p style={{ margin:0,padding:'16px 14px',fontFamily:'"Instrument Sans",system-ui',fontSize:13,color:colors.textSec,textAlign:'center' }}>No members found</p>
          ) : members.map(m => (
            <div key={m.id}
              onClick={() => setViewingUserId(m.id)}   // ADD THIS
              style={{ display:'flex',alignItems:'center',gap:10,padding:'9px 14px',cursor:'pointer',transition:'background 0.1s' }}  // ADD cursor + transition
              onMouseEnter={e => e.currentTarget.style.background = colors.surface}   // ADD THIS
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}   // ADD THIS
            >
              <img src={m.avatar_url||dicebearUrl(m.display_name)} style={{ width:34,height:34,borderRadius:'50%',objectFit:'cover',flexShrink:0,border:`1.5px solid ${colors.border}` }} alt=""/>
              <span style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:13.5,color:colors.textPri }}>{m.display_name}</span>
            </div>
          ))}
        </div>
      </div>

      {viewingUserId && (
        <UserProfilePage
          userId={viewingUserId}
          onClose={() => setViewingUserId(null)}
        />
      )}
    </div>
  )
}

export default function PostCard({ post, currentUserId, subjects = [], profile, onUserClick, onUpdated }) {  const { colors } = useDarkMode()
  const [liked, setLiked]             = useState(false)
  const [likeCount, setLikeCount]     = useState(0)
  const [likeAvatars, setLikeAvatars] = useState([])
  const [liking, setLiking]           = useState(false)
  const [commentCount, setCommentCount] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const { isSaved, toggleSaved }      = useSavedPosts()
  const saved                         = isSaved(post.id)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [expanded, setExpanded]       = useState(false)
  const [showMenu, setShowMenu]       = useState(false)
  const [showEdit, setShowEdit]       = useState(false)
  const [showShare, setShowShare]     = useState(false)
  const [deleted, setDeleted]         = useState(false)
  const [postData, setPostData]       = useState(post)
  useEffect(() => { setPostData(post) }, [post.is_pinned, post.pin_until, post.is_locked, post.is_official])
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showPinPicker, setShowPinPicker] = useState(false)
  const [pinDays, setPinDays] = useState('7')
  const [showUnpinWarning, setShowUnpinWarning] = useState(false)
  const [existingPin, setExistingPin] = useState(null)
  const menuRef  = useRef(null)
  const shareRef = useRef(null)

  const { isModerator, isSuperadmin } = useRole()
  const { modMode } = useModMode()
  const { effectivelyMuted, getMuteMessage } = useMuteGate()
  const canModerate = (isModerator || isSuperadmin) && modMode

  const isGroupPost = postData.visibility === 'group'
  const groupMemberIds = postData.group_members || []
  const groupCount = groupMemberIds.length

  async function handleDelete() {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postData.id)
      if (error) throw error
      setDeleted(true)
      toast.success('Post deleted')
    } catch (err) { toast.error(err.message || 'Failed to delete') }
  }

  async function handleModDelete() {
    if (!window.confirm(`Delete this post by ${postData.profiles?.display_name}? This cannot be undone.`)) return
    try {
      await supabase.from('audit_logs').insert({ actor_id: currentUserId, action:'delete_post', target_type:'post', target_id:postData.id, metadata:{ author_id:postData.author_id, caption:postData.caption?.slice(0,100) } })
      const { error } = await supabase.from('posts').delete().eq('id', postData.id)
      if (error) throw error
      setDeleted(true)
      toast.success('Post removed by mod')
    } catch (err) { toast.error(err.message || 'Failed to delete') }
  }

  async function handleTogglePin() {
    try {
      const next = !postData.is_pinned
      if (next) { setShowPinPicker(true); return }
      await supabase.from('posts').update({ is_pinned: false, pin_until: null }).eq('id', postData.id)
      await supabase.from('audit_logs').insert({ actor_id: currentUserId, action: 'unpin_post', target_type: 'post', target_id: postData.id })
      const updated = { ...postData, is_pinned: false, pin_until: null }
      setPostData(updated)
      onUpdated?.(updated)
      toast.success('Post unpinned')
    } catch (err) { toast.error(err.message) }
  }

  async function handleToggleLock() {
    try {
      const next = !postData.is_locked
      await supabase.from('posts').update({ is_locked: next }).eq('id', postData.id)
      await supabase.from('audit_logs').insert({ actor_id:currentUserId, action:next?'lock_post':'unlock_post', target_type:'post', target_id:postData.id })
      setPostData(p => ({ ...p, is_locked: next }))
      toast.success(next ? 'Comments locked' : 'Comments unlocked')
    } catch (err) { toast.error(err.message) }
  }

  async function handleToggleOfficial() {
    try {
      const next = !postData.is_official
      await supabase.from('posts').update({ is_official: next }).eq('id', postData.id)
      setPostData(p => ({ ...p, is_official: next }))
      toast.success(next ? 'Marked as official' : 'Official mark removed')
    } catch (err) { toast.error(err.message) }
  }

async function confirmPin() {
    const { data: alreadyPinned } = await supabase
      .from('posts')
      .select('id, caption')
      .eq('is_pinned', true)
      .neq('id', postData.id)
      .limit(1)
      .single()

    if (alreadyPinned) {
      setExistingPin(alreadyPinned)
      setShowUnpinWarning(true)
      return
    }
    await doPin()
  }

  async function doPin() {
    const pinUntil = new Date(Date.now() + Number(pinDays) * 86400000).toISOString()
    if (existingPin) {
      await supabase.from('posts').update({ is_pinned: false, pin_until: null }).eq('id', existingPin.id)
      onUpdated?.({ id: existingPin.id, is_pinned: false, pin_until: null })
      setExistingPin(null)
    }
    await supabase.from('posts').update({ is_pinned: true, pin_until: pinUntil }).eq('id', postData.id)
    await supabase.from('audit_logs').insert({ actor_id: currentUserId, action: 'pin_post', target_type: 'post', target_id: postData.id })
    const updated = { ...postData, is_pinned: true, pin_until: pinUntil }
    setPostData(updated)
    onUpdated?.(updated)
    setShowPinPicker(false)
    setShowUnpinWarning(false)
    toast.success(`Post pinned for ${pinDays} day${pinDays !== '1' ? 's' : ''}`)
  }
  
  async function handleLike() {
    if (liking) return
    setLiking(true)
    const nowLiked = !liked
    setLiked(nowLiked)
    setLikeCount(c => nowLiked ? c + 1 : Math.max(0, c - 1))
    try {
      if (nowLiked) {
        await supabase.from('likes').insert({ post_id: postData.id, user_id: currentUserId })
        if (postData.author_id && postData.author_id !== currentUserId) {
          const { count: totalLikes } = await supabase.from('likes').select('id', { count:'exact', head:true }).eq('post_id', postData.id)
          const likerName = profile?.display_name || 'Someone'
          const countSuffix = totalLikes > 1 ? ` (${totalLikes} likes total)` : ''
          await supabase.from('notifications').delete().eq('user_id', postData.author_id).eq('post_id', postData.id).eq('type', 'like')
          await supabase.from('notifications').insert({ user_id:postData.author_id, post_id:postData.id, type:'like', message:`${likerName} liked your post "${postData.caption?.slice(0,40)||'No caption'}..."${countSuffix}`, is_read:false })
        }
      } else {
        await supabase.from('likes').delete().eq('post_id', postData.id).eq('user_id', currentUserId)
        if (postData.author_id && postData.author_id !== currentUserId) {
          await supabase.from('notifications').delete()
            .eq('user_id', postData.author_id).eq('post_id', postData.id).eq('type', 'like')
        }
      }
      const { data } = await supabase.from('likes').select('user_id, profiles(avatar_url, display_name)').eq('post_id', postData.id)
      if (data) {
        setLikeCount(data.length)
        setLikeAvatars(data.slice(0, 3).map(l => l.profiles))
        setLiked(data.some(l => l.user_id === currentUserId))
      }
    } catch {
      setLiked(!nowLiked)
      setLikeCount(c => nowLiked ? Math.max(0, c - 1) : c + 1)
    } finally { setLiking(false) }
  }

  useEffect(() => {
    function h(e) {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setShowMenu(false)
      if (shareRef.current && !shareRef.current.contains(e.target)) setShowShare(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    async function fetchCounts() {
      const { data: likesData } = await supabase.from('likes').select('user_id, profiles(avatar_url, display_name)').eq('post_id', post.id)
      if (likesData) {
        setLikeCount(likesData.length)
        setLikeAvatars(likesData.slice(0, 3).map(l => l.profiles))
        setLiked(likesData.some(l => l.user_id === currentUserId))
      }
      const { count } = await supabase.from('comments').select('id', { count:'exact', head:true }).eq('post_id', post.id)
      setCommentCount(count || 0)
    }
    fetchCounts()
    const ch = supabase.channel('likes-' + post.id)
      .on('postgres_changes', { event:'*', schema:'public', table:'likes', filter:`post_id=eq.${post.id}` }, async () => {
        const { data } = await supabase.from('likes').select('user_id, profiles(avatar_url, display_name)').eq('post_id', post.id)
        if (data) {
          setLikeCount(data.length)
          setLikeAvatars(data.slice(0, 3).map(l => l.profiles))
          setLiked(data.some(l => l.user_id === currentUserId))
        }
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [post.id, currentUserId])

  if (deleted) return null

  const photos    = parsePhotos(postData.photo_url)
  const files     = parseFiles(postData.file_url, postData.file_name)
  const quoted    = parseQuoted(postData.quoted_message)
  const caption   = postData.caption || ''
  const isLong    = caption.length > 220
  const displayCaption = isLong && !expanded ? caption.slice(0,220)+'...' : caption

  const banner    = getBanner(postData.sub_type, postData.post_type)
  const isPastDue = postData.due_date && isPast(
    (() => {
      const [y, m, d] = (postData.due_date).split('-').map(Number)
      const dt = new Date(y, m - 1, d)
      if (postData.due_time) { const [h, min] = postData.due_time.split(':').map(Number); dt.setHours(h, min, 0, 0) }
      else dt.setHours(23, 59, 0, 0)
      return dt
    })()
  )
  const isOwn = postData.author_id === currentUserId

  return (
    <>
      <article style={{ background:colors.cardBg, borderTop:`1px solid ${colors.border}`, borderBottom:`1px solid ${colors.border}`, marginBottom:6, position:'relative' }}>

      {postData.is_pinned && (
        <div style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderBottom:`1px solid ${colors.border}`,background:'#FFFBEB',flexWrap:'wrap' }}>
          <Pin size={11} color="#F59E0B"/>
          <span style={{ fontFamily:'"Instrument Sans",system-ui',fontSize:11,fontWeight:700,color:'#F59E0B' }}>Pinned</span>
        </div>
      )}
        
        {banner && (
          <div style={{ background:banner.bg,padding:'7px 12px',display:'flex',alignItems:'center',gap:7 }}>
            <div style={{ width:20,height:20,borderRadius:5,background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>{banner.icon}</div>
            <span style={{ color:'white',fontSize:11,fontWeight:700,fontFamily:'"Instrument Sans",system-ui',letterSpacing:0.7,textTransform:'uppercase',flex:1 }}>
              {banner.label}{postData.announcement_type ? ` · ${postData.announcement_type}` : ''}
            </span>
            {postData.due_date && (
              <div style={{ display:'flex',alignItems:'center',gap:4,background:'rgba(255,255,255,0.18)',padding:'2px 9px',borderRadius:20 }}>
                {isPastDue && <AlertCircle size={10} color="white"/>}
                <span style={{ color:'rgba(255,255,255,0.93)',fontSize:11,fontFamily:'"Instrument Sans",system-ui',fontWeight:600 }}>
                  {isPastDue ? 'Past due · ' : 'Due · '}
                  {format(new Date(postData.due_date + 'T00:00:00'), 'MMM d, yyyy')}
                  {postData.due_time ? ` · ${formatTime12(postData.due_time)}` : ''}
                </span>
              </div>
            )}
            {postData.is_official && (
              <div title="Official" style={{ width:8,height:8,borderRadius:'50%',background:'rgba(255,255,255,0.5)',flexShrink:0 }}/>
            )}
          </div>
        )}

        {/* Header */}
        <div style={{ padding:'10px 12px 8px',display:'flex',alignItems:'center',gap:9 }}>
          <img
            src={postData.profiles?.avatar_url || dicebearUrl(postData.profiles?.display_name)}
            alt={`${postData.profiles?.display_name || 'User'} avatar`}
            onClick={() => onUserClick?.(postData.profiles)}
            style={{ width:40,height:40,borderRadius:10,objectFit:'cover',flexShrink:0,border:`1.5px solid ${colors.border}`,cursor:onUserClick?'pointer':'default' }}
          />
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:'flex',alignItems:'center',gap:5,flexWrap:'wrap' }}>
              <span
                onClick={() => onUserClick?.(postData.profiles)}
                style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:14,color:colors.textPri,cursor:onUserClick?'pointer':'default' }}
              >
                {postData.profiles?.display_name || 'Unknown'}
              </span>
              {canModerate && postData.profiles?.role === 'moderator' && (
                <span style={{ display:'inline-flex',alignItems:'center',gap:3,background:'#EBF5FB',color:BLUE,border:'1px solid #AED6F1',borderRadius:10,padding:'1px 6px',fontSize:10,fontWeight:700,fontFamily:'"Instrument Sans",system-ui' }}>
                  <Shield size={9}/> Mod
                </span>
              )}
              {canModerate && postData.profiles?.role === 'superadmin' && (
                <span style={{ display:'inline-flex',alignItems:'center',gap:3,background:'#FEF9C3',color:'#92400E',border:'1px solid #FDE68A',borderRadius:10,padding:'1px 6px',fontSize:10,fontWeight:700,fontFamily:'"Instrument Sans",system-ui' }}>
                  <Crown size={9}/> Admin
                </span>
              )}
              {postData.subjects && (
                <span style={{ display:'inline-flex',alignItems:'center',gap:3,background:'rgba(26,82,118,0.12)',color:BLUE,fontSize:10.5,fontWeight:700,fontFamily:'"Instrument Sans",system-ui',padding:'2px 7px',borderRadius:20,border:'1px solid rgba(26,82,118,0.2)' }}>
                  <BookOpen size={9}/> {postData.subjects.name}
                </span>
              )}
            </div>

            <div style={{ display:'flex',alignItems:'center',gap:0,flexWrap:'wrap',marginTop:1 }}>
              <span style={{ fontSize:11.5,color:colors.textSec,fontFamily:'"Instrument Sans",system-ui' }}>
                {formatDistanceToNow(new Date(postData.created_at),{addSuffix:true})}
              </span>
              <span style={{ margin:'0 4px',color:colors.border,fontSize:11.5 }}>·</span>
              {isGroupPost ? (
                <span style={{ fontSize:11.5,color:'#7C3AED',fontFamily:'"Instrument Sans",system-ui',display:'inline-flex',alignItems:'center',gap:3 }}>
                  <Users size={10} color="#7C3AED"/>
                  Group ·{' '}
                  <button
                    onClick={() => setShowMembersModal(true)}
                    style={{ background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'"Instrument Sans",system-ui',fontSize:11.5,fontWeight:700,color:'#7C3AED',textDecoration:'underline',textDecorationStyle:'dotted',textUnderlineOffset:2 }}>
                    {groupCount} {groupCount === 1 ? 'member' : 'members'}
                  </button>
                </span>
              ) : (
                <span style={{ fontSize:11.5,color:'#0D7377',fontFamily:'"Instrument Sans",system-ui',display:'inline-flex',alignItems:'center',gap:3,fontWeight:600 }}>
                  <Globe size={10} color="#0D7377"/>
                  Class
                </span>
              )}
              {postData.is_edited && (
                <>
                  <span style={{ margin:'0 4px',color:colors.border,fontSize:11.5 }}>·</span>
                  <span style={{ fontSize:11,color:colors.textMut,fontFamily:'"Instrument Sans",system-ui',fontStyle:'italic' }}>Edited</span>
                </>
              )}
            </div>
          </div>

          {/* Menu */}
          <div ref={menuRef} style={{ position:'relative',flexShrink:0 }}>
            <button
              onClick={() => setShowMenu(v => !v)}
              style={{ width:32,height:32,borderRadius:7,background:showMenu?colors.surface:'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:showMenu?colors.textSec:colors.textMut,transition:'background 0.12s,color 0.12s' }}
              onMouseEnter={e=>{if(!isTouchDevice){e.currentTarget.style.background=colors.surface;e.currentTarget.style.color=colors.textSec}}}
              onMouseLeave={e=>{if(!isTouchDevice&&!showMenu){e.currentTarget.style.background='transparent';e.currentTarget.style.color=colors.textMut}}}>
              <MoreHorizontal size={17}/>
            </button>
            {showMenu && (
              <div style={{ position:'absolute',right:0,top:'calc(100% + 4px)',background:colors.cardBg,borderRadius:10,border:`1px solid ${colors.border}`,boxShadow:'0 6px 20px rgba(0,0,0,0.15)',overflow:'hidden',zIndex:20,minWidth:175,animation:'slideDown 0.15s ease' }}>
                {isOwn && (
                  <>
                    <MenuItem icon={<Pencil size={14} color={colors.textSec}/>} label="Edit post" colors={colors} onClick={() => { setShowMenu(false); setShowEdit(true) }}/>
                    <MenuDivider colors={colors}/>
                    <MenuItem icon={<Trash2 size={14} color={RED}/>} label="Delete post" danger colors={colors} onClick={() => { setShowMenu(false); if(window.confirm('Delete this post?')) handleDelete() }}/>
                  </>
                )}
                {!isOwn && (
                  <MenuItem
                    icon={<Bookmark size={14} color={saved?BLUE:colors.textSec} fill={saved?BLUE:'none'}/>}
                    label={saved ? 'Saved' : 'Save post'} colors={colors}
                    onClick={() => { toggleSaved(postData.id); setShowMenu(false) }}
                  />
                )}
                {canModerate && (
                  <>
                    <MenuDivider colors={colors}/>
                    <div style={{ padding:'6px 10px 2px',fontFamily:'"Instrument Sans",system-ui',fontSize:10,fontWeight:700,color:colors.textSec,textTransform:'uppercase',letterSpacing:0.5 }}>
                      {isSuperadmin ? 'Admin' : 'Mod'}
                    </div>
                    <MenuItem icon={<Pin size={14} color={postData.is_pinned?'#F59E0B':colors.textSec} fill={postData.is_pinned?'#F59E0B':'none'}/>} label={postData.is_pinned?'Unpin post':'Pin post'} colors={colors} onClick={() => { setShowMenu(false); handleTogglePin() }}/>
                    <MenuItem icon={<Lock size={14} color={postData.is_locked?'#64748B':colors.textSec}/>} label={postData.is_locked?'Unlock comments':'Lock comments'} colors={colors} onClick={() => { setShowMenu(false); handleToggleLock() }}/>
                    <MenuItem icon={<BadgeCheck size={14} color={postData.is_official?'#16a34a':colors.textSec}/>} label={postData.is_official?'Remove official':'Mark as official'} colors={colors} onClick={() => { setShowMenu(false); handleToggleOfficial() }}/>
                    {!isOwn && (
                      <>
                        <MenuDivider colors={colors}/>
                        <MenuItem icon={<Trash2 size={14} color={RED}/>} label="Delete (mod)" danger colors={colors} onClick={() => { setShowMenu(false); handleModDelete() }}/>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Caption + Quoted */}
        {(caption || quoted) && (
          <div style={{ padding:`0 12px ${photos.length>0?'8px':'0'}` }}>
            {caption && (
              <div style={{ margin:0,fontSize:14.5,color:colors.textPri,fontFamily:'"Instrument Sans",system-ui',lineHeight:1.55,whiteSpace:'pre-wrap',wordBreak:'break-word' }}>
                {displayCaption}
                {isLong && (
                  <button onClick={()=>setExpanded(e=>!e)} style={{ background:'none',border:'none',cursor:'pointer',color:RED,fontWeight:700,fontSize:14,fontFamily:'"Instrument Sans",system-ui',marginLeft:4,padding:0,verticalAlign:'baseline' }}>
                    {expanded?'See less':'See more'}
                  </button>
                )}
              </div>
            )}
            {quoted && <QuotedMessageBlock from={quoted.from} message={quoted.message} subType={postData.sub_type} postType={postData.post_type} colors={colors}/>}
          </div>
        )}

        {photos.length>0 && <div style={{marginTop:caption||quoted?4:8}}><PhotoGrid photos={photos} onPhotoClick={setLightboxIndex}/></div>}

        {files.length>0 && (
          <div style={{ padding:'10px 12px 0',display:'flex',flexDirection:'column',gap:6 }}>
            {files.map((file,i) => (
              <a key={i} href={file.url} target="_blank" rel="noopener noreferrer"
                style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:9,background:colors.surface,border:`1.5px solid ${colors.border}`,textDecoration:'none',transition:'all 0.15s' }}
                onMouseEnter={e=>{e.currentTarget.style.background=colors.surfaceHov;e.currentTarget.style.borderColor=colors.borderStrong}}
                onMouseLeave={e=>{e.currentTarget.style.background=colors.surface;e.currentTarget.style.borderColor=colors.border}}>
                <div style={{ width:36,height:36,borderRadius:8,background:'rgba(26,82,118,0.12)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(26,82,118,0.2)' }}>
                  <FileText size={15} color={BLUE}/>
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ margin:0,fontSize:13,fontWeight:600,color:colors.textPri,fontFamily:'"Instrument Sans",system-ui',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{file.name}</p>
                  <p style={{ margin:'1px 0 0',fontSize:11,color:colors.textSec,fontFamily:'"Instrument Sans",system-ui' }}>Tap to open</p>
                </div>
                <Download size={13} color={colors.textMut}/>
              </a>
            ))}
          </div>
        )}

        {(likeCount > 0 || commentCount > 0) && (
          <div style={{ padding:'8px 12px 0',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
            {likeCount > 0 ? (
              <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                <div style={{ display:'flex' }}>
                  {likeAvatars.map((a,i) => (
                    <img key={i} src={a?.avatar_url||dicebearUrl(a?.display_name)} alt=""
                      style={{ width:18,height:18,borderRadius:'50%',objectFit:'cover',border:`1.5px solid ${colors.cardBg}`,marginLeft:i>0?-5:0 }}/>
                  ))}
                </div>
                <div style={{ width:18,height:18,borderRadius:'50%',background:`linear-gradient(135deg,${RED},#E74C3C)`,display:'flex',alignItems:'center',justifyContent:'center',marginLeft:likeAvatars.length>0?-5:0,border:`1.5px solid ${colors.cardBg}` }}>
                  <Heart size={9} color="white" fill="white"/>
                </div>
                <span style={{ fontSize:12.5,color:colors.textSec,fontFamily:'"Instrument Sans",system-ui' }}>{likeCount}</span>
              </div>
            ) : <div/>}
            {commentCount > 0 && (
              <button onClick={() => !postData.is_locked && setShowComments(true)}
                style={{ background:'none',border:'none',cursor:postData.is_locked?'default':'pointer',fontFamily:'"Instrument Sans",system-ui',fontSize:12.5,color:postData.is_locked?colors.textMut:colors.textSec,padding:0 }}>
                {commentCount} comment{commentCount !== 1 ? 's' : ''}{postData.is_locked ? ' · locked' : ''}
              </button>
            )}
          </div>
        )}

        <div style={{ height:1,background:colors.border,margin:'8px 12px 0' }}/>

        {/* Actions */}
        <div style={{ display:'flex',alignItems:'center',padding:'0 6px 2px' }}>
          <ActionBtn onClick={handleLike} icon={<Heart size={17} fill={liked?RED:'none'} color={liked?RED:colors.textSec}/>} label="Like" active={liked} activeColor={RED} colors={colors}/>
          <ActionBtn
            onClick={() => {
              if (postData.is_locked) return
              if (effectivelyMuted) {
                toast.error(getMuteMessage() || 'You are muted and cannot comment.', { duration: 3500 })
                return
              }
              setShowComments(true)
            }}
            icon={<MessageCircle size={17} color={postData.is_locked?colors.textMut:effectivelyMuted?colors.textMut:colors.textSec}/>}
            label={postData.is_locked ? 'Locked' : 'Comment'}
            disabled={postData.is_locked} colors={colors}
          />
          <div ref={shareRef} style={{ flex:1,position:'relative' }}>
            <ActionBtn onClick={() => setShowShare(v => !v)} icon={<Share2 size={17} color={showShare?RED:colors.textSec}/>} label="Share" active={showShare} activeColor={RED} noflex colors={colors}/>
            {showShare && <ShareSheet post={postData} onClose={() => setShowShare(false)} anchorRef={shareRef}/>}
          </div>
        </div>
      </article>

      {lightboxIndex!==null && <Lightbox photos={photos} initialIndex={lightboxIndex} onClose={()=>setLightboxIndex(null)}/>}
      {showEdit && (
        <EditPostModal post={postData} profile={postData.profiles} subjects={subjects} onClose={() => setShowEdit(false)} onUpdated={(updated) => { setPostData(updated); setShowEdit(false) }}/>
      )}
      {showComments && !postData.is_locked && (
        <CommentsSheet postId={postData.id} onClose={() => setShowComments(false)} onCommentCountChange={setCommentCount}/>
      )}
      {showMembersModal && (
        <GroupMembersModal memberIds={groupMemberIds} onClose={() => setShowMembersModal(false)} colors={colors}/>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideDown   { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp     { from{opacity:0;transform:translateY(6px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes expandIn    { from{opacity:0;transform:scale(0.96)}      to{opacity:1;transform:scale(1)} }
        @keyframes spin        { from{transform:rotate(0deg)}               to{transform:rotate(360deg)} }
        @keyframes fadeIn      { from{opacity:0}                            to{opacity:1} }
        @keyframes shareDropUp        { from{opacity:0;transform:translateY(6px)}                       to{opacity:1;transform:translateY(0)} }
        @keyframes shareDropUpDesktop { from{opacity:0;transform:translateX(-50%) translateY(6px)}      to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes sheetSlideUp { from{opacity:0;transform:translateX(-50%) translateY(100%)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
      `}}/>
      {showUnpinWarning && (
        <div style={{ position:'fixed',inset:0,zIndex:110,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}>
          <div style={{ background:colors.cardBg,borderRadius:14,width:'100%',maxWidth:290,boxShadow:'0 12px 36px rgba(0,0,0,0.2)',overflow:'hidden',animation:'expandIn 0.16s ease' }}>
            <div style={{ padding:'16px 16px 10px' }}>
              <p style={{ margin:'0 0 6px',fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:15,color:colors.textPri }}>Replace pinned post?</p>
              <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:13,color:colors.textSec,lineHeight:1.5 }}>
                <span style={{ fontWeight:700,color:colors.textPri }}>"{existingPin?.caption?.slice(0,50) || 'Another post'}{existingPin?.caption?.length > 50 ? '…' : ''}"</span>
                {' '}is currently pinned. It will be unpinned automatically.
              </p>
            </div>
            <div style={{ display:'flex',gap:8,padding:'8px 16px 16px' }}>
              <button onClick={() => { setShowUnpinWarning(false); setExistingPin(null) }}
                style={{ flex:1,padding:'10px 0',borderRadius:10,border:`1.5px solid ${colors.border}`,background:'transparent',cursor:'pointer',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,color:colors.textPri }}>
                Cancel
              </button>
              <button onClick={doPin}
                style={{ flex:1,padding:'10px 0',borderRadius:10,border:'none',background:'#F59E0B',cursor:'pointer',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,color:'white' }}>
                Pin this instead
              </button>
            </div>
          </div>
        </div>
      )}
      {showPinPicker && (
        <div style={{ position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}>
          <div style={{ background:colors.cardBg,borderRadius:14,width:'100%',maxWidth:280,boxShadow:'0 12px 36px rgba(0,0,0,0.18)',overflow:'hidden' }}>
            <div style={{ padding:'14px 16px 10px',borderBottom:`1px solid ${colors.border}` }}>
              <p style={{ margin:0,fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:15,color:colors.textPri }}>Pin this post</p>
              <p style={{ margin:'3px 0 0',fontFamily:'"Instrument Sans",system-ui',fontSize:12,color:colors.textSec }}>How many days should it stay pinned?</p>
            </div>
            <div style={{ padding:'14px 16px',display:'flex',gap:6,flexWrap:'wrap' }}>
              {['1','3','7','14','30'].map(d => (
                <button key={d} onClick={() => setPinDays(d)}
                  style={{ padding:'6px 14px',borderRadius:20,border:`1.5px solid ${pinDays===d?'#F59E0B':'#E4E6EB'}`,background:pinDays===d?'#FFFBEB':'white',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,color:pinDays===d?'#F59E0B':'#65676B',cursor:'pointer' }}>
                  {d}d
                </button>
              ))}
            </div>
            <div style={{ display:'flex',gap:8,padding:'0 16px 14px' }}>
              <button onClick={() => setShowPinPicker(false)}
                style={{ flex:1,padding:'10px 0',borderRadius:10,border:'1.5px solid #E4E6EB',background:'white',cursor:'pointer',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,color:'#050505' }}>
                Cancel
              </button>
              <button onClick={confirmPin}
                style={{ flex:1,padding:'10px 0',borderRadius:10,border:'none',background:'#F59E0B',cursor:'pointer',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,color:'white' }}>
                Pin for {pinDays}d
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MenuItem({ icon, label, onClick, danger, colors }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => { if (!isTouchDevice) setHovered(true) }} onMouseLeave={() => { if (!isTouchDevice) setHovered(false) }}
      style={{ width:'100%',display:'flex',alignItems:'center',gap:9,padding:'10px 14px',border:'none',cursor:'pointer',background:hovered?(danger?'rgba(192,57,43,0.1)':colors.surface):'transparent',fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:13,color:danger?RED:colors.textPri,textAlign:'left',transition:'background 0.1s' }}>
      {icon} {label}
    </button>
  )
}

function MenuDivider({ colors }) {
  return <div style={{ height:1,background:colors.border }}/>
}

const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

function ActionBtn({ onClick, icon, label, active, activeColor, noflex, disabled, colors }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => { if (!isTouchDevice) setHovered(true) }}
      onMouseLeave={() => { if (!isTouchDevice) setHovered(false) }}
      style={{
        flex:noflex?'none':1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,
        padding:'8px 4px',border:'none',cursor:disabled?'default':'pointer',
        background:hovered&&!disabled?colors.surface:'transparent',borderRadius:7,transition:'background 0.12s',
        fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:13,
        color:disabled?colors.textMut:active?(activeColor||RED):colors.textSec,
        width:noflex?'100%':undefined,
        opacity: disabled ? 0.6 : 1,
      }}>
      {icon}{label&&<span>{label}</span>}
    </button>
  )
}
