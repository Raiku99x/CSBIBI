import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useDeadlineCompletions } from '../hooks/useDeadlineCompletions'
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns'
import {
  Clock, ChevronDown, ChevronUp,
  BookOpen, FileText, Download, Check, X, RotateCcw,
  AlertCircle, AlertTriangle, Loader2, Bell, Calendar, Tag
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

function getDeadlineDate(due_date, due_time) {
  const [y, m, d] = due_date.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (due_time) {
    const [h, min] = due_time.split(':').map(Number)
    date.setHours(h, min, 0, 0)
  } else {
    date.setHours(23, 59, 0, 0)
  }
  return date
}

function getDueStatus(due_date, due_time) {
  const date = getDeadlineDate(due_date, due_time)
  if (isPast(date))                   return { label: 'Past due',    color: GREY,  bg: GREY_BG,  urgent: false, past: true  }
  const days = differenceInDays(date, new Date())
  if (isToday(new Date(due_date)))    return { label: 'Today',       color: RED,   bg: RED_BG,   urgent: true,  past: false }
  if (isTomorrow(new Date(due_date))) return { label: 'Tomorrow',    color: RED,   bg: RED_BG,   urgent: true,  past: false }
  if (days <= 3)  return { label: `${days}d left`, color: RED,  bg: RED_BG,   urgent: true,  past: false }
  if (days <= 7)  return { label: `${days}d left`, color: BLUE, bg: BLUE_BG,  urgent: false, past: false }
  return            { label: `${days}d left`, color: BLUE, bg: BLUE_BG,  urgent: false, past: false }
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

function NotifBar({ pastDueCount, dueSoonCount }) {
  const [hidePast, setHidePast] = useState(false)
  const [hideSoon, setHideSoon] = useState(false)

  if ((pastDueCount === 0 || hidePast) && (dueSoonCount === 0 || hideSoon)) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
      {pastDueCount > 0 && !hidePast && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: '#FCEBEB',
          border: '1px solid #F7C1C1',
          borderLeft: `4px solid ${RED}`,
          borderRadius: 10,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: RED, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={14} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13, color: '#791F1F' }}>
              {pastDueCount} task{pastDueCount !== 1 ? 's are' : ' is'} past due — act now
            </p>
          </div>
          <button onClick={() => setHidePast(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#A32D2D', opacity: 0.6, padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      )}
      {dueSoonCount > 0 && !hideSoon && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: '#FAEEDA',
          border: '1px solid #FAC775',
          borderLeft: `4px solid #EF9F27`,
          borderRadius: 10,
        }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#854F0B', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={14} color="#FAEEDA" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13, color: '#633806' }}>
              {dueSoonCount} task{dueSoonCount !== 1 ? 's are' : ' is'} due soon — don't miss them
            </p>
          </div>
          <button onClick={() => setHideSoon(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#854F0B', opacity: 0.6, padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

function DeadlineRow({ post, done, onToggleDone, toggling }) {
  const [expanded, setExpanded] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [hiding, setHiding] = useState(false)

  const status = getDueStatus(post.due_date, post.due_time)
  const photos = parsePhotos(post.photo_url)
  const files  = parseFiles(post.file_url, post.file_name)
  const hasDetails = !!post.caption || photos.length > 0 || files.length > 0
  const leftAccent = done ? '#E5E7EB' : status.past ? '#DADDE1' : status.urgent ? RED : BLUE

  function handleToggle() {
    if (toggling) return
    if (done) {
      setHiding(true)
      setTimeout(() => onToggleDone(post.id), 320)
      return
    }
    setAnimating(true)
    setTimeout(() => {
      setAnimating(false)
      setHiding(true)
      setTimeout(() => onToggleDone(post.id), 380)
    }, 500)
  }

  return (
    <div style={{
      background: animating ? '#DCFCE7' : done ? '#FAFAFA' : 'white',
      borderRadius: 12,
      border: `1px solid ${
        animating ? '#86EFAC'
        : done ? '#E5E7EB'
        : status.urgent && !status.past ? '#F5B7B1'
        : '#E4E6EB'
      }`,
      overflow: 'hidden',
      transition: 'background 0.25s, border-color 0.25s, opacity 0.32s, transform 0.32s',
      opacity: hiding ? 0 : done ? 0.65 : 1,
      transform: hiding ? (done ? 'scale(0.97)' : 'translateX(40px)') : 'none',
      pointerEvents: animating || hiding || toggling ? 'none' : 'auto',
    }}>
      <div style={{ display: 'flex' }}>
        <div style={{ width: 4, flexShrink: 0, background: animating ? '#22C55E' : leftAccent, transition: 'background 0.25s' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ padding: '11px 12px 11px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{
                width: 62, textAlign: 'center', padding: '5px 6px', borderRadius: 8,
                background: animating ? '#DCFCE7' : done ? GREY_BG : status.bg,
                border: `1px solid ${animating ? '#86EFAC' : done ? '#E4E6EB' : status.urgent ? '#F5B7B1' : '#AED6F1'}`,
                transition: 'background 0.25s, border-color 0.25s',
              }}>
                <div style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 17, color: animating ? '#16a34a' : done ? '#9CA3AF' : status.color, lineHeight: 1, transition: 'color 0.25s' }}>
                  {format(new Date(post.due_date + 'T00:00:00'), 'd')}
                </div>
                <div style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 10, color: animating ? '#16a34a' : done ? '#BCC0C4' : status.color, opacity: 0.85, marginTop: 1, transition: 'color 0.25s' }}>
                  {format(new Date(post.due_date + 'T00:00:00'), 'MMM')}
                </div>
                <div style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 9, color: animating ? '#16a34a' : done ? '#BCC0C4' : status.color, marginTop: 3, paddingTop: 2, borderTop: `1px solid ${animating ? '#86EFAC' : done ? '#E4E6EB' : status.urgent && !status.past ? '#F5B7B1' : '#AED6F1'}`, letterSpacing: 0.1, whiteSpace: 'nowrap', transition: 'color 0.25s' }}>
                  {animating ? 'Done' : done ? 'Done' : status.label}
                </div>
                {post.due_time && (
                  <div style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 500, fontSize: 8, color: done ? '#BCC0C4' : status.color, opacity: 0.6, marginTop: 2 }}>
                    {formatTime12(post.due_time)}
                  </div>
                )}
              </div>
              <button
                onClick={handleToggle}
                disabled={toggling}
                style={{
                  width: 62, padding: '5px 0', borderRadius: 8, border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  cursor: toggling ? 'not-allowed' : 'pointer',
                  fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 11,
                  background: animating ? '#DCFCE7' : done ? '#FFF1F2' : '#F0FDF4',
                  color: animating ? '#16a34a' : done ? '#e11d48' : '#4ade80',
                  outline: `2px solid ${animating ? '#86EFAC' : done ? '#FEE2E2' : '#D1FAE5'}`,
                  transition: 'all 0.2s',
                  transform: animating ? 'scale(1.05)' : 'scale(1)',
                  opacity: toggling ? 0.6 : 1,
                }}
                onMouseEnter={e => { if (!animating && !toggling) { e.currentTarget.style.background = done ? '#FEE2E2' : '#DCFCE7'; e.currentTarget.style.color = done ? '#be123c' : '#16a34a' } }}
                onMouseLeave={e => { if (!animating && !toggling) { e.currentTarget.style.background = done ? '#FFF1F2' : '#F0FDF4'; e.currentTarget.style.color = done ? '#e11d48' : '#4ade80' } }}
              >
                {toggling
                  ? <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} />
                  : done
                    ? <><RotateCcw size={10} strokeWidth={2.5} /> Undo</>
                    : <><Check size={11} strokeWidth={2.5} /> Done</>
                }
              </button>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ background: post.subjects ? BLUE_BG : GREY_BG, color: post.subjects ? BLUE : GREY, border: `1px solid ${post.subjects ? '#AED6F1' : '#DADDE1'}`, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <BookOpen size={9} />
                  {post.subjects?.name || 'General'}
                </span>
                {post.announcement_type && (
                  <span style={{ background: GREY_BG, color: '#1c1e21', border: '1px solid #DADDE1', fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 11, padding: '2px 8px', borderRadius: 20, display:'inline-flex', alignItems:'center', gap:3 }}>
                    <Tag size={9}/> {post.announcement_type}
                  </span>
                )}
              </div>
              {post.caption && (
                <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 13, fontWeight: done ? 400 : 500, color: done ? '#9CA3AF' : '#1c1e21', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textDecoration: done ? 'line-through' : 'none', lineHeight: 1.45 }}>
                  {post.caption}
                </p>
              )}
            </div>

            {hasDetails && (
              <button
                onClick={() => setExpanded(e => !e)}
                style={{ flexShrink: 0, marginTop: 1, padding: '4px 7px', borderRadius: 7, background: expanded ? GREY_BG : 'transparent', border: '1px solid #E4E6EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, color: GREY, transition: 'all 0.15s', fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.background = GREY_BG}
                onMouseLeave={e => e.currentTarget.style.background = expanded ? GREY_BG : 'transparent'}
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <span className="dl-detail-label">{expanded ? 'Close' : 'Details'}</span>
              </button>
            )}
          </div>

          {expanded && (
            <div style={{ borderTop: '1px solid #F0F2F5', padding: '12px 14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 10, animation: 'expandIn 0.18s ease' }}>
              {post.caption && (
                <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 13.5, color: done ? '#9CA3AF' : '#1c1e21', lineHeight: 1.55, textDecoration: done ? 'line-through' : 'none' }}>
                  {post.caption}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img
                  src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.profiles?.display_name || 'U')}&backgroundColor=1A5276&textColor=ffffff`}
                  style={{ width: 24, height: 24, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }}
                  alt=""
                />
                <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 12, color: '#050505' }}>{post.profiles?.display_name || 'Unknown'}</span>
                <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 11, color: '#8A8D91' }}>· {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              </div>
              {photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: photos.length === 1 ? '1fr' : 'repeat(3,1fr)', gap: 4, borderRadius: 8, overflow: 'hidden' }}>
                  {photos.slice(0, 6).map((url, i) => (
                    <div key={i} style={{ aspectRatio: '1/1', overflow: 'hidden', background: GREY_BG }}>
                      <img src={url} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
                    </div>
                  ))}
                </div>
              )}
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

function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E4E6EB', padding: '52px 24px', textAlign: 'center' }}>
      <div style={{ display:'flex', justifyContent:'center', marginBottom: 12, opacity:0.35 }}>{icon}</div>
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
        <div key={i} style={{ background: 'white', borderRadius: 12, border: '1px solid #E4E6EB', overflow: 'hidden' }}>
          <div style={{ display: 'flex' }}>
            <div style={{ width: 4, background: '#E4E6EB' }} />
            <div style={{ flex: 1, padding: '11px 12px 10px' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                {bar(62, 68, 8)}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', gap: 5 }}>{bar(80, 22, 20)}{bar(60, 22, 20)}</div>
                  {bar('90%', 13)}
                  {bar('70%', 13)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    </div>
  )
}

const FILTERS = ['All', 'Due Soon', 'Past Due', 'Done']

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const { isDone, toggleDone, doneIds, loading: completionsLoading } = useDeadlineCompletions()
  const [togglingId, setTogglingId] = useState(null)

  const [deadlines, setDeadlines]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('All')
  const [typeFilter, setTypeFilter] = useState('All Types')

  async function handleToggleDone(postId) {
    setTogglingId(postId)
    await toggleDone(postId)
    setTogglingId(null)
  }

  useEffect(() => {
    async function load() {
      const { data: enrolled } = await supabase
        .from('user_subjects').select('subject_id').eq('user_id', user.id)
      const subjectIds = enrolled?.map(e => e.subject_id) || []

      let query = supabase
        .from('posts').select('*, profiles!posts_author_id_fkey(*), subjects!posts_subject_id_fkey(*)')
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

  const isDueSoon = (d) => {
    const dl = getDeadlineDate(d.due_date, d.due_time)
    if (isPast(dl)) return false
    return isToday(new Date(d.due_date + 'T00:00:00')) || isTomorrow(new Date(d.due_date + 'T00:00:00'))
  }
  const isPastDue = (d) => isPast(getDeadlineDate(d.due_date, d.due_time))
  const applyType = (list) => typeFilter === 'All Types' ? list : list.filter(d => d.announcement_type === typeFilter)

  const doneDeadlines   = deadlines.filter(d => isDone(d.id))
  const activeDeadlines = deadlines.filter(d => !isDone(d.id))

  let displayItems = []
  if (filter === 'All')         displayItems = applyType(activeDeadlines)
  else if (filter === 'Due Soon')  displayItems = applyType(activeDeadlines.filter(isDueSoon))
  else if (filter === 'Past Due')  displayItems = applyType(activeDeadlines.filter(isPastDue))
  else if (filter === 'Done')      displayItems = applyType(doneDeadlines)

  const pastDueCount = activeDeadlines.filter(isPastDue).length
  const dueSoonCount = activeDeadlines.filter(isDueSoon).length

  const typeCounts = {}
  activeDeadlines.forEach(d => {
    if (d.announcement_type) typeCounts[d.announcement_type] = (typeCounts[d.announcement_type] || 0) + 1
  })
  const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])

  const emptyConfig = {
    'Due Soon':  { icon: <Bell size={40}/>,     title: 'Nothing due soon',       subtitle: 'No tasks due today or tomorrow' },
    'Past Due':  { icon: <Check size={40}/>,    title: 'No past due tasks',       subtitle: "You're all caught up" },
    'Done':      { icon: <Calendar size={40}/>, title: 'No completed tasks yet',  subtitle: 'Mark tasks as done to see them here' },
    'All':       { icon: <Clock size={40}/>,    title: 'All clear',               subtitle: 'No deadlines match this filter' },
  }

  const isPageLoading = loading || completionsLoading

  return (
    <div style={{ paddingTop: 14 }}>
      {!isPageLoading && <NotifBar pastDueCount={pastDueCount} dueSoonCount={dueSoonCount} />}

      <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 10, boxShadow: '0 2px 12px rgba(192,57,43,0.15)' }}>
        <div style={{ background: `linear-gradient(135deg, ${RED} 0%, ${BLUE} 100%)`, padding: '18px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: isPageLoading || typeEntries.length === 0 ? 0 : 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 20, color: 'white' }}>Deadlines</p>
              <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>From your enrolled subjects</p>
            </div>
            {!isPageLoading && (
              <div style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', padding: '4px 12px', borderRadius: 20, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13 }}>
                {deadlines.length}
              </div>
            )}
          </div>

          {!isPageLoading && typeEntries.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {typeEntries.map(([type, count]) => {
                const isActive = typeFilter === type
                return (
                  <button key={type} onClick={() => setTypeFilter(t => t === type ? 'All Types' : type)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: isActive ? '4px 10px 4px 6px' : '4px 10px', borderRadius: 20, border: `1.5px solid ${isActive ? 'white' : 'rgba(255,255,255,0.35)'}`, background: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.15)', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {isActive && (
                      <span style={{ width: 15, height: 15, borderRadius: '50%', background: RED, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <X size={8} color="white" strokeWidth={3} />
                      </span>
                    )}
                    <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 12, color: isActive ? RED : 'white' }}>{type}</span>
                    <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 11, background: isActive ? RED : 'rgba(255,255,255,0.25)', color: 'white', borderRadius: 10, padding: '1px 6px', lineHeight: 1.6, minWidth: 18, textAlign: 'center' }}>{count}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ background: 'white', padding: '10px 14px', borderTop: '1px solid #F0F2F5' }}>
          <div style={{ display: 'flex', background: GREY_BG, borderRadius: 8, padding: 3, gap: 1 }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: '7px 1px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 10, background: filter === f ? 'white' : 'transparent', color: filter === f ? '#050505' : GREY, boxShadow: filter === f ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      {isPageLoading ? (
        <LoadingSkeleton />
      ) : deadlines.length === 0 ? (
        <EmptyState icon={<Clock size={40}/>} title="No deadlines yet" subtitle="Enroll in subjects to see their deadlines" />
      ) : displayItems.length === 0 ? (
        <EmptyState
          icon={emptyConfig[filter]?.icon || <Clock size={40}/>}
          title={emptyConfig[filter]?.title || 'Nothing here'}
          subtitle={emptyConfig[filter]?.subtitle || ''}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {displayItems.map(post => (
            <DeadlineRow
              key={post.id}
              post={post}
              done={filter === 'Done' || isDone(post.id)}
              onToggleDone={handleToggleDone}
              toggling={togglingId === post.id}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes expandIn  { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin      { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @media (max-width: 600px) { .dl-detail-label { display: none; } }
      `}</style>
    </div>
  )
}
