import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import UserProfilePage from './UserProfilePage'
import { PostSkeleton } from '../components/Skeletons'
import { X, Heart } from 'lucide-react'

const RED = '#C0392B'

export default function LikedPostsPage({ onClose }) {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewingUserId, setViewingUserId] = useState(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    async function load() {
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id)
      if (!likes?.length) { setLoading(false); return }
      const ids = likes.map(l => l.post_id)
      const { data } = await supabase
        .from('posts').select('*, profiles(*), subjects(*)')
        .in('id', ids)
        .order('created_at', { ascending: false })
      if (data) setPosts(data)
      setLoading(false)
    }
    load()
  }, [user.id])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'var(--page-bg, #F0F2F5)',
      display: 'flex', flexDirection: 'column',
      animation: 'fullscreenIn 0.22s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--card-bg, white)',
        borderBottom: '1px solid var(--border, #E4E6EB)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FADBD8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={17} color={RED} fill={RED} />
          </div>
          <div>
            <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: 'var(--text-primary, #050505)' }}>
              Liked Posts
            </span>
            {!loading && (
              <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: 'var(--text-secondary, #65676B)' }}>
                {posts.length} liked
              </p>
            )}
          </div>
        </div>
        <button onClick={onClose}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface, #E4E6EB)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => e.currentTarget.style.background = '#CED0D4'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface, #E4E6EB)'}
        >
          <X size={18} color="var(--text-primary, #050505)" />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
        {loading ? (
          <div>{[0,1,2].map(i => <PostSkeleton key={i} />)}</div>
        ) : posts.length === 0 ? (
          <div style={{ padding: '80px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❤️</div>
            <p style={{ margin: '0 0 6px', fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: 'var(--text-primary, #050505)' }}>No liked posts yet</p>
            <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: 'var(--text-secondary, #65676B)' }}>Posts you like will appear here</p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              onUserClick={(p) => setViewingUserId(p?.id)}
            />
          ))
        )}
      </div>

      {viewingUserId && (
        <UserProfilePage
          userId={viewingUserId}
          onClose={() => setViewingUserId(null)}
        />
      )}

      <style>{`
        @keyframes fullscreenIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
