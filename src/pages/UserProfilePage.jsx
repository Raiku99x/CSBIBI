import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRole } from '../hooks/useRole'
import { useModMode } from '../hooks/useModMode'
import PostCard from '../components/PostCard'
import { PostSkeleton } from '../components/Skeletons'
import {
  X, Shield, Crown, Ban, VolumeX, Volume2,
  UserX, UserCheck, ChevronDown, Loader2,
  Heart, MessageSquare, Calendar, LogOut
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'

const RED  = '#C0392B'
const BLUE = '#1A5276'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','922B21','C0392B']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

function RoleBadge({ role }) {
  if (role === 'superadmin') return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:4,background:'#FEF9C3',color:'#92400E',border:'1px solid #FDE68A',borderRadius:12,padding:'3px 10px',fontSize:12,fontWeight:700,fontFamily:'"Instrument Sans",system-ui' }}>
      <Crown size={11}/> Admin
    </span>
  )
  if (role === 'moderator') return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:4,background:'#EBF5FB',color:BLUE,border:'1px solid #AED6F1',borderRadius:12,padding:'3px 10px',fontSize:12,fontWeight:700,fontFamily:'"Instrument Sans",system-ui' }}>
      <Shield size={11}/> Moderator
    </span>
  )
  return null
}

export default function UserProfilePage({ userId, onClose, onSendDM }) {
  const { user: currentUser } = useAuth()
  const { isModerator, isSuperadmin } = useRole()
  const { modMode } = useModMode()

  const [profile, setProfile]   = useState(null)
  const [posts, setPosts]       = useState([])
  const [stats, setStats]       = useState({ postCount: 0, likesReceived: 0 })
  const [loading, setLoading]   = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Modals
  const [showMuteModal, setShowMuteModal]           = useState(false)
  const [showBanModal, setShowBanModal]             = useState(false)
  const [showForceLogoutModal, setShowForceLogoutModal] = useState(false)
  const [banReason, setBanReason]                   = useState('')
  const [muteHours, setMuteHours]                   = useState('24')

  const canModerate = (isModerator || isSuperadmin) && modMode
  const isOwnProfile = userId === currentUser?.id

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (!userId) return
    async function load() {
      const [
        { data: profileData },
        { data: postsData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('posts').select('*, profiles(*), subjects(*)').eq('author_id', userId).order('created_at', { ascending: false }).limit(20),
      ])

      if (profileData) setProfile(profileData)
      if (postsData) {
        setPosts(postsData)
        const postIds = postsData.map(p => p.id)
        if (postIds.length > 0) {
          const { count } = await supabase.from('likes').select('id', { count: 'exact', head: true }).in('post_id', postIds)
          setStats({ postCount: postsData.length, likesReceived: count || 0 })
        } else {
          setStats({ postCount: 0, likesReceived: 0 })
        }
      }
      setLoading(false)
    }
    load()
  }, [userId])

  async function handleMute() {
    if (!profile) return
    setActionLoading(true)
    try {
      const hours = parseInt(muteHours) || 24
      const mutedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      await supabase.from('profiles').update({ is_muted: true, muted_until: mutedUntil }).eq('id', profile.id)
      await supabase.from('audit_logs').insert({
        actor_id: currentUser.id,
        action: 'mute_user',
        target_type: 'profile',
        target_id: profile.id,
        metadata: { hours, muted_until: mutedUntil },
      })
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'announcement',
        message: `🔇 You have been muted for ${hours} hours by a moderator.`,
        is_read: false,
      })
      setProfile(p => ({ ...p, is_muted: true, muted_until: mutedUntil }))
      setShowMuteModal(false)
      toast.success(`${profile.display_name} muted for ${hours}h`)
    } catch (err) { toast.error(err.message) }
    finally { setActionLoading(false) }
  }

  async function handleUnmute() {
    if (!profile) return
    setActionLoading(true)
    try {
      await supabase.from('profiles').update({ is_muted: false, muted_until: null }).eq('id', profile.id)
      await supabase.from('audit_logs').insert({
        actor_id: currentUser.id,
        action: 'unmute_user',
        target_type: 'profile',
        target_id: profile.id,
      })
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'announcement',
        message: `🔊 Your mute has been lifted by a moderator.`,
        is_read: false,
      })
      setProfile(p => ({ ...p, is_muted: false, muted_until: null }))
      toast.success(`${profile.display_name} unmuted`)
    } catch (err) { toast.error(err.message) }
    finally { setActionLoading(false) }
  }

  async function handleBan() {
    if (!profile) return
    if (!banReason.trim()) { toast.error('Enter a ban reason'); return }
    setActionLoading(true)
    try {
      await supabase.from('profiles').update({
        is_banned: true,
        banned_at: new Date().toISOString(),
        banned_reason: banReason.trim(),
      }).eq('id', profile.id)
      await supabase.from('audit_logs').insert({
        actor_id: currentUser.id,
        action: 'ban_user',
        target_type: 'profile',
        target_id: profile.id,
        metadata: { reason: banReason.trim() },
      })
      setProfile(p => ({ ...p, is_banned: true, banned_reason: banReason.trim() }))
      setShowBanModal(false)
      setBanReason('')
      toast.success(`${profile.display_name} banned`)
    } catch (err) { toast.error(err.message) }
    finally { setActionLoading(false) }
  }

  async function handleUnban() {
    if (!profile) return
    setActionLoading(true)
    try {
      await supabase.from('profiles').update({ is_banned: false, banned_at: null, banned_reason: null }).eq('id', profile.id)
      await supabase.from('audit_logs').insert({
        actor_id: currentUser.id,
        action: 'unban_user',
        target_type: 'profile',
        target_id: profile.id,
      })
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'announcement',
        message: `✅ Your account suspension has been lifted.`,
        is_read: false,
      })
      setProfile(p => ({ ...p, is_banned: false, banned_at: null, banned_reason: null }))
      toast.success(`${profile.display_name} unbanned`)
    } catch (err) { toast.error(err.message) }
    finally { setActionLoading(false) }
  }

  async function handlePromote() {
    if (!profile) return
    if (!window.confirm(`Promote ${profile.display_name} to Moderator?`)) return
    setActionLoading(true)
    try {
      await supabase.from('profiles').update({ role: 'moderator' }).eq('id', profile.id)
      await supabase.from('audit_logs').insert({
        actor_id: currentUser.id,
        action: 'promote_to_moderator',
        target_type: 'profile',
        target_id: profile.id,
      })
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'announcement',
        message: `🛡️ You've been promoted to Moderator. Activate your mod powers from the drawer menu.`,
        is_read: false,
      })
      setProfile(p => ({ ...p, role: 'moderator' }))
      toast.success(`${profile.display_name} is now a Moderator`)
    } catch (err) { toast.error(err.message) }
    finally { setActionLoading(false) }
  }

  async function handleDemote() {
    if (!profile) return
    if (!window.confirm(`Remove ${profile.display_name}'s Moderator role?`)) return
    setActionLoading(true)
    try {
      await supabase.from('profiles').update({ role: 'user' }).eq('id', profile.id)
      await supabase.from('audit_logs').insert({
        actor_id: currentUser.id,
        action: 'demote_from_moderator',
        target_type: 'profile',
        target_id: profile.id,
      })
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'announcement',
        message: `ℹ️ Your Moderator role has been removed.`,
        is_read: false,
      })
      setProfile(p => ({ ...p, role: 'user' }))
      toast.success(`${profile.display_name} demoted`)
    } catch (err) { toast.error(err.message) }
    finally { setActionLoading(false) }
  }

  // ── Force Logout ────────────────────────────────────────────
  // Strategy: set a `force_logout_at` timestamp on the profile.
  // The app's auth listener (or a useEffect in Layout/App) checks this value
  // against the user's session start time and signs them out if stale.
  async function handleForceLogout() {
    if (!profile) return
    setActionLoading(true)
    try {
      const now = new Date().toISOString()

      // 1. Stamp the profile so the target user's client detects it
      await supabase.from('profiles')
        .update({ force_logout_at: now })
        .eq('id', profile.id)

      // 2. Audit log
      await supabase.from('audit_logs').insert({
        actor_id: currentUser.id,
        action: 'force_logout',
        target_type: 'profile',
        target_id: profile.id,
        metadata: { force_logout_at: now },
      })

      // 3. Notify the user (they'll see it when they log back in)
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'announcement',
        message: `🔐 You have been signed out by an administrator.`,
        is_read: false,
      })

      setShowForceLogoutModal(false)
      toast.success(`${profile.display_name} will be signed out immediately`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:60,background:'rgba(0,0,0,0.55)',animation:'fadeIn 0.18s ease' }}/>

      {/* Panel */}
      <div style={{
        position:'fixed', right:0, top:0, bottom:0,
        width:'100%', maxWidth:440,
        zIndex:61,
        background:'#F0F2F5',
        display:'flex', flexDirection:'column',
        boxShadow:'-8px 0 32px rgba(0,0,0,0.18)',
        animation:'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)',
        overflowY:'auto',
      }}>
        {loading ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Loader2 size={28} color={RED} style={{ animation:'spin 0.8s linear infinite' }}/>
          </div>
        ) : !profile ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <p style={{ fontFamily:'"Instrument Sans",system-ui', color:'#65676B' }}>User not found</p>
          </div>
        ) : (
          <>
            {/* Header cover */}
            <div style={{ background:`linear-gradient(135deg, ${RED} 0%, ${BLUE} 100%)`, padding:'20px 16px 60px', position:'relative' }}>
              <button onClick={onClose} style={{ position:'absolute',top:14,right:14,width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.2)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <X size={15} color="white"/>
              </button>
            </div>

            {/* Avatar + info card */}
            <div style={{ background:'white', margin:'0 0 8px', padding:'0 16px 16px', position:'relative' }}>
              {/* Avatar */}
              <div style={{ position:'relative', width:72, height:72, marginTop:-36 }}>
                <img src={profile.avatar_url || dicebearUrl(profile.display_name)} alt=""
                  style={{ width:72,height:72,borderRadius:18,objectFit:'cover',border:'3px solid white',boxShadow:'0 2px 12px rgba(0,0,0,0.12)',display:'block' }}/>
                {profile.is_banned && (
                  <div style={{ position:'absolute',bottom:-2,right:-2,width:20,height:20,borderRadius:'50%',background:RED,border:'2px solid white',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <Ban size={10} color="white"/>
                  </div>
                )}
              </div>

              <div style={{ marginTop:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                  <span style={{ fontFamily:'"Bricolage Grotesque",system-ui', fontWeight:800, fontSize:20, color:'#050505' }}>
                    {profile.display_name}
                  </span>
                  <RoleBadge role={profile.role}/>
                  {profile.is_banned && (
                    <span style={{ display:'inline-flex',alignItems:'center',gap:3,background:'#FEE2E2',color:RED,border:'1px solid #FECACA',borderRadius:12,padding:'3px 8px',fontSize:11,fontWeight:700,fontFamily:'"Instrument Sans",system-ui' }}>
                      <Ban size={10}/> Banned
                    </span>
                  )}
                  {profile.is_muted && (
                    <span style={{ display:'inline-flex',alignItems:'center',gap:3,background:'#FFF7ED',color:'#C2410C',border:'1px solid #FED7AA',borderRadius:12,padding:'3px 8px',fontSize:11,fontWeight:700,fontFamily:'"Instrument Sans",system-ui' }}>
                      <VolumeX size={10}/> Muted
                    </span>
                  )}
                </div>

                {/* Email — visible to mods/admins */}
                {canModerate && (
                  <p style={{ margin:'0 0 4px',fontFamily:'"Instrument Sans",system-ui',fontSize:13,color:'#65676B' }}>
                    {profile.email}
                  </p>
                )}

                <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:8, flexWrap:'wrap' }}>
                  <StatPill icon={<MessageSquare size={12}/>} value={stats.postCount} label="posts"/>
                  <StatPill icon={<Heart size={12}/>} value={stats.likesReceived} label="likes received"/>
                  <StatPill icon={<Calendar size={12}/>} value={format(new Date(profile.created_at), 'MMM yyyy')} label="joined"/>
                </div>

                {/* Mod info — ban reason */}
                {canModerate && profile.is_banned && profile.banned_reason && (
                  <div style={{ marginTop:10,padding:'8px 12px',background:'#FEE2E2',borderRadius:8,border:'1px solid #FECACA' }}>
                    <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:12,fontWeight:700,color:RED }}>Ban reason</p>
                    <p style={{ margin:'2px 0 0',fontFamily:'"Instrument Sans",system-ui',fontSize:13,color:'#1c1e21' }}>{profile.banned_reason}</p>
                  </div>
                )}

                {/* Action buttons */}
                {!isOwnProfile && (
                  <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
                    {/* DM button — always visible */}
                    {onSendDM && (
                      <ActionButton label="Message" color="#0D7377" bg="#E6F4F4" onClick={() => { onClose(); onSendDM(profile) }}/>
                    )}

                    {/* Mod actions */}
                    {canModerate && (
                      <>
                        {profile.is_muted
                          ? <ActionButton label="Unmute" icon={<Volume2 size={13}/>} color="#16a34a" bg="#F0FDF4" onClick={handleUnmute} loading={actionLoading}/>
                          : <ActionButton label="Mute" icon={<VolumeX size={13}/>} color="#C2410C" bg="#FFF7ED" onClick={() => setShowMuteModal(true)} loading={actionLoading}/>
                        }
                      </>
                    )}

                    {/* Superadmin-only actions */}
                    {isSuperadmin && modMode && (
                      <>
                        {profile.is_banned
                          ? <ActionButton label="Unban" icon={<UserCheck size={13}/>} color="#16a34a" bg="#F0FDF4" onClick={handleUnban} loading={actionLoading}/>
                          : <ActionButton label="Ban" icon={<UserX size={13}/>} color={RED} bg="#FEE2E2" onClick={() => setShowBanModal(true)} loading={actionLoading}/>
                        }
                        {profile.role === 'user' && (
                          <ActionButton label="Make Mod" icon={<Shield size={13}/>} color={BLUE} bg="#EBF5FB" onClick={handlePromote} loading={actionLoading}/>
                        )}
                        {profile.role === 'moderator' && (
                          <ActionButton label="Remove Mod" icon={<Shield size={13}/>} color="#65676B" bg="#F0F2F5" onClick={handleDemote} loading={actionLoading}/>
                        )}
                        {/* Force Logout — superadmin only, not on other superadmins */}
                        {profile.role !== 'superadmin' && (
                          <ActionButton label="Force Logout" icon={<LogOut size={13}/>} color="#7C3AED" bg="#F5F3FF" onClick={() => setShowForceLogoutModal(true)} loading={actionLoading}/>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Posts */}
            <div style={{ flex:1 }}>
              <div style={{ padding:'8px 16px 4px' }}>
                <span style={{ fontFamily:'"Instrument Sans",system-ui',fontSize:11,fontWeight:700,color:'#65676B',textTransform:'uppercase',letterSpacing:0.6 }}>
                  Posts · {stats.postCount}
                </span>
              </div>
              {posts.length === 0 ? (
                <div style={{ padding:'40px 24px',textAlign:'center' }}>
                  <div style={{ fontSize:36,marginBottom:8 }}>📝</div>
                  <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:14,color:'#65676B' }}>No posts yet</p>
                </div>
              ) : (
                posts.map(p => <PostCard key={p.id} post={p} currentUserId={currentUser?.id}/>)
              )}
            </div>
          </>
        )}
      </div>

      {/* Mute modal */}
      {showMuteModal && (
        <SimpleModal title="Mute User" onClose={() => setShowMuteModal(false)}>
          <p style={{ margin:'0 0 12px',fontFamily:'"Instrument Sans",system-ui',fontSize:14,color:'#1c1e21' }}>
            Mute <strong>{profile?.display_name}</strong> — they won't be able to post or comment.
          </p>
          <label style={{ fontFamily:'"Instrument Sans",system-ui',fontSize:12,fontWeight:700,color:'#65676B',display:'block',marginBottom:6 }}>DURATION</label>
          <div style={{ position:'relative',marginBottom:16 }}>
            <select value={muteHours} onChange={e => setMuteHours(e.target.value)}
              style={{ width:'100%',padding:'10px 32px 10px 12px',borderRadius:10,border:'1px solid #E4E6EB',background:'#F7F8FA',fontFamily:'"Instrument Sans",system-ui',fontSize:14,color:'#050505',appearance:'none',outline:'none' }}>
              <option value="1">1 hour</option>
              <option value="6">6 hours</option>
              <option value="24">24 hours</option>
              <option value="72">3 days</option>
              <option value="168">1 week</option>
            </select>
            <ChevronDown size={14} color="#65676B" style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }}/>
          </div>
          <button onClick={handleMute} disabled={actionLoading}
            style={{ width:'100%',padding:'12px',borderRadius:10,border:'none',background:'#C2410C',color:'white',cursor:'pointer',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
            {actionLoading && <Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }}/>}
            Mute User
          </button>
        </SimpleModal>
      )}

      {/* Ban modal */}
      {showBanModal && (
        <SimpleModal title="Ban User" onClose={() => setShowBanModal(false)}>
          <p style={{ margin:'0 0 12px',fontFamily:'"Instrument Sans",system-ui',fontSize:14,color:'#1c1e21' }}>
            Ban <strong>{profile?.display_name}</strong>? They will be locked out of the app.
          </p>
          <label style={{ fontFamily:'"Instrument Sans",system-ui',fontSize:12,fontWeight:700,color:'#65676B',display:'block',marginBottom:6 }}>BAN REASON <span style={{ color:RED }}>*</span></label>
          <textarea value={banReason} onChange={e => setBanReason(e.target.value)} rows={3} placeholder="e.g. Repeated violations of community guidelines"
            style={{ width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #E4E6EB',background:'#F7F8FA',fontFamily:'"Instrument Sans",system-ui',fontSize:14,color:'#050505',resize:'none',outline:'none',marginBottom:14,boxSizing:'border-box' }}/>
          <button onClick={handleBan} disabled={actionLoading || !banReason.trim()}
            style={{ width:'100%',padding:'12px',borderRadius:10,border:'none',background:RED,color:'white',cursor:'pointer',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:!banReason.trim()?0.6:1 }}>
            {actionLoading && <Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }}/>}
            Ban User
          </button>
        </SimpleModal>
      )}

      {/* Force Logout modal */}
      {showForceLogoutModal && (
        <SimpleModal title="Force Logout" onClose={() => setShowForceLogoutModal(false)}>
          <div style={{ background:'#F5F3FF',border:'1px solid #DDD6FE',borderRadius:10,padding:'10px 14px',marginBottom:14,display:'flex',gap:8,alignItems:'flex-start' }}>
            <LogOut size={15} color="#7C3AED" style={{ flexShrink:0,marginTop:1 }}/>
            <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:13,color:'#5B21B6',lineHeight:1.5 }}>
              This will immediately invalidate <strong>{profile?.display_name}</strong>'s session. They will be signed out on all devices and must log in again.
            </p>
          </div>
          <p style={{ margin:'0 0 16px',fontFamily:'"Instrument Sans",system-ui',fontSize:14,color:'#1c1e21' }}>
            Are you sure you want to force logout <strong>{profile?.display_name}</strong>?
          </p>
          <div style={{ display:'flex',gap:8 }}>
            <button onClick={() => setShowForceLogoutModal(false)}
              style={{ flex:1,padding:'11px',borderRadius:10,border:'1px solid #E4E6EB',background:'white',color:'#65676B',cursor:'pointer',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:14 }}>
              Cancel
            </button>
            <button onClick={handleForceLogout} disabled={actionLoading}
              style={{ flex:1,padding:'11px',borderRadius:10,border:'none',background:'#7C3AED',color:'white',cursor:'pointer',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
              {actionLoading && <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/>}
              Force Logout
            </button>
          </div>
        </SimpleModal>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0}to{opacity:1} }
        @keyframes slideInRight { from{transform:translateX(100%)}to{transform:translateX(0)} }
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
      `}</style>
    </>
  )
}

function StatPill({ icon, value, label }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:4 }}>
      <span style={{ color:'#8A8D91' }}>{icon}</span>
      <span style={{ fontFamily:'"Instrument Sans",system-ui',fontSize:13,fontWeight:700,color:'#050505' }}>{value}</span>
      <span style={{ fontFamily:'"Instrument Sans",system-ui',fontSize:12,color:'#65676B' }}>{label}</span>
    </div>
  )
}

function ActionButton({ label, icon, color, bg, onClick, loading }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} disabled={loading}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,border:'none',cursor:'pointer',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,color,background:hovered?color+'22':bg,transition:'background 0.12s',flexShrink:0 }}>
      {loading ? <Loader2 size={13} style={{ animation:'spin 0.8s linear infinite' }}/> : icon}
      {label}
    </button>
  )
}

function SimpleModal({ title, onClose, children }) {
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:70,background:'rgba(0,0,0,0.4)' }}/>
      <div style={{ position:'fixed',left:'50%',top:'50%',transform:'translate(-50%,-50%)',zIndex:71,width:'calc(100% - 48px)',maxWidth:380,background:'white',borderRadius:16,padding:'20px 20px 24px',boxShadow:'0 16px 48px rgba(0,0,0,0.2)',animation:'scaleIn 0.18s ease' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
          <span style={{ fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:18,color:'#050505' }}>{title}</span>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:'50%',background:'#F0F2F5',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={14} color="#65676B"/></button>
        </div>
        {children}
        <style>{`@keyframes scaleIn{from{opacity:0;transform:translate(-50%,-50%)scale(0.93)}to{opacity:1;transform:translate(-50%,-50%)scale(1)}}`}</style>
      </div>
    </>
  )
}
