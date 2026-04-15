import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import UserProfilePage from './UserProfilePage'
import { PostSkeleton } from '../components/Skeletons'
import { X, Heart } from 'lucide-react'

const RED = '#C0392B'
const PAGE_SIZE = 20

export default function LikedPostsPage({ onClose }) {
  const { user } = useAuth()
  const [posts, setPosts]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]         = useState(true)
  const [totalCount, setTotalCount]   = useState(0)
  const [viewingUserId, setViewingUserId] = useState(null)
  const [subjects, setSubjects]       = useState([])
  const sentinelRef  = useRef(null)
  const loadingRef   = useRef(false)
  const hasMoreRef   = useRef(true)
  const cursorRef    = useRef(null)  // created_at of last like row fetched

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    supabase.from('subjects').select('*').order('name')
      .then(({ data }) => { if (data) setSubjects(data) })
  }, [])

  // Fetch liked post IDs ordered by like created_at desc, paginated
  async function fetchLikedPosts(cursor = null, replace = false) {
    if (replace) setLoading(true)
    else setLoadingMore(true)

    let q = supabase
      .from('likes')
      .select('post_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (cursor) q = q.lt('created_at', cursor)

    const { data: likeRows } = await q
    if (!likeRows || likeRows.length === 0) {
      setHasMore(false)
      hasMoreRef.current = false
      setLoading(false)
      setLoadingMore(false)
      loadingRef.current = false
      return
    }

    const ids = likeRows.map(l => l.post_id)
    cursorRef.current = likeRows[likeRows.length - 1].created_at

    const { data: postsData } = await supabase
      .from('posts')
      .select('*, profiles!posts_author_id_fkey(*), subjects!posts_subject_id_fkey(*)')
      .in('id', ids)

    // Preserve order from likes
    const postMap = {}
    ;(postsData || []).forEach(p => { postMap[p.id] = p })
    const ordered = ids.map(id => postMap[id]).filter(Boolean)

    const more = likeRows.length === PAGE_SIZE

    if (replace) {
      setPosts(ordered)
    } else {
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id))
        return [...prev, ...ordered.filter(p => !existingIds.has(p.id))]
      })
    }
    setHasMore(more)
    hasMoreRef.current = more
    setLoading(false)
    setLoadingMore(false)
    loadingRef.current = false
  }

  useEffect(() => {
    // Get total count for display
    supabase.from('likes').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      .then(({ count }) => setTotalCount(count || 0))
    fetchLikedPosts(null, true)
  }, [user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingRef.current && hasMoreRef.current) {
        loadingRef.current = true
        fetchLikedPosts(cursorRef.current)
      }
    }, { rootMargin: '300px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--page-bg, #F0F2F5)', display: 'flex', flexDirection: 'column', animation: 'fullscreenIn 0.22s cubic-bezier(0.16,1,0.3,1)' }}>
      <div style={{ background: 'var(--card-bg, white)', borderBottom: '1px solid var(--border, #E4E6EB)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FADBD8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={17} color={RED} fill={RED} />
          </div>
          <div>
            <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: 'var(--text-primary, #050505)' }}>Liked Posts</span>
            {!loading && <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: 'var(--text-secondary, #65676B)' }}>{totalCount} liked</p>}
          </div>
        </div>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface, #E4E6EB)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => e.currentTarget.style.background = '#CED0D4'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface, #E4E6EB)'}>
          <X size={18} color="var(--text-primary, #050505)" />
        </button>
      </div>

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
          <>
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                subjects={subjects}
                onUserClick={(p) => setViewingUserId(p?.id)}
              />
            ))}

            {hasMore && (
              <div ref={sentinelRef} style={{ padding: '20px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                {loadingMore && (
                  <>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid #E4E6EB', borderTopColor: RED, animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    <span style={{ fontFamily: '"Instrument Sans",system-ui', fontSize: 12, color: '#BCC0C4' }}>Loading more...</span>
                  </>
                )}
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div style={{ padding: '16px 0 8px', textAlign: 'center' }}>
                <span style={{ fontFamily: '"Instrument Sans",system-ui', fontSize: 12, color: '#BCC0C4' }}>
                  · {posts.length} liked posts · All caught up ·
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {viewingUserId && (
        <UserProfilePage userId={viewingUserId} onClose={() => setViewingUserId(null)} />
      )}

      <style>{`
        @keyframes fullscreenIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
