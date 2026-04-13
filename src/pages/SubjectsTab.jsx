// ── SubjectsTab — REPLACEMENT for AdminDashboard.jsx ─────────
// Drop-in replacement for the SubjectsTab function in AdminDashboard.jsx
// Key changes:
//   1. Fetches all distinct channels from profiles
//   2. Shows channel tabs at top (All, CS, IT, etc.)
//   3. Add Subject form includes a "Channel" dropdown
//   4. Edit subject form also shows channel picker
//   5. Subject cards show their channel badge

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Pencil, Star, Archive, Trash2, Check, X,
  Plus, Loader2, Radio
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const RED   = '#C0392B'
const GREEN = '#16a34a'
const TEAL  = '#0D7377'

// ── Small action icon button (reused from AdminDashboard) ─────
function ActionBtn({ icon, color, title, onClick, loading: isLoading }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick} disabled={isLoading} title={title}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ width:30, height:30, borderRadius:8, border:`1px solid ${hovered?color:'#E4E6EB'}`, background:hovered?`${color}15`:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:hovered?color:'#BCC0C4', transition:'all 0.12s', flexShrink:0 }}>
      {isLoading ? <Loader2 size={12} style={{ animation:'spin 0.8s linear infinite' }}/> : icon}
    </button>
  )
}

// ── Channel badge ─────────────────────────────────────────────
function ChannelBadge({ channel }) {
  if (!channel) return (
    <span style={{ fontFamily:'"Instrument Sans",system-ui', fontSize:10, fontWeight:600, color:'#8A8D91', background:'#F0F2F5', border:'1px solid #E4E6EB', borderRadius:8, padding:'1px 6px' }}>
      Global
    </span>
  )
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontFamily:'"Instrument Sans",system-ui', fontSize:10, fontWeight:700, color:TEAL, background:'rgba(13,115,119,0.10)', border:'1px solid rgba(13,115,119,0.25)', borderRadius:8, padding:'1px 6px' }}>
      <Radio size={8} color={TEAL}/> {channel}
    </span>
  )
}

