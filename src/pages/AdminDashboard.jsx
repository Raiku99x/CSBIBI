import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRole } from '../hooks/useRole'
import { useModMode } from '../hooks/useModMode'
import UserProfilePage from './UserProfilePage'
import {
  X, Shield, Crown, Users, FileText, Heart,
  MessageSquare, Megaphone, Trash2, Plus,
  BarChart2, Clock, VolumeX, Ban, ChevronRight,
  Loader2, Send, Tag, BookOpen, Eye, EyeOff,
  ChevronUp, ChevronDown, Pencil, Check, Archive,
  Star, AlertTriangle, GripVertical
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'

const RED  = '#C0392B'
const BLUE = '#1A5276'
const GREEN = '#16a34a'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','922B21','C0392B']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

export default function AdminDashboard({ onClose }) {
  const { user } = useAuth()
  const { isSuperadmin, isModerator } = useRole()
  const { modMode } = useModMode()

  const [tab, setTab]             = useState('overview')
  const [stats, setStats]         = useState(null)
  const [users, setUsers]         = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [banners, setBanners]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [viewingUserId, setViewingUserId] = useState(null)

  // Banner creation
  const [newBanner, setNewBanner]       = useState('')
  const [bannerHours, setBannerHours]   = useState('24')
  const [postingBanner, setPostingBanner] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => { loadAll() }, [tab])

  async function loadAll() {
    setLoading(true)
    try {
      const [
        { count: postCount },
        { count: userCount },
        { count: likeCount },
        { count: commentCount },
        { data: usersData },
        { data: logsData },
        { data: bannersData },
      ] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('likes').select('id', { count: 'exact', head: true }),
        supabase.from('comments').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*, actor:profiles!audit_logs_actor_id_fkey(display_name, avatar_url)').order('created_at', { ascending: false }).limit(50),
        supabase.from('system_notifications').select('*').order('created_at', { ascending: false }),
      ])
      setStats({ postCount, userCount, likeCount, commentCount })
      setUsers(usersData || [])
      setAuditLogs(logsData || [])
      setBanners(bannersData || [])
    } catch (err) {
      toast.error('Failed to load dashboard data')
    }
    setLoading(false)
  }

  async function postBanner() {
    if (!newBanner.trim()) { toast.error('Enter a message'); return }
    setPostingBanner(true)
    try {
      const hours = parseInt(bannerHours) || 24
      const expiresAt = bannerHours === 'never'
        ? null
        : new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      await supabase.from('system_notifications').insert({
        message: newBanner.trim(),
        is_active: true,
        created_by: user.id,
        expires_at: expiresAt,
      })
      setNewBanner('')
      toast.success('Banner posted!')
      loadAll()
    } catch (err) { toast.error(err.message) }
    setPostingBanner(false)
  }

  async function deleteBanner(id) {
    await supabase.from('system_notifications').update({ is_active: false }).eq('id', id)
    toast.success('Banner removed')
    loadAll()
  }

  const tabs = [
    { key: 'overview',  label: 'Overview',  icon: BarChart2  },
    { key: 'users',     label: 'Users',     icon: Users      },
    { key: 'banners',   label: 'Banners',   icon: Megaphone  },
    ...(isSuperadmin ? [
      { key: 'types',    label: 'Post Types', icon: Tag      },
      { key: 'subjects', label: 'Subjects',   icon: BookOpen },
      { key: 'audit',    label: 'Audit Log',  icon: Clock    },
    ] : []),
  ]

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:60,background:'rgba(0,0,0,0.55)' }}/>
      <div style={{ position:'fixed',inset:0,zIndex:61,background:'#F0F2F5',display:'flex',flexDirection:'column',animation:'slideInUp 0.25s cubic-bezier(0.16,1,0.3,1)' }}>

        {/* Header */}
        <div style={{ background:'white',borderBottom:'1px solid #E4E6EB',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:isSuperadmin?'#FEF9C3':'#EBF5FB',display:'flex',alignItems:'center',justifyContent:'center' }}>
              {isSuperadmin ? <Crown size={18} color="#92400E"/> : <Shield size={18} color={BLUE}/>}
            </div>
            <div>
              <span style={{ fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:18,color:'#050505' }}>
                {isSuperadmin ? 'Admin Dashboard' : 'Mod Dashboard'}
              </span>
              <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:11,color:'#65676B' }}>
                {isSuperadmin ? 'Full admin access' : 'Moderator view'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:36,height:36,borderRadius:'50%',background:'#F0F2F5',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <X size={18} color="#65676B"/>
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ background:'white',borderBottom:'1px solid #E4E6EB',display:'flex',padding:'0 16px',flexShrink:0,overflowX:'auto' }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ display:'flex',alignItems:'center',gap:6,padding:'12px 14px',border:'none',cursor:'pointer',background:'transparent',fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:13,color:tab===key?RED:'#65676B',borderBottom:`2px solid ${tab===key?RED:'transparent'}`,whiteSpace:'nowrap',transition:'color 0.15s,border-color 0.15s',flexShrink:0 }}>
              <Icon size={14}/> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1,overflowY:'auto',padding:'12px 16px' }}>
          {loading ? (
            <div style={{ display:'flex',justifyContent:'center',padding:48 }}>
              <Loader2 size={28} color={RED} style={{ animation:'spin 0.8s linear infinite' }}/>
            </div>
          ) : (
            <>
              {tab === 'overview'  && <OverviewTab stats={stats} users={users}/>}
              {tab === 'users'     && <UsersTab users={users} currentUserId={user.id} isSuperadmin={isSuperadmin} onViewUser={setViewingUserId}/>}
              {tab === 'banners'   && <BannersTab banners={banners} newBanner={newBanner} setNewBanner={setNewBanner} bannerHours={bannerHours} setBannerHours={setBannerHours} onPost={postBanner} onDelete={deleteBanner} posting={postingBanner}/>}
              {tab === 'types'     && <AnnouncementTypesTab/>}
              {tab === 'subjects'  && <SubjectsTab/>}
              {tab === 'audit'     && <AuditTab logs={auditLogs}/>}
            </>
          )}
        </div>
      </div>

      {viewingUserId && (
        <UserProfilePage
          userId={viewingUserId}
          onClose={() => { setViewingUserId(null); loadAll() }}
        />
      )}

      <style>{`
        @keyframes slideInUp { from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)} }
      `}</style>
    </>
  )
}

