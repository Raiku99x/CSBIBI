import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useMuteGate } from '../hooks/useMuteGate'
import { useSearchParams } from 'react-router-dom'
import PostCard from '../components/PostCard'
import CreatePostModal from '../components/CreatePostModal'
import UserProfilePage from './UserProfilePage'
import { PostSkeleton } from '../components/Skeletons'
import { Image, Megaphone, Paperclip, VolumeX, Clock, Users, Eye, EyeOff, Radio } from 'lucide-react'
import SystemBanner from '../components/SystemBanner'
import { useNavigate } from 'react-router-dom'
import { useRole } from '../hooks/useRole'
import toast from 'react-hot-toast'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','922B21','C0392B']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

const RED = '#C0392B'
const PAGE_SIZE = 20

// Sentinel value — never shown to users, only used internally
const ALL_CHANNELS = '__ALL__'

function isScheduledFuture(post) {
  if (!post.scheduled_at) return false
  return new Date(post.scheduled_at) > new Date()
}

function canSeePost(post, userId, isSuperadmin, superadminGroupView) {
  if (isScheduledFuture(post)) {
    if (post.author_id === userId || isSuperadmin) return true
    return false
  }
  if (post.visibility === 'group') {
    if (post.author_id === userId) return true
    if (Array.isArray(post.group_members) && post.group_members.includes(userId)) return true
    if (isSuperadmin && superadminGroupView) return true
    return false
  }
  return true
}

