import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import { PostSkeleton } from '../components/Skeletons'
import { Megaphone, EyeOff, Eye } from 'lucide-react'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past Due' },
]

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [hideReminders, setHideReminders] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: enrolled } = await supabase
        .from('user_subjects').select('subject_id').eq('user_id', user.id)
      const subjectIds = enrolled?.map(e => e.subject_id) || []

      let query = supabase
        .from('posts').select('*, profiles(*), subjects(*)')
        .eq('post_type', 'announcement')
        .order('created_at', { ascending: false })

      if (subjectIds.length > 0) {
        query = query.or(`subject_id.in.(${subjectIds.join(',')}),subject_id.is.null`)
      } else {
        query = query.is('subject_id', null)
      }

      const { data } = await query
      if (data) setAnnouncements(data)
      setLoading(false)
    }
    if (user) fetch()
  }, [user])

  const now = new Date()

  const filtered = announcements.filter(a => {
    if (hideReminders) {
      const isReminder = a.sub_type === 'reminder' || (!a.sub_type && !a.due_date)
      if (isReminder) return false
    }
    if (filter === 'upcoming') return !a.due_date || new Date(a.due_date) >= now
    if (filter === 'past') return a.due_date && new Date(a.due_date) < now
    return true
  })

  const reminderCount = announcements.filter(a =>
    a.sub_type === 'reminder' || (!a.sub_type && !a.due_date)
  ).length

  return (
    <div style={{ paddingTop: 12 }}>

      {/* ── Header card ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0D7377 0%, #0A5C60 100%)',
        borderRadius: 12, padding: '20px 20px 18px',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Megaphone size={24} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 20, color: 'white' }}>
              Announcements
            </p>
            <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
              From your enrolled subjects
            </p>
          </div>
          {!loading && (
            <span style={{
              background: 'rgba(255,255,255,0.2)', color: 'white',
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13,
              padding: '4px 12px', borderRadius: 20,
            }}>
              {filtered.length}
            </span>
          )}
        </div>

        {/* Hide Reminders toggle */}
        {!loading && reminderCount > 0 && (
          <button
            onClick={() => setHideReminders(h => !h)}
            style={{
              marginTop: 12,
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: hideReminders ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.15)',
              color: hideReminders ? '#0D7377' : 'rgba(255,255,255,0.9)',
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 12,
              transition: 'all 0.15s',
            }}
          >
            {hideReminders
              ? <><Eye size={14} /> Show Reminders ({reminderCount})</>
              : <><EyeOff size={14} /> Hide Reminders ({reminderCount})</>
            }
          </button>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div style={{
        background: 'white', borderRadius: 12,
        border: '1px solid #DADDE1', marginBottom: 8,
        display: 'flex', padding: 6, gap: 4,
      }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 14,
              background: filter === f.key ? '#0D7377' : 'transparent',
              color: filter === f.key ? 'white' : '#65676B',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Active hint bar */}
      {hideReminders && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 10, marginBottom: 8,
          background: '#E6F4F4', border: '1px solid #CCE9E9',
        }}>
          <EyeOff size={14} color="#0D7377" />
          <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#0D7377', fontWeight: 600 }}>
            {reminderCount} reminder{reminderCount !== 1 ? 's' : ''} hidden — showing deadlines only
          </span>
          <button
            onClick={() => setHideReminders(false)}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 700,
              color: '#0D7377', textDecoration: 'underline', padding: 0,
            }}
          >
            Show all
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1].map(i => <PostSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          emoji={hideReminders ? '📅' : '📭'}
          title={hideReminders ? 'No deadlines' : 'No announcements'}
          subtitle={
            hideReminders
              ? 'No deadlines yet — reminders are hidden'
              : announcements.length === 0
                ? 'Enroll in subjects to see their announcements'
                : 'No announcements match this filter'
          }
          action={hideReminders ? { label: 'Show reminders too', onClick: () => setHideReminders(false) } : null}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(post => <PostCard key={post.id} post={post} currentUserId={user?.id} />)}
        </div>
      )}
    </div>
  )
}

function EmptyState({ emoji, title, subtitle, action }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, border: '1px solid #DADDE1',
      padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>{emoji}</div>
      <p style={{ margin: '0 0 6px', fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 700, fontSize: 17, color: '#050505' }}>
        {title}
      </p>
      <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#65676B' }}>
        {subtitle}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: 16, padding: '8px 20px', borderRadius: 8, border: 'none',
            background: '#0D7377', color: 'white', cursor: 'pointer',
            fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13,
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
