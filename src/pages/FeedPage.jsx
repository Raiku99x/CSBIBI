import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import CreatePostModal from '../components/CreatePostModal'
import { PostSkeleton } from '../components/Skeletons'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','5C4A7A','6B5B8A','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','4A3A7A','3E3068']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}
import { Image, Megaphone, Paperclip } from 'lucide-react'

export default function FeedPage() {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createType, setCreateType] = useState('status')
  const [createSubType, setCreateSubType] = useState('status')

  // Hidden file inputs on FeedPage — clicking these triggers the modal + auto-fires the picker
  const photoInputRef = useRef()
  const fileInputRef = useRef()

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(*), subjects(*)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setPosts(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPosts()
    supabase.from('subjects').select('*').order('name').then(({ data }) => {
      if (data) setSubjects(data)
    })

    const channel = supabase
      .channel('feed-posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          const { data } = await supabase
            .from('posts')
            .select('*, profiles(*), subjects(*)')
            .eq('id', payload.new.id)
            .single()
          if (data) setPosts(prev => [data, ...prev])
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchPosts])

  function openCreate(type = 'status', subType = 'status') {
    setCreateType(type)
    setCreateSubType(subType)
    setShowCreate(true)
  }

  // Photo button: open native file picker first, then open modal with those files pre-loaded
  // Since CreatePostModal manages its own refs, we open modal with a hint and let it handle it.
  // We pass autoOpenPhoto / autoOpenFile props so modal can trigger its own picker on mount.
  const [autoOpenPhoto, setAutoOpenPhoto] = useState(false)
  const [autoOpenFile, setAutoOpenFile] = useState(false)

  function handlePhotoClick() {
    setAutoOpenPhoto(true)
    setAutoOpenFile(false)
    openCreate('status', 'status')
  }

  function handleFileClick() {
    setAutoOpenFile(true)
    setAutoOpenPhoto(false)
    openCreate('status', 'material')
  }

  function handleModalClose() {
    setShowCreate(false)
    setAutoOpenPhoto(false)
    setAutoOpenFile(false)
  }

  const firstName = profile?.display_name?.split(' ')[0] || 'there'

  return (
    <div style={{ paddingTop: 12, paddingBottom: 8 }}>

      {/* ── Compose card ── */}
      <div style={{
        background: 'white', borderRadius: 12,
        border: '1px solid #DADDE1',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        marginBottom: 8, overflow: 'hidden',
      }}>
        {/* Top row: avatar + input */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={profile?.avatar_url || dicebearUrl(profile?.display_name)}
            alt=""
            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#E4E6EB' }}
          />
          <button
            onClick={() => openCreate('status', 'status')}
            style={{
              flex: 1, height: 40,
              background: '#F0F2F5', border: '1px solid #E4E6EB',
              borderRadius: 20, padding: '0 16px',
              textAlign: 'left', cursor: 'pointer',
              fontSize: 15, color: '#65676B',
              fontFamily: '"Instrument Sans", system-ui',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#E4E6EB'}
            onMouseLeave={e => e.currentTarget.style.background = '#F0F2F5'}
          >
            What's on your mind, {firstName}?
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#E4E6EB', margin: '0 16px' }} />

        {/* Action buttons row */}
        <div style={{ display: 'flex', padding: '6px 8px' }}>
          <ComposeAction
            icon={<Paperclip size={20} color="#1877F2" />}
            label="File"
            onClick={handleFileClick}
          />
          <ComposeAction
            icon={<Image size={20} color="#45BD62" />}
            label="Photo"
            onClick={handlePhotoClick}
          />
          <ComposeAction
            icon={<Megaphone size={20} color="#0D7377" />}
            label="Announce"
            onClick={() => openCreate('announcement', 'reminder')}
          />
        </div>
      </div>

      {/* ── Feed ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <EmptyFeed onPost={() => openCreate('status', 'status')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {posts.map(post => (
            <PostCard key={post.id} post={post} currentUserId={user?.id} />
          ))}
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

function ComposeAction({ icon, label, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '8px 4px', border: 'none', cursor: 'pointer',
        background: hovered ? '#F0F2F5' : 'transparent',
        borderRadius: 8, transition: 'background 0.12s',
        fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13,
        color: '#65676B',
      }}
    >
      {icon} {label}
    </button>
  )
}

function EmptyFeed({ onPost }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12,
      border: '1px solid #DADDE1',
      padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
      <p style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 700, fontSize: 18, color: '#050505', margin: '0 0 6px' }}>
        No posts yet
      </p>
      <p style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#65676B', margin: '0 0 20px' }}>
        Be the first to share something with the class.
      </p>
      <button
        onClick={onPost}
        style={{
          padding: '10px 24px', borderRadius: 8, border: 'none',
          background: '#0D7377', color: 'white', cursor: 'pointer',
          fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 14,
        }}
      >
        Create Post
      </button>
    </div>
  )
}
