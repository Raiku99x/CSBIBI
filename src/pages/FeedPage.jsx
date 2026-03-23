import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import CreatePostModal from '../components/CreatePostModal'
import { PostSkeleton } from '../components/Skeletons'
import { Image, Megaphone, Paperclip, TrendingUp } from 'lucide-react'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','5C4A7A','6B5B8A','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','4A3A7A','3E3068']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

const RED = '#C0392B'
const BLUE = '#1A5276'

export default function FeedPage() {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createType, setCreateType] = useState('status')
  const [createSubType, setCreateSubType] = useState('status')
  const [autoOpenPhoto, setAutoOpenPhoto] = useState(false)
  const [autoOpenFile, setAutoOpenFile] = useState(false)

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
            .from('posts').select('*, profiles(*), subjects(*)').eq('id', payload.new.id).single()
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

  function handlePhotoClick() {
    setAutoOpenPhoto(true); setAutoOpenFile(false)
    openCreate('status', 'status')
  }

  function handleFileClick() {
    setAutoOpenFile(true); setAutoOpenPhoto(false)
    openCreate('status', 'material')
  }

  function handleModalClose() {
    setShowCreate(false); setAutoOpenPhoto(false); setAutoOpenFile(false)
  }

  const firstName = profile?.display_name?.split(' ')[0] || 'there'

  return (
    <div style={{ paddingTop: 14, paddingBottom: 8 }}>

      {/* ── Compose Card ── */}
      <div style={{
        background: 'white',
        borderRadius: 14,
        border: '1px solid #E4E6EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        marginBottom: 10,
        overflow: 'hidden',
      }}>
        {/* Top input row */}
        <div style={{ padding: '14px 14px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={profile?.avatar_url || dicebearUrl(profile?.display_name)}
            alt=""
            style={{
              width: 40, height: 40, borderRadius: 12,
              objectFit: 'cover', flexShrink: 0,
              border: '2px solid #F0F2F5',
            }}
          />
          <button
            onClick={() => openCreate('status', 'status')}
            style={{
              flex: 1, height: 42,
              background: '#F0F2F5',
              border: '1.5px solid transparent',
              borderRadius: 10,
              padding: '0 16px',
              textAlign: 'left', cursor: 'pointer',
              fontSize: 14.5, color: '#8A8D91',
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 500,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#E8EAED'
              e.currentTarget.style.borderColor = '#D4D6DA'
              e.currentTarget.style.color = '#65676B'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#F0F2F5'
              e.currentTarget.style.borderColor = 'transparent'
              e.currentTarget.style.color = '#8A8D91'
            }}
          >
            What's on your mind, {firstName}?
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#F0F2F5', margin: '0 14px' }} />

        {/* Action buttons */}
        <div style={{ display: 'flex', padding: '6px 8px 8px' }}>
          <ComposeBtn
            icon={<Paperclip size={19} />}
            color="#1877F2"
            bg="#EBF5FD"
            label="File"
            onClick={handleFileClick}
          />
          <ComposeBtn
            icon={<Image size={19} />}
            color="#16A34A"
            bg="#DCFCE7"
            label="Photo"
            onClick={handlePhotoClick}
          />
          <ComposeBtn
            icon={<Megaphone size={19} />}
            color={RED}
            bg="#FADBD8"
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
          {/* Footer */}
          <div style={{
            padding: '24px 0', textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 16px', borderRadius: 20,
              background: 'white', border: '1px solid #E4E6EB',
            }}>
              <TrendingUp size={13} color="#BCC0C4" />
              <span style={{
                fontFamily: '"Instrument Sans", system-ui',
                fontSize: 12.5, color: '#BCC0C4', fontWeight: 500,
              }}>
                You're all caught up · {posts.length} posts
              </span>
            </div>
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
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        padding: '9px 4px', border: 'none', cursor: 'pointer',
        background: hovered ? bg : 'transparent',
        borderRadius: 8, transition: 'background 0.15s',
        fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13.5,
        color: hovered ? color : '#65676B',
      }}
    >
      <span style={{ color: hovered ? color : '#8A8D91', transition: 'color 0.15s' }}>{icon}</span>
      {label}
    </button>
  )
}

function EmptyFeed({ onPost }) {
  return (
    <div style={{
      background: 'white', borderRadius: 14,
      border: '1px solid #E4E6EB',
      padding: '56px 24px', textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: 'linear-gradient(135deg, #FADBD8, #EBF5FB)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px', fontSize: 32,
        border: '1.5px solid #E4E6EB',
      }}>
        📭
      </div>
      <p style={{
        fontFamily: '"Bricolage Grotesque", system-ui',
        fontWeight: 800, fontSize: 19, color: '#050505', margin: '0 0 6px',
      }}>
        Nothing here yet
      </p>
      <p style={{
        fontFamily: '"Instrument Sans", system-ui',
        fontSize: 14, color: '#65676B', margin: '0 0 24px',
      }}>
        Be the first to share something with the class.
      </p>
      <button
        onClick={onPost}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '11px 24px', borderRadius: 10, border: 'none',
          background: RED, color: 'white', cursor: 'pointer',
          fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 14,
          boxShadow: '0 4px 14px rgba(192,57,43,0.3)',
          transition: 'transform 0.1s, box-shadow 0.15s',
        }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        Create Post
      </button>
    </div>
  )
}
