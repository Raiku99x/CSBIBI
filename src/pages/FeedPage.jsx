import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import CreatePostModal from '../components/CreatePostModal'
import { PostSkeleton } from '../components/Skeletons'
import { Image, Megaphone, Paperclip } from 'lucide-react'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','922B21','C0392B']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

const RED = '#C0392B'

export default function FeedPage() {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createType, setCreateType] = useState('status')
  const [createSubType, setCreateSubType] = useState('')
  const [autoOpenPhoto, setAutoOpenPhoto] = useState(false)
  const [autoOpenFile, setAutoOpenFile] = useState(false)

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('posts').select('*, profiles(*), subjects(*)')
      .order('created_at', { ascending: false }).limit(50)
    if (data) setPosts(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPosts()
    supabase.from('subjects').select('*').order('name').then(({ data }) => { if (data) setSubjects(data) })
    const channel = supabase.channel('feed-posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        const { data } = await supabase.from('posts').select('*, profiles(*), subjects(*)').eq('id', payload.new.id).single()
        if (data) setPosts(prev => [data, ...prev])
      }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchPosts])

  function openCreate(type = 'status', subType = '') {
    setCreateType(type)
    setCreateSubType(subType)
    setShowCreate(true)
  }
  function handlePhotoClick() { setAutoOpenPhoto(true); setAutoOpenFile(false); openCreate('status', '') }
  function handleFileClick() { setAutoOpenFile(true); setAutoOpenPhoto(false); openCreate('status', '') }
  function handleModalClose() { setShowCreate(false); setAutoOpenPhoto(false); setAutoOpenFile(false) }

  const firstName = profile?.display_name?.split(' ')[0] || 'there'

  return (
    <div style={{ paddingTop: 6 }}>

      {/* ── Compose Card ── */}
      <div style={{
        background: 'white',
        borderTop: '1px solid #E4E6EB',
        borderBottom: '1px solid #E4E6EB',
        marginBottom: 6,
      }}>
        {/* Input row */}
        <div style={{ padding: '10px 12px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img
            src={profile?.avatar_url || dicebearUrl(profile?.display_name)}
            alt=""
            style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1.5px solid #F0F2F5' }}
          />
          <button
            onClick={() => openCreate('status', '')}
            style={{
              flex: 1, height: 38,
              background: '#F0F2F5', border: 'none',
              borderRadius: 20, padding: '0 14px',
              textAlign: 'left', cursor: 'pointer',
              fontSize: 14, color: '#8A8D91',
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 500,
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#E4E6EB'}
            onMouseLeave={e => e.currentTarget.style.background = '#F0F2F5'}
          >
            What's on your mind, {firstName}?
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#F0F2F5', margin: '0 12px' }} />

        {/* Action buttons */}
        <div style={{ display: 'flex', padding: '4px 6px 6px' }}>
          <ComposeBtn icon={<Paperclip size={18} />} color="#1877F2" bg="#EBF5FD" label="File" onClick={handleFileClick} />
          <ComposeBtn icon={<Image size={18} />} color="#16A34A" bg="#DCFCE7" label="Photo" onClick={handlePhotoClick} />
          {/* Pass empty subType so modal opens with no sub-type pre-selected */}
          <ComposeBtn icon={<Megaphone size={18} />} color={RED} bg="#FADBD8" label="Announce" onClick={() => openCreate('announcement', '')} />
        </div>
      </div>

      {/* ── Feed ── */}
      {loading ? (
        <div>{Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)}</div>
      ) : posts.length === 0 ? (
        <EmptyFeed onPost={() => openCreate('status', '')} />
      ) : (
        <div>
          {posts.map(post => <PostCard key={post.id} post={post} currentUserId={user?.id} subjects={subjects} />)}
          <div style={{ padding: '16px 0 8px', textAlign: 'center' }}>
            <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#BCC0C4' }}>
              · {posts.length} posts · You're all caught up ·
            </span>
          </div>
        </div>
      )}

      {showCreate && (
        <CreatePostModal
          onClose={handleModalClose}
          onCreated={() => {}}
          subjects={subjects}
          defaultType={createType}
          defaultSubType={createSubType}
          autoOpenPhoto={autoOpenPhoto}
          autoOpenFile={autoOpenFile}
        />
      )}
    </div>
  )
}

function ComposeBtn({ icon, color, bg, label, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '8px 4px', border: 'none', cursor: 'pointer',
      background: hovered ? bg : 'transparent',
      borderRadius: 7, transition: 'background 0.15s',
      fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13,
      color: hovered ? color : '#65676B',
    }}>
      <span style={{ color: hovered ? color : '#8A8D91', transition: 'color 0.15s' }}>{icon}</span>
      {label}
    </button>
  )
}

function EmptyFeed({ onPost }) {
  return (
    <div style={{ background: 'white', borderTop: '1px solid #E4E6EB', borderBottom: '1px solid #E4E6EB', padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
      <p style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 17, color: '#050505', margin: '0 0 5px' }}>No posts yet</p>
      <p style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 13.5, color: '#65676B', margin: '0 0 18px' }}>Be the first to share something.</p>
      <button onClick={onPost} style={{
        padding: '9px 22px', borderRadius: 8, border: 'none',
        background: RED, color: 'white', cursor: 'pointer',
        fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13.5,
        boxShadow: '0 3px 12px rgba(192,57,43,0.28)',
      }}>
        Create Post
      </button>
    </div>
  )
}
