import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns'
import {
  Clock, AlertCircle, CheckCircle2, ChevronDown, ChevronUp,
  BookOpen, Calendar, User, FileText, Image as ImageIcon,
  Download, Loader2, Filter, X
} from 'lucide-react'

const RED   = '#C0392B'
const BLUE  = '#1A5276'
const GREEN = '#16a34a'

const TYPE_COLORS = {
  Quiz:           { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  Activity:       { bg: '#DBEAFE', color: '#1E40AF', dot: '#3B82F6' },
  Output:         { bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
  Exam:           { bg: '#FCE7F3', color: '#9D174D', dot: '#EC4899' },
  Fees:           { bg: '#FEE2E2', color: '#991B1B', dot: RED },
  Info:           { bg: '#E0F2FE', color: '#0C4A6E', dot: '#0EA5E9' },
  'Learning Task':{ bg: '#EDE9FE', color: '#5B21B6', dot: '#8B5CF6' },
  Project:        { bg: '#FFF7ED', color: '#9A3412', dot: '#F97316' },
  Reporting:      { bg: '#F0FDF4', color: '#14532D', dot: '#22C55E' },
}

function formatTime12(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function getDueStatus(due_date, due_time) {
  const date = new Date(due_date)
  if (due_time) {
    const [h, m] = due_time.split(':').map(Number)
    date.setHours(h, m, 0, 0)
  } else {
    date.setHours(23, 59, 59, 999)
  }

  if (isPast(date)) return { label: 'Past due', color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF', urgent: false, past: true }

  const days = differenceInDays(date, new Date())
  if (isToday(new Date(due_date))) return { label: 'Due today!', color: RED, bg: '#FEE2E2', dot: RED, urgent: true, past: false }
  if (isTomorrow(new Date(due_date))) return { label: 'Due tomorrow', color: '#D97706', bg: '#FEF3C7', dot: '#F59E0B', urgent: true, past: false }
  if (days <= 3) return { label: `${days}d left`, color: '#D97706', bg: '#FEF3C7', dot: '#F59E0B', urgent: true, past: false }
  if (days <= 7) return { label: `${days}d left`, color: BLUE, bg: '#DBEAFE', dot: '#3B82F6', urgent: false, past: false }
  return { label: `${days}d left`, color: GREEN, bg: '#D1FAE5', dot: '#10B981', urgent: false, past: false }
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

// ── Deadline Card ─────────────────────────────────────────────
function DeadlineCard({ post }) {
  const [expanded, setExpanded] = useState(false)
  const status = getDueStatus(post.due_date, post.due_time)
  const typeStyle = TYPE_COLORS[post.announcement_type] || { bg: '#F3F4F6', color: '#374151', dot: '#6B7280' }
  const photos = parsePhotos(post.photo_url)
  const files  = parseFiles(post.file_url, post.file_name)
  const hasDetails = post.caption || photos.length > 0 || files.length > 0

  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      border: `1.5px solid ${status.urgent && !status.past ? '#FCA5A5' : status.past ? '#E5E7EB' : '#E4E6EB'}`,
      overflow: 'hidden',
      boxShadow: status.urgent && !status.past
        ? '0 2px 12px rgba(192,57,43,0.1)'
        : '0 1px 3px rgba(0,0,0,0.06)',
      opacity: status.past ? 0.7 : 1,
      transition: 'all 0.15s',
    }}>
      {/* Urgency stripe */}
      {!status.past && (
        <div style={{
          height: 3,
          background: status.urgent
            ? `linear-gradient(90deg, ${RED}, #F97316)`
            : status.dot === '#10B981'
              ? 'linear-gradient(90deg, #10B981, #3B82F6)'
              : `linear-gradient(90deg, #3B82F6, ${BLUE})`,
        }} />
      )}

      {/* ── Collapsed row ── */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Due status badge */}
        <div style={{
          flexShrink: 0,
          background: status.bg,
          color: status.color,
          borderRadius: 8,
          padding: '6px 10px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          minWidth: 60, textAlign: 'center',
        }}>
          <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 13, lineHeight: 1 }}>
            {format(new Date(post.due_date), 'MMM d')}
          </span>
          <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 10, marginTop: 2, lineHeight: 1 }}>
            {post.due_time ? formatTime12(post.due_time) : format(new Date(post.due_date), 'yyyy')}
          </span>
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top row: type badge + status pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
            {post.announcement_type && (
              <span style={{
                background: typeStyle.bg, color: typeStyle.color,
                fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 10.5,
                padding: '2px 7px', borderRadius: 20,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: typeStyle.dot, flexShrink: 0 }} />
                {post.announcement_type}
              </span>
            )}
            <span style={{
              background: status.bg, color: status.color,
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 10.5,
              padding: '2px 7px', borderRadius: 20,
            }}>
              {status.label}
            </span>
          </div>

          {/* Caption preview */}
          <p style={{
            margin: 0,
            fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13.5,
            color: status.past ? '#9CA3AF' : '#050505',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            lineHeight: 1.35,
          }}>
            {post.caption || '(No description)'}
          </p>

          {/* Subject */}
          {post.subjects && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <BookOpen size={10} color="#8A8D91" />
              <span style={{
                fontFamily: '"Instrument Sans", system-ui', fontSize: 11, color: '#8A8D91', fontWeight: 500,
              }}>
                {post.subjects.name}
              </span>
            </div>
          )}
        </div>

        {/* Expand button */}
        {hasDetails && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              flexShrink: 0,
              width: 30, height: 30, borderRadius: 8,
              background: expanded ? '#F0F2F5' : 'transparent',
              border: '1.5px solid #E4E6EB',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
              color: '#65676B',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#F0F2F5'}
            onMouseLeave={e => e.currentTarget.style.background = expanded ? '#F0F2F5' : 'transparent'}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* ── Expanded details ── */}
      {expanded && (
        <div style={{
          borderTop: '1px solid #F0F2F5',
          padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: 12,
          animation: 'expandIn 0.18s ease',
        }}>
          {/* Who posted + timestamp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.profiles?.display_name || 'U')}&backgroundColor=0D7377&textColor=ffffff`}
              style={{ width: 26, height: 26, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }}
              alt=""
            />
            <div>
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 12, color: '#050505' }}>
                {post.profiles?.display_name || 'Unknown'}
              </span>
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 11, color: '#8A8D91', marginLeft: 6 }}>
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Full caption */}
          {post.caption && (
            <p style={{
              margin: 0,
              fontFamily: '"Instrument Sans", system-ui', fontSize: 14,
              color: '#1c1e21', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {post.caption}
            </p>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: photos.length === 1 ? '1fr' : 'repeat(3, 1fr)',
              gap: 4, borderRadius: 8, overflow: 'hidden',
            }}>
              {photos.slice(0, 6).map((url, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', background: '#F0F2F5' }}>
                  <img src={url} loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
                  {i === 5 && photos.length > 6 && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'white', fontWeight: 800, fontSize: 18, fontFamily: '"Bricolage Grotesque", system-ui' }}>+{photos.length - 6}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {files.map((file, i) => (
                <a key={i} href={file.url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 9,
                    background: '#F7F9FC', border: '1.5px solid #E8EDF5',
                    textDecoration: 'none', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#EFF4FF'; e.currentTarget.style.borderColor = '#C7D9F7' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F7F9FC'; e.currentTarget.style.borderColor = '#E8EDF5' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#DBEAFE', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={14} color={BLUE} />
                  </div>
                  <span style={{ flex: 1, fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13, color: '#1c1e21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </span>
                  <Download size={13} color="#BCC0C4" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ emoji, title, subtitle }) {
  return (
    <div style={{
      background: 'white', borderRadius: 14, border: '1px solid #E4E6EB',
      padding: '52px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{emoji}</div>
      <p style={{ margin: '0 0 6px', fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 17, color: '#050505' }}>{title}</p>
      <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 13.5, color: '#65676B' }}>{subtitle}</p>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
const FILTERS = ['All', 'Upcoming', 'Past Due']
const TYPE_FILTERS = ['All Types', 'Quiz', 'Activity', 'Output', 'Exam', 'Fees', 'Info', 'Learning Task', 'Project', 'Reporting']

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const [deadlines, setDeadlines] = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('All')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [showTypeFilter, setShowTypeFilter] = useState(false)

  useEffect(() => {
    async function fetch() {
      const { data: enrolled } = await supabase
        .from('user_subjects').select('subject_id').eq('user_id', user.id)
      const subjectIds = enrolled?.map(e => e.subject_id) || []

      let query = supabase
        .from('posts')
        .select('*, profiles(*), subjects(*)')
        .eq('post_type', 'announcement')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })

      if (subjectIds.length > 0) {
        query = query.or(`subject_id.in.(${subjectIds.join(',')}),subject_id.is.null`)
      } else {
        query = query.is('subject_id', null)
      }

      const { data } = await query
      if (data) setDeadlines(data)
      setLoading(false)
    }
    if (user) fetch()
  }, [user])

  const now = new Date()

  const filtered = deadlines.filter(d => {
    const dueDate = new Date(d.due_date)
    if (filter === 'Upcoming' && isPast(dueDate)) return false
    if (filter === 'Past Due' && !isPast(dueDate)) return false
    if (typeFilter !== 'All Types' && d.announcement_type !== typeFilter) return false
    return true
  })

  const upcomingCount = deadlines.filter(d => !isPast(new Date(d.due_date))).length
  const pastCount     = deadlines.filter(d => isPast(new Date(d.due_date))).length
  const urgentCount   = deadlines.filter(d => {
    const days = differenceInDays(new Date(d.due_date), now)
    return days >= 0 && days <= 3
  }).length

  // group upcoming by date proximity
  const urgent   = filtered.filter(d => { const days = differenceInDays(new Date(d.due_date), now); return days >= 0 && days <= 3 })
  const thisWeek = filtered.filter(d => { const days = differenceInDays(new Date(d.due_date), now); return days > 3 && days <= 7 })
  const later    = filtered.filter(d => differenceInDays(new Date(d.due_date), now) > 7)
  const past     = filtered.filter(d => isPast(new Date(d.due_date)))

  const groups = filter === 'Past Due'
    ? [{ label: 'Past Due', items: past }]
    : filter === 'Upcoming'
      ? [
          ...(urgent.length   ? [{ label: '🔥 Due Soon (within 3 days)', items: urgent }]   : []),
          ...(thisWeek.length ? [{ label: '📅 This Week', items: thisWeek }]                : []),
          ...(later.length    ? [{ label: '🗓️ Later', items: later }]                       : []),
        ]
      : [
          ...(urgent.length   ? [{ label: '🔥 Due Soon', items: urgent }]                   : []),
          ...(thisWeek.length ? [{ label: '📅 This Week', items: thisWeek }]                : []),
          ...(later.length    ? [{ label: '🗓️ Later', items: later }]                       : []),
          ...(past.length     ? [{ label: '✅ Past Due', items: past }]                     : []),
        ]

  return (
    <div style={{ paddingTop: 14 }}>

      {/* ── Header ── */}
      <div style={{
        borderRadius: 14, overflow: 'hidden', marginBottom: 10,
        boxShadow: '0 2px 12px rgba(192,57,43,0.15)',
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${RED} 0%, ${BLUE} 100%)`,
          padding: '18px 20px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: urgentCount > 0 ? 14 : 0 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12, flexShrink: 0,
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Clock size={22} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 20, color: 'white' }}>
                Deadlines
              </p>
              <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                From your enrolled subjects
              </p>
            </div>
            {!loading && (
              <div style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', padding: '4px 12px', borderRadius: 20, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13 }}>
                {filtered.length}
              </div>
            )}
          </div>

          {/* Stats */}
          {!loading && deadlines.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'Upcoming', count: upcomingCount, emoji: '⏰' },
                { label: 'Due Soon', count: urgentCount,  emoji: '🔥' },
                { label: 'Past Due', count: pastCount,    emoji: '✅' },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 10, padding: '8px 10px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 15, marginBottom: 2 }}>{s.emoji}</div>
                  <div style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: 'white', lineHeight: 1 }}>{s.count}</div>
                  <div style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 10.5, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ background: 'white', padding: '10px 14px', borderTop: '1px solid #F0F2F5', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Status filter tabs */}
          <div style={{ display: 'flex', background: '#F0F2F5', borderRadius: 8, padding: 3, gap: 2, flex: 1 }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: '7px 6px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 12.5,
                background: filter === f ? 'white' : 'transparent',
                color: filter === f ? '#050505' : '#65676B',
                boxShadow: filter === f ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}>
                {f}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowTypeFilter(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 11px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: typeFilter !== 'All Types' ? '#FADBD8' : '#F0F2F5',
                color: typeFilter !== 'All Types' ? RED : '#65676B',
                fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 12.5,
                flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              <Filter size={12} />
              {typeFilter === 'All Types' ? 'Type' : typeFilter}
              {typeFilter !== 'All Types' && (
                <span onClick={e => { e.stopPropagation(); setTypeFilter('All Types') }}
                  style={{ marginLeft: 2, display: 'flex', alignItems: 'center' }}>
                  <X size={11} />
                </span>
              )}
            </button>

            {showTypeFilter && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                background: 'white', borderRadius: 12, border: '1px solid #E4E6EB',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50,
                minWidth: 160, overflow: 'hidden',
                animation: 'slideDown 0.15s ease',
              }}>
                {TYPE_FILTERS.map(t => (
                  <button key={t} onClick={() => { setTypeFilter(t); setShowTypeFilter(false) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 14px', border: 'none', cursor: 'pointer',
                      background: typeFilter === t ? '#FADBD8' : 'transparent',
                      color: typeFilter === t ? RED : '#1c1e21',
                      fontFamily: '"Instrument Sans", system-ui', fontWeight: typeFilter === t ? 700 : 500, fontSize: 13,
                      textAlign: 'left', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (typeFilter !== t) e.currentTarget.style.background = '#F7F8FA' }}
                    onMouseLeave={e => { if (typeFilter !== t) e.currentTarget.style.background = 'transparent' }}
                  >
                    {t !== 'All Types' && TYPE_COLORS[t] && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[t].dot, flexShrink: 0 }} />
                    )}
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <LoadingSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          emoji="📭"
          title={filter === 'Past Due' ? 'No past deadlines' : 'No upcoming deadlines'}
          subtitle={deadlines.length === 0 ? 'Enroll in subjects to see their deadlines' : 'Nothing matches this filter'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groups.map(({ label, items }) => items.length > 0 && (
            <div key={label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '0 2px' }}>
                <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 12.5, color: '#65676B' }}>
                  {label}
                </span>
                <span style={{ background: '#E4E6EB', color: '#65676B', fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 11, padding: '1px 7px', borderRadius: 10 }}>
                  {items.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(post => <DeadlineCard key={post.id} post={post} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes expandIn { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}

function LoadingSkeleton() {
  const bar = (w, h, r = 6) => (
    <div style={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
      background: 'linear-gradient(90deg,#F0F2F5 25%,#E4E6EB 50%,#F0F2F5 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
    }} />
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{ background: 'white', borderRadius: 12, border: '1px solid #E4E6EB', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          {bar(60, 44, 8)}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', gap: 5 }}>{bar(60, 18, 20)}{bar(50, 18, 20)}</div>
            {bar('75%', 13)}
            {bar('40%', 11)}
          </div>
          {bar(30, 30, 8)}
        </div>
      ))}
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    </div>
  )
}