export default function FeedPage() {
  const { user, profile } = useAuth()
  const { isSuperadmin } = useRole()
  const navigate = useNavigate()
  const { effectivelyMuted, getMuteMessage } = useMuteGate()

  const [searchParams, setSearchParams] = useSearchParams()
  const targetPostId = searchParams.get('post')

  const [posts, setPosts]               = useState([])
  const [subjects, setSubjects]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [loadingMore, setLoadingMore]   = useState(false)
  const [hasMore, setHasMore]           = useState(true)
  const [showCreate, setShowCreate]     = useState(false)
  const [createType, setCreateType]     = useState('status')
  const [createSubType, setCreateSubType] = useState('')
  const [autoOpenPhoto, setAutoOpenPhoto] = useState(false)
  const [autoOpenFile, setAutoOpenFile]   = useState(false)
  const [viewingUserId, setViewingUserId] = useState(null)
  const [superadminGroupView, setSuperadminGroupView] = useState(false)

  // ── Channel state ────────────────────────────────────────
  // userChannel: the section/channel this user belongs to (from profile.section)
  // viewingChannel (superadmin only): which channel the admin is currently browsing
  // Regular users NEVER know about other channels — they just see their own feed filtered by section
  const userChannel = profile?.section || null

  // Only superadmin has a viewingChannel concept. Regular users always use their own channel.
  const [viewingChannel, setViewingChannel] = useState(null) // null = use userChannel
  const [allChannels, setAllChannels] = useState([])

  // The effective channel filter applied to the query.
  // For regular users: always their own section (no switcher, no awareness of others).
  // For superadmin: can be their own, a specific other channel, or ALL_CHANNELS (see everything).
  const activeChannel = isSuperadmin
    ? (viewingChannel === ALL_CHANNELS ? null : (viewingChannel || userChannel))
    : userChannel

  const sentinelRef = useRef(null)
  const oldestCreatedAt = useRef(null)
  const loadingMoreRef = useRef(false)
  const hasMoreRef = useRef(true)

  function buildQuery(cursorDate = null) {
    let q = supabase
      .from('posts')
      .select('*, profiles!posts_author_id_fkey(*), subjects!posts_subject_id_fkey(*)')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (cursorDate) q = q.lt('created_at', cursorDate)

    // Channel filtering:
    // - Superadmin viewing ALL_CHANNELS: no channel filter, sees everything
    // - Has an activeChannel: show posts where channel = activeChannel OR channel IS NULL (global posts)
    // - No channel at all (unassigned user): show everything
    if (!(isSuperadmin && viewingChannel === ALL_CHANNELS) && activeChannel) {
      q = q.or(`channel.eq.${activeChannel},channel.is.null`)
    }

    return q
  }

  const fetchInitial = useCallback(async () => {
    setLoading(true)
    const { data } = await buildQuery()
    if (data) {
      setPosts(data)
      const more = data.length === PAGE_SIZE
      setHasMore(more)
      hasMoreRef.current = more
      if (data.length > 0) oldestCreatedAt.current = data[data.length - 1].created_at
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingChannel, activeChannel])

  const fetchMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current || !oldestCreatedAt.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    const { data } = await buildQuery(oldestCreatedAt.current)
    if (data && data.length > 0) {
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id))
        return [...prev, ...data.filter(p => !existingIds.has(p.id))]
      })
      const more = data.length === PAGE_SIZE
      setHasMore(more)
      hasMoreRef.current = more
      oldestCreatedAt.current = data[data.length - 1].created_at
    } else {
      setHasMore(false)
      hasMoreRef.current = false
    }
    loadingMoreRef.current = false
    setLoadingMore(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingChannel, activeChannel])

  // Superadmin-only: fetch distinct channel names for the switcher
  useEffect(() => {
    if (!isSuperadmin) return
    supabase
      .from('profiles')
      .select('section')
      .not('section', 'is', null)
      .neq('section', '')
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map(p => p.section))].sort()
          setAllChannels(unique)
        }
      })
  }, [isSuperadmin])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchMore() },
      { rootMargin: '300px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchMore, loading])

  useEffect(() => {
    fetchInitial()
    supabase.from('subjects').select('*').order('name').then(({ data }) => { if (data) setSubjects(data) })

    const channel = supabase.channel('feed-posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        const { data } = await supabase
          .from('posts')
          .select('*, profiles!posts_author_id_fkey(*), subjects!posts_subject_id_fkey(*)')
          .eq('id', payload.new.id)
          .single()
        if (!data) return
        // Apply channel filter to incoming realtime posts
        const postChannel = data.channel
        const isViewingAll = isSuperadmin && viewingChannel === ALL_CHANNELS
        const passesChannelFilter = isViewingAll ||
          !postChannel ||
          !activeChannel ||
          postChannel === activeChannel
        if (passesChannelFilter && canSeePost(data, user?.id, isSuperadmin, superadminGroupView)) {
          setPosts(prev =>
            prev.some(p => p.id === data.id) ? prev : [data, ...prev]
          )
        }
      }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchInitial, user?.id, isSuperadmin, superadminGroupView, viewingChannel, activeChannel])

  useEffect(() => {
    if (!targetPostId) return
    let attempts = 0
    const timer = setInterval(() => {
      const el = document.getElementById('post-' + targetPostId)
      attempts++
      if (el) {
        clearInterval(timer)
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.style.outline = '2px solid ' + RED
        el.style.outlineOffset = '-2px'
        el.style.transition = 'outline 0.3s'
        setTimeout(() => {
          el.style.outline = 'none'
          setSearchParams({}, { replace: true })
        }, 2000)
      } else if (attempts > 20) {
        clearInterval(timer)
      }
    }, 100)
    return () => clearInterval(timer)
  }, [targetPostId, setSearchParams])

  const pinnedPosts = posts
    .filter(post => post.is_pinned && canSeePost(post, user?.id, isSuperadmin, superadminGroupView))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const unpinnedPosts = posts.filter(post => !post.is_pinned && canSeePost(post, user?.id, isSuperadmin, superadminGroupView))
  const visiblePosts = [...pinnedPosts, ...unpinnedPosts]
  
  function tryOpenCreate(type = 'status', subType = '') {
    if (effectivelyMuted) {
      toast.error(getMuteMessage(), { duration: 4000 })
      return
    }
    setCreateType(type)
    setCreateSubType(subType)
    setShowCreate(true)
  }

  function handlePhotoClick()  { setAutoOpenPhoto(true); setAutoOpenFile(false); tryOpenCreate('status', '') }
  function handleFileClick()   { setAutoOpenFile(true); setAutoOpenPhoto(false); tryOpenCreate('status', '') }
  function handleModalClose()  { setShowCreate(false); setAutoOpenPhoto(false); setAutoOpenFile(false) }

  function handleUserClick(profileData) {
    if (!profileData?.id) return
    setViewingUserId(profileData.id)
  }

  function handleSendDM(targetProfile) {
    navigate('/messages', { state: { openDM: targetProfile.id } })
  }

  const firstName = profile?.display_name?.split(' ')[0] || 'there'

  // Label shown in the superadmin channel switcher UI only
  const adminChannelLabel = viewingChannel === ALL_CHANNELS
    ? 'All Channels'
    : (viewingChannel || userChannel || 'No channel')

  return (
    <div style={{ paddingTop: 6 }}>
      <SystemBanner/>

      {effectivelyMuted && (
        <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderLeft:'4px solid #C2410C', borderRadius:10, margin:'0 0 8px', padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:'#C2410C', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <VolumeX size={14} color="white"/>
          </div>
          <div>
            <p style={{ margin:0, fontFamily:'"Instrument Sans",system-ui', fontWeight:700, fontSize:13, color:'#9A3412' }}>You are muted</p>
            <p style={{ margin:'1px 0 0', fontFamily:'"Instrument Sans",system-ui', fontSize:12, color:'#C2410C' }}>
              {getMuteMessage()} You can still read and like posts.
            </p>
          </div>
        </div>
      )}

      {/* SUPERADMIN-ONLY: Combined channel switcher + group view toggle */}
      {isSuperadmin && (
        <div style={{ margin:'0 0 6px', padding:'7px 12px', background:'white', border:'1px solid #E4E6EB', borderLeft:'3px solid #0D7377', borderRadius:'0 8px 8px 0', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <Radio size={13} color="#0D7377" style={{ flexShrink:0 }}/>
          {allChannels.length > 0 && (
            <select
              value={viewingChannel || userChannel || ''}
              onChange={e => setViewingChannel(e.target.value || null)}
              style={{ padding:'4px 8px', borderRadius:8, border:'1px solid #E4E6EB', background:'#F7F8FA', fontFamily:'"Instrument Sans",system-ui', fontWeight:700, fontSize:12, color:'#0D7377', cursor:'pointer', outline:'none' }}
            >
              {allChannels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
              <option value={ALL_CHANNELS}>All Channels</option>
            </select>
          )}
          <div style={{ width:1, height:16, background:'#E4E6EB', flexShrink:0 }}/>
          <Users size={13} color={superadminGroupView ? '#7C3AED' : '#8A8D91'} style={{ flexShrink:0 }}/>
          <span style={{ fontFamily:'"Instrument Sans",system-ui', fontSize:12, fontWeight:600, color: superadminGroupView ? '#5B21B6' : '#65676B', flex:1 }}>
            Group posts
          </span>
          <button
            onClick={() => setSuperadminGroupView(v => !v)}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:8, border:`1.5px solid ${superadminGroupView ? '#7C3AED' : '#CED0D4'}`, background: superadminGroupView ? '#7C3AED' : 'white', cursor:'pointer', fontFamily:'"Instrument Sans",system-ui', fontWeight:700, fontSize:12, color: superadminGroupView ? 'white' : '#65676B', transition:'all 0.15s' }}>
            {superadminGroupView ? <><EyeOff size={11}/> Hide</> : <><Eye size={11}/> Show</>}
          </button>
        </div>
      )}

      {/* Compose Card */}
      <div style={{ background:'white', borderTop:'1px solid #E4E6EB', borderBottom:'1px solid #E4E6EB', marginBottom:6 }}>
        <div style={{ padding:'10px 12px 8px', display:'flex', alignItems:'center', gap:8 }}>
          <img
            src={profile?.avatar_url || dicebearUrl(profile?.display_name)}
            alt=""
            onClick={() => setViewingUserId(user?.id)}
            style={{ width:38, height:38, borderRadius:10, objectFit:'cover', flexShrink:0, border:'1.5px solid #F0F2F5', cursor:'pointer' }}
          />
          <button
            onClick={() => tryOpenCreate('status', '')}
            style={{ flex:1, height:38, background:effectivelyMuted?'#F7F8FA':'#F0F2F5', border:effectivelyMuted?'1.5px solid #E4E6EB':'none', borderRadius:20, padding:'0 14px', textAlign:'left', cursor:effectivelyMuted?'not-allowed':'pointer', fontSize:14, color:effectivelyMuted?'#BCC0C4':'#8A8D91', fontFamily:'"Instrument Sans",system-ui', fontWeight:500, transition:'background 0.12s' }}
            onMouseEnter={e => { if (!effectivelyMuted) e.currentTarget.style.background = '#E4E6EB' }}
            onMouseLeave={e => { if (!effectivelyMuted) e.currentTarget.style.background = '#F0F2F5' }}
          >
            {effectivelyMuted ? 'You are muted and cannot post' : `What's on your mind, ${firstName}?`}
          </button>
        </div>

        <div style={{ height:1, background:'#F0F2F5', margin:'0 12px' }}/>

        <div style={{ display:'flex', padding:'4px 6px 6px' }}>
          <ComposeBtn icon={<Paperclip size={18}/>} color="#1877F2" bg="#EBF5FD" label="File"     onClick={handleFileClick}                         disabled={effectivelyMuted}/>
          <ComposeBtn icon={<Image size={18}/>}     color="#16A34A" bg="#DCFCE7" label="Photo"    onClick={handlePhotoClick}                        disabled={effectivelyMuted}/>
          <ComposeBtn icon={<Megaphone size={18}/>} color={RED}     bg="#FADBD8" label="Announce" onClick={() => tryOpenCreate('announcement', '')} disabled={effectivelyMuted}/>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div>{Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i}/>)}</div>
      ) : visiblePosts.length === 0 ? (
        <EmptyFeed onPost={() => tryOpenCreate('status', '')}/>
      ) : (
        <div>
          {visiblePosts.map(post => (
            <div key={post.id} id={'post-' + post.id} style={{ position: 'relative' }}>
              {isScheduledFuture(post) && (post.author_id === user?.id || isSuperadmin) && (
                <ScheduledBadge scheduledAt={post.scheduled_at} />
              )}
              <PostCard
                post={post}
                currentUserId={user?.id}
                subjects={subjects}
                profile={profile}
                onUserClick={handleUserClick}
                onUpdated={(updated) => setPosts(prev => prev.map(p => {
                  if (p.id === updated.id) return { ...p, ...updated }
                  if (updated.is_pinned) return { ...p, is_pinned: false, pin_until: null }
                  return p
                }))}
              />
            </div>
          ))}

          {hasMore && (
            <div ref={sentinelRef} style={{ padding:'20px 0', display:'flex', justifyContent:'center', alignItems:'center', gap:8 }}>
              {loadingMore && <>
                <div style={{ width:18, height:18, borderRadius:'50%', border:'2.5px solid #E4E6EB', borderTopColor:RED, animation:'spin 0.7s linear infinite', flexShrink:0 }}/>
                <span style={{ fontFamily:'"Instrument Sans",system-ui', fontSize:12, color:'#BCC0C4' }}>Loading more...</span>
              </>}
            </div>
          )}

          {!hasMore && (
            <div style={{ padding:'16px 0 8px', textAlign:'center' }}>
              <span style={{ fontFamily:'"Instrument Sans",system-ui', fontSize:12, color:'#BCC0C4' }}>
                · {visiblePosts.length} posts · You're all caught up ·
              </span>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreatePostModal
          onClose={handleModalClose}
          onCreated={(post) => {
            setPosts(prev =>
              prev.some(p => p.id === post.id) ? prev : [post, ...prev]
            )
          }}
          subjects={subjects}
          defaultType={createType}
          defaultSubType={createSubType}
          autoOpenPhoto={autoOpenPhoto}
          autoOpenFile={autoOpenFile}
          // Pass the active channel so new posts are tagged to the correct channel.
          // Superadmin viewing ALL_CHANNELS posts to null (global), otherwise use their active channel.
          defaultChannel={
            isSuperadmin && viewingChannel === ALL_CHANNELS
              ? null
              : (viewingChannel || userChannel)
          }
          isSuperadmin={isSuperadmin}
          allChannels={allChannels}
        />
      )}

      {viewingUserId && (
        <UserProfilePage
          userId={viewingUserId}
          onClose={() => setViewingUserId(null)}
          onSendDM={handleSendDM}
        />
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ScheduledBadge({ scheduledAt }) {
  const dt = new Date(scheduledAt)
  const label = dt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', background:'#F5F3FF', borderTop:'1px solid #DDD6FE', borderLeft:'3px solid #7C3AED' }}>
      <Clock size={12} color="#7C3AED" />
      <span style={{ fontFamily:'"Instrument Sans", system-ui', fontWeight:700, fontSize:11.5, color:'#7C3AED' }}>
        Scheduled · Publishes {label}
      </span>
    </div>
  )
}

function ComposeBtn({ icon, color, bg, label, onClick, disabled }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px 4px', border:'none', cursor:disabled?'not-allowed':'pointer', background:hovered&&!disabled?bg:'transparent', borderRadius:7, transition:'background 0.15s', fontFamily:'"Instrument Sans",system-ui', fontWeight:600, fontSize:13, color:disabled?'#BCC0C4':hovered?color:'#65676B', opacity:disabled?0.5:1 }}>
      <span style={{ color:disabled?'#BCC0C4':hovered?color:'#8A8D91', transition:'color 0.15s' }}>{icon}</span>
      {label}
    </button>
  )
}

function EmptyFeed({ onPost }) {
  return (
    <div style={{ background:'white', borderTop:'1px solid #E4E6EB', borderBottom:'1px solid #E4E6EB', padding:'48px 24px', textAlign:'center' }}>
      <div style={{ marginBottom:10 }}>
        <Megaphone size={40} color="#BCC0C4"/>
      </div>
      <p style={{ fontFamily:'"Bricolage Grotesque",system-ui', fontWeight:800, fontSize:17, color:'#050505', margin:'0 0 5px' }}>No posts yet</p>
      <p style={{ fontFamily:'"Instrument Sans",system-ui', fontSize:13.5, color:'#65676B', margin:'0 0 18px' }}>
        Be the first to share something.
      </p>
      <button onClick={onPost} style={{ padding:'9px 22px', borderRadius:8, border:'none', background:RED, color:'white', cursor:'pointer', fontFamily:'"Instrument Sans",system-ui', fontWeight:700, fontSize:13.5, boxShadow:'0 3px 12px rgba(192,57,43,0.28)' }}>
        Create Post
      </button>
    </div>
  )
}
