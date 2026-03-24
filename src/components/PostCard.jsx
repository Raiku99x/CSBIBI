import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import {
  FileText, Download, Calendar, BookOpen, Megaphone,
  Heart, MessageCircle, Share2, X, ChevronLeft, ChevronRight,
  MoreHorizontal, Bookmark, Bell, Clock, AlertCircle, Pencil, Trash2
} from 'lucide-react'

import EditPostModal from './EditPostModal'
import { supabase } from '../lib/supabase'

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
  if (subType === 'deadline')      return { bg: `linear-gradient(90deg,#B03A2E,#922B21)`, label: 'DEADLINE',      icon: <Clock size={12} color="white" /> }
  if (subType === 'reminder')      return { bg: `linear-gradient(90deg,${RED},#A93226)`,  label: 'REMINDER',      icon: <Bell size={12} color="white" /> }
  if (subType === 'material')      return { bg: `linear-gradient(90deg,${BLUE},#154360)`, label: 'MATERIAL',      icon: <FileText size={12} color="white" /> }
  if (subType === 'announcement')  return { bg: `linear-gradient(90deg,${RED},${BLUE})`,  label: 'ANNOUNCEMENT',  icon: <Megaphone size={12} color="white" /> }
  if (postType === 'announcement') return { bg: `linear-gradient(90deg,${RED},${BLUE})`,  label: 'ANNOUNCEMENT',  icon: <Megaphone size={12} color="white" /> }
  return null
}

function getTypeLabel(subType, postType) {
  if (subType === 'material')      return 'Material'
  if (subType === 'deadline')      return 'Deadline'
  if (subType === 'reminder')      return 'Reminder'
  if (subType === 'announcement')  return 'Announcement'
  if (postType === 'announcement') return 'Announcement'
  return 'Post'
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

// ── Lightbox ──────────────────────────────────────────────────
function Lightbox({ photos, initialIndex, onClose }) {
  const [activeIdx, setActiveIdx] = useState(initialIndex)
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
  }, [photos.length])

  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.94)',display:'flex',alignItems:'center',justifyContent:'center' }}
      onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <button onClick={onClose} style={{ position:'absolute',top:14,right:14,width:38,height:38,borderRadius:9,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.18)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
        <X size={17} color="white" />
      </button>
      {photos.length > 1 && <div style={{ position:'absolute',top:18,left:'50%',transform:'translateX(-50%)',background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.18)',color:'white',fontSize:12,fontWeight:600,fontFamily:'"Instrument Sans",system-ui',padding:'4px 12px',borderRadius:20 }}>{activeIdx+1}/{photos.length}</div>}
      <img src={photos[activeIdx]} alt="" style={{ maxWidth:'92vw',maxHeight:'88vh',objectFit:'contain',borderRadius:8 }} />
      {photos.length > 1 && <>
        <button onClick={() => setActiveIdx(i=>Math.max(i-1,0))} disabled={activeIdx===0} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',width:40,height:40,borderRadius:9,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.18)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:activeIdx===0?0.3:1 }}><ChevronLeft size={19} color="white" /></button>
        <button onClick={() => setActiveIdx(i=>Math.min(i+1,photos.length-1))} disabled={activeIdx===photos.length-1} style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',width:40,height:40,borderRadius:9,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.18)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:activeIdx===photos.length-1?0.3:1 }}><ChevronRight size={19} color="white" /></button>
      </>}
    </div>
  )
}

// ── Photo Grid ────────────────────────────────────────────────
function PhotoGrid({ photos, onPhotoClick }) {
  const display = photos.slice(0, 5)
  const remaining = photos.length - 5
  const wrap = (url, i, style={}) => (
    <div key={i} onClick={() => onPhotoClick(i)} style={{ overflow:'hidden',cursor:'pointer',position:'relative',...style }}
      onMouseEnter={e=>{const img=e.currentTarget.querySelector('img');if(img)img.style.transform='scale(1.03)'}}
      onMouseLeave={e=>{const img=e.currentTarget.querySelector('img');if(img)img.style.transform='scale(1)'}}>
      <img src={url} alt="" loading="lazy" style={{ width:'100%',height:'100%',objectFit:'cover',display:'block',transition:'transform 0.25s ease' }} />
      {i===4&&remaining>0&&<div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.52)',display:'flex',alignItems:'center',justifyContent:'center' }}><span style={{ color:'white',fontSize:24,fontWeight:800,fontFamily:'"Bricolage Grotesque",system-ui' }}>+{remaining}</span></div>}
    </div>
  )
  const count = display.length
  if (count===1) return <div onClick={()=>onPhotoClick(0)} style={{cursor:'pointer',overflow:'hidden',maxHeight:380}} onMouseEnter={e=>{const img=e.currentTarget.querySelector('img');if(img)img.style.transform='scale(1.02)'}} onMouseLeave={e=>{const img=e.currentTarget.querySelector('img');if(img)img.style.transform='scale(1)'}}><img src={display[0]} style={{width:'100%',maxHeight:380,objectFit:'cover',display:'block',transition:'transform 0.25s ease'}} loading="lazy"/></div>
  if (count===2) return <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,height:260}}>{display.map((u,i)=>wrap(u,i))}</div>
  if (count===3) return <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gridTemplateRows:'1fr 1fr',gap:2,height:260}}>{wrap(display[0],0,{gridRow:'1/3'})}{wrap(display[1],1)}{wrap(display[2],2)}</div>
  if (count===4) return <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',gap:2,height:260}}>{display.map((u,i)=>wrap(u,i))}</div>
  return <div style={{display:'flex',flexDirection:'column',gap:2}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,height:200}}>{display.slice(0,2).map((u,i)=>wrap(u,i))}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:2,height:130}}>{display.slice(2,5).map((u,i)=>wrap(u,i+2))}</div></div>
}

