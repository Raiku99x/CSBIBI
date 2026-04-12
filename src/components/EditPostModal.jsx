import { useAnnouncementTypes } from '../hooks/useAnnouncementTypes'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  X, ChevronDown, Loader2, MessageSquareQuote, Eye, EyeOff,
  ClipboardPaste, Trash2, Image, Paperclip, Plus, FileText,
  MessageCircle, Megaphone, Bell, CalendarCheck, Folder
} from 'lucide-react'
import toast from 'react-hot-toast'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','922B21','C0392B']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

// POST_TYPES — Icon replaces emoji
const POST_TYPES = [
  { sub_type: 'status',       post_type: 'status',       Icon: MessageCircle, label: 'Status',       btnColor: '#0D7377', activeColor: '#050505', activeBg: '#F0F2F5', activeBorder: '#CED0D4' },
  { sub_type: 'material',     post_type: 'status',       Icon: Folder,        label: 'Material',     btnColor: '#1A5276', activeColor: '#1A5276', activeBg: '#EBF5FB', activeBorder: '#AED6F1' },
  { sub_type: 'announcement', post_type: 'announcement', Icon: Megaphone,     label: 'Announcement', btnColor: '#C0392B', activeColor: '#C0392B', activeBg: '#FFF0EF', activeBorder: '#F5B7B1' },
  { sub_type: 'reminder',     post_type: 'announcement', Icon: Bell,          label: 'Reminder',     btnColor: '#C0392B', activeColor: '#C0392B', activeBg: '#FFF0EF', activeBorder: '#F5B7B1' },
  { sub_type: 'deadline',     post_type: 'announcement', Icon: CalendarCheck, label: 'Deadline',     btnColor: '#922B21', activeColor: '#922B21', activeBg: '#FFF5F5', activeBorder: '#F5B7B1' },
]

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

function getQuoteAccent() {
  return { color: '#0D7377', bg: '#E6F4F4', light: '#B2DFDF', border: '#80C7C9' }
}

function parseQuoted(raw) {
  if (!raw) return { from: '', message: '' }
  try { const p = JSON.parse(raw); return { from: p.from || '', message: p.message || '' } }
  catch { return { from: '', message: raw } }
}

function parsePhotos(photo_url) {
  if (!photo_url) return []
  try { const p = JSON.parse(photo_url); return Array.isArray(p) ? p : [photo_url] } catch { return [photo_url] }
}

