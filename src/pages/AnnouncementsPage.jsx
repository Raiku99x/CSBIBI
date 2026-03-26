import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns'
import {
  Clock, ChevronDown, ChevronUp,
  BookOpen, FileText, Download, Filter, X, Check
} from 'lucide-react'

const RED     = '#C0392B'
const RED_BG  = '#FADBD8'
const BLUE    = '#1A5276'
const BLUE_BG = '#D6EAF8'
const GREY    = '#65676B'
const GREY_BG = '#F0F2F5'

function formatTime12(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// Returns the exact deadline Date, defaulting to 11:59 PM if no time set
function getDeadlineDate(due_date, due_time) {
  const date = new Date(due_date)
  if (due_time) {
    const [h, m] = due_time.split(':').map(Number)
    date.setHours(h, m, 0, 0)
  } else {
    date.setHours(23, 59, 0, 0)
  }
  return date
}

function getDueStatus(due_date, due_time) {
  const date = getDeadlineDate(due_date, due_time)
  if (isPast(date))                   return { label: 'Past due',     color: GREY,  bg: GREY_BG,  urgent: false, past: true  }
  const days = differenceInDays(date, new Date())
  if (isToday(new Date(due_date)))    return { label: 'Due today!',   color: RED,   bg: RED_BG,   urgent: true,  past: false }
  if (isTomorrow(new Date(due_date))) return { label: 'Due tomorrow', color: RED,   bg: RED_BG,   urgent: true,  past: false }
  if (days <= 3)  return { label: `${days}d left`,  color: RED,   bg: RED_BG,   urgent: true,  past: false }
  if (days <= 7)  return { label: `${days}d left`,  color: BLUE,  bg: BLUE_BG,  urgent: false, past: false }
  return            { label: `${days}d left`,  color: BLUE,  bg: BLUE_BG,  urgent: false, past: false }
}

function parsePhotos(photo_url) {
  if (!photo_url) return []
  try { const p = JSON.parse(photo_url); return Array.isArray(p) ? p : [photo_url] } catch { return [photo_url] }
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

// ── Deadline Row ──────────────────────────────────────────────
function DeadlineRow({ post, done, onToggleDone }) {
  const [expanded, setExpanded] = useState(false)
  const status = getDueStatus(post.due_date, post.due_time)
  const photos = parsePhotos(post.photo_url)
  const files  = parseFiles(post.file_url, post.file_name)
  const hasDetails = !!post.caption || photos.length > 0 || files.length > 0

  const leftAccent = done ? '#E5E7EB' : status.past ? '#DADDE1' : status.urgent ? RED : BLUE

  return (
    <div style={{
      background: done ? '#FAFAFA' : 'white',
      borderRadius: 12,
      border: `1px solid ${done ? '#E5E7EB' : status.urgent && !status.past ? '#F5B7B1' : '#E4E6EB'}`,
      overflow: 'hidden',
      transition: 'all 0.2s',
      opacity: done ? 0.65 : 1,
    }}>
      {/* Left accent bar */}
      <div style={{ display: 'flex' }}>
        <div style={{ width: 4, flexShrink: 0, background: leftAccent, borderRadius: '0 0 0 0' }} />

        <div style={{ flex: 1 }}>
          {/* ── Main row ── */}
          <div style={{ padding: '11px 14px 11px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>

            {/* Date block */}
            <div style={{
              flexShrink: 0,
              minWidth: 52,
              textAlign: 'center',
              padding: '5px 8px',
              borderRadius: 8,
              background: done ? GREY_BG : status.bg,
              border: `1px solid ${done ? '#E4E6EB' : status.urgent ? '#F5B7B1' : '#AED6F1'}`,
            }}>
              <div style={{
                fontFamily: '"Bricolage Grotesque", system-ui',
                fontWeight: 800, fontSize: 15,
                color: done ? '#9CA3AF' : status.color,
                lineHeight: 1,
              }}>
                {format(new Date(post.due_date), 'd')}
              </div>
              <div style={{
                fontFamily: '"Instrument Sans", system-ui',
                fontWeight: 600, fontSize: 10,
                color: done ? '#BCC0C4' : status.color,
                opacity: 0.85,
                marginTop: 1,
              }}>
                {format(new Date(post.due_date), 'MMM')}
              </div>
              {post.due_time && (
                <div style={{
                  fontFamily: '"Instrument Sans", system-ui',
                  fontWeight: 500, fontSize: 9,
                  color: done ? '#BCC0C4' : status.color,
                  opacity: 0.7,
                  marginTop: 1,
                }}>
                  {formatTime12(post.due_time)}
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Pills row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                {/* Subject */}
                <span style={{
                  background: post.subjects ? BLUE_BG : GREY_BG,
                  color: post.subjects ? BLUE : GREY,
                  border: `1px solid ${post.subjects ? '#AED6F1' : '#DADDE1'}`,
                  fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 11,
                  padding: '2px 8px', borderRadius: 20,
                  display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                }}>
                  <BookOpen size={9} />
                  {post.subjects?.name || 'General'}
                </span>

                {/* Type */}
                {post.announcement_type && (
                  <span style={{
                    background: GREY_BG, color: '#1c1e21',
                    border: '1px solid #DADDE1',
                    fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 11,
                    padding: '2px 8px', borderRadius: 20,
                  }}>
                    {post.announcement_type}
                  </span>
                )}

                {/* Status */}
                {done ? (
                  <span style={{
                    background: '#DCFCE7', color: '#16a34a',
                    border: '1px solid #BBF7D0',
                    fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 11,
                    padding: '2px 8px', borderRadius: 20,
                  }}>
                    Done
                  </span>
                ) : (
                  <span style={{
                    background: status.bg, color: status.color,
                    border: `1px solid ${status.urgent ? '#F5B7B1' : status.past ? '#DADDE1' : '#AED6F1'}`,
                    fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 11,
                    padding: '2px 8px', borderRadius: 20,
                  }}>
                    {status.label}
                  </span>
                )}
              </div>

              {/* Caption preview */}
              {post.caption && (
                <p style={{
                  margin: 0,
                  fontFamily: '"Instrument Sans", system-ui', fontSize: 13, fontWeight: done ? 400 : 500,
                  color: done ? '#9CA3AF' : '#1c1e21',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  textDecoration: done ? 'line-through' : 'none',
                }}>
                  {post.caption}
                </p>
              )}
            </div>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {/* Expand button */}
              {hasDetails && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: expanded ? GREY_BG : 'transparent',
                    border: '1px solid #E4E6EB',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: GREY, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = GREY_BG}
                  onMouseLeave={e => e.currentTarget.style.background = expanded ? GREY_BG : 'transparent'}
                >
                  {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              )}

              {/* Done toggle */}
              <button
                onClick={() => onToggleDone(post.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 8, border: 'none',
                  cursor: 'pointer', flexShrink: 0,
                  fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 12.5,
                  background: done ? '#DCFCE7' : '#F0FDF4',
                  color: done ? '#16a34a' : '#4ade80',
                  outline: `2px solid ${done ? '#BBF7D0' : '#D1FAE5'}`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = done ? '#BBF7D0' : '#DCFCE7'
                  e.currentTarget.style.color = '#16a34a'
                  e.currentTarget.style.outline = '2px solid #86EFAC'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = done ? '#DCFCE7' : '#F0FDF4'
                  e.currentTarget.style.color = done ? '#16a34a' : '#4ade80'
                  e.currentTarget.style.outline = `2px solid ${done ? '#BBF7D0' : '#D1FAE5'}`
                }}
              >
                {done ? (
                  <><Check size={13} strokeWidth={2.5} />Done</>
                ) : (
                  <><Check size={13} strokeWidth={2.5} />Mark done</>
                )}
              </button>
            </div>
          </div>

          {/* ── Expanded details ── */}
          {expanded && (
            <div style={{
              borderTop: '1px solid #F0F2F5',
              padding: '12px 14px 14px 12px',
              display: 'flex', flexDirection: 'column', gap: 10,
              animation: 'expandIn 0.18s ease',
            }}>
              {post.caption && (
                <p style={{
                  margin: 0,
                  fontFamily: '"Instrument Sans", system-ui', fontSize: 13.5,
                  color: done ? '#9CA3AF' : '#1c1e21', lineHeight: 1.55,
                  textDecoration: done ? 'line-through' : 'none',
                }}>
                  {post.caption}
                </p>
              )}

              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img
                  src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.profiles?.display_name || 'U')}&backgroundColor=1A5276&textColor=ffffff`}
                  style={{ width: 24, height: 24, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }}
                  alt=""
                />
                <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 12, color: '#050505' }}>
                  {post.profiles?.display_name || 'Unknown'}
                </span>
                <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 11, color: '#8A8D91' }}>
                  · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>

              {/* Photos */}
              {photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: photos.length === 1 ? '1fr' : 'repeat(3,1fr)', gap: 4, borderRadius: 8, overflow: 'hidden' }}>
                  {photos.slice(0, 6).map((url, i) => (
                    <div key={i} style={{ aspectRatio: '1/1', overflow: 'hidden', background: GREY_BG }}>
                      <img src={url} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
                    </div>
                  ))}
                </div>
              )}

              {/* Files */}
              {files.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {files.map((file, i) => (
                    <a key={i} href={file.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: BLUE_BG, border: `1px solid #AED6F1`, textDecoration: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#C5E1F5'}
                      onMouseLeave={e => e.currentTarget.style.background = BLUE_BG}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: 7, background: 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid #AED6F1` }}>
                        <FileText size={13} color={BLUE} />
                      </div>
                      <span style={{ flex: 1, fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13, color: BLUE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                      <Download size={13} color={BLUE} style={{ opacity: 0.6 }} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ emoji, label, count, muted }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '0 2px' }}>
      <span style={{ fontSize: 14 }}>{emoji}</span>
      <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 12.5, color: muted ? '#BCC0C4' : GREY }}>
        {label}
      </span>
      <span style={{
        background: muted ? GREY_BG : '#E4E6EB',
        color: muted ? '#BCC0C4' : GREY,
        fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 11,
        padding: '1px 7px', borderRadius: 10,
      }}>
        {count}
      </span>
    </div>
  )
}

function EmptyState({ emoji, title, subtitle }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E4E6EB', padding: '52px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{emoji}</div>
      <p style={{ margin: '0 0 6px', fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 17, color: '#050505' }}>{title}</p>
      <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 13.5, color: GREY }}>{subtitle}</p>
    </div>
  )
}

