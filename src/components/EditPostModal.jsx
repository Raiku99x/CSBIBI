import { useAnnouncementTypes } from '../hooks/useAnnouncementTypes'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { X, ChevronDown, Loader2, MessageSquareQuote, Eye, EyeOff, ClipboardPaste, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','922B21','C0392B']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

const POST_TYPES = [
  { sub_type: 'status',       post_type: 'status',       emoji: '💬', label: 'Status',       btnColor: '#0D7377', activeColor: '#050505', activeBg: '#F0F2F5', activeBorder: '#CED0D4' },
  { sub_type: 'material',     post_type: 'status',       emoji: '📁', label: 'Material',     btnColor: '#1A5276', activeColor: '#1A5276', activeBg: '#EBF5FB', activeBorder: '#AED6F1' },
  { sub_type: 'announcement', post_type: 'announcement', emoji: '📢', label: 'Announcement', btnColor: '#C0392B', activeColor: '#C0392B', activeBg: '#FFF0EF', activeBorder: '#F5B7B1' },
  { sub_type: 'reminder',     post_type: 'announcement', emoji: '🔔', label: 'Reminder',     btnColor: '#C0392B', activeColor: '#C0392B', activeBg: '#FFF0EF', activeBorder: '#F5B7B1' },
  { sub_type: 'deadline',     post_type: 'announcement', emoji: '📅', label: 'Deadline',     btnColor: '#922B21', activeColor: '#922B21', activeBg: '#FFF5F5', activeBorder: '#F5B7B1' },
]

function getQuoteAccent(subType) {
  if (subType === 'deadline')      return { color: '#922B21', bg: '#FFF5F5', light: '#FADBD8', border: '#F5B7B1' }
  if (subType === 'reminder')      return { color: '#C0392B', bg: '#FFF8F8', light: '#FADBD8', border: '#F5B7B1' }
  if (subType === 'announcement')  return { color: '#C0392B', bg: '#FFF8F8', light: '#FADBD8', border: '#F5B7B1' }
  if (subType === 'material')      return { color: '#1A5276', bg: '#EBF5FB', light: '#D6EAF8', border: '#AED6F1' }
  return                                  { color: '#65676B', bg: '#F7F8FA', light: '#E4E6EB', border: '#DADDE1' }
}

function parseQuoted(raw) {
  if (!raw) return { from: '', message: '' }
  try { const p = JSON.parse(raw); return { from: p.from || '', message: p.message || '' } }
  catch { return { from: '', message: raw } }
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

  const [loading, setLoading]           = useState(false)
  const [showQuoteSection, setShowQuoteSection] = useState(!!(existingQuoted.from || existingQuoted.message))
  const [showQuotePreview, setShowQuotePreview] = useState(false)
  const [pastingMsg, setPastingMsg]     = useState(false)
  const pasteAreaRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isAnnouncement = selectedType?.post_type === 'announcement'
  const isDeadline     = selectedType?.sub_type === 'deadline'
  const accent         = getQuoteAccent(selectedType?.sub_type)
  const showDueDate    = isDeadline || (isAnnouncement && selectedType?.sub_type === 'announcement')

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  function handleSelectType(type) {
    setSelectedType(type)
    if (type.sub_type !== 'deadline' && type.sub_type !== 'announcement') { set('due_date', ''); set('due_time', '') }
    set('announcement_type', '')
  }

  function handlePasteAreaKeyDown(e) {
    const isPaste = (e.ctrlKey || e.metaKey) && e.key === 'v'
    const isSelectAll = (e.ctrlKey || e.metaKey) && e.key === 'a'
    const isCopy = (e.ctrlKey || e.metaKey) && e.key === 'c'
    if (!isPaste && !isSelectAll && !isCopy && !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault()
  }
  function handlePasteAreaBeforeInput(e) {
    if (e.inputType !== 'insertFromPaste' && e.inputType !== 'insertFromPasteAsQuotation') e.preventDefault()
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

  async function handleSave(e) {
    e.preventDefault()
    const hasQuote = showQuoteSection && form.quoted_message.trim()
    if (!form.caption.trim() && !hasQuote) { toast.error('Add a caption or a quoted message'); return }
    if (isDeadline && !form.due_date) { toast.error('Please set a due date'); return }
    if (showQuoteSection && form.quoted_message.trim() && !form.quoted_from.trim()) {
      toast.error('Please enter who sent this message'); return
    }

    setLoading(true)
    try {
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
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'white', display: 'flex', flexDirection: 'column', animation: 'fullscreenIn 0.22s cubic-bezier(0.16,1,0.3,1)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #E4E6EB', flexShrink: 0 }}>
        <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: '#050505' }}>Edit Post</span>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: '#E4E6EB', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => e.currentTarget.style.background = '#CED0D4'}
          onMouseLeave={e => e.currentTarget.style.background = '#E4E6EB'}>
          <X size={18} color="#050505" />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <img src={profile?.avatar_url || dicebearUrl(profile?.display_name)} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E4E6EB' }} alt="" />
          <div>
            <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 15, color: '#050505' }}>{profile?.display_name}</p>
            <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: selectedType.activeColor }}>
              {selectedType.emoji} {selectedType.label} · Class
            </p>
          </div>
        </div>

        {/* ── PILL CHIPS ── */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700, color: '#8A8D91', textTransform: 'uppercase', letterSpacing: 0.6 }}>Post type</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {POST_TYPES.map(type => {
              const isActive = selectedType?.sub_type === type.sub_type
              return (
                <button key={type.sub_type} type="button" onClick={() => handleSelectType(type)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${isActive ? type.activeBorder : '#E4E6EB'}`, background: isActive ? type.activeBg : 'white', cursor: 'pointer', fontFamily: '"Instrument Sans", system-ui', fontWeight: isActive ? 700 : 500, fontSize: 13.5, color: isActive ? type.activeColor : '#65676B', transition: 'all 0.15s', boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = type.activeBorder; e.currentTarget.style.background = type.activeBg + '80' } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = '#E4E6EB'; e.currentTarget.style.background = 'white' } }}>
                  <span style={{ fontSize: 15 }}>{type.emoji}</span>
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
          <textarea placeholder="What's on your mind?" rows={5} value={form.caption} onChange={e => set('caption', e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontFamily: '"Instrument Sans", system-ui', fontSize: 16, color: '#050505', background: 'transparent', lineHeight: 1.6 }} />
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
                    onKeyDown={handlePasteAreaKeyDown} onBeforeInput={handlePasteAreaBeforeInput}
                    placeholder="Paste the exact message here…" rows={3}
                    style={{ flex: 1, padding: '8px 9px', borderRadius: 8, border: `1.5px solid ${form.quoted_message ? accent.color : '#E4E6EB'}`, fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#050505', background: 'white', outline: 'none', resize: 'vertical', lineHeight: 1.45, minHeight: 70 }}
                    onFocus={e => e.currentTarget.style.borderColor = accent.color}
                    onBlur={e => e.currentTarget.style.borderColor = form.quoted_message ? accent.color : '#E4E6EB'} />
                  <p style={{ margin: '4px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 10.5, color: '#BCC0C4' }}>🔒 Paste-only — Ctrl+V / ⌘V</p>
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

        <div style={{ height: 16 }} />
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #E4E6EB', background: 'white', flexShrink: 0, padding: '10px 16px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))', display: 'flex', gap: 8 }}>
        <button type="button" onClick={onClose}
          style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1.5px solid #E4E6EB', background: 'white', fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 15, color: '#65676B', cursor: 'pointer', transition: 'background 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F7F8FA'}
          onMouseLeave={e => e.currentTarget.style.background = 'white'}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={loading}
          style={{ flex: 2, padding: '13px 0', borderRadius: 12, border: 'none', background: loading ? '#7EC8C8' : selectedType.btnColor, color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s, transform 0.1s' }}
          onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.985)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}>
          {loading && <Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} />}
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <style>{`
        @keyframes fullscreenIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes expandIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
