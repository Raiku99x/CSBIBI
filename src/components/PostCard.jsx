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
  MoreHorizontal, Bookmark, Bell, Clock, AlertCircle
} from 'lucide-react'

const RED  = '#C0392B'
const BLUE = '#1A5276'

// Banner config per sub_type
function getBanner(subType, postType) {
  if (subType === 'deadline')    return { bg: `linear-gradient(90deg, #B03A2E, #922B21)`, label: 'DEADLINE',     icon: <Clock size={13} color="white" />,    accent: '#B03A2E' }
  if (subType === 'reminder')    return { bg: `linear-gradient(90deg, ${RED}, #A93226)`,   label: 'REMINDER',     icon: <Bell size={13} color="white" />,     accent: RED }
  if (subType === 'material')    return { bg: `linear-gradient(90deg, ${BLUE}, #154360)`,  label: 'MATERIAL',     icon: <FileText size={13} color="white" />, accent: BLUE }
  if (postType === 'announcement') return { bg: `linear-gradient(90deg, ${RED}, ${BLUE})`, label: 'ANNOUNCEMENT', icon: <Megaphone size={13} color="white" />, accent: RED }
  return null
}

function getTypeLabel(subType, postType) {
  if (subType === 'material')    return 'Material'
  if (subType === 'deadline')    return 'Deadline'
  if (subType === 'reminder')    return 'Reminder'
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
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setActiveIdx(i => Math.min(i + 1, photos.length - 1))
      if (e.key === 'ArrowLeft')  setActiveIdx(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photos.length])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.94)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.18s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 16,
        width: 40, height: 40, borderRadius: 10,
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.15)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <X size={18} color="white" />
      </button>

      {photos.length > 1 && (
        <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'white', fontSize: 12, fontWeight: 600,
          fontFamily: '"Instrument Sans", system-ui',
          padding: '5px 14px', borderRadius: 20,
        }}>
          {activeIdx + 1} / {photos.length}
        </div>
      )}

      <img
        src={photos[activeIdx]}
        alt=""
        style={{
          maxWidth: '90vw', maxHeight: '88vh',
          objectFit: 'contain', borderRadius: 10,
          animation: 'scaleIn 0.2s ease',
        }}
      />

      {photos.length > 1 && (
        <>
          <button
            onClick={() => setActiveIdx(i => Math.max(i - 1, 0))}
            disabled={activeIdx === 0}
            style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              width: 44, height: 44, borderRadius: 10,
              background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
              cursor: activeIdx === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: activeIdx === 0 ? 0.3 : 1, transition: 'opacity 0.15s',
            }}
          >
            <ChevronLeft size={20} color="white" />
          </button>
          <button
            onClick={() => setActiveIdx(i => Math.min(i + 1, photos.length - 1))}
            disabled={activeIdx === photos.length - 1}
            style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              width: 44, height: 44, borderRadius: 10,
              background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
              cursor: activeIdx === photos.length - 1 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: activeIdx === photos.length - 1 ? 0.3 : 1, transition: 'opacity 0.15s',
            }}
          >
            <ChevronRight size={20} color="white" />
          </button>
        </>
      )}
      <style>{`
        @keyframes fadeIn { from{opacity:0}to{opacity:1} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  )
}

// ── Photo Grid ────────────────────────────────────────────────
function PhotoGrid({ photos, onPhotoClick }) {
  const display = photos.slice(0, 5)
  const remaining = photos.length - 5

  const wrap = (url, i, style = {}) => (
    <div
      key={i}
      onClick={() => onPhotoClick(i)}
      style={{
        overflow: 'hidden', cursor: 'pointer', position: 'relative',
        transition: 'opacity 0.15s',
        ...style,
      }}
      onMouseEnter={e => { const img = e.currentTarget.querySelector('img'); if (img) img.style.transform = 'scale(1.03)'; }}
      onMouseLeave={e => { const img = e.currentTarget.querySelector('img'); if (img) img.style.transform = 'scale(1)'; }}
    >
      <img
        src={url} alt="" loading="lazy"
        style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          transition: 'transform 0.3s ease',
        }}
      />
      {i === 4 && remaining > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)',
        }}>
          <span style={{
            color: 'white', fontSize: 26, fontWeight: 800,
            fontFamily: '"Bricolage Grotesque", system-ui',
          }}>+{remaining}</span>
        </div>
      )}
    </div>
  )

  const count = display.length
  if (count === 1)
    return (
      <div onClick={() => onPhotoClick(0)} style={{ cursor: 'pointer', overflow: 'hidden', maxHeight: 420 }}
        onMouseEnter={e => { const img = e.currentTarget.querySelector('img'); if(img) img.style.transform='scale(1.02)'; }}
        onMouseLeave={e => { const img = e.currentTarget.querySelector('img'); if(img) img.style.transform='scale(1)'; }}
      >
        <img src={display[0]} style={{ width: '100%', maxHeight: 420, objectFit: 'cover', display: 'block', transition: 'transform 0.3s ease' }} loading="lazy" />
      </div>
    )
  if (count === 2)
    return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, height: 300 }}>{display.map((u,i)=>wrap(u,i))}</div>
  if (count === 3)
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, height: 300 }}>
        {wrap(display[0], 0, { gridRow: '1 / 3' })}
        {wrap(display[1], 1)}
        {wrap(display[2], 2)}
      </div>
    )
  if (count === 4)
    return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, height: 300 }}>{display.map((u,i)=>wrap(u,i))}</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, height: 220 }}>{display.slice(0,2).map((u,i)=>wrap(u,i))}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, height: 150 }}>{display.slice(2,5).map((u,i)=>wrap(u,i+2))}</div>
    </div>
  )
}

// ── Main PostCard ─────────────────────────────────────────────
export default function PostCard({ post, currentUserId }) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const photos = parsePhotos(post.photo_url)
  const files  = parseFiles(post.file_url, post.file_name)
  const caption = post.caption || ''
  const isLong = caption.length > 220
  const displayCaption = isLong && !expanded ? caption.slice(0, 220) + '…' : caption

  const banner = getBanner(post.sub_type, post.post_type)
  const typeLabel = getTypeLabel(post.sub_type, post.post_type)
  const isDeadline = post.sub_type === 'deadline'
  const isPastDue = isDeadline && post.due_date && new Date(post.due_date) < new Date()

  return (
    <>
      <article style={{
        background: 'white',
        borderRadius: 14,
        border: '1px solid #E4E6EB',
        overflow: 'hidden',
        marginBottom: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        transition: 'box-shadow 0.2s',
      }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.10)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.07)'}
      >

        {/* ── Type Banner ── */}
        {banner && (
          <div style={{
            background: banner.bg,
            padding: '8px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {banner.icon}
            </div>
            <span style={{
              color: 'white', fontSize: 11.5, fontWeight: 700,
              fontFamily: '"Instrument Sans", system-ui',
              letterSpacing: 0.8, textTransform: 'uppercase',
              flex: 1,
            }}>
              {banner.label}{post.announcement_type ? ` · ${post.announcement_type}` : ''}
            </span>
            {post.due_date && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(255,255,255,0.18)',
                padding: '3px 10px', borderRadius: 20,
              }}>
                {isPastDue && <AlertCircle size={11} color="white" />}
                <span style={{
                  color: 'rgba(255,255,255,0.95)', fontSize: 11.5,
                  fontFamily: '"Instrument Sans", system-ui', fontWeight: 600,
                }}>
                  {isPastDue ? 'Past due · ' : 'Due · '}
                  {format(new Date(post.due_date), 'MMM d, yyyy')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Card Header ── */}
        <div style={{
          padding: '14px 16px 10px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={post.profiles?.avatar_url || dicebearUrl(post.profiles?.display_name)}
              alt=""
              style={{
                width: 42, height: 42, borderRadius: 12,
                objectFit: 'cover', background: '#E4E6EB',
                border: '2px solid #F0F2F5',
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: '"Instrument Sans", system-ui',
                fontWeight: 700, fontSize: 14.5, color: '#050505',
              }}>
                {post.profiles?.display_name || 'Unknown'}
              </span>
              {post.subjects && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#EBF5FB', color: BLUE,
                  fontSize: 11, fontWeight: 700,
                  fontFamily: '"Instrument Sans", system-ui',
                  padding: '2px 8px', borderRadius: 20,
                  border: '1px solid #D6EAF8',
                }}>
                  <BookOpen size={10} /> {post.subjects.name}
                </span>
              )}
            </div>
            <p style={{
              margin: '2px 0 0', fontSize: 12, color: '#8A8D91',
              fontFamily: '"Instrument Sans", system-ui',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              <span style={{ color: '#D4D6DA' }}>·</span>
              <span style={{ color: '#BCC0C4' }}>{typeLabel}</span>
            </p>
          </div>

          {/* More options */}
          <button
            style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#BCC0C4', flexShrink: 0, transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F0F2F5'; e.currentTarget.style.color = '#65676B' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#BCC0C4' }}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* ── Caption ── */}
        {caption && (
          <div style={{ padding: `0 16px ${photos.length > 0 ? '10px' : '0'}` }}>
            <p style={{
              margin: 0, fontSize: 15, color: '#1c1e21',
              fontFamily: '"Instrument Sans", system-ui',
              lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {displayCaption}
              {isLong && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: RED, fontWeight: 700, fontSize: 14,
                    fontFamily: '"Instrument Sans", system-ui',
                    marginLeft: 4, padding: 0,
                  }}
                >
                  {expanded ? 'See less' : 'See more'}
                </button>
              )}
            </p>
          </div>
        )}

        {/* ── Photos ── */}
        {photos.length > 0 && (
          <div style={{ marginTop: caption ? 4 : 10 }}>
            <PhotoGrid photos={photos} onPhotoClick={setLightboxIndex} />
          </div>
        )}

        {/* ── Files ── */}
        {files.length > 0 && (
          <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {files.map((file, i) => (
              <a
                key={i}
                href={file.url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', borderRadius: 10,
                  background: '#F7F9FC',
                  border: '1.5px solid #E8EDF5',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#EFF4FF'; e.currentTarget.style.borderColor = '#C7D9F7' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F7F9FC'; e.currentTarget.style.borderColor = '#E8EDF5' }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 9,
                  background: 'linear-gradient(135deg, #EBF5FB, #D6EAF8)',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid #C3DEF0',
                }}>
                  <FileText size={17} color={BLUE} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 13.5, fontWeight: 600, color: '#1c1e21',
                    fontFamily: '"Instrument Sans", system-ui',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {file.name}
                  </p>
                  <p style={{ margin: '1px 0 0', fontSize: 11.5, color: '#8A8D91', fontFamily: '"Instrument Sans", system-ui' }}>
                    Tap to open
                  </p>
                </div>
                <Download size={14} color="#BCC0C4" />
              </a>
            ))}
          </div>
        )}

        {/* ── Like count ── */}
        {likeCount > 0 && (
          <div style={{
            padding: '10px 16px 0',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: `linear-gradient(135deg, ${RED}, #E74C3C)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(192,57,43,0.35)',
            }}>
              <Heart size={10} color="white" fill="white" />
            </div>
            <span style={{
              fontSize: 13, color: '#65676B',
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 500,
            }}>
              {likeCount} {likeCount === 1 ? 'person' : 'people'} liked this
            </span>
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{ height: 1, background: '#F0F2F5', margin: '10px 14px 0' }} />

        {/* ── Action Row ── */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '2px 8px 4px' }}>
          <ActionBtn
            onClick={() => { setLiked(l => !l); setLikeCount(c => liked ? c - 1 : c + 1) }}
            icon={<Heart size={17} fill={liked ? RED : 'none'} color={liked ? RED : '#65676B'} />}
            label="Like"
            active={liked}
            activeColor={RED}
          />
          <ActionBtn
            icon={<MessageCircle size={17} color="#65676B" />}
            label="Comment"
          />
          <ActionBtn
            icon={<Share2 size={17} color="#65676B" />}
            label="Share"
          />
          <div style={{ marginLeft: 'auto' }}>
            <ActionBtn
              onClick={() => setSaved(s => !s)}
              icon={
                <Bookmark
                  size={17}
                  fill={saved ? BLUE : 'none'}
                  color={saved ? BLUE : '#65676B'}
                />
              }
              label=""
              noflex
            />
          </div>
        </div>
      </article>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}

function ActionBtn({ onClick, icon, label, active, activeColor, noflex }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: noflex ? 'none' : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '9px 6px', border: 'none', cursor: 'pointer',
        background: hovered ? '#F5F6F7' : 'transparent',
        borderRadius: 8, transition: 'background 0.12s',
        fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13.5,
        color: active ? (activeColor || RED) : '#65676B',
      }}
    >
      {icon}{label && <span>{label}</span>}
    </button>
  )
}
