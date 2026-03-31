import { useAnnouncementTypes } from '../hooks/useAnnouncementTypes'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { X, ChevronDown, Loader2, Megaphone, FileText, Globe, MessageSquareQuote, Eye, EyeOff, ClipboardPaste, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','922B21','C0392B']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

function getQuoteAccent(postType, subType) {
  if (subType === 'deadline')      return { color: '#922B21', bg: '#FFF5F5', light: '#FADBD8', border: '#F5B7B1' }
  if (subType === 'reminder')      return { color: '#C0392B', bg: '#FFF8F8', light: '#FADBD8', border: '#F5B7B1' }
  if (subType === 'announcement')  return { color: '#C0392B', bg: '#FFF8F8', light: '#FADBD8', border: '#F5B7B1' }
  if (postType === 'announcement') return { color: '#C0392B', bg: '#FFF8F8', light: '#FADBD8', border: '#F5B7B1' }
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
    <div style={{
      background: accent.bg, border: `1px solid ${accent.border}`,
      borderLeft: `3px solid ${accent.color}`, borderRadius: '0 8px 8px 0',
      padding: '8px 12px', marginTop: 8,
    }}>
      <p style={{
        margin: '0 0 4px', fontFamily: '"Instrument Sans", system-ui',
        fontWeight: 700, fontSize: 12, color: accent.color,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <MessageSquareQuote size={11} />
        {from ? `From ${from}` : 'Quoted message'}
      </p>
      <p style={{
        margin: 0, fontFamily: '"Instrument Sans", system-ui',
        fontSize: 13.5, color: '#1c1e21', lineHeight: 1.5,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {message || <span style={{ color: '#BCC0C4', fontStyle: 'italic' }}>Paste a message below to preview…</span>}
      </p>
    </div>
  )
}

export default function EditPostModal({ post, profile, subjects, onClose, onUpdated }) {
  const isAnnouncement = post.post_type === 'announcement'
  const existingQuoted = parseQuoted(post.quoted_message)

  const [form, setForm] = useState({
    caption: post.caption || '',
    subject_id: post.subject_id || '',
    post_type: post.post_type || 'status',
    sub_type: post.sub_type || '',
    announcement_type: post.announcement_type || '',
    due_date: post.due_date || '',
    due_time: post.due_time || '',
    quoted_from: existingQuoted.from,
    quoted_message: existingQuoted.message,
  })
  const [loading, setLoading] = useState(false)
  const [showQuoteSection, setShowQuoteSection] = useState(!!(existingQuoted.from || existingQuoted.message))
  const [showQuotePreview, setShowQuotePreview] = useState(false)
  const [pastingMsg, setPastingMsg] = useState(false)
  const pasteAreaRef = useRef()
  const announcementTypes = useAnnouncementTypes()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const formIsAnnouncement = form.post_type === 'announcement'
  const formIsDeadline = formIsAnnouncement && form.sub_type === 'deadline'
  const showDueDate = formIsDeadline || (formIsAnnouncement && form.sub_type === 'announcement')
  const accent = getQuoteAccent(form.post_type, form.sub_type)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

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

  async function handleSave(e) {
    e.preventDefault()
    const hasQuote = showQuoteSection && form.quoted_message.trim()
    if (!form.caption.trim() && !hasQuote) {
      toast.error('Add a caption or a quoted message'); return
    }
    if (formIsDeadline && !form.due_date) { toast.error('Please set a due date'); return }
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
          post_type: form.post_type,
          sub_type: form.sub_type || null,
          announcement_type: formIsAnnouncement && form.announcement_type ? form.announcement_type : null,
          due_date: form.due_date || null,
          due_time: form.due_time || null,
          quoted_message: quoted_data,
          is_edited: true,
        })
        .eq('id', post.id)
        .select('*, profiles(*), subjects(*)')
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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, background: 'white',
      display: 'flex', flexDirection: 'column',
      animation: 'fullscreenIn 0.22s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid #E4E6EB',
        flexShrink: 0, background: 'white',
      }}>
        <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 18, color: '#050505' }}>
          Edit Post
        </span>
        <button onClick={onClose}
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
          <img src={profile?.avatar_url || dicebearUrl(profile?.display_name)} style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', background: '#E4E6EB' }} alt="" />
          <div>
            <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 15, color: '#050505' }}>
              {profile?.display_name}
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#E4E6EB', padding: '3px 10px', borderRadius: 6, marginTop: 3 }}>
              <Globe size={11} color="#050505" />
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 12, color: '#050505' }}>
                {form.sub_type === 'material' ? 'Material' : form.sub_type === 'deadline' ? 'Deadline' : form.sub_type === 'reminder' ? 'Reminder' : form.sub_type === 'announcement' ? 'Announcement' : form.sub_type === 'status' ? 'Status' : 'Post'} · Class
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
            <button key={key} type="button"
              onClick={() => { set('post_type', key); set('sub_type', ''); set('announcement_type', ''); if (key === 'status') { set('due_date', ''); set('due_time', '') } }}
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
        <div style={{ display: 'flex', gap: 5, padding: '3px', background: '#F7F8FA', borderRadius: 8, border: '1px solid #E4E6EB', marginBottom: 14 }}>
          {(formIsAnnouncement
            ? [{ key: 'announcement', label: '📢 Announcement' }, { key: 'reminder', label: '🔔 Reminder' }, { key: 'deadline', label: '📅 Deadline' }]
            : [{ key: 'status', label: '💬 Status' }, { key: 'material', label: '📁 Material' }]
          ).map(({ key, label }) => (
            <button key={key} type="button"
              onClick={() => { set('sub_type', key); if (key !== 'deadline' && key !== 'announcement') { set('due_date', ''); set('due_time', '') } }}
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

        {/* Announcement type dropdown — now from DB */}
        {formIsAnnouncement && form.sub_type && (
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <select value={form.announcement_type} onChange={e => set('announcement_type', e.target.value)}
              style={{ width: '100%', padding: '11px 36px 11px 14px', borderRadius: 10, border: '1px solid #E4E6EB', background: form.announcement_type ? '#E6F4F4' : '#F7F8FA', appearance: 'none', fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: form.announcement_type ? '#0D7377' : '#8A8D91', fontWeight: form.announcement_type ? 700 : 400, cursor: 'pointer', outline: 'none' }}
            >
              <option value="">Type (optional)</option>
              {announcementTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown size={15} color={form.announcement_type ? '#0D7377' : '#65676B'} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        )}

        {/* Textarea */}
        <textarea
          placeholder="What's on your mind?" rows={5} value={form.caption} onChange={e => set('caption', e.target.value)}
          style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontFamily: '"Instrument Sans", system-ui', fontSize: 18, color: '#050505', background: 'transparent', lineHeight: 1.5 }}
        />

        {/* Subject selector */}
        <div style={{ position: 'relative', marginTop: 8 }}>
          <select value={form.subject_id} onChange={e => set('subject_id', e.target.value)}
            style={{ width: '100%', padding: '11px 36px 11px 14px', borderRadius: 10, border: '1px solid #E4E6EB', background: '#F7F8FA', appearance: 'none', fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#050505', cursor: 'pointer', outline: 'none' }}
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
                    type="text" value={form.quoted_from} onChange={e => set('quoted_from', e.target.value)}
                    placeholder="e.g. Sir Cruz" maxLength={40}
                    style={{
                      flex: 1, padding: '8px 9px', borderRadius: 8,
                      border: `1.5px solid ${form.quoted_from ? accent.color : '#E4E6EB'}`,
                      fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#050505',
                      background: 'white', outline: 'none', transition: 'border-color 0.15s',
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
                      fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#050505',
                      background: 'white', outline: 'none', resize: 'vertical', lineHeight: 1.45, minHeight: 70,
                      transition: 'border-color 0.15s',
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
                  type="button" onClick={() => setShowQuotePreview(v => !v)}
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

              <p style={{ margin: '8px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 11, color: '#BCC0C4' }}>
                💡 This will appear as a quoted block on the post — the text cannot be edited by others.
              </p>
            </div>
          )}
        </div>

        {/* Due date + time */}
        {showDueDate && (
          <div style={{ marginTop: 12 }}>
            <label style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700, color: formIsDeadline ? '#E41E3F' : '#65676B', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              📅 Due Date &amp; Time
              {formIsDeadline ? <span style={{ color: '#E41E3F', fontWeight: 700 }}>*</span> : <span style={{ fontWeight: 400, color: '#BCC0C4', fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} min={new Date().toISOString().split('T')[0]}
                style={{ flex: 3, padding: '10px 12px', borderRadius: 10, border: `1px solid ${form.due_date ? '#0D7377' : formIsDeadline ? '#E41E3F' : '#E4E6EB'}`, fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#050505', background: '#F7F8FA', outline: 'none', boxSizing: 'border-box' }}
              />
              <input type="time" value={form.due_time} onChange={e => set('due_time', e.target.value)} disabled={!form.due_date}
                style={{ flex: 2, padding: '10px 12px', borderRadius: 10, border: `1px solid ${form.due_time ? '#0D7377' : '#E4E6EB'}`, fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: form.due_date ? '#050505' : '#BCC0C4', background: form.due_date ? '#F7F8FA' : '#F0F2F5', outline: 'none', boxSizing: 'border-box', opacity: form.due_date ? 1 : 0.5, cursor: form.due_date ? 'text' : 'not-allowed' }}
              />
            </div>
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #E4E6EB', background: 'white', flexShrink: 0, padding: '10px 16px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))', display: 'flex', gap: 8 }}>
        <button type="button" onClick={onClose}
          style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1.5px solid #E4E6EB', background: 'white', fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 15, color: '#65676B', cursor: 'pointer', transition: 'background 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F7F8FA'}
          onMouseLeave={e => e.currentTarget.style.background = 'white'}
        >
          Cancel
        </button>
        <button onClick={handleSave} disabled={loading}
          style={{ flex: 2, padding: '13px 0', borderRadius: 12, border: 'none', background: loading ? '#7EC8C8' : '#0D7377', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s, transform 0.1s' }}
          onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.985)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
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
