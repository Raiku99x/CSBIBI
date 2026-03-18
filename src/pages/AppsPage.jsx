import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Grid3X3, ExternalLink, AppWindow } from 'lucide-react'

export default function AppsPage() {
  const { user } = useAuth()
  const [grouped, setGrouped] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: enrolled } = await supabase
        .from('user_subjects').select('subject_id, subjects(*)').eq('user_id', user.id)
      if (!enrolled?.length) { setLoading(false); return }

      const subjectIds = enrolled.map(e => e.subject_id)
      const { data: apps } = await supabase
        .from('apps').select('*, subjects(*)').in('subject_id', subjectIds)

      setGrouped(enrolled.map(e => ({
        subject: e.subjects,
        apps: apps?.filter(a => a.subject_id === e.subject_id) || [],
      })))
      setLoading(false)
    }
    if (user) load()
  }, [user])

  const totalApps = grouped.reduce((n, g) => n + g.apps.length, 0)

  return (
    <div style={{ paddingTop: 12 }}>

      {/* Header */}
      <div style={{
        background: 'white', borderRadius: 12, border: '1px solid #DADDE1',
        padding: '16px 20px', marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: '#1c1e21',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Grid3X3 size={22} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 20, color: '#050505' }}>
            Apps
          </p>
          <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#65676B' }}>
            Tools linked to your subjects
          </p>
        </div>
        {!loading && totalApps > 0 && (
          <span style={{
            background: '#F0F2F5', color: '#050505',
            fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13,
            padding: '4px 12px', borderRadius: 20,
          }}>
            {totalApps} apps
          </span>
        )}
      </div>

      {loading ? (
        <AppsSkeleton />
      ) : grouped.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {grouped.map(({ subject, apps }) => (
            <div key={subject.id} style={{
              background: 'white', borderRadius: 12, border: '1px solid #DADDE1',
              overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}>
              {/* Subject header */}
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid #F0F2F5',
                background: '#FAFAFA',
              }}>
                <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 14, color: '#050505' }}>
                  {subject.name}
                </p>
              </div>

              {apps.length === 0 ? (
                <p style={{
                  margin: 0, padding: '16px', fontFamily: '"Instrument Sans", system-ui',
                  fontSize: 13, color: '#BCC0C4', fontStyle: 'italic',
                }}>
                  No apps linked yet
                </p>
              ) : (
                <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {apps.map(app => (
                    <AppCard key={app.id} app={app} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AppCard({ app }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={app.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
        border: `1.5px solid ${hovered ? '#7EC8C8' : '#E4E6EB'}`,
        background: hovered ? '#E6F4F4' : '#F7F8FA',
        transition: 'all 0.15s',
      }}
    >
      {app.icon_url ? (
        <img src={app.icon_url} style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} alt={app.name} />
      ) : (
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: '#E6F4F4', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AppWindow size={18} color="#0D7377" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13,
          color: '#050505', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {app.name}
        </p>
      </div>
      <ExternalLink size={13} color={hovered ? '#0D7377' : '#BCC0C4'} style={{ flexShrink: 0, transition: 'color 0.15s' }} />
    </a>
  )
}

function AppsSkeleton() {
  const bar = (w, h, r = 8) => (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,#F0F2F5 25%,#E4E6EB 50%,#F0F2F5 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[0, 1].map(i => (
        <div key={i} style={{ background: 'white', borderRadius: 12, border: '1px solid #DADDE1', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0F2F5', background: '#FAFAFA' }}>
            {bar('40%', 14)}
          </div>
          <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[0, 1].map(j => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#F7F8FA', border: '1px solid #E4E6EB' }}>
                {bar(36, 36, 10)}
                {bar('60%', 13)}
              </div>
            ))}
          </div>
        </div>
      ))}
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      background: 'white', borderRadius: 12, border: '1px solid #DADDE1',
      padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>🧩</div>
      <p style={{ margin: '0 0 6px', fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 700, fontSize: 17, color: '#050505' }}>
        No apps available
      </p>
      <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#65676B' }}>
        Enroll in subjects to see their linked apps
      </p>
    </div>
  )
}