// ── Overview ──────────────────────────────────────────────────
function OverviewTab({ stats, users }) {
  if (!stats) return null
  const muted  = users.filter(u => u.is_muted).length
  const banned = users.filter(u => u.is_banned).length
  const mods   = users.filter(u => u.role === 'moderator').length

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
        <StatCard icon={<FileText size={18} color={BLUE}/>}         bg="#EBF5FB" label="Total Posts"  value={stats.postCount}    />
        <StatCard icon={<Users size={18} color={GREEN}/>}            bg="#F0FDF4" label="Total Users"  value={stats.userCount}    />
        <StatCard icon={<Heart size={18} color={RED}/>}              bg="#FFF5F5" label="Total Likes"  value={stats.likeCount}    />
        <StatCard icon={<MessageSquare size={18} color="#8B5CF6"/>}  bg="#F5F3FF" label="Comments"     value={stats.commentCount} />
      </div>
      <div style={{ background:'white',borderRadius:12,border:'1px solid #DADDE1',padding:'14px 16px' }}>
        <p style={{ margin:'0 0 12px',fontFamily:'"Instrument Sans",system-ui',fontSize:12,fontWeight:700,color:'#65676B',textTransform:'uppercase',letterSpacing:0.5 }}>User Status</p>
        <div style={{ display:'flex',gap:16,flexWrap:'wrap' }}>
          <StatusPill icon={<Shield size={12}/>}  color={BLUE}    label={`${mods} Moderator${mods!==1?'s':''}`}/>
          <StatusPill icon={<VolumeX size={12}/>} color="#C2410C" label={`${muted} Muted`}/>
          <StatusPill icon={<Ban size={12}/>}     color={RED}     label={`${banned} Banned`}/>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, bg, label, value }) {
  return (
    <div style={{ background:'white',borderRadius:12,border:'1px solid #DADDE1',padding:'14px 16px',display:'flex',alignItems:'center',gap:12 }}>
      <div style={{ width:40,height:40,borderRadius:11,background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>{icon}</div>
      <div>
        <p style={{ margin:0,fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:22,color:'#050505' }}>{value ?? '—'}</p>
        <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:12,color:'#65676B' }}>{label}</p>
      </div>
    </div>
  )
}

function StatusPill({ icon, color, label }) {
  return (
    <div style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:20,background:`${color}15`,border:`1px solid ${color}40` }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:12,color }}>{label}</span>
    </div>
  )
}