export default function SubjectsTab() {
  const [subjects, setSubjects]   = useState([])
  const [channels, setChannels]   = useState([])  // distinct channels from profiles
  const [loading, setLoading]     = useState(true)
  const [activeChannel, setActiveChannel] = useState('__ALL__')  // '__ALL__' = show all

  const [showAdd, setShowAdd]     = useState(false)
  const [newName, setNewName]     = useState('')
  const [newDesc, setNewDesc]     = useState('')
  const [newChannel, setNewChannel] = useState('')  // '' = global
  const [adding, setAdding]       = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName]   = useState('')
  const [editDesc, setEditDesc]   = useState('')
  const [editChannel, setEditChannel] = useState('')
  const [saving, setSaving]       = useState(false)

  const [filter, setFilter]       = useState('all')

  // Fetch channels from profiles so the dropdown always reflects real channels
  useEffect(() => {
    supabase
      .from('profiles')
      .select('section')
      .not('section', 'is', null)
      .neq('section', '')
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map(p => p.section))].sort()
          setChannels(unique)
        }
      })
  }, [])

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
      channel: newChannel || null,  // null = global
      is_archived: false,
      is_featured: false,
    })
    if (error) { toast.error(error.message); setAdding(false); return }
    toast.success(`"${newName.trim()}" added${newChannel ? ` to ${newChannel}` : ' (Global)'}`)
    setNewName(''); setNewDesc(''); setNewChannel(''); setShowAdd(false)
    setAdding(false)
    fetchSubjects()
  }

  async function saveEdit(id) {
    if (!editName.trim()) { toast.error('Name cannot be empty'); return }
    setSaving(true)
    const { error } = await supabase.from('subjects').update({
      name: editName.trim(),
      description: editDesc.trim() || null,
      channel: editChannel || null,
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
    if (!window.confirm(`Delete "${subject.name}"? Enrollment records will be removed. Posts will remain.`)) return
    const { error } = await supabase.from('subjects').delete().eq('id', subject.id)
    if (error) { toast.error(error.message); return }
    toast.success(`"${subject.name}" deleted`)
    fetchSubjects()
  }

  // ── Filtering logic ───────────────────────────────────────
  // First filter by active channel tab
  const byChannel = subjects.filter(s => {
    if (activeChannel === '__ALL__') return true
    if (activeChannel === '__GLOBAL__') return !s.channel
    return s.channel === activeChannel
  })

  // Then filter by status pill
  const filtered = byChannel.filter(s => {
    if (filter === 'active')   return !s.is_archived
    if (filter === 'archived') return s.is_archived
    if (filter === 'featured') return s.is_featured
    return true
  })

  // Count subjects per channel for tab badges
  function countForChannel(ch) {
    if (ch === '__ALL__')    return subjects.length
    if (ch === '__GLOBAL__') return subjects.filter(s => !s.channel).length
    return subjects.filter(s => s.channel === ch).length
  }

  const channelTabs = [
    { key: '__ALL__',    label: 'All' },
    { key: '__GLOBAL__', label: 'Global' },
    ...channels.map(ch => ({ key: ch, label: ch })),
  ]

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
      <Loader2 size={24} color={RED} style={{ animation:'spin 0.8s linear infinite' }}/>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

      {/* ── Channel Tabs ── */}
      <div style={{ background:'white', borderRadius:12, border:'1px solid #DADDE1', overflow:'hidden' }}>
        <div style={{ padding:'12px 16px 0', borderBottom:'1px solid #F0F2F5' }}>
          <p style={{ margin:'0 0 10px', fontFamily:'"Instrument Sans",system-ui', fontSize:11, fontWeight:700, color:'#65676B', textTransform:'uppercase', letterSpacing:0.5 }}>Filter by Channel</p>
          <div style={{ display:'flex', overflowX:'auto', gap:2, paddingBottom:0, scrollbarWidth:'none' }}>
            {channelTabs.map(({ key, label }) => {
              const isActive = activeChannel === key
              const count = countForChannel(key)
              return (
                <button key={key} onClick={() => setActiveChannel(key)}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 14px', border:'none', cursor:'pointer', background:'transparent', fontFamily:'"Instrument Sans",system-ui', fontWeight:isActive?700:600, fontSize:13, color:isActive?TEAL:'#65676B', borderBottom:`2px solid ${isActive?TEAL:'transparent'}`, whiteSpace:'nowrap', transition:'all 0.15s', flexShrink:0 }}>
                  {key !== '__ALL__' && key !== '__GLOBAL__' && <Radio size={11} color={isActive?TEAL:'#BCC0C4'}/>}
                  {label}
                  <span style={{ background:isActive?'rgba(13,115,119,0.15)':'#F0F2F5', color:isActive?TEAL:'#8A8D91', fontFamily:'"Instrument Sans",system-ui', fontWeight:700, fontSize:10, padding:'1px 6px', borderRadius:10 }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Toolbar: status filter + Add button ── */}
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <div style={{ display:'flex', gap:6, flex:1, flexWrap:'wrap' }}>
          {['all','active','featured','archived'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:'5px 12px', borderRadius:20, border:`1.5px solid ${filter===f?RED:'#E4E6EB'}`, background:filter===f?'#FADBD8':'white', color:filter===f?RED:'#65676B', fontFamily:'"Instrument Sans",system-ui', fontWeight:filter===f?700:500, fontSize:12, cursor:'pointer' }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'none', background:showAdd?'#F0F2F5':'#0D7377', color:showAdd?'#65676B':'white', cursor:'pointer', fontFamily:'"Instrument Sans",system-ui', fontWeight:700, fontSize:13, flexShrink:0, transition:'background 0.12s' }}>
          {showAdd ? <X size={14}/> : <Plus size={14}/>}
          {showAdd ? 'Cancel' : 'Add Subject'}
        </button>
      </div>

      {/* ── Add Subject Form ── */}
      {showAdd && (
        <div style={{ background:'white', borderRadius:12, border:'1px solid #DADDE1', padding:'14px 16px', animation:'fadeIn 0.18s ease' }}>
          <p style={{ margin:'0 0 10px', fontFamily:'"Instrument Sans",system-ui', fontSize:12, fontWeight:700, color:'#65676B', textTransform:'uppercase', letterSpacing:0.5 }}>New Subject</p>

          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Subject name *" maxLength={80}
            style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid #E4E6EB', fontFamily:'"Instrument Sans",system-ui', fontSize:13, color:'#050505', outline:'none', background:'#F7F8FA', boxSizing:'border-box', marginBottom:8 }}/>

          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Short description (optional)" rows={2} maxLength={200}
            style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid #E4E6EB', fontFamily:'"Instrument Sans",system-ui', fontSize:13, color:'#050505', outline:'none', background:'#F7F8FA', resize:'none', boxSizing:'border-box', marginBottom:8 }}/>

          {/* Channel picker */}
          <div style={{ marginBottom:12 }}>
            <label style={{ display:'block', fontFamily:'"Instrument Sans",system-ui', fontSize:11, fontWeight:700, color:'#65676B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>
              Assign to Channel
            </label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <button type="button" onClick={() => setNewChannel('')}
                style={{ padding:'6px 12px', borderRadius:20, border:`1.5px solid ${!newChannel?TEAL:'#E4E6EB'}`, background:!newChannel?'rgba(13,115,119,0.10)':'white', color:!newChannel?TEAL:'#65676B', fontFamily:'"Instrument Sans",system-ui', fontWeight:!newChannel?700:500, fontSize:12, cursor:'pointer', transition:'all 0.12s' }}>
                Global (all channels)
              </button>
              {channels.map(ch => (
                <button key={ch} type="button" onClick={() => setNewChannel(ch)}
                  style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:20, border:`1.5px solid ${newChannel===ch?TEAL:'#E4E6EB'}`, background:newChannel===ch?'rgba(13,115,119,0.10)':'white', color:newChannel===ch?TEAL:'#65676B', fontFamily:'"Instrument Sans",system-ui', fontWeight:newChannel===ch?700:500, fontSize:12, cursor:'pointer', transition:'all 0.12s' }}>
                  <Radio size={10} color={newChannel===ch?TEAL:'#BCC0C4'}/> {ch}
                </button>
              ))}
            </div>
            <p style={{ margin:'5px 0 0', fontFamily:'"Instrument Sans",system-ui', fontSize:11, color:'#8A8D91' }}>
              {newChannel ? `Only students in "${newChannel}" will see this subject.` : 'All students will see this subject regardless of their channel.'}
            </p>
          </div>

          <button onClick={addSubject} disabled={adding||!newName.trim()}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, border:'none', background:newName.trim()?TEAL:'#E4E6EB', color:newName.trim()?'white':'#BCC0C4', cursor:newName.trim()?'pointer':'default', fontFamily:'"Instrument Sans",system-ui', fontWeight:700, fontSize:13, transition:'background 0.12s' }}>
            {adding ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/> : <Plus size={14}/>}
            Add Subject
          </button>
        </div>
      )}

      {/* ── Count label ── */}
      <p style={{ margin:'2px 0 0', fontFamily:'"Instrument Sans",system-ui', fontSize:11, color:'#8A8D91' }}>
        {filtered.length} subject{filtered.length!==1?'s':''}
        {activeChannel !== '__ALL__' && (
          <span> in <strong>{activeChannel === '__GLOBAL__' ? 'Global' : activeChannel}</strong></span>
        )}
      </p>

      {/* ── No subjects for this channel ── */}
      {filtered.length === 0 && (
        <div style={{ background:'white', borderRadius:12, border:'1px solid #DADDE1', padding:'40px 0', textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:8 }}>📚</div>
          <p style={{ margin:'0 0 6px', fontFamily:'"Instrument Sans",system-ui', fontSize:14, fontWeight:700, color:'#050505' }}>
            {activeChannel === '__ALL__' ? 'No subjects yet' : `No subjects in ${activeChannel === '__GLOBAL__' ? 'Global' : activeChannel}`}
          </p>
          <p style={{ margin:'0 0 14px', fontFamily:'"Instrument Sans",system-ui', fontSize:13, color:'#65676B' }}>
            {activeChannel !== '__ALL__' ? 'Add a subject and assign it to this channel.' : 'Click "Add Subject" to create one.'}
          </p>
          <button onClick={() => { setShowAdd(true); if (activeChannel !== '__ALL__' && activeChannel !== '__GLOBAL__') setNewChannel(activeChannel) }}
            style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:10, border:'none', background:TEAL, color:'white', cursor:'pointer', fontFamily:'"Instrument Sans",system-ui', fontWeight:700, fontSize:13 }}>
            <Plus size={14}/> Add Subject
          </button>
        </div>
      )}

      {/* ── Subject Cards ── */}
      {filtered.map(subject => {
        const enrollCount = subject.user_subjects?.[0]?.count ?? 0
        const isEditing = editingId === subject.id
        return (
          <div key={subject.id} style={{ background:'white', borderRadius:12, border:`1px solid ${subject.is_archived?'#E4E6EB':subject.is_featured?'#FDE68A':'#DADDE1'}`, padding:'14px 16px', display:'flex', flexDirection:'column', gap:8, opacity:subject.is_archived?0.65:1, animation:'fadeIn 0.15s ease' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                {isEditing ? (
                  <>
                    <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={80} autoFocus
                      style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:`1.5px solid ${TEAL}`, fontFamily:'"Instrument Sans",system-ui', fontSize:14, fontWeight:700, color:'#050505', outline:'none', background:'white', boxSizing:'border-box', marginBottom:6 }}/>
                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} maxLength={200}
                      style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1.5px solid #E4E6EB', fontFamily:'"Instrument Sans",system-ui', fontSize:12, color:'#050505', outline:'none', background:'white', resize:'none', boxSizing:'border-box', marginBottom:8 }}/>

                    {/* Channel picker in edit mode */}
                    <div style={{ marginBottom:6 }}>
                      <label style={{ display:'block', fontFamily:'"Instrument Sans",system-ui', fontSize:10, fontWeight:700, color:'#65676B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Channel</label>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        <button type="button" onClick={() => setEditChannel('')}
                          style={{ padding:'4px 10px', borderRadius:20, border:`1.5px solid ${!editChannel?TEAL:'#E4E6EB'}`, background:!editChannel?'rgba(13,115,119,0.10)':'white', color:!editChannel?TEAL:'#65676B', fontFamily:'"Instrument Sans",system-ui', fontWeight:!editChannel?700:500, fontSize:11, cursor:'pointer' }}>
                          Global
                        </button>
                        {channels.map(ch => (
                          <button key={ch} type="button" onClick={() => setEditChannel(ch)}
                            style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:20, border:`1.5px solid ${editChannel===ch?TEAL:'#E4E6EB'}`, background:editChannel===ch?'rgba(13,115,119,0.10)':'white', color:editChannel===ch?TEAL:'#65676B', fontFamily:'"Instrument Sans",system-ui', fontWeight:editChannel===ch?700:500, fontSize:11, cursor:'pointer' }}>
                            <Radio size={9} color={editChannel===ch?TEAL:'#BCC0C4'}/> {ch}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:3 }}>
                      <span style={{ fontFamily:'"Instrument Sans",system-ui', fontWeight:700, fontSize:15, color:'#050505' }}>{subject.name}</span>
                      <ChannelBadge channel={subject.channel}/>
                      {subject.is_featured  && <span style={{ fontSize:10, fontWeight:700, color:'#92400E', background:'#FEF9C3', border:'1px solid #FDE68A', borderRadius:8, padding:'1px 6px', fontFamily:'"Instrument Sans",system-ui' }}>⭐ Featured</span>}
                      {subject.is_archived  && <span style={{ fontSize:10, fontWeight:700, color:'#65676B', background:'#F0F2F5', border:'1px solid #DADDE1', borderRadius:8, padding:'1px 6px', fontFamily:'"Instrument Sans",system-ui' }}>Archived</span>}
                    </div>
                    {subject.description && (
                      <p style={{ margin:'0 0 4px', fontFamily:'"Instrument Sans",system-ui', fontSize:12, color:'#65676B', lineHeight:1.4 }}>{subject.description}</p>
                    )}
                    <p style={{ margin:0, fontFamily:'"Instrument Sans",system-ui', fontSize:11, color:'#BCC0C4' }}>
                      {enrollCount} enrolled · created {formatDistanceToNow(new Date(subject.created_at),{addSuffix:true})}
                    </p>
                  </>
                )}
              </div>
              <div style={{ display:'flex', gap:4, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                {isEditing ? (
                  <>
                    <ActionBtn icon={<Check size={13}/>} color={GREEN} title="Save" onClick={() => saveEdit(subject.id)} loading={saving}/>
                    <ActionBtn icon={<X size={13}/>} color="#65676B" title="Cancel" onClick={() => setEditingId(null)}/>
                  </>
                ) : (
                  <>
                    <ActionBtn icon={<Pencil size={13}/>} color="#65676B" title="Edit" onClick={() => { setEditingId(subject.id); setEditName(subject.name); setEditDesc(subject.description||''); setEditChannel(subject.channel||'') }}/>
                    <ActionBtn icon={<Star size={13}/>} color={subject.is_featured?'#92400E':'#65676B'} title={subject.is_featured?'Unfeature':'Feature'} onClick={() => toggleFeature(subject)}/>
                    <ActionBtn icon={<Archive size={13}/>} color={subject.is_archived?GREEN:'#65676B'} title={subject.is_archived?'Restore':'Archive'} onClick={() => toggleArchive(subject)}/>
                    <ActionBtn icon={<Trash2 size={13}/>} color={RED} title="Delete" onClick={() => deleteSubject(subject)}/>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
