import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import { PostSkeleton } from '../components/Skeletons'
import { Megaphone, EyeOff, Eye, Clock, Bell } from 'lucide-react'

const RED = '#C0392B'
const FILTERS = [
  { key: 'all',      label: 'All',         icon: <Megaphone size={13} /> },
  { key: 'upcoming', label: 'Upcoming',    icon: <Clock size={13} /> },
  { key: 'past',     label: 'Past Due',    icon: <Bell size={13} /> },
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
      if (a.sub_type === 'reminder' || (!a.sub_type && !a.due_date)) return false
    }
    if (filter === 'upcoming') return !a.due_date || new Date(a.due_date) >= now
    if (filter === 'past')     return a.due_date && new Date(a.due_date) < now
    return true
  })

  const reminderCount = announcements.filter(a =>
    a.sub_type === 'reminder' || (!a.sub_type && !a.due_date)
  ).length

  const deadlineCount  = announcements.filter(a => a.sub_type === 'deadline').length
  const upcomingCount  = announcements.filter(a => a.due_date && new Date(a.due_date) >= now).length
  const pastDueCount   = announcements.filter(a => a.due_date && new Date(a.due_date) < now).length

  return (
    <div style={{ paddingTop: 14 }}>

      {/* ── Header Card ── */}
      <div style={{
        borderRadius: 14, overflow: 'hidden', marginBottom: 10,
        boxShadow: '0 2px 12px rgba(192,57,43,0.18)',
      }}>
        {/* Gradient top */}
        <div style={{
          background: `linear-gradient(135deg, ${RED} 0%, #1A5276 100%)`,
          padding: '18px 20px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12, flexShrink: 0,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.25)',
            }}>
              <Megaphone size={22} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                margin: 0,
                fontFamily: '"Bricolage Grotesque", system-ui',
                fontWeight: 800, fontSize: 20, color: 'white',
              }}>Announcements</p>
              <p style={{
                margin: '2px 0 0',
                fontFamily: '"Instrument Sans", system-ui',
                fontSize: 13, color: 'rgba(255,255,255,0.7)',
              }}>From your enrolled subjects</p>
            </div>
            {!loading && (
              <div style={{
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: 'white', padding: '4px 12px', borderRadius: 20,
                fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13,
              }}>
                {filtered.length}
              </div>
            )}
          </div>

          {/* Stats row */}
          {!loading && announcements.length > 0 && (
            <div style={{
              display: 'flex', gap: 8, paddingBottom: 16,
            }}>
              {[
                { label: 'Deadlines', count: deadlineCount, emoji: '📅' },
                { label: 'Upcoming', count: upcomingCount, emoji: '⏰' },
                { label: 'Past Due', count: pastDueCount, emoji: '⚠️' },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 10, padding: '8px 10px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{s.emoji}</div>
                  <div style={{
                    fontFamily: '"Bricolage Grotesque", system-ui',
                    fontWeight: 800, fontSize: 18, color: 'white', lineHeight: 1,
                  }}>{s.count}</div>
                  <div style={{
                    fontFamily: '"Instrument Sans", system-ui',
                    fontSize: 10.5, color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginTop: 2,
                  }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{
          background: 'white', padding: '12px 16px',
          borderTop: '1px solid #F0F2F5',
          display: 'flex', alignItems: 'center', gap: 10,
          flexWrap: 'wrap',
        }}>
          {/* Filter tabs */}
          <div style={{
            display: 'flex', background: '#F0F2F5',
            borderRadius: 8, padding: 3, gap: 2, flex: 1,
          }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '7px 6px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 12.5,
                background: filter === f.key ? 'white' : 'transparent',
                color: filter === f.key ? '#050505' : '#65676B',
                boxShadow: filter === f.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}>
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          {/* Hide reminders toggle */}
          {!loading && reminderCount > 0 && (
            <button onClick={() => setHideReminders(h => !h)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: hideReminders ? '#FADBD8' : '#F0F2F5',
              color: hideReminders ? RED : '#65676B',
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 12.5,
              flexShrink: 0, transition: 'all 0.15s',
            }}>
              {hideReminders ? <Eye size={13} /> : <EyeOff size={13} />}
              {hideReminders ? 'Show reminders' : 'Hide reminders'}
            </button>
          )}
        </div>
      </div>

      {/* ── Active filter hint ── */}
      {hideReminders && reminderCount > 0 && !loading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 14px', borderRadius: 10, marginBottom: 10,
          background: '#FFF8F8',
          border: '1px solid #FADBD8',
        }}>
          <EyeOff size={13} color={RED} />
          <span style={{
            fontFamily: '"Instrument Sans", system-ui',
            fontSize: 12.5, color: RED, fontWeight: 600, flex: 1,
          }}>
            {reminderCount} reminder{reminderCount !== 1 ? 's' : ''} hidden — showing deadlines only
          </span>
          <button onClick={() => setHideReminders(false)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 700,
            color: RED, padding: 0, textDecoration: 'underline',
          }}>
            Show all
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2].map(i => <PostSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          emoji={hideReminders ? '📅' : '📭'}
          title={hideReminders ? 'No deadlines yet' : 'No announcements'}
          subtitle={
            hideReminders
              ? 'Reminders are hidden. Toggle to show all.'
              : announcements.length === 0
                ? 'Enroll in subjects to see their announcements'
                : 'Nothing matches this filter'
          }
          action={hideReminders ? { label: 'Show all announcements', onClick: () => setHideReminders(false) } : null}
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
      background: 'white', borderRadius: 14, border: '1px solid #E4E6EB',
      padding: '52px 24px', textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    }}>
      <div style={{
        width: 68, height: 68, borderRadius: 18,
        background: 'linear-gradient(135deg, #FADBD8, #EBF5FB)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px', fontSize: 30,
        border: '1.5px solid #E4E6EB',
      }}>
        {emoji}
      </div>
      <p style={{
        margin: '0 0 6px',
        fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: '#050505',
      }}>{title}</p>
      <p style={{
        margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#65676B',
      }}>{subtitle}</p>
      {action && (
        <button onClick={action.onClick} style={{
          marginTop: 18, padding: '10px 22px', borderRadius: 9, border: 'none',
          background: RED, color: 'white', cursor: 'pointer',
          fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13.5,
          boxShadow: '0 4px 14px rgba(192,57,43,0.25)',
          transition: 'transform 0.1s',
        }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