// ── Users ─────────────────────────────────────────────────────
function UsersTab({ users, currentUserId, isSuperadmin, onViewUser }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = users.filter(u => {
    const matchSearch = u.display_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filter === 'mods')   return u.role === 'moderator' || u.role === 'superadmin'
    if (filter === 'muted')  return u.is_muted
    if (filter === 'banned') return u.is_banned
    return true
  })

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
      <div style={{ display:'flex',gap:8 }}>
        <div style={{ flex:1,display:'flex',alignItems:'center',gap:8,background:'white',borderRadius:10,border:'1px solid #E4E6EB',padding:'0 12px',height:38 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
            style={{ flex:1,border:'none',outline:'none',fontFamily:'"Instrument Sans",system-ui',fontSize:13,color:'#050505',background:'transparent' }}/>
        </div>
      </div>
      <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
        {['all','mods','muted','banned'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:'5px 12px',borderRadius:20,border:`1.5px solid ${filter===f?RED:'#E4E6EB'}`,background:filter===f?'#FADBD8':'white',color:filter===f?RED:'#65676B',fontFamily:'"Instrument Sans",system-ui',fontWeight:filter===f?700:500,fontSize:12,cursor:'pointer' }}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>
      <p style={{ margin:'4px 0 0',fontFamily:'"Instrument Sans",system-ui',fontSize:11,color:'#8A8D91' }}>{filtered.length} user{filtered.length!==1?'s':''}</p>
      {filtered.map(u => (
        <div key={u.id} onClick={() => onViewUser(u.id)}
          style={{ background:'white',borderRadius:12,border:'1px solid #DADDE1',padding:'12px 14px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'background 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.background='#F7F8FA'}
          onMouseLeave={e => e.currentTarget.style.background='white'}>
          <img src={u.avatar_url||dicebearUrl(u.display_name)} style={{ width:40,height:40,borderRadius:11,objectFit:'cover',flexShrink:0 }} alt=""/>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
              <span style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:14,color:'#050505' }}>{u.display_name}</span>
              {u.id === currentUserId && <span style={{ fontSize:10,fontWeight:600,color:'#8A8D91',fontFamily:'"Instrument Sans",system-ui' }}>You</span>}
              {u.role === 'superadmin' && <span style={{ fontSize:10,fontWeight:700,color:'#92400E',background:'#FEF9C3',border:'1px solid #FDE68A',borderRadius:8,padding:'1px 6px',fontFamily:'"Instrument Sans",system-ui' }}>Admin</span>}
              {u.role === 'moderator'  && <span style={{ fontSize:10,fontWeight:700,color:BLUE,background:'#EBF5FB',border:'1px solid #AED6F1',borderRadius:8,padding:'1px 6px',fontFamily:'"Instrument Sans",system-ui' }}>Mod</span>}
              {u.is_banned && <span style={{ fontSize:10,fontWeight:700,color:RED,background:'#FEE2E2',border:'1px solid #FECACA',borderRadius:8,padding:'1px 6px',fontFamily:'"Instrument Sans",system-ui' }}>Banned</span>}
              {u.is_muted  && <span style={{ fontSize:10,fontWeight:700,color:'#C2410C',background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:8,padding:'1px 6px',fontFamily:'"Instrument Sans",system-ui' }}>Muted</span>}
            </div>
            <p style={{ margin:'1px 0 0',fontFamily:'"Instrument Sans",system-ui',fontSize:11,color:'#8A8D91',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{u.email}</p>
          </div>
          <ChevronRight size={16} color="#BCC0C4"/>
        </div>
      ))}
    </div>
  )
}

// ── Banners ───────────────────────────────────────────────────
function BannersTab({ banners, newBanner, setNewBanner, bannerHours, setBannerHours, onPost, onDelete, posting }) {
  const active   = banners.filter(b => b.is_active)
  const inactive = banners.filter(b => !b.is_active)

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
      <div style={{ background:'white',borderRadius:12,border:'1px solid #DADDE1',padding:'14px 16px' }}>
        <p style={{ margin:'0 0 10px',fontFamily:'"Instrument Sans",system-ui',fontSize:12,fontWeight:700,color:'#65676B',textTransform:'uppercase',letterSpacing:0.5 }}>
          Post System Banner
        </p>
        <textarea value={newBanner} onChange={e => setNewBanner(e.target.value)} rows={3}
          placeholder="Type your announcement to all users…"
          style={{ width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #E4E6EB',fontFamily:'"Instrument Sans",system-ui',fontSize:14,color:'#050505',resize:'none',outline:'none',background:'#F7F8FA',boxSizing:'border-box',marginBottom:10 }}/>
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          <div style={{ position:'relative',flex:1 }}>
            <select value={bannerHours} onChange={e => setBannerHours(e.target.value)}
              style={{ width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid #E4E6EB',background:'#F7F8FA',fontFamily:'"Instrument Sans",system-ui',fontSize:13,color:'#050505',appearance:'none',outline:'none' }}>
              <option value="1">Expires in 1 hour</option>
              <option value="6">Expires in 6 hours</option>
              <option value="24">Expires in 24 hours</option>
              <option value="72">Expires in 3 days</option>
              <option value="never">Never expires</option>
            </select>
          </div>
          <button onClick={onPost} disabled={posting||!newBanner.trim()}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:10,border:'none',background:newBanner.trim()?RED:'#E4E6EB',color:newBanner.trim()?'white':'#BCC0C4',cursor:newBanner.trim()?'pointer':'default',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,flexShrink:0,transition:'background 0.12s' }}>
            {posting ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/> : <Send size={14}/>}
            Post
          </button>
        </div>
      </div>

      {active.length > 0 && (
        <div>
          <p style={{ margin:'4px 0 6px',fontFamily:'"Instrument Sans",system-ui',fontSize:11,fontWeight:700,color:'#65676B',textTransform:'uppercase',letterSpacing:0.5 }}>Active · {active.length}</p>
          {active.map(b => <BannerRow key={b.id} banner={b} onDelete={() => onDelete(b.id)} active/>)}
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <p style={{ margin:'4px 0 6px',fontFamily:'"Instrument Sans",system-ui',fontSize:11,fontWeight:700,color:'#BCC0C4',textTransform:'uppercase',letterSpacing:0.5 }}>Past · {inactive.length}</p>
          {inactive.map(b => <BannerRow key={b.id} banner={b} active={false}/>)}
        </div>
      )}

      {banners.length === 0 && (
        <div style={{ textAlign:'center',padding:'40px 24px' }}>
          <div style={{ fontSize:36,marginBottom:8 }}>📢</div>
          <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:14,color:'#65676B' }}>No banners yet</p>
        </div>
      )}
    </div>
  )
}

