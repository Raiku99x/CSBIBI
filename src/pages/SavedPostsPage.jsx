import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useSavedPosts } from '../contexts/SavedPostsContext'
import PostCard from '../components/PostCard'
import { PostSkeleton } from '../components/Skeletons'
import { X, Bookmark, Loader2 } from 'lucide-react'
import UserProfilePage from './UserProfilePage'

const PAGE_SIZE = 20
const RED = '#C0392B'

export default function SavedPostsPage({ onClose }) {
  const { user } = useAuth()
  const { savedIds } = useSavedPosts()
  const [posts, setPosts]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [loadingMore, setLoadingMore]   = useState(false)
  const [hasMore, setHasMore]           = useState(true)
  const [page, setPage]                 = useState(0)
  const [viewingUserId, setViewingUserId] = useState(null)
  const [subjects, setSubjects]         = useState([])
  const sentinelRef   = useRef(null)
  const loadingRef    = useRef(false)
  const hasMoreRef    = useRef(true)
  const allIds        = useRef([])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    supabase.from('subjects').select('*').order('name')
      .then(({ data }) => { if (data) setSubjects(data) })
  }, [])

  // Build sorted id list once
  useEffect(() => {
    allIds.current = [...savedIds]
    setPage(0)
    setPosts([])
    setHasMore(allIds.current.length > 0)
    hasMoreRef.current = allIds.current.length > 0
  }, [savedIds])

  // Load a page of posts by ID slice
  async function loadPage(pageIndex, replace = false) {
    const ids = allIds.current
    if (!ids.length) { setLoading(false); return }
    const start = pageIndex * PAGE_SIZE
    const slice = ids.slice(start, start + PAGE_SIZE)
    if (!slice.length) { setHasMore(false); hasMoreRef.current = false; setLoading(false); return }

    if (pageIndex === 0) setLoading(true)
    else setLoadingMore(true)

    const { data } = await supabase
      .from('posts')
      .select('*, profiles!posts_author_id_fkey(*), subjects!posts_subject_id_fkey(*)')
      .in('id', slice)
      .order('created_at', { ascending: false })

    const results = data || []
    const more = start + PAGE_SIZE < ids.length

    if (replace) {
      setPosts(results)
    } else {
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id))
        return [...prev, ...results.filter(p => !existingIds.has(p.id))]
      })
    }
    setHasMore(more)
    hasMoreRef.current = more
    setLoading(false)
    setLoadingMore(false)
    loadingRef.current = false
  }

  useEffect(() => {
    loadPage(0, true)
  }, [savedIds]) // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingRef.current && hasMoreRef.current) {
        loadingRef.current = true
        setPage(prev => {
          const next = prev + 1
          loadPage(next)
          return next
        })
      }
    }, { rootMargin: '300px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'var(--page-bg, #F0F2F5)', display: 'flex', flexDirection: 'column', animation: 'fullscreenIn 0.22s cubic-bezier(0.16,1,0.3,1)' }}>
      <div style={{ background: 'var(--card-bg, white)', borderBottom: '1px solid var(--border, #E4E6EB)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EBF5FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bookmark size={17} color="#1A5276" fill="#1A5276" />
          </div>
          <div>
            <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: 'var(--text-primary, #050505)' }}>Saved Posts</span>
            {!loading && <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: 'var(--text-secondary, #65676B)' }}>{savedIds.size} saved</p>}
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
        ) : savedIds.size === 0 ? (
          <EmptyState emoji="🔖" title="No saved posts yet" subtitle="Tap ··· on any post and hit Save to bookmark it here" />
        ) : posts.length === 0 ? (
          <EmptyState emoji="🗑️" title="Saved posts were deleted" subtitle="The posts you saved no longer exist" />
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
                  · {posts.length} saved posts · All caught up ·
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

function EmptyState({ emoji, title, subtitle }) {
  return (
    <div style={{ padding: '80px 32px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</div>
      <p style={{ margin: '0 0 6px', fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: 'var(--text-primary, #050505)' }}>{title}</p>
      <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: 'var(--text-secondary, #65676B)' }}>{subtitle}</p>
    </div>
  )
}