// ── PostCard ──────────────────────────────────────────────────
export default function PostCard({ post, currentUserId, subjects = [] }) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [postData, setPostData] = useState(post)
  const menuRef = useRef(null)

  async function handleDelete() {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postData.id)
      if (error) throw error
      setDeleted(true)
    } catch (err) {
      alert(err.message || 'Failed to delete')
    }
  }

  useEffect(() => {
    function h(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  if (deleted) return null

  const photos = parsePhotos(postData.photo_url)
  const files  = parseFiles(postData.file_url, postData.file_name)
  const caption = postData.caption || ''
  const isLong = caption.length > 220
  const displayCaption = isLong && !expanded ? caption.slice(0,220)+'…' : caption

  const banner = getBanner(postData.sub_type, postData.post_type)
  const typeLabel = getTypeLabel(postData.sub_type, postData.post_type)
  const isPastDue = postData.due_date && new Date(postData.due_date) < new Date()

  return (
    <>
      <article style={{
        background: 'white',
        borderTop: '1px solid #E4E6EB',
        borderBottom: '1px solid #E4E6EB',
        marginBottom: 6,
        overflow: 'hidden',
      }}>

        {/* ── Banner ── */}
        {banner && (
          <div style={{ background: banner.bg, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {banner.icon}
            </div>
            <span style={{ color: 'white', fontSize: 11, fontWeight: 700, fontFamily: '"Instrument Sans",system-ui', letterSpacing: 0.7, textTransform: 'uppercase', flex: 1 }}>
              {banner.label}{postData.announcement_type ? ` · ${postData.announcement_type}` : ''}
            </span>
            {postData.due_date && (
              <div style={{ display:'flex',alignItems:'center',gap:4,background:'rgba(255,255,255,0.18)',padding:'2px 9px',borderRadius:20 }}>
                {isPastDue && <AlertCircle size={10} color="white" />}
                <span style={{ color:'rgba(255,255,255,0.93)',fontSize:11,fontFamily:'"Instrument Sans",system-ui',fontWeight:600 }}>
                  {isPastDue ? 'Past due · ' : 'Due · '}
                  {format(new Date(postData.due_date), 'MMM d, yyyy')}
                  {postData.due_time ? ` · ${formatTime12(postData.due_time)}` : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ padding: '10px 12px 8px', display: 'flex', alignItems: 'center', gap: 9 }}>
          <img
            src={postData.profiles?.avatar_url || dicebearUrl(postData.profiles?.display_name)}
            alt=""
            style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1.5px solid #F0F2F5' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: '"Instrument Sans",system-ui', fontWeight: 700, fontSize: 14, color: '#050505' }}>
                {postData.profiles?.display_name || 'Unknown'}
              </span>
              {postData.subjects && (
                <span style={{ display:'inline-flex',alignItems:'center',gap:3,background:'#EBF5FB',color:BLUE,fontSize:10.5,fontWeight:700,fontFamily:'"Instrument Sans",system-ui',padding:'2px 7px',borderRadius:20,border:'1px solid #D6EAF8' }}>
                  <BookOpen size={9} /> {postData.subjects.name}
                </span>
              )}
            </div>
            <p style={{ margin:'1px 0 0',fontSize:11.5,color:'#8A8D91',fontFamily:'"Instrument Sans",system-ui' }}>
              {formatDistanceToNow(new Date(postData.created_at),{addSuffix:true})}
              <span style={{margin:'0 4px',color:'#D4D6DA'}}>·</span>
              <span style={{color:'#BCC0C4'}}>{typeLabel}</span>
              {postData.is_edited && <><span style={{margin:'0 4px',color:'#D4D6DA'}}>·</span><span style={{color:'#BCC0C4',fontStyle:'italic',fontSize:11}}>Edited</span></>}
            </p>
          </div>
          <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowMenu(v => !v)}
              style={{ width:32,height:32,borderRadius:7,background:showMenu?'#F0F2F5':'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:showMenu?'#65676B':'#BCC0C4',transition:'background 0.12s,color 0.12s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='#F0F2F5';e.currentTarget.style.color='#65676B'}}
              onMouseLeave={e=>{if(!showMenu){e.currentTarget.style.background='transparent';e.currentTarget.style.color='#BCC0C4'}}}>
              <MoreHorizontal size={17} />
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                background: 'white', borderRadius: 10, border: '1px solid #E4E6EB',
                boxShadow: '0 6px 20px rgba(0,0,0,0.12)', overflow: 'hidden',
                zIndex: 20, minWidth: 155, animation: 'slideDown 0.15s ease',
              }}>
                {postData.author_id === currentUserId ? (
                  <>
                    <button
                      onClick={() => { setShowMenu(false); setShowEdit(true) }}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'10px 14px', border:'none', cursor:'pointer', background:'transparent', fontFamily:'"Instrument Sans",system-ui', fontWeight:600, fontSize:13, color:'#050505', textAlign:'left', transition:'background 0.1s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#F7F8FA'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                    >
                      <Pencil size={14} color="#65676B" /> Edit post
                    </button>
                    <div style={{ height:1, background:'#F0F2F5' }} />
                    <button
                      onClick={() => { setShowMenu(false); if (window.confirm('Delete this post? This cannot be undone.')) handleDelete() }}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'10px 14px', border:'none', cursor:'pointer', background:'transparent', fontFamily:'"Instrument Sans",system-ui', fontWeight:600, fontSize:13, color:'#C0392B', textAlign:'left', transition:'background 0.1s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#FFF5F5'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                    >
                      <Trash2 size={14} color="#C0392B" /> Delete post
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setSaved(s => !s); setShowMenu(false) }}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'10px 14px', border:'none', cursor:'pointer', background:'transparent', fontFamily:'"Instrument Sans",system-ui', fontWeight:600, fontSize:13, color: saved ? '#1A5276' : '#050505', textAlign:'left', transition:'background 0.1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#F7F8FA'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  >
                    <Bookmark size={14} color={saved ? '#1A5276' : '#65676B'} fill={saved ? '#1A5276' : 'none'} />
                    {saved ? 'Saved' : 'Save post'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Caption ── */}
        {caption && (
          <div style={{ padding:`0 12px ${photos.length>0?'8px':'0'}` }}>
            <p style={{ margin:0,fontSize:14.5,color:'#1c1e21',fontFamily:'"Instrument Sans",system-ui',lineHeight:1.55,whiteSpace:'pre-wrap',wordBreak:'break-word' }}>
              {displayCaption}
              {isLong && <button onClick={()=>setExpanded(e=>!e)} style={{ background:'none',border:'none',cursor:'pointer',color:RED,fontWeight:700,fontSize:14,fontFamily:'"Instrument Sans",system-ui',marginLeft:4,padding:0 }}>{expanded?'See less':'See more'}</button>}
            </p>
          </div>
        )}

        {/* ── Photos ── */}
        {photos.length>0 && <div style={{marginTop:caption?4:8}}><PhotoGrid photos={photos} onPhotoClick={setLightboxIndex}/></div>}

        {/* ── Files ── */}
        {files.length>0 && (
          <div style={{ padding:'10px 12px 0',display:'flex',flexDirection:'column',gap:6 }}>
            {files.map((file,i) => (
              <a key={i} href={file.url} target="_blank" rel="noopener noreferrer"
                style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:9,background:'#F7F9FC',border:'1.5px solid #E8EDF5',textDecoration:'none',transition:'all 0.15s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='#EFF4FF';e.currentTarget.style.borderColor='#C7D9F7'}}
                onMouseLeave={e=>{e.currentTarget.style.background='#F7F9FC';e.currentTarget.style.borderColor='#E8EDF5'}}>
                <div style={{ width:36,height:36,borderRadius:8,background:'linear-gradient(135deg,#EBF5FB,#D6EAF8)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #C3DEF0' }}>
                  <FileText size={15} color={BLUE} />
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ margin:0,fontSize:13,fontWeight:600,color:'#1c1e21',fontFamily:'"Instrument Sans",system-ui',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{file.name}</p>
                  <p style={{ margin:'1px 0 0',fontSize:11,color:'#8A8D91',fontFamily:'"Instrument Sans",system-ui' }}>Tap to open</p>
                </div>
                <Download size={13} color="#BCC0C4" />
              </a>
            ))}
          </div>
        )}

        {/* ── Like count ── */}
        {likeCount>0 && (
          <div style={{ padding:'8px 12px 0',display:'flex',alignItems:'center',gap:5 }}>
            <div style={{ width:18,height:18,borderRadius:'50%',background:`linear-gradient(135deg,${RED},#E74C3C)`,display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Heart size={9} color="white" fill="white" />
            </div>
            <span style={{ fontSize:12.5,color:'#65676B',fontFamily:'"Instrument Sans",system-ui' }}>{likeCount}</span>
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{ height:1,background:'#F0F2F5',margin:'8px 12px 0' }} />

        {/* ── Actions ── */}
        <div style={{ display:'flex',alignItems:'center',padding:'0 6px 2px' }}>
          <ActionBtn onClick={()=>{setLiked(l=>!l);setLikeCount(c=>liked?c-1:c+1)}} icon={<Heart size={17} fill={liked?RED:'none'} color={liked?RED:'#65676B'}/>} label="Like" active={liked} activeColor={RED} />
          <ActionBtn icon={<MessageCircle size={17} color="#65676B"/>} label="Comment" />
          <ActionBtn icon={<Share2 size={17} color="#65676B"/>} label="Share" />

        </div>
      </article>

      {lightboxIndex!==null && <Lightbox photos={photos} initialIndex={lightboxIndex} onClose={()=>setLightboxIndex(null)} />}
      {showEdit && (
        <EditPostModal
          post={postData}
          profile={postData.profiles}
          subjects={subjects}
          onClose={() => setShowEdit(false)}
          onUpdated={(updated) => { setPostData(updated); setShowEdit(false) }}
        />
      )}
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  )
}

function ActionBtn({ onClick, icon, label, active, activeColor, noflex }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} style={{
      flex:noflex?'none':1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,
      padding:'8px 4px',border:'none',cursor:'pointer',
      background:hovered?'#F5F6F7':'transparent',borderRadius:7,transition:'background 0.12s',
      fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:13,
      color:active?(activeColor||RED):'#65676B',
    }}>
      {icon}{label&&<span>{label}</span>}
    </button>
  )
}