function parseFiles(file_url, file_name) {
  if (!file_url) return []
  try {
    const urls = JSON.parse(file_url)
    const names = file_name ? JSON.parse(file_name) : []
    if (Array.isArray(urls)) return urls.map((url, i) => ({ url, name: names[i] || 'Attachment', isExisting: true }))
    return [{ url: file_url, name: file_name || 'Attachment', isExisting: true }]
  } catch { return [{ url: file_url, name: file_name || 'Attachment', isExisting: true }] }
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

export default function EditPostModal({ post, profile, subjects, onClose, onUpdated }) {
  const existingQuoted = parseQuoted(post.quoted_message)
  const announcementTypes = useAnnouncementTypes()

  const initialType = POST_TYPES.find(t => t.sub_type === post.sub_type) || POST_TYPES[0]
  const [selectedType, setSelectedType] = useState(initialType)

  const [form, setForm] = useState({
    caption: post.caption || '',
    subject_id: post.subject_id || '',
    announcement_type: post.announcement_type || '',
    due_date: post.due_date || '',
    due_time: post.due_time || '',
    quoted_from: existingQuoted.from,
    quoted_message: existingQuoted.message,
  })

  // Photo state — start with existing photos
  const existingPhotos = parsePhotos(post.photo_url)
  const [photoFiles, setPhotoFiles]     = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [keptPhotos, setKeptPhotos]     = useState(existingPhotos)

  // File state — start with existing files
  const existingFiles = parseFiles(post.file_url, post.file_name)
  const [attachFiles, setAttachFiles]   = useState([])
  const [keptFiles, setKeptFiles]       = useState(existingFiles)

  const [loading, setLoading]           = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [showQuoteSection, setShowQuoteSection] = useState(!!(existingQuoted.from || existingQuoted.message))
  const [showQuotePreview, setShowQuotePreview] = useState(false)
  const [pastingMsg, setPastingMsg]     = useState(false)

  // Keyboard detection for footer
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setKeyboardOpen(vv.height < window.innerHeight * 0.75)
    vv.addEventListener('resize', update)
    return () => vv.removeEventListener('resize', update)
  }, [])

  const photoRef = useRef()
  const fileRef  = useRef()
  const uploadCounter = useRef(0)
  const pasteAreaRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isAnnouncement = selectedType?.post_type === 'announcement'
  const isDeadline     = selectedType?.sub_type === 'deadline'
  const isMaterial     = selectedType?.sub_type === 'material'
  const accent         = getQuoteAccent()
  const showDueDate    = isDeadline || (isAnnouncement && selectedType?.sub_type === 'announcement')

  const totalPhotos = keptPhotos.length + photoFiles.length
  const totalFiles  = keptFiles.length + attachFiles.length

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  function handleSelectType(type) {
    setSelectedType(type)
    if (type.sub_type !== 'deadline' && type.sub_type !== 'announcement') { set('due_date', ''); set('due_time', '') }
    set('announcement_type', '')
  }

  async function handlePasteButton() {
    setPastingMsg(true)
    try {
      const text = await navigator.clipboard.readText()
      if (text) { set('quoted_message', text); toast.success('Message pasted!') }
      else toast.error('Clipboard is empty')
    } catch { pasteAreaRef.current?.focus(); toast('Press Ctrl+V / Cmd+V to paste') }
    finally { setPastingMsg(false) }
  }

  function handlePhoto(e) {
    const chosen = Array.from(e.target.files || [])
    const remaining = MAX_PHOTOS - totalPhotos
    if (remaining <= 0) { toast.error(`Max ${MAX_PHOTOS} photos`); return }
    const toAdd = chosen.slice(0, remaining)
    setPhotoFiles(prev => [...prev, ...toAdd])
    setPhotoPreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
    e.target.value = ''
  }

  function removeNewPhoto(idx) {
    URL.revokeObjectURL(photoPreviews[idx])
    setPhotoFiles(prev => prev.filter((_, i) => i !== idx))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  function removeKeptPhoto(idx) {
    setKeptPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  function handleFile(e) {
    const chosen = Array.from(e.target.files || [])
    const remaining = MAX_FILES - totalFiles
    if (remaining <= 0) { toast.error(`Max ${MAX_FILES} files`); e.target.value = ''; return }
    const toAdd = chosen.slice(0, remaining)
    setAttachFiles(prev => [...prev, ...toAdd])
    e.target.value = ''
  }

  function removeNewFile(idx) { setAttachFiles(prev => prev.filter((_, i) => i !== idx)) }
  function removeKeptFile(idx) { setKeptFiles(prev => prev.filter((_, i) => i !== idx)) }

  async function uploadFile(file, bucket) {
    const ext = file.name.split('.').pop().toLowerCase()
    const counter = ++uploadCounter.current
    const path = `${post.author_id}/${Date.now()}_${counter}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSave(e) {
    e.preventDefault()
    const hasQuote = showQuoteSection && form.quoted_message.trim()
    if (!form.caption.trim() && !hasQuote && totalPhotos === 0 && totalFiles === 0) {
      toast.error('Add a caption, photo, or file'); return
    }
    if (isDeadline && !form.due_date) { toast.error('Please set a due date'); return }
    if (showQuoteSection && form.quoted_message.trim() && !form.quoted_from.trim()) {
      toast.error('Please enter who sent this message'); return
    }

    setLoading(true)
    try {
      // Upload new photos
      let allPhotoUrls = [...keptPhotos]
      if (photoFiles.length > 0) {
        for (let i = 0; i < photoFiles.length; i++) {
          setUploadProgress(`Uploading photo ${i + 1} of ${photoFiles.length}…`)
          allPhotoUrls.push(await uploadFile(photoFiles[i], 'post-media'))
        }
      }
      const photo_url = allPhotoUrls.length > 0 ? JSON.stringify(allPhotoUrls) : null

      // Upload new files
      let allFileUrls  = keptFiles.map(f => f.url)
      let allFileNames = keptFiles.map(f => f.name)
      if (attachFiles.length > 0) {
        for (let i = 0; i < attachFiles.length; i++) {
          setUploadProgress(`Uploading file ${i + 1} of ${attachFiles.length}…`)
          const url = await uploadFile(attachFiles[i], 'post-media')
          allFileUrls.push(url)
          allFileNames.push(attachFiles[i].name)
        }
      }
      const file_url  = allFileUrls.length > 0  ? JSON.stringify(allFileUrls)  : null
      const file_name = allFileNames.length > 0 ? JSON.stringify(allFileNames) : null

      setUploadProgress('Saving…')
      const quoted_data = (showQuoteSection && form.quoted_message.trim())
        ? JSON.stringify({ from: form.quoted_from.trim(), message: form.quoted_message.trim() })
        : null

      const { data, error } = await supabase
        .from('posts')
        .update({
          caption: form.caption.trim(),
          subject_id: form.subject_id || null,
          post_type: selectedType.post_type,
          sub_type: selectedType.sub_type,
          announcement_type: isAnnouncement && form.announcement_type ? form.announcement_type : null,
          due_date: form.due_date || null,
          due_time: form.due_time || null,
          quoted_message: quoted_data,
          photo_url,
          file_url,
          file_name,
          is_edited: true,
        })
        .eq('id', post.id)
        .select('*, profiles!posts_author_id_fkey(*), subjects!posts_subject_id_fkey(*)')
        .single()

      if (error) throw error
      toast.success('Post updated!')
      onUpdated(data)
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to update')
    } finally {
      setLoading(false)
      setUploadProgress('')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'white', display: 'flex', flexDirection: 'column', animation: 'fullscreenIn 0.22s cubic-bezier(0.16,1,0.3,1)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #E4E6EB', flexShrink: 0 }}>
        <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: '#050505', flex: 1 }}>Edit Post</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={handleSave} disabled={loading}
            style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: loading ? '#7EC8C8' : selectedType.btnColor, color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s', whiteSpace: 'nowrap' }}>
            {loading && <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
            {loading
              ? (uploadProgress || 'Saving…')
              : <><selectedType.Icon size={14}/> Save</>
            }
          </button>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: '#E4E6EB', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = '#CED0D4'}
            onMouseLeave={e => e.currentTarget.style.background = '#E4E6EB'}>
            <X size={18} color="#050505" />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', padding: '16px 16px 70px' }}>

        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <img src={profile?.avatar_url || dicebearUrl(profile?.display_name)} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E4E6EB' }} alt="" />
          <div>
            <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 15, color: '#050505' }}>{profile?.display_name}</p>
            <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: selectedType.activeColor, display: 'flex', alignItems: 'center', gap: 4 }}>
              <selectedType.Icon size={11} /> {selectedType.label}
            </p>
          </div>
        </div>

        {/* Post type pills */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 7px', fontFamily: '"Instrument Sans", system-ui', fontSize: 10.5, fontWeight: 700, color: '#8A8D91', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            What are you posting?
          </p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {POST_TYPES.map(type => {
              const isActive = selectedType?.sub_type === type.sub_type
              return (
                <button key={type.sub_type} type="button" onClick={() => handleSelectType(type)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 20, border: `1.5px solid ${isActive ? type.activeBorder : '#E4E6EB'}`, background: isActive ? type.activeBg : 'white', cursor: 'pointer', fontFamily: '"Instrument Sans", system-ui', fontWeight: isActive ? 700 : 500, fontSize: 12, color: isActive ? type.activeColor : '#65676B', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = type.activeBorder; e.currentTarget.style.background = type.activeBg + '80' } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = '#E4E6EB'; e.currentTarget.style.background = 'white' } }}>
                  <type.Icon size={12} color={isActive ? type.activeColor : '#65676B'} />
                  {type.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Announcement category */}
        {isAnnouncement && (
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <select value={form.announcement_type} onChange={e => set('announcement_type', e.target.value)}
              style={{ width: '100%', padding: '11px 36px 11px 14px', borderRadius: 10, border: '1px solid #E4E6EB', background: form.announcement_type ? '#E6F4F4' : '#F7F8FA', appearance: 'none', fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: form.announcement_type ? '#0D7377' : '#8A8D91', fontWeight: form.announcement_type ? 700 : 400, cursor: 'pointer', outline: 'none' }}>
              <option value="">Category (optional)</option>
              {announcementTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown size={15} color={form.announcement_type ? '#0D7377' : '#65676B'} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        )}

        {/* Textarea */}
        <div style={{ background: '#F7F8FA', borderRadius: 12, padding: '12px 14px', marginBottom: 12, border: '1.5px solid #E4E6EB' }}>
          <textarea autoFocus
            placeholder="What's on your mind?"
            rows={5} value={form.caption} onChange={e => set('caption', e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontFamily: '"Instrument Sans", system-ui', fontSize: 16, color: '#050505', background: 'transparent', lineHeight: 1.6 }}
          />
        </div>

        {/* Subject */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <select value={form.subject_id} onChange={e => set('subject_id', e.target.value)}
            style={{ width: '100%', padding: '11px 36px 11px 14px', borderRadius: 10, border: '1px solid #E4E6EB', background: '#F7F8FA', appearance: 'none', fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: form.subject_id ? '#050505' : '#8A8D91', cursor: 'pointer', outline: 'none' }}>
            <option value="">No subject (General)</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <ChevronDown size={15} color="#65676B" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* Due date */}
        {showDueDate && (
          <div style={{ marginBottom: 12, background: isDeadline ? '#FFF5F5' : '#F7F8FA', borderRadius: 10, padding: '12px 14px', border: `1px solid ${isDeadline ? '#F5B7B1' : '#E4E6EB'}` }}>
            <label style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700, color: isDeadline ? '#922B21' : '#65676B', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              <CalendarCheck size={12} color={isDeadline ? '#922B21' : '#65676B'}/> Due Date &amp; Time
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

        {/* Photo previews — existing + new */}
        {(keptPhotos.length > 0 || photoFiles.length > 0) && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 600, color: '#65676B' }}>{totalPhotos}/{MAX_PHOTOS} photos</span>
              <button type="button" onClick={() => { photoPreviews.forEach(u => URL.revokeObjectURL(u)); setPhotoFiles([]); setPhotoPreviews([]); setKeptPhotos([]) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E41E3F', fontSize: 12, fontWeight: 600, fontFamily: '"Instrument Sans", system-ui' }}>Remove all</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {keptPhotos.map((url, i) => (
                <div key={'kept-' + i} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 10, overflow: 'hidden', background: '#E4E6EB' }}>
                  <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
                  <button type="button" onClick={() => removeKeptPhoto(i)}
                    style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={11} color="white" />
                  </button>
                </div>
              ))}
              {photoPreviews.map((url, i) => (
                <div key={'new-' + i} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 10, overflow: 'hidden', background: '#E4E6EB', outline: '2px solid #0D7377', outlineOffset: 1 }}>
                  <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
                  <div style={{ position: 'absolute', top: 4, left: 4, background: '#0D7377', color: 'white', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, fontFamily: '"Instrument Sans", system-ui' }}>NEW</div>
                  <button type="button" onClick={() => removeNewPhoto(i)}
                    style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={11} color="white" />
                  </button>
                </div>
              ))}
              {totalPhotos < MAX_PHOTOS && (
                <button type="button" onClick={() => photoRef.current.click()}
                  style={{ aspectRatio: '1/1', borderRadius: 10, border: '2px dashed #CED0D4', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#65676B' }}>
                  <Plus size={18} /><span style={{ fontSize: 11, fontFamily: '"Instrument Sans", system-ui', fontWeight: 600 }}>Add</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* File list — existing + new */}
        {(keptFiles.length > 0 || attachFiles.length > 0) && (
          <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 600, color: '#65676B' }}>{totalFiles}/{MAX_FILES} files</span>
              <button type="button" onClick={() => { setAttachFiles([]); setKeptFiles([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E41E3F', fontSize: 12, fontWeight: 600, fontFamily: '"Instrument Sans", system-ui' }}>Remove all</button>
            </div>
            {keptFiles.map((file, i) => (
              <div key={'kept-file-' + i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#F7F8FA', borderRadius: 10, border: '1px solid #E4E6EB' }}>
                <FileText size={15} color="#0D7377" />
                <span style={{ flex: 1, fontSize: 13, color: '#050505', fontFamily: '"Instrument Sans", system-ui', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <button type="button" onClick={() => removeKeptFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={14} color="#65676B" /></button>
              </div>
            ))}
            {attachFiles.map((file, i) => (
              <div key={'new-file-' + i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#E6F4F4', borderRadius: 10, border: '1px solid #7EC8C8' }}>
                <FileText size={15} color="#0D7377" />
                <span style={{ flex: 1, fontSize: 13, color: '#050505', fontFamily: '"Instrument Sans", system-ui', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#0D7377', background: 'white', padding: '1px 5px', borderRadius: 4, fontFamily: '"Instrument Sans", system-ui', flexShrink: 0 }}>NEW</span>
                <button type="button" onClick={() => removeNewFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={14} color="#65676B" /></button>
              </div>
            ))}
            {totalFiles < MAX_FILES && (
              <button type="button" onClick={() => fileRef.current.click()}
                style={{ padding: '9px 0', borderRadius: 10, border: '2px dashed #CED0D4', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#65676B' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D7377'; e.currentTarget.style.color = '#0D7377' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#CED0D4'; e.currentTarget.style.color = '#65676B' }}>
                <Plus size={15} /><span style={{ fontSize: 12, fontFamily: '"Instrument Sans", system-ui', fontWeight: 600 }}>Add more files</span>
              </button>
            )}
          </div>
        )}

      </div>

      {/* Fixed footer */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51, background: 'white', borderTop: '1px solid #E4E6EB', display: keyboardOpen ? 'none' : 'block' }}>
        <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 14, color: '#050505', flex: 1 }}>Add to your post</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <MediaBtn icon={<Image size={22} color="#45BD62" />} title="Photos" onClick={() => photoRef.current.click()} badge={totalPhotos > 0 ? totalPhotos : null} />
            {(isMaterial || isAnnouncement) && (
              <MediaBtn icon={<Paperclip size={22} color="#1877F2" />} title="Attach files" onClick={() => fileRef.current.click()} badge={totalFiles > 0 ? totalFiles : null} />
            )}
          </div>
        </div>
      </div>

      <input ref={photoRef} type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/avif,image/heic,image/heif" multiple style={{ display: 'none' }} onChange={handlePhoto} />
      <input ref={fileRef} type="file" accept={FILE_ACCEPT} multiple style={{ display: 'none' }} onChange={handleFile} />

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