function BannerRow({ banner, onDelete, active }) {
  return (
    <div style={{ background:'white',borderRadius:10,border:`1px solid ${active?'#FED7AA':'#E4E6EB'}`,padding:'11px 14px',marginBottom:6,display:'flex',alignItems:'flex-start',gap:10 }}>
      <div style={{ flex:1,minWidth:0 }}>
        <p style={{ margin:'0 0 4px',fontFamily:'"Instrument Sans",system-ui',fontSize:13.5,color:'#050505',lineHeight:1.4 }}>{banner.message}</p>
        <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:11,color:'#8A8D91' }}>
          {format(new Date(banner.created_at),'MMM d, yyyy · h:mm a')}
          {banner.expires_at && ` · expires ${formatDistanceToNow(new Date(banner.expires_at),{addSuffix:true})}`}
        </p>
      </div>
      {active && onDelete && (
        <button onClick={onDelete} style={{ background:'none',border:'none',cursor:'pointer',color:'#BCC0C4',display:'flex',padding:4,flexShrink:0,transition:'color 0.12s' }}
          onMouseEnter={e=>e.currentTarget.style.color=RED} onMouseLeave={e=>e.currentTarget.style.color='#BCC0C4'}>
          <Trash2 size={14}/>
        </button>
      )}
    </div>
  )
}

