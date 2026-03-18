import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import { PostSkeleton } from '../components/Skeletons'
import {
  BookMarked, BookOpen, Plus, Minus, FileText, Image, Layers,
  ChevronLeft, File, AppWindow, Loader2, Search, X
} from 'lucide-react'
import toast from 'react-hot-toast'

const SUBJECT_COLORS = [
  { bg: '#E0F0F0', icon: '#0D7377', bar: 'linear-gradient(135deg,#0D7377,#0A5C60)' }, // jade
  { bg: '#DDE4EA', icon: '#3D5166', bar: 'linear-gradient(135deg,#3D5166,#2C3E50)' }, // slate
  { bg: '#D8EDE6', icon: '#2D6A4F', bar: 'linear-gradient(135deg,#2D6A4F,#1B4332)' }, // forest
  { bg: '#DCEAF5', icon: '#2E5F8A', bar: 'linear-gradient(135deg,#2E5F8A,#1A3A5C)' }, // steel
  { bg: '#EDE4D8', icon: '#7A5C42', bar: 'linear-gradient(135deg,#7A5C42,#4A3728)' }, // brown
  { bg: '#E4E0EB', icon: '#5C4A7A', bar: 'linear-gradient(135deg,#5C4A7A,#3D2B5E)' }, // muted violet
]

function getColor(name) {
  return SUBJECT_COLORS[name.charCodeAt(0) % SUBJECT_COLORS.length]
}

export default function EnrolledSubjectsPage() {
  const { user } = useAuth()
  const [allSubjects, setAllSubjects] = useState([])
  const [enrolledIds, setEnrolledIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: subjects }, { data: enrolled }] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('user_subjects').select('subject_id').eq('user_id', user.id),
      ])
      if (subjects) setAllSubjects(subjects)
      if (enrolled) setEnrolledIds(new Set(enrolled.map(e => e.subject_id)))
      setLoading(false)
    }
    if (user) load()
  }, [user])

  async function toggle(subjectId, enrolled) {
    setToggling(subjectId)
    try {
      if (enrolled) {
        await supabase.from('user_subjects').delete()
          .eq('user_id', user.id).eq('subject_id', subjectId)
        setEnrolledIds(prev => { const s = new Set(prev); s.delete(subjectId); return s })
        toast.success('Unenrolled')
        if (selected?.id === subjectId) setSelected(null)
      } else {
        await supabase.from('user_subjects').insert({ user_id: user.id, subject_id: subjectId })
        setEnrolledIds(prev => new Set([...prev, subjectId]))
        toast.success('Enrolled!')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setToggling(null)
    }
  }

  const filtered = allSubjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  )
  const enrolledSubjects = filtered.filter(s => enrolledIds.has(s.id))
  const availableSubjects = filtered.filter(s => !enrolledIds.has(s.id))

  if (selected) {
    return (
      <SubjectDetail
        subject={selected}
        isEnrolled={enrolledIds.has(selected.id)}
        userId={user.id}
        onBack={() => setSelected(null)}
        onToggle={() => toggle(selected.id, enrolledIds.has(selected.id))}
      />
    )
  }

  return (
    <div style={{ paddingTop: 12 }}>

      {/* Header */}
      <div style={{
        background: 'white', borderRadius: 12, border: '1px solid #DADDE1',
        padding: '16px 20px', marginBottom: 8,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: '#E6F4F4',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <BookMarked size={22} color="#0D7377" />
          </div>
          <div>
            <p style={{ margin: 0, fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 20, color: '#050505' }}>
              Subjects
            </p>
            <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#65676B' }}>
              {enrolledIds.size} enrolled · {allSubjects.length} total
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#F0F2F5', borderRadius: 22,
          padding: '0 14px', height: 40,
        }}>
          <Search size={16} color="#65676B" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search subjects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#050505',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <X size={15} color="#65676B" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2].map(i => <SubjectSkeleton key={i} />)}
        </div>
      ) : (
        <>
          {/* Enrolled section */}
          {enrolledSubjects.length > 0 && (
            <Section title="Enrolled" count={enrolledSubjects.length}>
              {enrolledSubjects.map(s => (
                <SubjectRow
                  key={s.id} subject={s} enrolled
                  toggling={toggling === s.id}
                  onToggle={() => toggle(s.id, true)}
                  onClick={() => setSelected(s)}
                />
              ))}
            </Section>
          )}

          {/* Available section */}
          {availableSubjects.length > 0 && (
            <Section title={enrolledIds.size > 0 ? 'Available to Join' : 'All Subjects'} count={availableSubjects.length}>
              {availableSubjects.map(s => (
                <SubjectRow
                  key={s.id} subject={s} enrolled={false}
                  toggling={toggling === s.id}
                  onToggle={() => toggle(s.id, false)}
                  onClick={() => setSelected(s)}
                />
              ))}
            </Section>
          )}

          {filtered.length === 0 && (
            <EmptyCard emoji="🔍" title="No subjects found" subtitle="Try a different search term" />
          )}
        </>
      )}
    </div>
  )
}

