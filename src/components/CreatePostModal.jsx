import { useAnnouncementTypes } from '../hooks/useAnnouncementTypes'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRole } from '../hooks/useRole'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','5C4A7A','6B5B8A','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','4A3A7A','3E3068']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

import {
  X, Image, Paperclip, ChevronDown, Loader2,
  Plus, MessageSquareQuote, Eye, EyeOff,
  ClipboardPaste, Trash2, Clock, FileText,
  Users, Globe, Search, Check
} from 'lucide-react'
import toast from 'react-hot-toast'

function genShortId() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let id = ''
  for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

const MAX_PHOTOS = 20
const MAX_FILES = 10

const FILE_ACCEPT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
].join(',')

const POST_TYPES = [
  { sub_type: 'status',       post_type: 'status',       emoji: '💬', label: 'Status',       btnColor: '#0D7377', activeColor: '#050505', activeBg: '#F0F2F5', activeBorder: '#CED0D4' },
  { sub_type: 'material',     post_type: 'status',       emoji: '📁', label: 'Material',     btnColor: '#1A5276', activeColor: '#1A5276', activeBg: '#EBF5FB', activeBorder: '#AED6F1' },
  { sub_type: 'announcement', post_type: 'announcement', emoji: '📢', label: 'Announcement', btnColor: '#C0392B', activeColor: '#C0392B', activeBg: '#FFF0EF', activeBorder: '#F5B7B1' },
  { sub_type: 'reminder',     post_type: 'announcement', emoji: '🔔', label: 'Reminder',     btnColor: '#C0392B', activeColor: '#C0392B', activeBg: '#FFF0EF', activeBorder: '#F5B7B1' },
  { sub_type: 'deadline',     post_type: 'announcement', emoji: '📅', label: 'Deadline',     btnColor: '#922B21', activeColor: '#922B21', activeBg: '#FFF5F5', activeBorder: '#F5B7B1' },
]

function getQuoteAccent() {
  return { color: '#0D7377', bg: '#E6F4F4', light: '#B2DFDF', border: '#80C7C9' }
}

function QuotedMessagePreview({ from, message, accent }) {
  if (!from && !message) return null
  return (
    <div style={{ background: accent.bg, border: `1px solid ${accent.border}`, borderLeft: `3px solid ${accent.color}`, borderRadius: '0 8px 8px 0', padding: '8px 12px', marginTop: 8 }}>
      <p style={{ margin: '0 0 4px', fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 12, color: accent.color, display: 'flex', alignItems: 'center', gap: 5 }}>
        <MessageSquareQuote size={11} />
        {from ? `From ${from}` : 'Quoted message'}
      </p>
      <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 13.5, color: '#1c1e21', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {message || <span style={{ color: '#BCC0C4', fontStyle: 'italic' }}>Paste a message below to preview…</span>}
      </p>
    </div>
  )
}