// ── Announcement Types Manager ────────────────────────────────
function AnnouncementTypesTab() {
  const [types, setTypes]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [newLabel, setNewLabel]   = useState('')
  const [adding, setAdding]       = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [saving, setSaving]       = useState(false)

  useEffect(() => { fetchTypes() }, [])

  async function fetchTypes() {
    setLoading(true)
    const { data } = await supabase
      .from('announcement_types')
      .select('*')
      .order('sort_order', { ascending: true })
    setTypes(data || [])
    setLoading(false)
  }

  async function addType() {
    if (!newLabel.trim()) { toast.error('Enter a label'); return }
    if (types.some(t => t.label.toLowerCase() === newLabel.trim().toLowerCase())) {
      toast.error('That type already exists'); return
    }
    setAdding(true)
    const maxOrder = types.length > 0 ? Math.max(...types.map(t => t.sort_order)) : 0
    const { error } = await supabase.from('announcement_types').insert({
      label: newLabel.trim(),
      is_visible: true,
      sort_order: maxOrder + 1,
    })
    if (error) { toast.error(error.message); setAdding(false); return }
    toast.success(`"${newLabel.trim()}" added`)
    setNewLabel('')
    setAdding(false)
    fetchTypes()
  }

  async function toggleVisibility(type) {
    await supabase.from('announcement_types').update({ is_visible: !type.is_visible }).eq('id', type.id)
    toast.success(type.is_visible ? 'Type hidden' : 'Type visible')
    fetchTypes()
  }

  async function deleteType(type) {
    if (!window.confirm(`Delete "${type.label}"? Posts using this type will keep the label but it won't appear in dropdowns.`)) return
    const { error } = await supabase.from('announcement_types').delete().eq('id', type.id)
    if (error) { toast.error(error.message); return }
    toast.success(`"${type.label}" deleted`)
    fetchTypes()
  }

  async function saveEdit(id) {
    if (!editLabel.trim()) { toast.error('Label cannot be empty'); return }
    setSaving(true)
    const { error } = await supabase.from('announcement_types').update({ label: editLabel.trim() }).eq('id', id)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Label updated')
    setEditingId(null)
    setSaving(false)
    fetchTypes()
  }

  async function moveType(type, direction) {
    const sorted = [...types].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex(t => t.id === type.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const a = sorted[idx]
    const b = sorted[swapIdx]
    await Promise.all([
      supabase.from('announcement_types').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('announcement_types').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    fetchTypes()
  }

  if (loading) return (
    <div style={{ display:'flex',justifyContent:'center',padding:48 }}>
      <Loader2 size={24} color={RED} style={{ animation:'spin 0.8s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:10 }}>

      {/* Info card */}
      <div style={{ background:'#EBF5FB',border:'1px solid #AED6F1',borderRadius:10,padding:'10px 14px',display:'flex',gap:8 }}>
        <Tag size={15} color={BLUE} style={{ flexShrink:0,marginTop:1 }}/>
        <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:12,color:BLUE,lineHeight:1.5 }}>
          These are the types that appear in the announcement dropdown when creating posts. Hidden types won't show for users but existing posts keep their label.
        </p>
      </div>

      {/* Add new type */}
      <div style={{ background:'white',borderRadius:12,border:'1px solid #DADDE1',padding:'14px 16px' }}>
        <p style={{ margin:'0 0 10px',fontFamily:'"Instrument Sans",system-ui',fontSize:12,fontWeight:700,color:'#65676B',textTransform:'uppercase',letterSpacing:0.5 }}>
          Add New Type
        </p>
        <div style={{ display:'flex',gap:8 }}>
          <input
            value={newLabel} onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addType() }}
            placeholder="e.g. Field Trip, Defense, Recitation…"
            maxLength={40}
            style={{ flex:1,padding:'9px 12px',borderRadius:10,border:'1px solid #E4E6EB',fontFamily:'"Instrument Sans",system-ui',fontSize:13,color:'#050505',outline:'none',background:'#F7F8FA' }}
          />
          <button onClick={addType} disabled={adding || !newLabel.trim()}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:10,border:'none',background:newLabel.trim()?'#0D7377':'#E4E6EB',color:newLabel.trim()?'white':'#BCC0C4',cursor:newLabel.trim()?'pointer':'default',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,flexShrink:0,transition:'background 0.12s' }}>
            {adding ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/> : <Plus size={14}/>}
            Add
          </button>
        </div>
      </div>

      {/* Types list */}
      <div style={{ background:'white',borderRadius:12,border:'1px solid #DADDE1',overflow:'hidden' }}>
        <div style={{ padding:'12px 16px',borderBottom:'1px solid #F0F2F5',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:12,fontWeight:700,color:'#65676B',textTransform:'uppercase',letterSpacing:0.5 }}>
            All Types · {types.length}
          </p>
          <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:11,color:'#BCC0C4' }}>
            {types.filter(t => t.is_visible).length} visible · {types.filter(t => !t.is_visible).length} hidden
          </p>
        </div>

        {types.length === 0 ? (
          <div style={{ padding:'32px 0',textAlign:'center' }}>
            <div style={{ fontSize:32,marginBottom:8 }}>🏷️</div>
            <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:13,color:'#65676B' }}>No types yet — add one above</p>
          </div>
        ) : (
          types.map((type, idx) => (
            <div key={type.id} style={{ padding:'11px 14px',borderBottom:idx < types.length-1?'1px solid #F0F2F5':'none',display:'flex',alignItems:'center',gap:10,animation:'fadeIn 0.15s ease',opacity:type.is_visible?1:0.55 }}>

              {/* Order buttons */}
              <div style={{ display:'flex',flexDirection:'column',gap:1,flexShrink:0 }}>
                <button onClick={() => moveType(type,'up')} disabled={idx===0}
                  style={{ background:'none',border:'none',cursor:idx===0?'default':'pointer',color:idx===0?'#E4E6EB':'#BCC0C4',padding:'1px 2px',display:'flex',transition:'color 0.12s' }}
                  onMouseEnter={e=>{ if(idx>0) e.currentTarget.style.color='#050505' }}
                  onMouseLeave={e=>e.currentTarget.style.color=idx===0?'#E4E6EB':'#BCC0C4'}>
                  <ChevronUp size={13}/>
                </button>
                <button onClick={() => moveType(type,'down')} disabled={idx===types.length-1}
                  style={{ background:'none',border:'none',cursor:idx===types.length-1?'default':'pointer',color:idx===types.length-1?'#E4E6EB':'#BCC0C4',padding:'1px 2px',display:'flex',transition:'color 0.12s' }}
                  onMouseEnter={e=>{ if(idx<types.length-1) e.currentTarget.style.color='#050505' }}
                  onMouseLeave={e=>e.currentTarget.style.color=idx===types.length-1?'#E4E6EB':'#BCC0C4'}>
                  <ChevronDown size={13}/>
                </button>
              </div>

              {/* Label / edit field */}
              {editingId === type.id ? (
                <input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(type.id); if (e.key === 'Escape') setEditingId(null) }}
                  autoFocus
                  maxLength={40}
                  style={{ flex:1,padding:'6px 10px',borderRadius:8,border:`1.5px solid #0D7377`,fontFamily:'"Instrument Sans",system-ui',fontSize:13,color:'#050505',outline:'none',background:'white' }}
                />
              ) : (
                <span style={{ flex:1,fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:14,color:type.is_visible?'#050505':'#BCC0C4' }}>
                  {type.label}
                  {!type.is_visible && <span style={{ marginLeft:6,fontSize:11,color:'#BCC0C4',fontWeight:400 }}>hidden</span>}
                </span>
              )}

              {/* Actions */}
              <div style={{ display:'flex',gap:4,flexShrink:0 }}>
                {editingId === type.id ? (
                  <>
                    <ActionBtn icon={<Check size={13}/>} color={GREEN} title="Save" onClick={() => saveEdit(type.id)} loading={saving}/>
                    <ActionBtn icon={<X size={13}/>} color="#65676B" title="Cancel" onClick={() => setEditingId(null)}/>
                  </>
                ) : (
                  <>
                    <ActionBtn icon={<Pencil size={13}/>} color="#65676B" title="Rename" onClick={() => { setEditingId(type.id); setEditLabel(type.label) }}/>
                    <ActionBtn icon={type.is_visible ? <EyeOff size={13}/> : <Eye size={13}/>} color={type.is_visible?'#65676B':GREEN} title={type.is_visible?'Hide':'Show'} onClick={() => toggleVisibility(type)}/>
                    <ActionBtn icon={<Trash2 size={13}/>} color={RED} title="Delete" onClick={() => deleteType(type)}/>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Subjects Manager ──────────────────────────────────────────
function SubjectsTab() {
  const [subjects, setSubjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [newName, setNewName]     = useState('')
  const [newDesc, setNewDesc]     = useState('')
  const [adding, setAdding]       = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName]   = useState('')
  const [editDesc, setEditDesc]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [filter, setFilter]       = useState('all')

  useEffect(() => { fetchSubjects() }, [])

  async function fetchSubjects() {
    setLoading(true)
    const { data } = await supabase
      .from('subjects')
      .select('*, user_subjects(count)')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
    setSubjects(data || [])
    setLoading(false)
  }

  async function addSubject() {
    if (!newName.trim()) { toast.error('Enter a subject name'); return }
    setAdding(true)
    const { error } = await supabase.from('subjects').insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
      is_archived: false,
      is_featured: false,
    })
    if (error) { toast.error(error.message); setAdding(false); return }
    toast.success(`"${newName.trim()}" added`)
    setNewName(''); setNewDesc(''); setShowAdd(false)
    setAdding(false)
    fetchSubjects()
  }

  async function saveEdit(id) {
    if (!editName.trim()) { toast.error('Name cannot be empty'); return }
    setSaving(true)
    const { error } = await supabase.from('subjects').update({
      name: editName.trim(),
      description: editDesc.trim() || null,
    }).eq('id', id)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Subject updated')
    setEditingId(null)
    setSaving(false)
    fetchSubjects()
  }

  async function toggleArchive(subject) {
    await supabase.from('subjects').update({ is_archived: !subject.is_archived }).eq('id', subject.id)
    toast.success(subject.is_archived ? 'Subject restored' : 'Subject archived')
    fetchSubjects()
  }

  async function toggleFeature(subject) {
    await supabase.from('subjects').update({ is_featured: !subject.is_featured }).eq('id', subject.id)
    toast.success(subject.is_featured ? 'Removed from featured' : 'Subject featured!')
    fetchSubjects()
  }

  async function deleteSubject(subject) {
    if (!window.confirm(`Delete "${subject.name}"? This will remove all enrollment records. Posts will remain.`)) return
    const { error } = await supabase.from('subjects').delete().eq('id', subject.id)
    if (error) { toast.error(error.message); return }
    toast.success(`"${subject.name}" deleted`)
    fetchSubjects()
  }

  const filtered = subjects.filter(s => {
    if (filter === 'active')   return !s.is_archived
    if (filter === 'archived') return s.is_archived
    if (filter === 'featured') return s.is_featured
    return true
  })

  if (loading) return (
    <div style={{ display:'flex',justifyContent:'center',padding:48 }}>
      <Loader2 size={24} color={RED} style={{ animation:'spin 0.8s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:10 }}>

      {/* Header row */}
      <div style={{ display:'flex',gap:8,alignItems:'center' }}>
        <div style={{ display:'flex',gap:6,flex:1,flexWrap:'wrap' }}>
          {['all','active','featured','archived'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:'5px 12px',borderRadius:20,border:`1.5px solid ${filter===f?RED:'#E4E6EB'}`,background:filter===f?'#FADBD8':'white',color:filter===f?RED:'#65676B',fontFamily:'"Instrument Sans",system-ui',fontWeight:filter===f?700:500,fontSize:12,cursor:'pointer' }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,border:'none',background:showAdd?'#F0F2F5':'#0D7377',color:showAdd?'#65676B':'white',cursor:'pointer',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,flexShrink:0,transition:'background 0.12s' }}>
          {showAdd ? <X size={14}/> : <Plus size={14}/>}
          {showAdd ? 'Cancel' : 'Add'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background:'white',borderRadius:12,border:'1px solid #DADDE1',padding:'14px 16px',animation:'fadeIn 0.18s ease' }}>
          <p style={{ margin:'0 0 10px',fontFamily:'"Instrument Sans",system-ui',fontSize:12,fontWeight:700,color:'#65676B',textTransform:'uppercase',letterSpacing:0.5 }}>
            New Subject
          </p>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Subject name *" maxLength={80}
            style={{ width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid #E4E6EB',fontFamily:'"Instrument Sans",system-ui',fontSize:13,color:'#050505',outline:'none',background:'#F7F8FA',boxSizing:'border-box',marginBottom:8 }}/>
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Short description (optional)" rows={2} maxLength={200}
            style={{ width:'100%',padding:'9px 12px',borderRadius:10,border:'1px solid #E4E6EB',fontFamily:'"Instrument Sans",system-ui',fontSize:13,color:'#050505',outline:'none',background:'#F7F8FA',resize:'none',boxSizing:'border-box',marginBottom:10 }}/>
          <button onClick={addSubject} disabled={adding||!newName.trim()}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:10,border:'none',background:newName.trim()?'#0D7377':'#E4E6EB',color:newName.trim()?'white':'#BCC0C4',cursor:newName.trim()?'pointer':'default',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,transition:'background 0.12s' }}>
            {adding ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/> : <Plus size={14}/>}
            Add Subject
          </button>
        </div>
      )}

      {/* Subjects list */}
      <p style={{ margin:'2px 0 0',fontFamily:'"Instrument Sans",system-ui',fontSize:11,color:'#8A8D91' }}>{filtered.length} subject{filtered.length!==1?'s':''}</p>

      {filtered.length === 0 ? (
        <div style={{ background:'white',borderRadius:12,border:'1px solid #DADDE1',padding:'40px 0',textAlign:'center' }}>
          <div style={{ fontSize:36,marginBottom:8 }}>📚</div>
          <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:13,color:'#65676B' }}>No subjects here</p>
        </div>
      ) : (
        filtered.map(subject => {
          const enrollCount = subject.user_subjects?.[0]?.count ?? 0
          const isEditing = editingId === subject.id
          return (
            <div key={subject.id} style={{ background:'white',borderRadius:12,border:`1px solid ${subject.is_archived?'#E4E6EB':subject.is_featured?'#FDE68A':'#DADDE1'}`,padding:'14px 16px',display:'flex',flexDirection:'column',gap:8,opacity:subject.is_archived?0.65:1,animation:'fadeIn 0.15s ease' }}>

              {/* Top row: name + badges + actions */}
              <div style={{ display:'flex',alignItems:'flex-start',gap:10 }}>
                <div style={{ flex:1,minWidth:0 }}>
                  {isEditing ? (
                    <>
                      <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={80} autoFocus
                        style={{ width:'100%',padding:'6px 10px',borderRadius:8,border:'1.5px solid #0D7377',fontFamily:'"Instrument Sans",system-ui',fontSize:14,fontWeight:700,color:'#050505',outline:'none',background:'white',boxSizing:'border-box',marginBottom:6 }}/>
                      <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} maxLength={200}
                        style={{ width:'100%',padding:'6px 10px',borderRadius:8,border:'1.5px solid #E4E6EB',fontFamily:'"Instrument Sans",system-ui',fontSize:12,color:'#050505',outline:'none',background:'white',resize:'none',boxSizing:'border-box' }}/>
                    </>
                  ) : (
                    <>
                      <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:2 }}>
                        <span style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:15,color:'#050505' }}>{subject.name}</span>
                        {subject.is_featured  && <span style={{ fontSize:10,fontWeight:700,color:'#92400E',background:'#FEF9C3',border:'1px solid #FDE68A',borderRadius:8,padding:'1px 6px',fontFamily:'"Instrument Sans",system-ui' }}>⭐ Featured</span>}
                        {subject.is_archived  && <span style={{ fontSize:10,fontWeight:700,color:'#65676B',background:'#F0F2F5',border:'1px solid #DADDE1',borderRadius:8,padding:'1px 6px',fontFamily:'"Instrument Sans",system-ui' }}>Archived</span>}
                      </div>
                      {subject.description && (
                        <p style={{ margin:'0 0 4px',fontFamily:'"Instrument Sans",system-ui',fontSize:12,color:'#65676B',lineHeight:1.4 }}>{subject.description}</p>
                      )}
                      <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:11,color:'#BCC0C4' }}>
                        {enrollCount} enrolled · created {formatDistanceToNow(new Date(subject.created_at),{addSuffix:true})}
                      </p>
                    </>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display:'flex',gap:4,flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end' }}>
                  {isEditing ? (
                    <>
                      <ActionBtn icon={<Check size={13}/>} color={GREEN} title="Save" onClick={() => saveEdit(subject.id)} loading={saving}/>
                      <ActionBtn icon={<X size={13}/>} color="#65676B" title="Cancel" onClick={() => setEditingId(null)}/>
                    </>
                  ) : (
                    <>
                      <ActionBtn icon={<Pencil size={13}/>} color="#65676B" title="Edit" onClick={() => { setEditingId(subject.id); setEditName(subject.name); setEditDesc(subject.description||'') }}/>
                      <ActionBtn icon={<Star size={13}/>} color={subject.is_featured?'#92400E':'#65676B'} title={subject.is_featured?'Unfeature':'Feature'} onClick={() => toggleFeature(subject)}/>
                      <ActionBtn icon={<Archive size={13}/>} color={subject.is_archived?GREEN:'#65676B'} title={subject.is_archived?'Restore':'Archive'} onClick={() => toggleArchive(subject)}/>
                      <ActionBtn icon={<Trash2 size={13}/>} color={RED} title="Delete" onClick={() => deleteSubject(subject)}/>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ── Shared small action button ────────────────────────────────
function ActionBtn({ icon, color, title, onClick, loading: isLoading }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width:30,height:30,borderRadius:8,border:`1px solid ${hovered?color:'#E4E6EB'}`,background:hovered?`${color}15`:'white',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:hovered?color:'#BCC0C4',transition:'all 0.12s',flexShrink:0 }}>
      {isLoading ? <Loader2 size={12} style={{ animation:'spin 0.8s linear infinite' }}/> : icon}
    </button>
  )
}