function Section({ title, count, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', marginBottom: 6 }}>
        <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 12, color: '#65676B', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {title}
        </span>
        <span style={{
          background: '#E4E6EB', color: '#65676B',
          fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 11,
          padding: '1px 7px', borderRadius: 10,
        }}>
          {count}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </div>
    </div>
  )
}

function SubjectRow({ subject, enrolled, toggling, onToggle, onClick }) {
  const color = getColor(subject.name)
  const [btnHovered, setBtnHovered] = useState(false)
  const [rowHovered, setRowHovered] = useState(false)

  return (
    <div
      style={{
        background: 'white', borderRadius: 12,
        border: `1.5px solid ${enrolled ? '#7EC8C8' : '#DADDE1'}`,
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={() => setRowHovered(true)}
      onMouseLeave={() => setRowHovered(false)}
    >
      {/* Icon */}
      <div
        onClick={onClick}
        style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: color.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <BookOpen size={20} color={color.icon} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onClick}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 14, color: '#050505' }}>
            {subject.name}
          </span>
          {enrolled && (
            <span style={{
              background: '#F0FDF4', color: '#16a34a',
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 10,
              padding: '2px 7px', borderRadius: 10, letterSpacing: 0.3,
            }}>
              ✓ Enrolled
            </span>
          )}
        </div>
        {subject.description && (
          <p style={{
            margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 12,
            color: '#65676B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {subject.description}
          </p>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        disabled={!!toggling}
        onMouseEnter={() => setBtnHovered(true)}
        onMouseLeave={() => setBtnHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '7px 14px', borderRadius: 8, border: 'none', cursor: toggling ? 'not-allowed' : 'pointer',
          fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13,
          background: enrolled
            ? btnHovered ? '#FEE2E2' : '#FFF1F2'
            : btnHovered ? '#CCE9E9' : '#E6F4F4',
          color: enrolled ? '#e11d48' : '#0D7377',
          flexShrink: 0, transition: 'background 0.12s',
        }}
      >
        {toggling
          ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
          : enrolled ? <Minus size={13} /> : <Plus size={13} />
        }
        {enrolled ? 'Leave' : 'Join'}
      </button>
    </div>
  )
}

/* ── Subject Detail ── */
const TABS = [
  { key: 'posts', label: 'Posts', icon: FileText },
  { key: 'media', label: 'Media', icon: Image },
  { key: 'files', label: 'Files', icon: File },
  { key: 'apps', label: 'Apps', icon: AppWindow },
]

function SubjectDetail({ subject, isEnrolled, userId, onBack, onToggle }) {
  const [activeTab, setActiveTab] = useState('posts')
  const [posts, setPosts] = useState([])
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const color = getColor(subject.name)

  useEffect(() => {
    async function load() {
      const [{ data: postsData }, { data: appsData }] = await Promise.all([
        supabase.from('posts').select('*, profiles(*), subjects(*)')
          .eq('subject_id', subject.id).order('created_at', { ascending: false }),
        supabase.from('apps').select('*').eq('subject_id', subject.id),
      ])
      if (postsData) setPosts(postsData)
      if (appsData) setApps(appsData)
      setLoading(false)
    }
    load()
  }, [subject.id])

  const filePosts = posts.filter(p => p.file_url)
  const mediaPosts = posts.filter(p => p.photo_url)

  return (
    <div style={{ paddingTop: 12 }}>

      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 4px',
          fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 14, color: '#0D7377',
        }}
      >
        <ChevronLeft size={17} /> All Subjects
      </button>

      {/* Subject header card */}
      <div style={{
        background: 'white', borderRadius: 12, border: '1px solid #DADDE1',
        overflow: 'hidden', marginBottom: 8,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      }}>
        {/* Color bar */}
        <div style={{ height: 6, background: color.bar }} />

        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: color.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BookOpen size={24} color={color.icon} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: '#050505' }}>
                {subject.name}
              </p>
              {subject.description && (
                <p style={{ margin: '4px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#65676B', lineHeight: 1.4 }}>
                  {subject.description}
                </p>
              )}
            </div>
            <ToggleBtn enrolled={isEnrolled} onToggle={onToggle} />
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderTop: '1px solid #F0F2F5', overflowX: 'auto' }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '12px 8px', border: 'none', cursor: 'pointer', background: 'transparent',
                fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13,
                color: activeTab === key ? '#0D7377' : '#65676B',
                borderBottom: `2px solid ${activeTab === key ? '#0D7377' : 'transparent'}`,
                whiteSpace: 'nowrap', transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {!isEnrolled ? (
        <LockedState onJoin={onToggle} />
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1].map(i => <PostSkeleton key={i} />)}
        </div>
      ) : (
        <TabContent
          activeTab={activeTab}
          posts={posts}
          filePosts={filePosts}
          mediaPosts={mediaPosts}
          apps={apps}
          userId={userId}
          color={color}
        />
      )}
    </div>
  )
}

