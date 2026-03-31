import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useMuteGate } from '../hooks/useMuteGate'
import { useSearchParams } from 'react-router-dom'
import PostCard from '../components/PostCard'
import CreatePostModal from '../components/CreatePostModal'
import UserProfilePage from './UserProfilePage'
import { PostSkeleton } from '../components/Skeletons'
import { Image, Megaphone, Paperclip, VolumeX, Clock } from 'lucide-react'
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

function isScheduledFuture(post) {
  if (!post.scheduled_at) return false
  return new Date(post.scheduled_at) > new Date()
}

export default function FeedPage() {
  const { user, profile } = useAuth()
  const { isSuperadmin } = useRole()
  const navigate = useNavigate()
  const { effectivelyMuted, getMuteMessage } = useMuteGate()

  // FIX #2: read the ?post= query param so notification clicks work
  const [searchParams, setSearchParams] = useSearchParams()
  const targetPostId = searchParams.get('post')
  const highlightRef = useRef(null)

  const [posts, setPosts]               = useState([])
  const [subjects, setSubjects]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [showCreate, setShowCreate]     = useState(false)
  const [createType, setCreateType]     = useState('status')
  const [createSubType, setCreateSubType] = useState('')
  const [autoOpenPhoto, setAutoOpenPhoto] = useState(false)
  const [autoOpenFile, setAutoOpenFile]   = useState(false)
  const [viewingUserId, setViewingUserId] = useState(null)

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
        const { data } = await supabase
          .from('posts').select('*, profiles(*), subjects(*)')
          .eq('id', payload.new.id).single()
        if (data) {
          // FIX #3: don't push future-scheduled posts for non-authors/non-admins
          const isFuture = isScheduledFuture(data)
          const canSee = !isFuture || data.author_id === user?.id || isSuperadmin
          if (canSee) setPosts(prev => [data, ...prev])
        }
      }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchPosts, user?.id, isSuperadmin])

  // FIX #2: scroll to and highlight the target post once posts have loaded
  useEffect(() => {
    if (!targetPostId || loading) return
    // Small delay so the DOM has painted
    const timer = setTimeout(() => {
      const el = document.getElementById('post-' + targetPostId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Flash highlight
        el.style.outline = '2px solid ' + RED
        el.style.outlineOffset = '-2px'
        el.style.transition = 'outline 0.3s'
        setTimeout(() => {
          el.style.outline = 'none'
          // Clean up the query param without navigating
          setSearchParams({}, { replace: true })
        }, 2000)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [targetPostId, loading, setSearchParams])

  const visiblePosts = posts.filter(post => {
    if (!isScheduledFuture(post)) return true
    if (post.author_id === user?.id) return true
    if (isSuperadmin) return true
    return false
  })

  function tryOpenCreate(type = 'status', subType = '') {
    if (effectivelyMuted) {
      toast.error(getMuteMessage(), { icon: '🔇', duration: 4000 })
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
            {effectivelyMuted ? '🔇 You are muted and cannot post' : `What's on your mind, ${firstName}?`}
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
            // FIX #2: add id on the wrapper so scrollIntoView works
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
              />
            </div>
          ))}
          <div style={{ padding:'16px 0 8px', textAlign:'center' }}>
            <span style={{ fontFamily:'"Instrument Sans",system-ui', fontSize:12, color:'#BCC0C4' }}>
              · {visiblePosts.length} posts · You're all caught up ·
            </span>
          </div>
        </div>
      )}

      {showCreate && (
        <CreatePostModal
          onClose={handleModalClose}
          onCreated={fetchPosts}
          subjects={subjects}
          defaultType={createType}
          defaultSubType={createSubType}
          autoOpenPhoto={autoOpenPhoto}
          autoOpenFile={autoOpenFile}
        />
      )}

      {viewingUserId && (
        <UserProfilePage
          userId={viewingUserId}
          onClose={() => setViewingUserId(null)}
          onSendDM={handleSendDM}
        />
      )}
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
        🕐 Scheduled · Publishes {label}
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
      <div style={{ fontSize:40, marginBottom:10 }}>📭</div>
      <p style={{ fontFamily:'"Bricolage Grotesque",system-ui', fontWeight:800, fontSize:17, color:'#050505', margin:'0 0 5px' }}>No posts yet</p>
      <p style={{ fontFamily:'"Instrument Sans",system-ui', fontSize:13.5, color:'#65676B', margin:'0 0 18px' }}>Be the first to share something.</p>
      <button onClick={onPost} style={{ padding:'9px 22px', borderRadius:8, border:'none', background:RED, color:'white', cursor:'pointer', fontFamily:'"Instrument Sans",system-ui', fontWeight:700, fontSize:13.5, boxShadow:'0 3px 12px rgba(192,57,43,0.28)' }}>
        Create Post
      </button>
    </div>
  )
}