// ── Audit Log ─────────────────────────────────────────────────
const ACTION_LABELS = {
  delete_post:           { label:'Deleted post',      color:RED     },
  pin_post:              { label:'Pinned post',        color:'#F59E0B'},
  unpin_post:            { label:'Unpinned post',      color:'#8A8D91'},
  lock_post:             { label:'Locked comments',    color:'#64748B'},
  unlock_post:           { label:'Unlocked comments',  color:'#64748B'},
  mute_user:             { label:'Muted user',         color:'#C2410C'},
  unmute_user:           { label:'Unmuted user',       color:GREEN   },
  ban_user:              { label:'Banned user',        color:RED     },
  unban_user:            { label:'Unbanned user',      color:GREEN   },
  promote_to_moderator:  { label:'Promoted to Mod',    color:BLUE    },
  demote_from_moderator: { label:'Demoted from Mod',   color:'#8A8D91'},
}

function AuditTab({ logs }) {
  if (logs.length === 0) return (
    <div style={{ textAlign:'center',padding:'48px 24px' }}>
      <div style={{ fontSize:36,marginBottom:8 }}>📋</div>
      <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:14,color:'#65676B' }}>No audit logs yet</p>
    </div>
  )
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
      {logs.map(log => {
        const meta = ACTION_LABELS[log.action] || { label:log.action, color:'#65676B' }
        return (
          <div key={log.id} style={{ background:'white',borderRadius:10,border:'1px solid #DADDE1',padding:'11px 14px',display:'flex',alignItems:'center',gap:10 }}>
            <img src={log.actor?.avatar_url||dicebearUrl(log.actor?.display_name)} style={{ width:32,height:32,borderRadius:9,objectFit:'cover',flexShrink:0 }} alt=""/>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
                <span style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,color:'#050505' }}>{log.actor?.display_name||'Unknown'}</span>
                <span style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:12,color:meta.color,background:`${meta.color}15`,padding:'2px 8px',borderRadius:10 }}>{meta.label}</span>
              </div>
              <p style={{ margin:'2px 0 0',fontFamily:'"Instrument Sans",system-ui',fontSize:11,color:'#8A8D91' }}>
                {formatDistanceToNow(new Date(log.created_at),{addSuffix:true})}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
