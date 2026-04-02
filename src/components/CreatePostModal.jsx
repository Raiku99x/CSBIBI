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
  Megaphone, FileText, Plus, Globe, MessageSquareQuote, Eye, EyeOff,
  ClipboardPaste, Trash2, Clock
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

function getQuoteAccent(postType, subType) {
  if (subType === 'deadline')      return { color: '#922B21', bg: '#FFF5F5', light: '#FADBD8', border: '#F5B7B1' }
  if (subType === 'reminder')      return { color: '#C0392B', bg: '#FFF8F8', light: '#FADBD8', border: '#F5B7B1' }
  if (subType === 'announcement')  return { color: '#C0392B', bg: '#FFF8F8', light: '#FADBD8', border: '#F5B7B1' }
  if (postType === 'announcement') return { color: '#C0392B', bg: '#FFF8F8', light: '#FADBD8', border: '#F5B7B1' }
  if (subType === 'material')      return { color: '#1A5276', bg: '#EBF5FB', light: '#D6EAF8', border: '#AED6F1' }
  return                                  { color: '#65676B', bg: '#F7F8FA', light: '#E4E6EB', border: '#DADDE1' }
}

function QuotedMessagePreview({ from, message, accent }) {
  if (!from && !message) return null
  return (
    <div style={{
      background: accent.bg,
      border: `1px solid ${accent.border}`,
      borderLeft: `3px solid ${accent.color}`,
      borderRadius: '0 8px 8px 0',
      padding: '8px 12px',
      marginTop: 8,
    }}>
      <p style={{
        margin: '0 0 4px',
        fontFamily: '"Instrument Sans", system-ui',
        fontWeight: 700, fontSize: 12,
        color: accent.color,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <MessageSquareQuote size={11} />
        {from ? `From ${from}` : 'Quoted message'}
      </p>
      <p style={{
        margin: 0,
        fontFamily: '"Instrument Sans", system-ui',
        fontSize: 13.5, color: '#1c1e21',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {message || <span style={{ color: '#BCC0C4', fontStyle: 'italic' }}>Paste a message below to preview…</span>}
      </p>
    </div>
  )
}

export default function CreatePostModal({
  onClose,
  onCreated,
  subjects,
  defaultType = 'status',
  defaultSubType = 'status',
  autoOpenPhoto = false,
  autoOpenFile = false,
}) {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({
    caption: '',
    subject_id: '',
    post_type: defaultType,
    sub_type: defaultType === 'status' ? '' : defaultSubType,
    due_date: '',
    due_time: '',
    announcement_type: '',
    quoted_from: '',
    quoted_message: '',
    scheduled_date: '',
    scheduled_time: '',
  })
  const [photoFiles, setPhotoFiles] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [attachFiles, setAttachFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [showSubTypeError, setShowSubTypeError] = useState(false)
  const [showQuoteSection, setShowQuoteSection] = useState(false)
  const [showQuotePreview, setShowQuotePreview] = useState(false)
  const [pastingMsg, setPastingMsg] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const { isSuperadmin } = useRole()

  const photoRef = useRef()
  const fileRef = useRef()
  const uploadCounter = useRef(0)
  const pasteAreaRef = useRef()
  const announcementTypes = useAnnouncementTypes()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (autoOpenPhoto) {
      const t = setTimeout(() => photoRef.current?.click(), 150)
      return () => clearTimeout(t)
    }
    if (autoOpenFile) {
      const t = setTimeout(() => fileRef.current?.click(), 150)
      return () => clearTimeout(t)
    }
  }, [autoOpenPhoto, autoOpenFile])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isAnnouncement = form.post_type === 'announcement'
  const isDeadline = isAnnouncement && form.sub_type === 'deadline'
  const isMaterial = form.sub_type === 'material'
  const hasQuote = showQuoteSection && (form.quoted_from.trim() || form.quoted_message.trim())
  const accent = getQuoteAccent(form.post_type, form.sub_type)

  // Build the scheduled_at ISO string from date + time inputs
  function buildScheduledAt() {
    if (!showSchedule || !form.scheduled_date) return null
    const time = form.scheduled_time || '00:00'
    return new Date(`${form.scheduled_date}T${time}:00`).toISOString()
  }

  // Is the scheduled time actually in the future?
  const scheduledAt = buildScheduledAt()
  const isScheduledFuture = scheduledAt && new Date(scheduledAt) > new Date()

  function handlePasteAreaKeyDown(e) {
    const isPaste = (e.ctrlKey || e.metaKey) && e.key === 'v'
    const isSelectAll = (e.ctrlKey || e.metaKey) && e.key === 'a'
    const isCopy = (e.ctrlKey || e.metaKey) && e.key === 'c'
    if (!isPaste && !isSelectAll && !isCopy &&
        !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
      e.preventDefault()
    }
  }

  function handlePasteAreaBeforeInput(e) {
    if (e.inputType !== 'insertFromPaste' && e.inputType !== 'insertFromPasteAsQuotation') {
      e.preventDefault()
    }
  }

  async function handlePasteButton() {
    setPastingMsg(true)
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        set('quoted_message', text)
        toast.success('Message pasted!')
      } else {
        toast.error('Clipboard is empty')
      }
    } catch {
      pasteAreaRef.current?.focus()
      toast('Press Ctrl+V / Cmd+V to paste', { icon: '📋' })
    } finally {
      setPastingMsg(false)
    }
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
    if (chosen.length > remaining) {
      toast(`Only ${remaining} file${remaining !== 1 ? 's' : ''} added — limit reached`, { icon: 'ℹ️' })
    }
    setAttachFiles(prev => [...prev, ...toAdd])
    e.target.value = ''
 }
 

  function removeFile(idx) {
    setAttachFiles(prev => prev.filter((_, i) => i !== idx))
  }

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
    if (!form.caption.trim() && photoFiles.length === 0 && attachFiles.length === 0 && !hasQuote) {
      toast.error('Add a caption, photo, file, or quoted message')
      return
    }
    if (!form.sub_type) {
      setShowSubTypeError(true)
      toast.error('Please select a post type')
      return
    }
    if (isDeadline && !form.due_date) {
      toast.error('Please set a due date for Deadline posts')
      return
    }
    if (showQuoteSection && form.quoted_message.trim() && !form.quoted_from.trim()) {
      toast.error('Please enter who sent this message')
      return
    }
    // Validate schedule: if schedule toggle is on, date must be set and must be in the future
    if (showSchedule) {
      if (!form.scheduled_date) {
        toast.error('Please set a scheduled date')
        return
      }
      if (!isScheduledFuture) {
        toast.error('Scheduled time must be in the future')
        return
      }
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

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          short_id: genShortId(),
          author_id: user.id,
          subject_id: form.subject_id || null,
          caption: form.caption.trim(),
          photo_url, file_url, file_name,
          post_type: form.post_type,
          sub_type: form.sub_type || null,
          announcement_type: isAnnouncement && form.announcement_type ? form.announcement_type : null,
          due_date: form.due_date || null,
          due_time: form.due_time || null,
          quoted_message: quoted_data,
          scheduled_at: scheduledAt,
        })
        .select('*, profiles!posts_author_id_fkey(*), subjects!posts_subject_id_fkey(*)')
        .single()

      if (error) throw error

      // Only notify if NOT scheduled (or scheduled time has already passed)
      if (!isScheduledFuture && form.post_type === 'announcement' && form.subject_id) {
        const { data: enrolled } = await supabase
          .from('user_subjects').select('user_id')
          .eq('subject_id', form.subject_id).neq('user_id', user.id)
        if (enrolled?.length) {
          await supabase.from('notifications').insert(
            enrolled.map(e => ({
              user_id: e.user_id, post_id: post.id, type: 'announcement',
              message: `📢 New announcement in ${post.subjects?.name || 'a subject'}: "${form.caption.slice(0, 60)}${form.caption.length > 60 ? '…' : ''}"`,
              is_read: false,
            }))
          )
        }
      }

      if (isScheduledFuture) {
        toast.success('🕐 Post scheduled!', { duration: 3500 })
      } else {
        toast.success(
          isDeadline ? '📅 Deadline posted!'
          : form.sub_type === 'reminder' ? '🔔 Reminder posted!'
          : isAnnouncement ? '📢 Announcement posted!'
          : isMaterial ? '📁 Material shared!'
          : 'Posted!'
        )
      }
      onCreated(post)
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to post')
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }

  // Format the scheduled datetime for display
  function formatScheduledPreview() {
    if (!form.scheduled_date) return null
    const time = form.scheduled_time || '00:00'
    const dt = new Date(`${form.scheduled_date}T${time}:00`)
    return dt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'white', display: 'flex', flexDirection: 'column',
      animation: 'fullscreenIn 0.22s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid #E4E6EB',
        flexShrink: 0, background: 'white',
      }}>
        <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: '#050505' }}>
          Create Post
        </span>
        <button
          onClick={onClose}
          style={{ width: 36, height: 36, borderRadius: '50%', background: '#E4E6EB', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#CED0D4'}
          onMouseLeave={e => e.currentTarget.style.background = '#E4E6EB'}
        >
          <X size={18} color="#050505" />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <img
            src={profile?.avatar_url || dicebearUrl(profile?.display_name)}
            style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', background: '#E4E6EB' }}
            alt=""
          />
          <div>
            <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 15, color: '#050505' }}>
              {profile?.display_name}
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#E4E6EB', padding: '3px 10px', borderRadius: 6, marginTop: 3 }}>
              <Globe size={11} color="#050505" />
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 12, color: '#050505' }}>
                {form.sub_type === 'material' ? 'Material'
                  : form.sub_type === 'deadline' ? 'Deadline'
                  : form.sub_type === 'reminder' ? 'Reminder'
                  : form.sub_type === 'announcement' ? 'Announcement'
                  : (showSubTypeError ? '⚠️ Select type' : 'Select type…')} · Class
              </span>
            </div>
          </div>
        </div>

        {/* Post type toggle */}
        <div style={{ display: 'flex', gap: 6, padding: 4, background: '#F0F2F5', borderRadius: 10, marginBottom: 8 }}>
          {[
            { key: 'status', label: 'Status', icon: <FileText size={14} /> },
            { key: 'announcement', label: 'Announcement', icon: <Megaphone size={14} /> },
          ].map(({ key, label, icon }) => (
            <button
              key={key} type="button"
              onClick={() => {
                set('post_type', key); set('sub_type', ''); set('announcement_type', '')
                setShowSubTypeError(false)
                if (key === 'status') { set('due_date', ''); set('due_time', ''); setAttachFiles([]) }
              }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13,
                background: form.post_type === key ? (key === 'announcement' ? '#0D7377' : 'white') : 'transparent',
                color: form.post_type === key ? (key === 'announcement' ? 'white' : '#050505') : '#65676B',
                boxShadow: form.post_type === key && key === 'status' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Sub-type toggle */}
        {showSubTypeError && !form.sub_type && (
          <p style={{ margin: '0 0 6px', fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#E41E3F', fontWeight: 600 }}>
            ⚠️ Pick a type to continue
          </p>
        )}
        <div style={{
          display: 'flex', gap: 5, padding: '3px',
          background: '#F7F8FA', borderRadius: 8,
          border: `1px solid ${showSubTypeError && !form.sub_type ? '#E41E3F' : '#E4E6EB'}`,
          marginBottom: 14,
        }}>
          {(isAnnouncement
            ? [{ key: 'announcement', label: '📢 Announcement' }, { key: 'reminder', label: '🔔 Reminder' }, { key: 'deadline', label: '📅 Deadline' }]
            : [{ key: 'status', label: '💬 Status' }, { key: 'material', label: '📁 Material' }]
          ).map(({ key, label }) => (
            <button key={key} type="button"
              onClick={() => {
                set('sub_type', key); setShowSubTypeError(false)
                if (key !== 'deadline' && key !== 'announcement') { set('due_date', ''); set('due_time', '') }
                if (key !== 'material' && !isAnnouncement) setAttachFiles([])
              }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '9px 6px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontFamily: '"Instrument Sans", system-ui',
                background: form.sub_type === key ? 'white' : 'transparent',
                boxShadow: form.sub_type === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 13, color: form.sub_type === key ? '#050505' : '#65676B' }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Announcement type dropdown — from DB */}
        {isAnnouncement && form.sub_type && (
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <select
              value={form.announcement_type} onChange={e => set('announcement_type', e.target.value)}
              style={{
                width: '100%', padding: '11px 36px 11px 14px', borderRadius: 10, border: '1px solid #E4E6EB',
                background: form.announcement_type ? '#E6F4F4' : '#F7F8FA', appearance: 'none',
                fontFamily: '"Instrument Sans", system-ui', fontSize: 14,
                color: form.announcement_type ? '#0D7377' : '#8A8D91',
                fontWeight: form.announcement_type ? 700 : 400, cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="">Type (optional)</option>
              {announcementTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <ChevronDown size={15} color={form.announcement_type ? '#0D7377' : '#65676B'} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        )}

        {/* Textarea */}
        <textarea
          placeholder={
            !form.sub_type ? "Select a type above to continue…"
              : isDeadline ? "Describe this deadline…"
              : form.sub_type === 'reminder' ? "What's the reminder about?"
              : isAnnouncement ? "What's the announcement about?"
              : isMaterial ? "Add a description for this material…"
              : `What's on your mind, ${profile?.display_name?.split(' ')[0] || 'there'}?`
          }
          rows={5} value={form.caption} onChange={e => set('caption', e.target.value)}
          style={{
            width: '100%', border: 'none', outline: 'none', resize: 'none',
            fontFamily: '"Instrument Sans", system-ui', fontSize: 18, color: '#050505',
            background: 'transparent', lineHeight: 1.5,
          }}
        />

        {/* Subject selector */}
        <div style={{ position: 'relative', marginTop: 8 }}>
          <select
            value={form.subject_id} onChange={e => set('subject_id', e.target.value)}
            style={{
              width: '100%', padding: '11px 36px 11px 14px', borderRadius: 10, border: '1px solid #E4E6EB',
              background: '#F7F8FA', appearance: 'none',
              fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#050505',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="">No subject (General)</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <ChevronDown size={15} color="#65676B" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* ── QUOTED MESSAGE SECTION ── */}
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => { setShowQuoteSection(v => !v); setShowQuotePreview(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: `1.5px solid ${showQuoteSection ? accent.border : '#E4E6EB'}`,
              background: showQuoteSection ? accent.bg : '#F7F8FA',
              cursor: 'pointer', transition: 'all 0.15s',
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13.5,
              color: showQuoteSection ? accent.color : '#65676B',
            }}
          >
            <MessageSquareQuote size={16} color={showQuoteSection ? accent.color : '#8A8D91'} />
            <span style={{ flex: 1, textAlign: 'left' }}>
              {showQuoteSection ? 'Remove quoted message' : 'Attach a quoted message'}
            </span>
            {showQuoteSection ? <X size={14} /> : <ChevronDown size={14} />}
          </button>

          {showQuoteSection && (
            <div style={{
              marginTop: 8,
              padding: '10px 8px',
              background: '#FAFAFA', borderRadius: 10,
              border: `1px solid ${accent.border}`,
              animation: 'expandIn 0.18s ease',
            }}>
              <p style={{
                margin: '0 0 8px',
                fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700,
                color: accent.color, textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                Quoted message
              </p>

              <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                <div style={{ width: 86, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                  <label style={{
                    fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700,
                    color: '#65676B', marginBottom: 4, display: 'block',
                  }}>
                    From
                  </label>
                  <input
                    type="text"
                    value={form.quoted_from}
                    onChange={e => set('quoted_from', e.target.value)}
                    placeholder="e.g. Sir Cruz"
                    maxLength={40}
                    style={{
                      flex: 1, padding: '8px 9px', borderRadius: 8,
                      border: `1.5px solid ${form.quoted_from ? accent.color : '#E4E6EB'}`,
                      fontFamily: '"Instrument Sans", system-ui', fontSize: 13,
                      color: '#050505', background: 'white', outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = accent.color}
                    onBlur={e => e.currentTarget.style.borderColor = form.quoted_from ? accent.color : '#E4E6EB'}
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <label style={{
                      fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700,
                      color: '#65676B',
                    }}>
                      Paste message
                    </label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={handlePasteButton}
                        disabled={pastingMsg}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '3px 9px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: accent.light,
                          color: accent.color,
                          fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 11,
                          transition: 'opacity 0.12s',
                          opacity: pastingMsg ? 0.6 : 1,
                        }}
                        title="Paste from clipboard"
                      >
                        <ClipboardPaste size={11} />
                        Paste
                      </button>
                      {form.quoted_message && (
                        <button
                          type="button"
                          onClick={() => set('quoted_message', '')}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '3px 9px', borderRadius: 6, border: 'none', cursor: 'pointer',
                            background: '#F0F2F5',
                            color: '#65676B',
                            fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 11,
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FADBD8'; e.currentTarget.style.color = '#C0392B' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#F0F2F5'; e.currentTarget.style.color = '#65676B' }}
                          title="Clear message"
                        >
                          <Trash2 size={11} />
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    ref={pasteAreaRef}
                    value={form.quoted_message}
                    onChange={e => set('quoted_message', e.target.value)}
                    onKeyDown={handlePasteAreaKeyDown}
                    onBeforeInput={handlePasteAreaBeforeInput}
                    placeholder="Paste the exact message here…"
                    rows={3}
                    style={{
                      flex: 1, padding: '8px 9px', borderRadius: 8,
                      border: `1.5px solid ${form.quoted_message ? accent.color : '#E4E6EB'}`,
                      fontFamily: '"Instrument Sans", system-ui', fontSize: 13,
                      color: '#050505', background: 'white', outline: 'none',
                      resize: 'vertical', lineHeight: 1.45, minHeight: 70,
                      transition: 'border-color 0.15s',
                      cursor: 'text',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = accent.color}
                    onBlur={e => e.currentTarget.style.borderColor = form.quoted_message ? accent.color : '#E4E6EB'}
                  />

                  <p style={{
                    margin: '4px 0 0',
                    fontFamily: '"Instrument Sans", system-ui', fontSize: 10.5,
                    color: '#BCC0C4', display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    🔒 Paste-only field — use the Paste button or Ctrl+V / ⌘V
                  </p>
                </div>
              </div>

              {(form.quoted_from || form.quoted_message) && (
                <button
                  type="button"
                  onClick={() => setShowQuotePreview(v => !v)}
                  style={{
                    marginTop: 8, display: 'flex', alignItems: 'center', gap: 5,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 12,
                    color: accent.color,
                  }}
                >
                  {showQuotePreview ? <EyeOff size={13} /> : <Eye size={13} />}
                  {showQuotePreview ? 'Hide preview' : 'Preview how it looks on feed'}
                </button>
              )}

              {showQuotePreview && (
                <QuotedMessagePreview from={form.quoted_from} message={form.quoted_message} accent={accent} />
              )}

              <p style={{
                margin: '8px 0 0',
                fontFamily: '"Instrument Sans", system-ui', fontSize: 11, color: '#BCC0C4',
              }}>
                💡 This will appear as a quoted block on the post — the text cannot be edited by others.
              </p>
            </div>
          )}
        </div>

        {/* Due date + time */}
        {(isDeadline || (isAnnouncement && form.sub_type === 'announcement')) && (
          <div style={{ marginTop: 12 }}>
            <label style={{
              fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700,
              color: isDeadline ? '#E41E3F' : '#65676B',
              display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6,
              textTransform: 'uppercase', letterSpacing: 0.4,
            }}>
              📅 Due Date &amp; Time
              {isDeadline
                ? <span style={{ color: '#E41E3F', fontWeight: 700 }}>*</span>
                : <span style={{ fontWeight: 400, color: '#BCC0C4', fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              }
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  flex: 3, padding: '10px 12px', borderRadius: 10,
                  border: `1px solid ${form.due_date ? '#0D7377' : isDeadline ? '#E41E3F' : '#E4E6EB'}`,
                  fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#050505',
                  background: '#F7F8FA', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <input
                type="time" value={form.due_time} onChange={e => set('due_time', e.target.value)}
                disabled={!form.due_date}
                style={{
                  flex: 2, padding: '10px 12px', borderRadius: 10,
                  border: `1px solid ${form.due_time ? '#0D7377' : '#E4E6EB'}`,
                  fontFamily: '"Instrument Sans", system-ui', fontSize: 13,
                  color: form.due_date ? '#050505' : '#BCC0C4',
                  background: form.due_date ? '#F7F8FA' : '#F0F2F5',
                  outline: 'none', boxSizing: 'border-box',
                  opacity: form.due_date ? 1 : 0.5, cursor: form.due_date ? 'text' : 'not-allowed',
                }}
              />
            </div>
          </div>
        )}

        {/* ── SCHEDULE POST SECTION ── */}
        {isSuperadmin && <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => {
              setShowSchedule(v => !v)
              if (showSchedule) { set('scheduled_date', ''); set('scheduled_time', '') }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: `1.5px solid ${showSchedule ? '#7C3AED' : '#E4E6EB'}`,
              background: showSchedule ? '#F5F3FF' : '#F7F8FA',
              cursor: 'pointer', transition: 'all 0.15s',
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13.5,
              color: showSchedule ? '#7C3AED' : '#65676B',
            }}
          >
            <Clock size={16} color={showSchedule ? '#7C3AED' : '#8A8D91'} />
            <span style={{ flex: 1, textAlign: 'left' }}>
              {showSchedule
                ? isScheduledFuture
                  ? `Scheduled for ${formatScheduledPreview()}`
                  : 'Schedule this post'
                : 'Schedule this post'}
            </span>
            {showSchedule ? <X size={14} /> : <ChevronDown size={14} />}
          </button>

          {showSchedule && (
            <div style={{
              marginTop: 8, padding: '12px 14px',
              background: '#F5F3FF', borderRadius: 10,
              border: '1.5px solid #DDD6FE',
              animation: 'expandIn 0.18s ease',
            }}>
              <p style={{
                margin: '0 0 10px',
                fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700,
                color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                Publish date &amp; time
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={e => set('scheduled_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    flex: 3, padding: '10px 12px', borderRadius: 10,
                    border: `1.5px solid ${form.scheduled_date ? '#7C3AED' : '#DDD6FE'}`,
                    fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#050505',
                    background: 'white', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <input
                  type="time"
                  value={form.scheduled_time}
                  onChange={e => set('scheduled_time', e.target.value)}
                  disabled={!form.scheduled_date}
                  style={{
                    flex: 2, padding: '10px 12px', borderRadius: 10,
                    border: `1.5px solid ${form.scheduled_time ? '#7C3AED' : '#DDD6FE'}`,
                    fontFamily: '"Instrument Sans", system-ui', fontSize: 13,
                    color: form.scheduled_date ? '#050505' : '#BCC0C4',
                    background: form.scheduled_date ? 'white' : '#EDE9FE',
                    outline: 'none', boxSizing: 'border-box',
                    opacity: form.scheduled_date ? 1 : 0.5,
                    cursor: form.scheduled_date ? 'text' : 'not-allowed',
                  }}
                />
              </div>

              {/* Validation feedback */}
              {form.scheduled_date && !isScheduledFuture && (
                <p style={{
                  margin: '8px 0 0',
                  fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 600,
                  color: '#C0392B', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  ⚠️ Pick a future date and time
                </p>
              )}
              {isScheduledFuture && (
                <p style={{
                  margin: '8px 0 0',
                  fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 600,
                  color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  ✓ Will publish {formatScheduledPreview()}
                </p>
              )}
              <p style={{
                margin: '8px 0 0',
                fontFamily: '"Instrument Sans", system-ui', fontSize: 11, color: '#A78BFA',
              }}>
                💡 Only you and admins can see this post until it's published.
              </p>
            </div>
          )}
        </div>}

        {/* Photo previews */}
        {photoPreviews.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 600, color: '#65676B' }}>
                {photoPreviews.length}/{MAX_PHOTOS} photos
              </span>
              <button type="button" onClick={() => { photoPreviews.forEach(u => URL.revokeObjectURL(u)); setPhotoFiles([]); setPhotoPreviews([]) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E41E3F', fontSize: 12, fontWeight: 600, fontFamily: '"Instrument Sans", system-ui' }}>
                Remove all
              </button>
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
                  <Plus size={18} />
                  <span style={{ fontSize: 11, fontFamily: '"Instrument Sans", system-ui', fontWeight: 600 }}>Add</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* File list */}
        {attachFiles.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 600, color: '#65676B' }}>
                {attachFiles.length}/{MAX_FILES} files
              </span>
              <button type="button" onClick={() => setAttachFiles([])}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E41E3F', fontSize: 12, fontWeight: 600, fontFamily: '"Instrument Sans", system-ui' }}>
                Remove all
              </button>
            </div>
            {attachFiles.map((file, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#F7F8FA', borderRadius: 10, border: '1px solid #E4E6EB' }}>
                <FileText size={15} color="#0D7377" />
                <span style={{ flex: 1, fontSize: 13, color: '#050505', fontFamily: '"Instrument Sans", system-ui', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
                <button type="button" onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  <X size={14} color="#65676B" />
                </button>
              </div>
            ))}
            {attachFiles.length < MAX_FILES && (
              <button type="button" onClick={() => fileRef.current.click()}
                style={{ padding: '9px 0', borderRadius: 10, border: '2px dashed #CED0D4', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#65676B', transition: 'border-color 0.15s, color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D7377'; e.currentTarget.style.color = '#0D7377' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#CED0D4'; e.currentTarget.style.color = '#65676B' }}
              >
                <Plus size={15} />
                <span style={{ fontSize: 12, fontFamily: '"Instrument Sans", system-ui', fontWeight: 600 }}>Add more files</span>
              </button>
            )}
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/avif,image/heic,image/heif" multiple style={{ display: 'none' }} onChange={handlePhoto} />
      <input ref={fileRef} type="file" accept={FILE_ACCEPT} multiple style={{ display: 'none' }} onChange={handleFile} />

      {/* Footer */}
      <div style={{ borderTop: '1px solid #E4E6EB', background: 'white', flexShrink: 0 }}>
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #F0F2F5' }}>
          <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 14, color: '#050505', flex: 1 }}>
            Add to your post
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <MediaBtn icon={<Image size={22} color="#45BD62" />} title="Photos" onClick={() => photoRef.current.click()} badge={photoFiles.length > 0 ? photoFiles.length : null} />
            {(isMaterial || isAnnouncement) && (
              <MediaBtn icon={<Paperclip size={22} color="#1877F2" />} title="Attach files (PDF, DOCX, PPT…)" onClick={() => fileRef.current.click()} badge={attachFiles.length > 0 ? attachFiles.length : null} />
            )}
          </div>
        </div>

        {!isMaterial && !isAnnouncement && (
          <p style={{ margin: '0', padding: '6px 16px 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#8A8D91', lineHeight: 1.4 }}>
            💡 Switch to <strong>Material</strong> to attach PDF, DOCX, PPT, and other files.
          </p>
        )}

        <div style={{ padding: '10px 16px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleSubmit} disabled={loading}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
              background: loading
                ? '#7EC8C8'
                : isScheduledFuture
                  ? '#7C3AED'
                  : '#0D7377',
              color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s, transform 0.1s',
            }}
            onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.985)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {loading && <Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} />}
            {loading
              ? (uploadProgress || 'Posting…')
              : isScheduledFuture
                ? '🕐 Schedule Post'
                : 'Post'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fullscreenIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes expandIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

function MediaBtn({ icon, title, onClick, badge }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button" onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      title={title}
      style={{
        position: 'relative', width: 38, height: 38, borderRadius: '50%',
        background: hovered ? '#F0F2F5' : 'transparent',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.12s',
      }}
    >
      {icon}
      {badge && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          minWidth: 16, height: 16, borderRadius: 8,
          background: '#0D7377', color: 'white',
          fontSize: 10, fontWeight: 700, fontFamily: '"Instrument Sans", system-ui',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
        }}>
          {badge}
        </span>
      )}
    </button>
  )
}
