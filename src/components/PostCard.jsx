import { useState, useEffect } from 'react'
import { formatDistanceToNow, format } from 'date-fns'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','5C4A7A','6B5B8A','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','4A3A7A','3E3068']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

import {
  FileText, Download, Calendar, BookOpen, Megaphone,
  Heart, MessageCircle, Share2, X, ChevronLeft, ChevronRight,
  MoreHorizontal, Bookmark, Bell, Clock
} from 'lucide-react'

const RED  = '#C0392B'
const BLUE = '#1A5276'

// deadline → RED, reminder → RED, material → BLUE
function getBanner(subType, postType) {
  if (postType !== 'announcement') return null
  if (subType === 'deadline')  return { bg: `linear-gradient(90deg, ${RED}, #A93226)`,   label: 'DEADLINE',  icon: <Clock size={14} color="white" /> }
  if (subType === 'reminder')  return { bg: `linear-gradient(90deg, ${RED}, #A93226)`,   label: 'REMINDER',  icon: <Bell size={14} color="white" /> }
  if (subType === 'material')  return { bg: `linear-gradient(90deg, ${BLUE}, #154360)`,  label: 'MATERIAL',  icon: <FileText size={14} color="white" /> }
  return { bg: `linear-gradient(90deg, ${RED}, ${BLUE})`, label: 'ANNOUNCEMENT', icon: <Megaphone size={14} color="white" /> }
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

function Lightbox({ photos, initialIndex, onClose }) {
  const [activeIdx, setActiveIdx] = useState(initialIndex)
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setActiveIdx(i => Math.min(i + 1, photos.length - 1))
      if (e.key === 'ArrowLeft') setActiveIdx(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photos.length])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={20} color="white" />
      </button>
      {photos.length > 1 && <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 13, fontWeight: 600, fontFamily: '"Instrument Sans", system-ui', padding: '4px 14px', borderRadius: 20 }}>{activeIdx + 1} / {photos.length}</div>}
      <img src={photos[activeIdx]} alt="" style={{ maxWidth: '92vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }} />
      {photos.length > 1 && <>
        <button onClick={() => setActiveIdx(i => Math.max(i - 1, 0))} disabled={activeIdx === 0} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: activeIdx === 0 ? 0.3 : 1 }}><ChevronLeft size={20} color="white" /></button>
        <button onClick={() => setActiveIdx(i => Math.min(i + 1, photos.length - 1))} disabled={activeIdx === photos.length - 1} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: activeIdx === photos.length - 1 ? 0.3 : 1 }}><ChevronRight size={20} color="white" /></button>
      </>}
    </div>
  )
}

function PhotoGrid({ photos, onPhotoClick }) {
  const display = photos.slice(0, 5)
  const remaining = photos.length - 5
  const count = display.length

  const wrap = (url, i, extraStyle = {}) => (
    <div key={i} style={{ overflow: 'hidden', cursor: 'pointer', position: 'relative', ...extraStyle }}
      onClick={() => onPhotoClick(i)}
      onMouseEnter={e => e.currentTarget.querySelector('img').style.filter = 'brightness(0.88)'}
      onMouseLeave={e => e.currentTarget.querySelector('img').style.filter = 'brightness(1)'}
    >
      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'filter 0.15s', display: 'block' }} loading="lazy" />
      {i === 4 && remaining > 0 && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'white', fontSize: 28, fontWeight: 800 }}>+{remaining}</span></div>}
    </div>
  )

  if (count === 1) return <div onClick={() => onPhotoClick(0)} style={{ cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.querySelector('img').style.filter = 'brightness(0.88)'} onMouseLeave={e => e.currentTarget.querySelector('img').style.filter = 'brightness(1)'}><img src={display[0]} style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }} loading="lazy" /></div>
  if (count === 2) return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, height: 300 }}>{display.map((url, i) => wrap(url, i))}</div>
  if (count === 3) return <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, height: 300 }}>{wrap(display[0], 0, { gridRow: '1 / 3' })}{wrap(display[1], 1)}{wrap(display[2], 2)}</div>
  if (count === 4) return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, height: 300 }}>{display.map((url, i) => wrap(url, i))}</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, height: 220 }}>{display.slice(0, 2).map((url, i) => wrap(url, i))}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, height: 150 }}>{display.slice(2, 5).map((url, i) => wrap(url, i + 2))}</div>
    </div>
  )
}