export default function CreatePostModal({
  onClose, onCreated, subjects,
  defaultType = 'status', defaultSubType = 'status',
  autoOpenPhoto = false, autoOpenFile = false,
}) {
  const { user, profile } = useAuth()
  const { isSuperadmin } = useRole()
  const announcementTypes = useAnnouncementTypes()

  const initialType = POST_TYPES.find(t => t.sub_type === defaultSubType) || null
  const [selectedType, setSelectedType] = useState(defaultSubType !== 'status' ? initialType : null)
  const [typeError, setTypeError] = useState(false)

  const [form, setForm] = useState({
    caption: '', subject_id: '', announcement_type: '',
    due_date: '', due_time: '', quoted_from: '', quoted_message: '',
    scheduled_date: '', scheduled_time: '',
  })

  // ── Visibility / Group state ──
  const [visibility, setVisibility]         = useState('class')
  const [groupMembers, setGroupMembers]     = useState([])
  const [memberSearch, setMemberSearch]     = useState('')
  const [allUsers, setAllUsers]             = useState([])
  const [filteredUsers, setFilteredUsers]   = useState([])
  const [allUsersLoading, setAllUsersLoading] = useState(false)
  const [groupError, setGroupError]         = useState(false)
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false)
  const [showMemberPanel, setShowMemberPanel] = useState(false)
  const [pendingMembers, setPendingMembers] = useState([])
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)
  const searchTimeout                       = useRef(null)
  const visibilityDropdownRef               = useRef(null)

  const [photoFiles, setPhotoFiles]         = useState([])
  const [photoPreviews, setPhotoPreviews]   = useState([])
  const [attachFiles, setAttachFiles]       = useState([])
  const [loading, setLoading]               = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [showQuoteSection, setShowQuoteSection] = useState(false)
  const [showQuotePreview, setShowQuotePreview] = useState(false)
  const [pastingMsg, setPastingMsg]         = useState(false)
  const [showSchedule, setShowSchedule]     = useState(false)

  const photoRef      = useRef()
  const fileRef       = useRef()
  const uploadCounter = useRef(0)
  const pasteAreaRef  = useRef()
  const typePickerRef = useRef()

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  useEffect(() => {
    if (autoOpenPhoto) { const t = setTimeout(() => photoRef.current?.click(), 150); return () => clearTimeout(t) }
    if (autoOpenFile)  { const t = setTimeout(() => fileRef.current?.click(),  150); return () => clearTimeout(t) }
  }, [autoOpenPhoto, autoOpenFile])

  // Close visibility dropdown on outside click
  useEffect(() => {
    function h(e) {
      if (visibilityDropdownRef.current && !visibilityDropdownRef.current.contains(e.target)) {
        setShowVisibilityDropdown(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isAnnouncement   = selectedType?.post_type === 'announcement'
  const isDeadline       = selectedType?.sub_type === 'deadline'
  const isMaterial       = selectedType?.sub_type === 'material'
  const hasQuote         = showQuoteSection && (form.quoted_from.trim() || form.quoted_message.trim())
  const accent           = getQuoteAccent()

  function buildScheduledAt() {
    if (!showSchedule || !form.scheduled_date) return null
    const time = form.scheduled_time || '00:00'
    return new Date(`${form.scheduled_date}T${time}:00`).toISOString()
  }
  const scheduledAt       = buildScheduledAt()
  const isScheduledFuture = scheduledAt && new Date(scheduledAt) > new Date()

  function handleSelectType(type) {
    setSelectedType(type)
    setTypeError(false)
    if (type.sub_type !== 'deadline' && type.sub_type !== 'announcement') { set('due_date', ''); set('due_time', '') }
    if (type.sub_type !== 'material' && type.post_type !== 'announcement') setAttachFiles([])
    set('announcement_type', '')
  }

  function handleClose() {
    if (visibility === 'group' && groupMembers.length > 0) {
      setDiscardDialogOpen(true)
    } else {
      onClose()
    }
  }

  // ── Visibility change ──
  function switchToClass() {
    setVisibility('class')
    setGroupMembers([])
    setGroupError(false)
    setShowVisibilityDropdown(false)
  }

  function switchToGroup() {
    setVisibility('group')
    setGroupError(false)
    setShowVisibilityDropdown(false)
  }

  // ── Subject change handler — clears group members with toast ──
  function handleSubjectChange(newSubjectId) {
    set('subject_id', newSubjectId)
    setMemberSearch('')
    if (visibility === 'group' && groupMembers.length > 0) {
      setGroupMembers([])
      toast('Members cleared — subject changed', { icon: '🔄', duration: 3000 })
    }
  }

  // ── Load all users when panel opens ──
  async function loadAllUsers() {
    setAllUsersLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .neq('id', user.id)
        .order('display_name', { ascending: true })
        .limit(100)

      if (form.subject_id) {
        const { data: enrolled } = await supabase
          .from('user_subjects')
          .select('user_id')
          .eq('subject_id', form.subject_id)
        const enrolledIds = (enrolled || []).map(e => e.user_id).filter(id => id !== user.id)
        if (enrolledIds.length === 0) {
          setAllUsers([])
          setFilteredUsers([])
          setAllUsersLoading(false)
          return
        }
        query = query.in('id', enrolledIds)
      }

      const { data } = await query
      setAllUsers(data || [])
      setFilteredUsers(data || [])
    } catch {
      setAllUsers([])
      setFilteredUsers([])
    }
    setAllUsersLoading(false)
  }

  // ── Member panel ──
  function openMemberPanel() {
    setPendingMembers([...groupMembers])
    setMemberSearch('')
    setAllUsers([])
    setFilteredUsers([])
    setShowMemberPanel(true)
    loadAllUsers()
  }

  function closeMemberPanelSafe() {
    const changed = pendingMembers.length !== groupMembers.length ||
      pendingMembers.some(m => !groupMembers.find(g => g.id === m.id))
    if (changed && pendingMembers.length > 0) {
      if (!window.confirm('Discard member selection changes?')) return
    }
    setShowMemberPanel(false)
    setMemberSearch('')
  }

  function doneMemberPanel() {
    setGroupMembers([...pendingMembers])
    setGroupError(false)
    setShowMemberPanel(false)
    setMemberSearch('')
  }

  // ── Search filters the already-loaded list ──
  useEffect(() => {
    if (!showMemberPanel) return
    if (!memberSearch.trim()) {
      setFilteredUsers(allUsers)
      return
    }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      const q = memberSearch.trim().toLowerCase()
      setFilteredUsers(allUsers.filter(u => u.display_name?.toLowerCase().includes(q)))
    }, 150)
    return () => clearTimeout(searchTimeout.current)
  }, [memberSearch, allUsers, showMemberPanel])

  // Reload users when subject changes while panel is open
  useEffect(() => {
    if (showMemberPanel) {
      setAllUsers([])
      setFilteredUsers([])
      loadAllUsers()
    }
  }, [form.subject_id])

  function togglePendingMember(member) {
    setPendingMembers(prev => {
      const exists = prev.find(m => m.id === member.id)
      if (exists) return prev.filter(m => m.id !== member.id)
      return [...prev, member]
    })
  }

  async function handlePasteButton() {
    setPastingMsg(true)
    try {
      const text = await navigator.clipboard.readText()
      if (text) { set('quoted_message', text); toast.success('Message pasted!') }
      else toast.error('Clipboard is empty')
    } catch { pasteAreaRef.current?.focus(); toast('Press Ctrl+V / Cmd+V to paste', { icon: '📋' }) }
    finally { setPastingMsg(false) }
  }

  function handlePhoto(e) {
    const chosen = Array.from(e.target.files || [])
    const remaining = MAX_PHOTOS - photoFiles.length
    if (remaining <= 0) { toast.error(`Max ${MAX_PHOTOS} photos`); return }
    const toAdd = chosen.slice(0, remaining)
    setPhotoFiles(prev => [...prev, ...toAdd])
    setPhotoPreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
    e.target.value = ''
  }
  function removePhoto(idx) {
    URL.revokeObjectURL(photoPreviews[idx])
    setPhotoFiles(prev => prev.filter((_, i) => i !== idx))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx))
  }
  function handleFile(e) {
    const chosen = Array.from(e.target.files || [])
    const remaining = MAX_FILES - attachFiles.length
    if (remaining <= 0) { toast.error(`Max ${MAX_FILES} files`); e.target.value = ''; return }
    const toAdd = chosen.slice(0, remaining)
    if (chosen.length > remaining) toast(`Only ${remaining} file${remaining !== 1 ? 's' : ''} added`, { icon: 'ℹ️' })
    setAttachFiles(prev => [...prev, ...toAdd])
    e.target.value = ''
  }
  function removeFile(idx) { setAttachFiles(prev => prev.filter((_, i) => i !== idx)) }

  async function uploadFile(file, bucket) {
    const ext = file.name.split('.').pop().toLowerCase()
    const counter = ++uploadCounter.current
    const path = `${user.id}/${Date.now()}_${counter}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedType) {
      setTypeError(true)
      typePickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (!form.caption.trim() && photoFiles.length === 0 && attachFiles.length === 0 && !hasQuote) {
      toast.error('Add a caption, photo, file, or quoted message'); return
    }
    if (isDeadline && !form.due_date) { toast.error('Please set a due date for Deadline posts'); return }
    if (showQuoteSection && form.quoted_message.trim() && !form.quoted_from.trim()) {
      toast.error('Please enter who sent this message'); return
    }
    if (showSchedule) {
      if (!form.scheduled_date) { toast.error('Please set a scheduled date'); return }
      if (!isScheduledFuture) { toast.error('Scheduled time must be in the future'); return }
    }
    if (visibility === 'group' && groupMembers.length === 0) {
      setGroupError(true)
      toast.error('Add at least one group member')
      return
    }

    setLoading(true)
    try {
      let photo_url = null
      if (photoFiles.length > 0) {
        const urls = []
        for (let i = 0; i < photoFiles.length; i++) {
          setUploadProgress(`Uploading photo ${i + 1} of ${photoFiles.length}…`)
          urls.push(await uploadFile(photoFiles[i], 'post-media'))
        }
        photo_url = JSON.stringify(urls)
      }

      let file_url = null, file_name = null
      if (attachFiles.length > 0) {
        const results = []
        for (let i = 0; i < attachFiles.length; i++) {
          setUploadProgress(`Uploading file ${i + 1} of ${attachFiles.length}…`)
          const url = await uploadFile(attachFiles[i], 'post-media')
          results.push({ url, name: attachFiles[i].name })
        }
        file_url = JSON.stringify(results.map(r => r.url))
        file_name = JSON.stringify(results.map(r => r.name))
      }

      setUploadProgress('Saving…')
      const quoted_data = (showQuoteSection && form.quoted_message.trim())
        ? JSON.stringify({ from: form.quoted_from.trim(), message: form.quoted_message.trim() })
        : null

      const group_members_ids = visibility === 'group' ? groupMembers.map(m => m.id) : null

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          short_id: genShortId(),
          author_id: user.id,
          subject_id: form.subject_id || null,
          caption: form.caption.trim(),
          photo_url, file_url, file_name,
          post_type: selectedType.post_type,
          sub_type: selectedType.sub_type,
          announcement_type: isAnnouncement && form.announcement_type ? form.announcement_type : null,
          due_date: form.due_date || null,
          due_time: form.due_time || null,
          quoted_message: quoted_data,
          scheduled_at: scheduledAt,
          visibility,
          group_members: group_members_ids,
        })
        .select('*, profiles!posts_author_id_fkey(*), subjects!posts_subject_id_fkey(*)')
        .single()

      if (error) throw error

      if (!isScheduledFuture && isAnnouncement) {
        let notifyUserIds = []
        if (visibility === 'group') {
          notifyUserIds = groupMembers.map(m => m.id)
        } else if (form.subject_id) {
          const { data: enrolled } = await supabase
            .from('user_subjects').select('user_id')
            .eq('subject_id', form.subject_id).neq('user_id', user.id)
          notifyUserIds = (enrolled || []).map(e => e.user_id)
        }
        if (notifyUserIds.length) {
          await supabase.from('notifications').insert(
            notifyUserIds.map(uid => ({
              user_id: uid, post_id: post.id, type: 'announcement',
              message: `📢 New announcement in ${post.subjects?.name || 'a subject'}: "${form.caption.slice(0, 60)}${form.caption.length > 60 ? '…' : ''}"`,
              is_read: false,
            }))
          )
        }
      }

      if (isScheduledFuture) toast.success('🕐 Post scheduled!', { duration: 3500 })
      else toast.success(
        isDeadline ? '📅 Deadline posted!'
        : selectedType.sub_type === 'reminder' ? '🔔 Reminder posted!'
        : isAnnouncement ? '📢 Announcement posted!'
        : isMaterial ? '📁 Material shared!'
        : 'Posted!'
      )
      onCreated(post)
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to post')
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }

  function formatScheduledPreview() {
    if (!form.scheduled_date) return null
    const time = form.scheduled_time || '00:00'
    return new Date(`${form.scheduled_date}T${time}:00`).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  }

  function visibilityLabel() {
    if (visibility === 'group') return `👥 Group${groupMembers.length > 0 ? ` (${groupMembers.length})` : ''}`
    return '🌐 Class'
  }

  const displayList = memberSearch.trim() ? filteredUsers : allUsers

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, background: 'white', display: 'flex', flexDirection: 'column', height: '100dvh', animation: 'fullscreenIn 0.22s cubic-bezier(0.16,1,0.3,1)' }}>

      {/* ── MEMBER PANEL (full-screen overlay) ── */}
      {showMemberPanel && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, background: 'white', display: 'flex', flexDirection: 'column', height: '100%', animation: 'fullscreenIn 0.18s cubic-bezier(0.16,1,0.3,1)' }}>
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #E4E6EB', flexShrink: 0 }}>
            <div>
              <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 17, color: '#050505' }}>Select Members</span>
              {pendingMembers.length > 0 && (
                <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, borderRadius: 10, background: '#7C3AED', color: 'white', fontSize: 11, fontWeight: 700, fontFamily: '"Instrument Sans", system-ui', padding: '0 5px' }}>
                  {pendingMembers.length}
                </span>
              )}
            </div>
            <button onClick={closeMemberPanelSafe} style={{ width: 34, height: 34, borderRadius: '50%', background: '#E4E6EB', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color="#050505" />
            </button>
          </div>

          {/* Info tip */}
          <div style={{ margin: '10px 16px 0', padding: '9px 11px', background: '#EDE9FE', borderRadius: 9, display: 'flex', alignItems: 'flex-start', gap: 7, flexShrink: 0 }}>
            <span style={{ fontSize: 13 }}>💡</span>
            <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#5B21B6', lineHeight: 1.5 }}>
              {form.subject_id
                ? "Showing only users enrolled in the selected subject. Can't find someone? They may not be enrolled in this subject."
                : 'No subject selected — you can add anyone. Select a subject in the post to filter by enrolled users.'}
            </p>
          </div>

          {/* Search */}
          <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, border: '1.5px solid #DDD6FE', background: '#F9F7FF' }}>
              <Search size={14} color="#8A8D91" />
              <input
                autoFocus
                type="text"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Search by name…"
                style={{ flex: 1, border: 'none', outline: 'none', fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#050505', background: 'transparent' }}
              />
              {allUsersLoading && <Loader2 size={13} color="#7C3AED" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />}
              {memberSearch && !allUsersLoading && (
                <button type="button" onClick={() => setMemberSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                  <X size={13} color="#8A8D91" />
                </button>
              )}
            </div>
          </div>

          {/* Member list — flex: 1 1 0 + minHeight: 0 so it shrinks with keyboard */}
          <div style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', padding: '8px 16px' }}>
            {allUsersLoading ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid #DDD6FE', borderTopColor: '#7C3AED', animation: 'spin 0.7s linear infinite', margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#8A8D91' }}>Loading members…</p>
              </div>
            ) : displayList.length > 0 ? (
              <>
                {memberSearch.trim() && (
                  <p style={{ margin: '0 0 8px', fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700, color: '#8A8D91', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''}
                  </p>
                )}
                {displayList.map(u => {
                  const checked = !!pendingMembers.find(m => m.id === u.id)
                  return (
                    <button key={u.id} type="button" onClick={() => togglePendingMember(u)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 10px', border: 'none', background: checked ? '#F5F3FF' : 'white', cursor: 'pointer', borderRadius: 10, marginBottom: 2, textAlign: 'left', transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#FAFAFA' }}
                      onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'white' }}>
                      <img src={u.avatar_url || dicebearUrl(u.display_name)} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid #E4E6EB' }} alt="" />
                      <span style={{ flex: 1, fontFamily: '"Instrument Sans", system-ui', fontSize: 14, fontWeight: 600, color: '#050505' }}>{u.display_name}</span>
                      <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? '#7C3AED' : '#CED0D4'}`, background: checked ? '#7C3AED' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                        {checked && <Check size={12} color="white" strokeWidth={3} />}
                      </div>
                    </button>
                  )
                })}
              </>
            ) : memberSearch.trim() ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#8A8D91' }}>
                  No results for "{memberSearch}"
                  {form.subject_id && (
                    <span style={{ display: 'block', marginTop: 4, color: '#C0392B', fontWeight: 600, fontSize: 12 }}>
                      They may not be enrolled in this subject
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#BCC0C4' }}>No users found</p>
              </div>
            )}
          </div>

          {/* Done button — natural flex bottom */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #E4E6EB', background: 'white', flexShrink: 0 }}>
            <button type="button" onClick={doneMemberPanel}
              style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', background: pendingMembers.length > 0 ? '#7C3AED' : '#CED0D4', color: 'white', cursor: pendingMembers.length > 0 ? 'pointer' : 'not-allowed', fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 16, transition: 'background 0.15s' }}>
              {pendingMembers.length > 0 ? `Done · ${pendingMembers.length} member${pendingMembers.length !== 1 ? 's' : ''} selected` : 'Select at least one member'}
            </button>
          </div>
        </div>
      )}

      {/* ── DISCARD DIALOG ── */}
      {discardDialogOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '22px 20px', maxWidth: 300, width: '100%', boxShadow: '0 16px 48px rgba(0,0,0,0.18)', animation: 'expandIn 0.16s ease' }}>
            <p style={{ margin: '0 0 6px', fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 17, color: '#050505' }}>Discard changes?</p>
            <p style={{ margin: '0 0 18px', fontFamily: '"Instrument Sans", system-ui', fontSize: 13.5, color: '#65676B', lineHeight: 1.5 }}>
              You've selected {groupMembers.length} group member{groupMembers.length !== 1 ? 's' : ''}. Closing will discard these.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setDiscardDialogOpen(false)}
                style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1.5px solid #E4E6EB', background: 'white', cursor: 'pointer', fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 14, color: '#050505' }}>
                Stay
              </button>
              <button type="button" onClick={() => { setDiscardDialogOpen(false); onClose() }}
                style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: '#E41E3F', cursor: 'pointer', fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 14, color: 'white' }}>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #E4E6EB', flexShrink: 0 }}>
        <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: '#050505' }}>Create Post</span>
        <button onClick={handleClose} style={{ width: 36, height: 36, borderRadius: '50%', background: '#E4E6EB', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => e.currentTarget.style.background = '#CED0D4'}
          onMouseLeave={e => e.currentTarget.style.background = '#E4E6EB'}>
          <X size={18} color="#050505" />
        </button>
      </div>

      {/* Scrollable body — flex: 1 1 0 + minHeight: 0 lets it shrink when keyboard appears */}
      <div style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', padding: '16px 16px 0' }}>

        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <img src={profile?.avatar_url || dicebearUrl(profile?.display_name)} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E4E6EB' }} alt="" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 15, color: '#050505' }}>{profile?.display_name}</p>

            {/* Inline visibility control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, position: 'relative' }} ref={visibilityDropdownRef}>
              <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: selectedType ? selectedType.activeColor : '#8A8D91' }}>
                {selectedType ? `${selectedType.emoji} ${selectedType.label}` : 'Select a type below'}
              </p>
              {selectedType && (
                <>
                  <span style={{ fontSize: 12, color: '#CED0D4', margin: '0 1px' }}>·</span>
                  <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: visibility === 'group' ? '#7C3AED' : '#0D7377', fontWeight: 600 }}>
                    {visibilityLabel()}
                  </span>
                  <span style={{ fontSize: 12, color: '#CED0D4', margin: '0 1px' }}>·</span>
                  <button
                    type="button"
                    onClick={() => setShowVisibilityDropdown(v => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#8A8D91', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 2 }}>
                    change
                  </button>

                  {/* Inline dropdown */}
                  {showVisibilityDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 20, marginTop: 5, background: 'white', borderRadius: 10, border: '1.5px solid #E4E6EB', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: 160, animation: 'expandIn 0.14s ease' }}>
                      <button type="button" onClick={switchToClass}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', border: 'none', background: visibility === 'class' ? '#E6F4F4' : 'white', cursor: 'pointer', fontFamily: '"Instrument Sans", system-ui', fontWeight: visibility === 'class' ? 700 : 500, fontSize: 13, color: visibility === 'class' ? '#0D7377' : '#050505', transition: 'background 0.1s' }}
                        onMouseEnter={e => { if (visibility !== 'class') e.currentTarget.style.background = '#F7F8FA' }}
                        onMouseLeave={e => { if (visibility !== 'class') e.currentTarget.style.background = 'white' }}>
                        <Globe size={14} color={visibility === 'class' ? '#0D7377' : '#65676B'} />
                        🌐 Class
                        {visibility === 'class' && <Check size={12} color="#0D7377" style={{ marginLeft: 'auto' }} />}
                      </button>
                      <div style={{ height: 1, background: '#F0F2F5' }} />
                      <button type="button" onClick={switchToGroup}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', border: 'none', background: visibility === 'group' ? '#F5F3FF' : 'white', cursor: 'pointer', fontFamily: '"Instrument Sans", system-ui', fontWeight: visibility === 'group' ? 700 : 500, fontSize: 13, color: visibility === 'group' ? '#7C3AED' : '#050505', transition: 'background 0.1s' }}
                        onMouseEnter={e => { if (visibility !== 'group') e.currentTarget.style.background = '#F7F8FA' }}
                        onMouseLeave={e => { if (visibility !== 'group') e.currentTarget.style.background = 'white' }}>
                        <Users size={14} color={visibility === 'group' ? '#7C3AED' : '#65676B'} />
                        👥 Group
                        {visibility === 'group' && <Check size={12} color="#7C3AED" style={{ marginLeft: 'auto' }} />}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── GROUP MEMBER BUTTON (when group selected) ── */}
        {selectedType && visibility === 'group' && (
          <div style={{ marginBottom: 14, animation: 'expandIn 0.18s ease' }}>
            <button type="button" onClick={openMemberPanel}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 11, border: `1.5px solid ${groupError ? '#E41E3F' : groupMembers.length > 0 ? '#DDD6FE' : '#E4E6EB'}`, background: groupMembers.length > 0 ? '#F5F3FF' : '#FAFAFA', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.background = '#F5F3FF' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = groupError ? '#E41E3F' : groupMembers.length > 0 ? '#DDD6FE' : '#E4E6EB'; e.currentTarget.style.background = groupMembers.length > 0 ? '#F5F3FF' : '#FAFAFA' }}>
              <Users size={16} color={groupError ? '#E41E3F' : '#7C3AED'} style={{ flexShrink: 0 }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                {groupMembers.length > 0 ? (
                  /* ── Horizontal scrollable chip row ── */
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 5, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2, scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    // hide scrollbar on webkit
                    className="hide-scrollbar"
                  >
                    {groupMembers.map(m => (
                      <div key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 4px', borderRadius: 20, background: '#EDE9FE', border: '1px solid #DDD6FE', flexShrink: 0 }}>
                        <img src={m.avatar_url || dicebearUrl(m.display_name)} style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
                        <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 600, color: '#5B21B6', whiteSpace: 'nowrap' }}>{m.display_name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 13.5, fontWeight: 600, color: groupError ? '#E41E3F' : '#7C3AED' }}>
                    {groupError ? '⚠️ Add at least one member' : 'Click to select group members'}
                  </span>
                )}
              </div>

              {/* Count + Edit badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 4 }}>
                {groupMembers.length > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 700, color: '#7C3AED', background: '#EDE9FE', padding: '2px 8px', borderRadius: 20, border: '1px solid #DDD6FE', whiteSpace: 'nowrap' }}>
                    ({groupMembers.length}) Edit
                  </span>
                )}
              </div>
            </button>
          </div>
        )}

        {/* ── PILL CHIPS — compact enough to fit 2 rows on smallest screens ── */}
        <div ref={typePickerRef} style={{ marginBottom: 16, borderRadius: 12, border: typeError ? '2px solid #E41E3F' : '2px solid transparent', background: typeError ? '#FFF0F0' : 'transparent', transition: 'all 0.2s', padding: typeError ? '8px' : '0' }}>
          <p style={{ margin: '0 0 7px', fontFamily: '"Instrument Sans", system-ui', fontSize: 10.5, fontWeight: 700, color: typeError ? '#E41E3F' : '#8A8D91', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {typeError ? '⚠️ Pick a type first' : 'What are you posting?'}
          </p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {POST_TYPES.map(type => {
              const isActive = selectedType?.sub_type === type.sub_type
              return (
                <button key={type.sub_type} type="button" onClick={() => handleSelectType(type)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 20, border: `1.5px solid ${isActive ? type.activeBorder : '#E4E6EB'}`, background: isActive ? type.activeBg : 'white', cursor: 'pointer', fontFamily: '"Instrument Sans", system-ui', fontWeight: isActive ? 700 : 500, fontSize: 12, color: isActive ? type.activeColor : '#65676B', transition: 'all 0.15s', boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = type.activeBorder; e.currentTarget.style.background = type.activeBg + '80' } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = '#E4E6EB'; e.currentTarget.style.background = 'white' } }}>
                  <span style={{ fontSize: 12 }}>{type.emoji}</span>
                  {type.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Textarea */}
        <div style={{ background: '#F7F8FA', borderRadius: 12, padding: '12px 14px', marginBottom: 12, border: '1.5px solid #E4E6EB' }}>
          <textarea autoFocus
            placeholder={
              !selectedType ? `What's on your mind, ${profile?.display_name?.split(' ')[0] || 'there'}?`
              : isDeadline ? 'Describe this deadline…'
              : selectedType.sub_type === 'reminder' ? "What's the reminder about?"
              : isAnnouncement ? "What's the announcement about?"
              : isMaterial ? 'Add a description for this material…'
              : `What's on your mind, ${profile?.display_name?.split(' ')[0] || 'there'}?`
            }
            rows={5} value={form.caption} onChange={e => set('caption', e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontFamily: '"Instrument Sans", system-ui', fontSize: 16, color: '#050505', background: 'transparent', lineHeight: 1.6 }}
          />
        </div>

        {/* Announcement category */}
        {isAnnouncement && (
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <select value={form.announcement_type} onChange={e => set('announcement_type', e.target.value)}
              style={{ width: '100%', padding: '11px 36px 11px 14px', borderRadius: 10, border: '1px solid #E4E6EB', background: form.announcement_type ? '#E6F4F4' : '#F7F8FA', appearance: 'none', fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: form.announcement_type ? '#0D7377' : '#8A8D91', fontWeight: form.announcement_type ? 700 : 400, cursor: 'pointer', outline: 'none' }}>
              <option value="">Category (optional)</option>
              {announcementTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <ChevronDown size={15} color={form.announcement_type ? '#0D7377' : '#65676B'} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        )}

        {/* Subject — uses handleSubjectChange instead of inline set */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <select value={form.subject_id} onChange={e => handleSubjectChange(e.target.value)}
            style={{ width: '100%', padding: '11px 36px 11px 14px', borderRadius: 10, border: '1px solid #E4E6EB', background: '#F7F8FA', appearance: 'none', fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: form.subject_id ? '#050505' : '#8A8D91', cursor: 'pointer', outline: 'none' }}>
            <option value="">No subject (General)</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <ChevronDown size={15} color="#65676B" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* Due date */}
        {selectedType && (isDeadline || (isAnnouncement && selectedType.sub_type === 'announcement')) && (
          <div style={{ marginBottom: 12, background: isDeadline ? '#FFF5F5' : '#F7F8FA', borderRadius: 10, padding: '12px 14px', border: `1px solid ${isDeadline ? '#F5B7B1' : '#E4E6EB'}` }}>
            <label style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700, color: isDeadline ? '#922B21' : '#65676B', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              📅 Due Date &amp; Time
              {isDeadline ? <span style={{ color: '#E41E3F' }}>*</span> : <span style={{ fontWeight: 400, color: '#BCC0C4', fontSize: 10, textTransform: 'none' }}>(optional)</span>}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} min={new Date().toISOString().split('T')[0]}
                style={{ flex: 3, padding: '10px 12px', borderRadius: 10, border: `1px solid ${form.due_date ? '#0D7377' : isDeadline ? '#E41E3F' : '#E4E6EB'}`, fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#050505', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
              <input type="time" value={form.due_time} onChange={e => set('due_time', e.target.value)} disabled={!form.due_date}
                style={{ flex: 2, padding: '10px 12px', borderRadius: 10, border: `1px solid ${form.due_time ? '#0D7377' : '#E4E6EB'}`, fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: form.due_date ? '#050505' : '#BCC0C4', background: form.due_date ? 'white' : '#F0F2F5', outline: 'none', boxSizing: 'border-box', opacity: form.due_date ? 1 : 0.5, cursor: form.due_date ? 'text' : 'not-allowed' }} />
            </div>
          </div>
        )}

        {/* Quoted message */}
        <div style={{ marginBottom: 12 }}>
          <button type="button" onClick={() => { setShowQuoteSection(v => !v); setShowQuotePreview(false) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${showQuoteSection ? accent.border : '#E4E6EB'}`, background: showQuoteSection ? accent.bg : '#F7F8FA', cursor: 'pointer', transition: 'all 0.15s', fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13.5, color: showQuoteSection ? accent.color : '#65676B' }}>
            <MessageSquareQuote size={16} color={showQuoteSection ? accent.color : '#8A8D91'} />
            <span style={{ flex: 1, textAlign: 'left' }}>{showQuoteSection ? 'Remove quoted message' : 'Attach a quoted message'}</span>
            {showQuoteSection ? <X size={14} /> : <ChevronDown size={14} />}
          </button>
          {showQuoteSection && (
            <div style={{ marginTop: 8, padding: '10px 8px', background: '#FAFAFA', borderRadius: 10, border: `1px solid ${accent.border}`, animation: 'expandIn 0.18s ease' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                <div style={{ width: 86, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700, color: '#65676B', marginBottom: 4, display: 'block' }}>From</label>
                  <input type="text" value={form.quoted_from} onChange={e => set('quoted_from', e.target.value)} placeholder="e.g. Sir Cruz" maxLength={40}
                    style={{ flex: 1, padding: '8px 9px', borderRadius: 8, border: `1.5px solid ${form.quoted_from ? accent.color : '#E4E6EB'}`, fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#050505', background: 'white', outline: 'none' }}
                    onFocus={e => e.currentTarget.style.borderColor = accent.color}
                    onBlur={e => e.currentTarget.style.borderColor = form.quoted_from ? accent.color : '#E4E6EB'} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <label style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700, color: '#65676B' }}>Paste message</label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" onClick={handlePasteButton} disabled={pastingMsg}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', background: accent.light, color: accent.color, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 11, opacity: pastingMsg ? 0.6 : 1 }}>
                        <ClipboardPaste size={11} /> Paste
                      </button>
                      {form.quoted_message && (
                        <button type="button" onClick={() => set('quoted_message', '')}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#F0F2F5', color: '#65676B', fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 11 }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FADBD8'; e.currentTarget.style.color = '#C0392B' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#F0F2F5'; e.currentTarget.style.color = '#65676B' }}>
                          <Trash2 size={11} /> Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea ref={pasteAreaRef} value={form.quoted_message} onChange={e => set('quoted_message', e.target.value)}
                    placeholder="Paste the exact message here…" rows={3}
                    style={{ flex: 1, padding: '8px 9px', borderRadius: 8, border: `1.5px solid ${form.quoted_message ? accent.color : '#E4E6EB'}`, fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#050505', background: 'white', outline: 'none', resize: 'vertical', lineHeight: 1.45, minHeight: 70 }}
                    onFocus={e => e.currentTarget.style.borderColor = accent.color}
                    onBlur={e => e.currentTarget.style.borderColor = form.quoted_message ? accent.color : '#E4E6EB'} />
                  <p style={{ margin: '4px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 10.5, color: '#BCC0C4' }}>Ctrl+V / ⌘V or long-press to paste</p>
                </div>
              </div>
              {(form.quoted_from || form.quoted_message) && (
                <button type="button" onClick={() => setShowQuotePreview(v => !v)}
                  style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 12, color: accent.color }}>
                  {showQuotePreview ? <EyeOff size={13} /> : <Eye size={13} />}
                  {showQuotePreview ? 'Hide preview' : 'Preview how it looks on feed'}
                </button>
              )}
              {showQuotePreview && <QuotedMessagePreview from={form.quoted_from} message={form.quoted_message} accent={accent} />}
            </div>
          )}
        </div>

        {/* Schedule — superadmin only */}
        {isSuperadmin && (
          <div style={{ marginBottom: 12 }}>
            <button type="button" onClick={() => { setShowSchedule(v => !v); if (showSchedule) { set('scheduled_date', ''); set('scheduled_time', '') } }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${showSchedule ? '#7C3AED' : '#E4E6EB'}`, background: showSchedule ? '#F5F3FF' : '#F7F8FA', cursor: 'pointer', transition: 'all 0.15s', fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13.5, color: showSchedule ? '#7C3AED' : '#65676B' }}>
              <Clock size={16} color={showSchedule ? '#7C3AED' : '#8A8D91'} />
              <span style={{ flex: 1, textAlign: 'left' }}>{showSchedule && isScheduledFuture ? `Scheduled for ${formatScheduledPreview()}` : 'Schedule this post'}</span>
              {showSchedule ? <X size={14} /> : <ChevronDown size={14} />}
            </button>
            {showSchedule && (
              <div style={{ marginTop: 8, padding: '12px 14px', background: '#F5F3FF', borderRadius: 10, border: '1.5px solid #DDD6FE', animation: 'expandIn 0.18s ease' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} min={new Date().toISOString().split('T')[0]}
                    style={{ flex: 3, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${form.scheduled_date ? '#7C3AED' : '#DDD6FE'}`, fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#050505', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
                  <input type="time" value={form.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} disabled={!form.scheduled_date}
                    style={{ flex: 2, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${form.scheduled_time ? '#7C3AED' : '#DDD6FE'}`, fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: form.scheduled_date ? '#050505' : '#BCC0C4', background: form.scheduled_date ? 'white' : '#EDE9FE', outline: 'none', boxSizing: 'border-box', opacity: form.scheduled_date ? 1 : 0.5, cursor: form.scheduled_date ? 'text' : 'not-allowed' }} />
                </div>
                {form.scheduled_date && !isScheduledFuture && <p style={{ margin: '8px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 600, color: '#C0392B' }}>⚠️ Pick a future date and time</p>}
                {isScheduledFuture && <p style={{ margin: '8px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 600, color: '#7C3AED' }}>✓ Will publish {formatScheduledPreview()}</p>}
              </div>
            )}
          </div>
        )}

        {/* Photo previews */}
        {photoPreviews.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 600, color: '#65676B' }}>{photoPreviews.length}/{MAX_PHOTOS} photos</span>
              <button type="button" onClick={() => { photoPreviews.forEach(u => URL.revokeObjectURL(u)); setPhotoFiles([]); setPhotoPreviews([]) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E41E3F', fontSize: 12, fontWeight: 600, fontFamily: '"Instrument Sans", system-ui' }}>Remove all</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {photoPreviews.map((url, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 10, overflow: 'hidden', background: '#E4E6EB' }}>
                  <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
                  <button type="button" onClick={() => removePhoto(i)}
                    style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={11} color="white" />
                  </button>
                </div>
              ))}
              {photoPreviews.length < MAX_PHOTOS && (
                <button type="button" onClick={() => photoRef.current.click()}
                  style={{ aspectRatio: '1/1', borderRadius: 10, border: '2px dashed #CED0D4', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#65676B' }}>
                  <Plus size={18} /><span style={{ fontSize: 11, fontFamily: '"Instrument Sans", system-ui', fontWeight: 600 }}>Add</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* File list */}
        {attachFiles.length > 0 && (
          <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 600, color: '#65676B' }}>{attachFiles.length}/{MAX_FILES} files</span>
              <button type="button" onClick={() => setAttachFiles([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E41E3F', fontSize: 12, fontWeight: 600, fontFamily: '"Instrument Sans", system-ui' }}>Remove all</button>
            </div>
            {attachFiles.map((file, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#F7F8FA', borderRadius: 10, border: '1px solid #E4E6EB' }}>
                <FileText size={15} color="#0D7377" />
                <span style={{ flex: 1, fontSize: 13, color: '#050505', fontFamily: '"Instrument Sans", system-ui', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <button type="button" onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={14} color="#65676B" /></button>
              </div>
            ))}
            {attachFiles.length < MAX_FILES && (
              <button type="button" onClick={() => fileRef.current.click()}
                style={{ padding: '9px 0', borderRadius: 10, border: '2px dashed #CED0D4', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#65676B' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D7377'; e.currentTarget.style.color = '#0D7377' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#CED0D4'; e.currentTarget.style.color = '#65676B' }}>
                <Plus size={15} /><span style={{ fontSize: 12, fontFamily: '"Instrument Sans", system-ui', fontWeight: 600 }}>Add more files</span>
              </button>
            )}
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/avif,image/heic,image/heif" multiple style={{ display: 'none' }} onChange={handlePhoto} />
      <input ref={fileRef} type="file" accept={FILE_ACCEPT} multiple style={{ display: 'none' }} onChange={handleFile} />

      {/* Footer — normal flex child, NOT sticky above keyboard */}
      <div style={{ borderTop: '1px solid #E4E6EB', background: 'white', flexShrink: 0 }}>
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #F0F2F5' }}>
          <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 14, color: '#050505', flex: 1 }}>Add to your post</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <MediaBtn icon={<Image size={22} color="#45BD62" />} title="Photos" onClick={() => photoRef.current.click()} badge={photoFiles.length > 0 ? photoFiles.length : null} />
            {(isMaterial || isAnnouncement) && (
              <MediaBtn icon={<Paperclip size={22} color="#1877F2" />} title="Attach files (PDF, DOCX, PPT…)" onClick={() => fileRef.current.click()} badge={attachFiles.length > 0 ? attachFiles.length : null} />
            )}
          </div>
        </div>
        {!isMaterial && !isAnnouncement && (
          <p style={{ margin: 0, padding: '6px 16px 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#8A8D91' }}>
            💡 Switch to <strong>Material</strong> or <strong>Announcement</strong> to attach files.
          </p>
        )}
        <div style={{ padding: '10px 16px' }}>
          <button onClick={handleSubmit} disabled={loading}
            style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', background: loading ? '#7EC8C8' : isScheduledFuture ? '#7C3AED' : selectedType ? selectedType.btnColor : '#0D7377', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s, transform 0.1s' }}
            onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.985)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}>
            {loading && <Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} />}
            {loading ? (uploadProgress || 'Posting…') : isScheduledFuture ? '🕐 Schedule Post' : selectedType ? `Post ${selectedType.emoji}` : 'Post'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fullscreenIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes expandIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

function MediaBtn({ icon, title, onClick, badge }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} title={title}
      style={{ position: 'relative', width: 38, height: 38, borderRadius: '50%', background: hovered ? '#F0F2F5' : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}>
      {icon}
      {badge && (
        <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, background: '#0D7377', color: 'white', fontSize: 10, fontWeight: 700, fontFamily: '"Instrument Sans", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
          {badge}
        </span>
      )}
    </button>
  )
}