function LoadingSkeleton() {
  const bar = (w, h, r = 6) => (
    <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0, background: 'linear-gradient(90deg,#F0F2F5 25%,#E4E6EB 50%,#F0F2F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ background: 'white', borderRadius: 12, border: '1px solid #E4E6EB', display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: 4, background: '#E4E6EB' }} />
          <div style={{ flex: 1, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            {bar(52, 50, 8)}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', gap: 5 }}>{bar(80, 22, 20)}{bar(60, 22, 20)}{bar(55, 22, 20)}</div>
              {bar('60%', 13)}
            </div>
            {bar(80, 30, 8)}
          </div>
        </div>
      ))}
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    </div>
  )
}

// Filters: All, Due Soon (today+tomorrow only), Past Due, Done
const FILTERS = ['All', 'Due Soon', 'Past Due', 'Done']
const TYPE_FILTERS = ['All Types', 'Quiz', 'Activity', 'Output', 'Exam', 'Fees', 'Info', 'Learning Task', 'Project', 'Reporting']

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const [deadlines, setDeadlines]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('All')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const [doneIds, setDoneIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('csb_done_deadlines') || '[]')) }
    catch { return new Set() }
  })

  function toggleDone(id) {
    setDoneIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try { localStorage.setItem('csb_done_deadlines', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  useEffect(() => {
    async function load() {
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
    if (user) load()
  }, [user])

  // Helpers
  const isDueSoon = (d) => {
    const deadline = getDeadlineDate(d.due_date, d.due_time)
    if (isPast(deadline)) return false
    return isToday(new Date(d.due_date)) || isTomorrow(new Date(d.due_date))
  }
  const isPastDue = (d) => isPast(getDeadlineDate(d.due_date, d.due_time))

  // Apply type filter to a list
  const applyTypeFilter = (list) =>
    typeFilter === 'All Types' ? list : list.filter(d => d.announcement_type === typeFilter)

  const doneDeadlines   = deadlines.filter(d => doneIds.has(d.id))
  const activeDeadlines = deadlines.filter(d => !doneIds.has(d.id))

  // Stats for header summary
  const dueSoonCount = activeDeadlines.filter(isDueSoon).length
  const doneCount    = doneDeadlines.length

  // What to show based on active filter tab
  let displayItems = []
  let showDoneSection = false

  if (filter === 'All') {
    displayItems = applyTypeFilter(activeDeadlines)
    showDoneSection = false
  } else if (filter === 'Due Soon') {
    displayItems = applyTypeFilter(activeDeadlines.filter(isDueSoon))
  } else if (filter === 'Past Due') {
    displayItems = applyTypeFilter(activeDeadlines.filter(isPastDue))
  } else if (filter === 'Done') {
    displayItems = applyTypeFilter(doneDeadlines)
  }

  // Group active items into sections (for All, Due Soon, Past Due tabs)
  const urgent    = displayItems.filter(d => isDueSoon(d))
  const notUrgent = displayItems.filter(d => !isDueSoon(d) && !isPastDue(d))
  const past      = displayItems.filter(d => isPastDue(d))

  // Build groups based on filter
  let groups = []
  if (filter === 'Due Soon') {
    groups = urgent.length ? [{ emoji: '🔥', label: 'Due Soon', items: urgent }] : []
  } else if (filter === 'Past Due') {
    groups = past.length ? [{ emoji: '⚠️', label: 'Past Due', items: past }] : []
  } else if (filter === 'Done') {
    groups = displayItems.length ? [{ emoji: '✅', label: 'Done', items: displayItems }] : []
  } else {
    // All tab — show Due Soon, then Later, then Past Due
    if (urgent.length)    groups.push({ emoji: '🔥', label: 'Due Soon',  items: urgent })
    if (notUrgent.length) groups.push({ emoji: '🗓️', label: 'Later',     items: notUrgent })
    if (past.length)      groups.push({ emoji: '⚠️', label: 'Past Due',  items: past })
  }

  return (
    <div style={{ paddingTop: 14 }}>

      {/* ── Header card ── */}
      <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 10, boxShadow: '0 2px 12px rgba(192,57,43,0.15)' }}>
        <div style={{ background: `linear-gradient(135deg, ${RED} 0%, ${BLUE} 100%)`, padding: '18px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: loading ? 0 : 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 20, color: 'white' }}>Deadlines</p>
              <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>From your enrolled subjects</p>
            </div>
            {!loading && (
              <div style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', padding: '4px 12px', borderRadius: 20, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13 }}>
                {deadlines.length}
              </div>
            )}
          </div>

          {!loading && deadlines.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'Upcoming', count: activeDeadlines.filter(d => !isPastDue(d)).length, emoji: '⏰' },
                { label: 'Due Soon', count: dueSoonCount,  emoji: '🔥' },
                { label: 'Done',     count: doneCount,     emoji: '✅' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
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
          {/* Filter tabs */}
          <div style={{ display: 'flex', background: GREY_BG, borderRadius: 8, padding: 3, gap: 1, flex: 1, minWidth: 0 }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: '7px 1px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 10,
                background: filter === f ? 'white' : 'transparent',
                color: filter === f ? '#050505' : GREY,
                boxShadow: filter === f ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}>{f}</button>
            ))}
          </div>

          {/* Type filter */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowTypeFilter(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 11px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: typeFilter !== 'All Types' ? RED_BG : GREY_BG,
                color: typeFilter !== 'All Types' ? RED : GREY,
                fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 11,
                flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              <Filter size={12} />
              {typeFilter === 'All Types' ? 'Type' : typeFilter}
              {typeFilter !== 'All Types' && (
                <span onClick={e => { e.stopPropagation(); setTypeFilter('All Types') }} style={{ marginLeft: 2, display: 'flex', alignItems: 'center' }}>
                  <X size={11} />
                </span>
              )}
            </button>
            {showTypeFilter && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: 'white', borderRadius: 12, border: '1px solid #E4E6EB', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, minWidth: 160, overflow: 'hidden', animation: 'slideDown 0.15s ease' }}>
                {TYPE_FILTERS.map(t => (
                  <button key={t} onClick={() => { setTypeFilter(t); setShowTypeFilter(false) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      padding: '9px 14px', border: 'none', cursor: 'pointer',
                      background: typeFilter === t ? RED_BG : 'transparent',
                      color: typeFilter === t ? RED : '#1c1e21',
                      fontFamily: '"Instrument Sans", system-ui', fontWeight: typeFilter === t ? 700 : 500, fontSize: 13,
                      textAlign: 'left', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (typeFilter !== t) e.currentTarget.style.background = GREY_BG }}
                    onMouseLeave={e => { if (typeFilter !== t) e.currentTarget.style.background = 'transparent' }}
                  >
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
      ) : deadlines.length === 0 ? (
        <EmptyState emoji="📭" title="No deadlines yet" subtitle="Enroll in subjects to see their deadlines" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {groups.map(({ emoji, label, items }) => items.length > 0 && (
            <div key={label}>
              <SectionHeader emoji={emoji} label={label} count={items.length} muted={label === 'Done'} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {items.map(post => (
                  <DeadlineRow
                    key={post.id}
                    post={post}
                    done={filter === 'Done' || doneIds.has(post.id)}
                    onToggleDone={toggleDone}
                  />
                ))}
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <EmptyState
              emoji={filter === 'Due Soon' ? '🎉' : filter === 'Done' ? '📋' : '🗓️'}
              title={
                filter === 'Due Soon' ? 'Nothing due soon!' :
                filter === 'Past Due' ? 'No past due tasks' :
                filter === 'Done' ? 'No completed tasks yet' :
                'All clear!'
              }
              subtitle={
                filter === 'Due Soon' ? 'No tasks due today or tomorrow' :
                filter === 'Past Due' ? "You're all caught up" :
                filter === 'Done' ? 'Mark tasks as done to see them here' :
                'Nothing matches this filter'
              }
            />
          )}
        </div>
      )}

      <style>{`
        @keyframes expandIn  { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}