function ToggleBtn({ enrolled, onToggle }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
        fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13,
        background: enrolled
          ? hovered ? '#FEE2E2' : '#FFF1F2'
          : hovered ? '#CCE9E9' : '#E6F4F4',
        color: enrolled ? '#e11d48' : '#0D7377',
        flexShrink: 0, transition: 'background 0.12s',
      }}
    >
      {enrolled ? <Minus size={13} /> : <Plus size={13} />}
      {enrolled ? 'Leave' : 'Join'}
    </button>
  )
}

function TabContent({ activeTab, posts, filePosts, mediaPosts, apps, userId, color }) {
  if (activeTab === 'posts') {
    return posts.length === 0
      ? <EmptyCard emoji="📝" title="No posts yet" subtitle="Nothing shared in this subject yet" />
      : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{posts.map(p => <PostCard key={p.id} post={p} currentUserId={userId} />)}</div>
  }

  if (activeTab === 'media') {
    if (mediaPosts.length === 0) return <EmptyCard emoji="🖼️" title="No media yet" subtitle="No photos shared in this subject" />
    const allPhotos = mediaPosts.flatMap(p => {
      try { const parsed = JSON.parse(p.photo_url); return Array.isArray(parsed) ? parsed : [p.photo_url] }
      catch { return [p.photo_url] }
    })
    return (
      <div style={{
        background: 'white', borderRadius: 12, border: '1px solid #DADDE1',
        padding: 8, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4,
      }}>
        {allPhotos.map((url, i) => (
          <div key={i} style={{ aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', background: '#F0F2F5' }}>
            <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" loading="lazy" />
          </div>
        ))}
      </div>
    )
  }

  if (activeTab === 'files') {
    return filePosts.length === 0
      ? <EmptyCard emoji="📎" title="No files yet" subtitle="No files uploaded in this subject" />
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filePosts.map(p => <FileCard key={p.id} post={p} />)}
        </div>
      )
  }

  if (activeTab === 'apps') {
    return apps.length === 0
      ? <EmptyCard emoji="🧩" title="No apps linked" subtitle="No apps connected to this subject yet" />
      : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {apps.map(app => (
            <a key={app.id} href={app.url} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 12, textDecoration: 'none',
                background: 'white', border: '1px solid #DADDE1',
              }}>
              {app.icon_url
                ? <img src={app.icon_url} style={{ width: 36, height: 36, borderRadius: 10 }} alt={app.name} />
                : <div style={{ width: 36, height: 36, borderRadius: 10, background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AppWindow size={18} color={color.icon} />
                  </div>
              }
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13, color: '#050505', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {app.name}
                </p>
                <p style={{ margin: '1px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 11, color: '#65676B' }}>Open app</p>
              </div>
            </a>
          ))}
        </div>
      )
  }
}

function FileCard({ post }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a href={post.file_url} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 12, textDecoration: 'none',
        background: hovered ? '#F7F8FA' : 'white',
        border: `1px solid ${hovered ? '#7EC8C8' : '#DADDE1'}`,
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: '#E6F4F4', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <FileText size={18} color="#0D7377" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 14, color: '#050505', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {post.file_name || 'Attachment'}
        </p>
        {post.caption && (
          <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#65676B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {post.caption}
          </p>
        )}
      </div>
      <File size={15} color={hovered ? '#0D7377' : '#BCC0C4'} style={{ flexShrink: 0, transition: 'color 0.15s' }} />
    </a>
  )
}

function LockedState({ onJoin }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, border: '1px solid #DADDE1',
      padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>🔒</div>
      <p style={{ margin: '0 0 6px', fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 700, fontSize: 17, color: '#050505' }}>
        Enroll to see content
      </p>
      <p style={{ margin: '0 0 20px', fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#65676B' }}>
        Join this subject to access posts, files, and apps.
      </p>
      <button onClick={onJoin} style={{
        padding: '11px 28px', borderRadius: 10, border: 'none',
        background: '#0D7377', color: 'white', cursor: 'pointer',
        fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 15,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <Plus size={16} /> Join Subject
      </button>
    </div>
  )
}

function EmptyCard({ emoji, title, subtitle }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, border: '1px solid #DADDE1',
      padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>{emoji}</div>
      <p style={{ margin: '0 0 6px', fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 700, fontSize: 17, color: '#050505' }}>{title}</p>
      <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#65676B' }}>{subtitle}</p>
    </div>
  )
}

function SubjectSkeleton() {
  const bar = (w, h, r = 6) => (
    <div style={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
      background: 'linear-gradient(90deg,#F0F2F5 25%,#E4E6EB 50%,#F0F2F5 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
  return (
    <div style={{
      background: 'white', borderRadius: 12, border: '1px solid #DADDE1',
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4,
    }}>
      {bar(44, 44, 12)}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {bar('50%', 14)}
        {bar('70%', 11)}
      </div>
      {bar(60, 34, 8)}
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    </div>
  )
}