export default function PostCard({ post, currentUserId }) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const photos = parsePhotos(post.photo_url)
  const files = parseFiles(post.file_url, post.file_name)
  const caption = post.caption || ''
  const isLong = caption.length > 150
  const displayCaption = isLong && !expanded ? caption.slice(0, 150) + '…' : caption
  const banner = getBanner(post.sub_type, post.post_type)

  return (
    <>
      <article style={{ background: 'white', borderRadius: 12, border: '1px solid #DADDE1', overflow: 'hidden', marginBottom: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>

        {/* ── Banner ── */}
        {banner && (
          <div style={{ background: banner.bg, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {banner.icon}
            <span style={{ color: 'white', fontSize: 12, fontWeight: 700, fontFamily: '"Instrument Sans", system-ui', letterSpacing: 0.6, textTransform: 'uppercase' }}>
              {banner.label}{post.announcement_type ? ` · ${post.announcement_type}` : ''}
            </span>
            {post.due_date && (
              <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.9)', fontSize: 12, fontFamily: '"Instrument Sans", system-ui', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={11} /> Due {format(new Date(post.due_date), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={post.profiles?.avatar_url || dicebearUrl(post.profiles?.display_name)} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#E4E6EB' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 14, color: '#050505' }}>{post.profiles?.display_name || 'Unknown'}</span>
              {post.subjects && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#D6EAF8', color: BLUE, fontSize: 11, fontWeight: 600, fontFamily: '"Instrument Sans", system-ui', padding: '2px 8px', borderRadius: 20 }}>
                  <BookOpen size={10} /> {post.subjects.name}
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#65676B', fontFamily: '"Instrument Sans", system-ui' }}>
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              {post.post_type !== 'announcement' && <span style={{ marginLeft: 4, color: '#BCC0C4' }}>· Status</span>}
            </p>
          </div>
          <button style={{ width: 36, height: 36, borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#65676B', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = '#F0F2F5'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* ── Caption ── */}
        {caption && (
          <div style={{ padding: '10px 16px', paddingBottom: photos.length > 0 ? 10 : 0 }}>
            <p style={{ margin: 0, fontSize: 15, color: '#050505', fontFamily: '"Instrument Sans", system-ui', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {displayCaption}
              {isLong && <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', fontWeight: 600, fontSize: 14, fontFamily: '"Instrument Sans", system-ui', marginLeft: 4, padding: 0 }}>{expanded ? ' See less' : ' See more'}</button>}
            </p>
          </div>
        )}

        {/* ── Photos ── */}
        {photos.length > 0 && <div style={{ marginTop: caption ? 8 : 12 }}><PhotoGrid photos={photos} onPhotoClick={setLightboxIndex} /></div>}

        {/* ── Files ── */}
        {files.length > 0 && (
          <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {files.map((file, i) => (
              <a key={i} href={file.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: '#F7F8FA', border: '1px solid #E4E6EB', textDecoration: 'none', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#EBEDF0'}
                onMouseLeave={e => e.currentTarget.style.background = '#F7F8FA'}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#D6EAF8', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={16} color={BLUE} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#050505', fontFamily: '"Instrument Sans", system-ui', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#65676B', fontFamily: '"Instrument Sans", system-ui' }}>Tap to open</p>
                </div>
                <Download size={15} color="#BCC0C4" />
              </a>
            ))}
          </div>
        )}

        {likeCount > 0 && (
          <div style={{ padding: '8px 16px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Heart size={10} color="white" fill="white" /></div>
            <span style={{ fontSize: 13, color: '#65676B', fontFamily: '"Instrument Sans", system-ui' }}>{likeCount}</span>
          </div>
        )}

        <div style={{ height: 1, background: '#E4E6EB', margin: '10px 16px 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', padding: '2px 8px' }}>
          <ActionBtn onClick={() => { setLiked(l => !l); setLikeCount(c => liked ? c - 1 : c + 1) }}
            icon={<Heart size={18} fill={liked ? RED : 'none'} color={liked ? RED : '#65676B'} />}
            label="Like" active={liked} activeColor={RED} />
          <ActionBtn icon={<MessageCircle size={18} color="#65676B" />} label="Comment" />
          <ActionBtn icon={<Share2 size={18} color="#65676B" />} label="Share" />
          <div style={{ marginLeft: 'auto' }}>
            <ActionBtn onClick={() => setSaved(s => !s)}
              icon={<Bookmark size={18} fill={saved ? BLUE : 'none'} color={saved ? BLUE : '#65676B'} />}
              label="" />
          </div>
        </div>
      </article>

      {lightboxIndex !== null && <Lightbox photos={photos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}
    </>
  )
}

function ActionBtn({ onClick, icon, label, active, activeColor }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: label ? 1 : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '8px 4px', border: 'none', cursor: 'pointer',
        background: hovered ? '#F0F2F5' : 'transparent', borderRadius: 8, transition: 'background 0.12s',
        fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 14,
        color: active ? (activeColor || RED) : '#65676B',
      }}>
      {icon}{label && <span>{label}</span>}
    </button>
  )
}
