import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, ChevronDown, Loader2, Megaphone, FileText, Globe } from 'lucide-react'
import toast from 'react-hot-toast'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','922B21','C0392B']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

export default function EditPostModal({ post, profile, subjects, onClose, onUpdated }) {
  const isAnnouncement = post.post_type === 'announcement'

  const [form, setForm] = useState({
    caption: post.caption || '',
    subject_id: post.subject_id || '',
    post_type: post.post_type || 'status',
    sub_type: post.sub_type || '',
    announcement_type: post.announcement_type || '',
    due_date: post.due_date || '',
    due_time: post.due_time || '',
  })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const formIsAnnouncement = form.post_type === 'announcement'
  const formIsDeadline = formIsAnnouncement && form.sub_type === 'deadline'
  const showDueDate = formIsDeadline || (formIsAnnouncement && form.sub_type === 'announcement')

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    if (!form.caption.trim()) { toast.error('Caption cannot be empty'); return }
    if (formIsDeadline && !form.due_date) { toast.error('Please set a due date'); return }

    setLoading(true)
    try {
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
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      animation: 'fullscreenIn 0.22s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '1px solid #E4E6EB',
        flexShrink: 0,
        background: 'white',
      }}>
        <span style={{
          fontFamily: '"Bricolage Grotesque", system-ui',
          fontWeight: 800, fontSize: 18, color: '#050505',
        }}>
          Edit Post
        </span>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#E4E6EB', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#CED0D4'}
          onMouseLeave={e => e.currentTarget.style.background = '#E4E6EB'}
        >
          <X size={18} color="#050505" />
        </button>
      </div>

      {/* ── Scrollable body ── */}
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
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: '#E4E6EB', padding: '3px 10px', borderRadius: 6, marginTop: 3,
            }}>
              <Globe size={11} color="#050505" />
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 12, color: '#050505' }}>
                {form.sub_type === 'material' ? 'Material'
                  : form.sub_type === 'deadline' ? 'Deadline'
                  : form.sub_type === 'reminder' ? 'Reminder'
                  : form.sub_type === 'announcement' ? 'Announcement'
                  : form.sub_type === 'status' ? 'Status'
                  : 'Post'} · Class
              </span>
            </div>
          </div>
        </div>

        {/* Post type toggle */}
        <div style={{
          display: 'flex', gap: 6, padding: 4,
          background: '#F0F2F5', borderRadius: 10, marginBottom: 8,
        }}>
          {[
            { key: 'status', label: 'Status', icon: <FileText size={14} /> },
            { key: 'announcement', label: 'Announcement', icon: <Megaphone size={14} /> },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                set('post_type', key)
                set('sub_type', '')
                set('announcement_type', '')
                if (key === 'status') { set('due_date', ''); set('due_time', '') }
              }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13,
                background: form.post_type === key
                  ? key === 'announcement' ? '#0D7377' : 'white'
                  : 'transparent',
                color: form.post_type === key
                  ? key === 'announcement' ? 'white' : '#050505'
                  : '#65676B',
                boxShadow: form.post_type === key && key === 'status' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Sub-type toggle */}
        <div style={{
          display: 'flex', gap: 5, padding: '3px',
          background: '#F7F8FA', borderRadius: 8,
          border: '1px solid #E4E6EB',
          marginBottom: 14,
        }}>
          {(formIsAnnouncement
            ? [
                { key: 'announcement', label: '📢 Announcement' },
                { key: 'reminder', label: '🔔 Reminder' },
                { key: 'deadline', label: '📅 Deadline' },
              ]
            : [
                { key: 'status', label: '💬 Status' },
                { key: 'material', label: '📁 Material' },
              ]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                set('sub_type', key)
                if (key !== 'deadline' && key !== 'announcement') { set('due_date', ''); set('due_time', '') }
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
              <span style={{
                fontWeight: 700, fontSize: 13,
                color: form.sub_type === key ? '#050505' : '#65676B',
              }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Announcement type dropdown */}
        {formIsAnnouncement && form.sub_type && (
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <select
              value={form.announcement_type}
              onChange={e => set('announcement_type', e.target.value)}
              style={{
                width: '100%', padding: '11px 36px 11px 14px',
                borderRadius: 10, border: '1px solid #E4E6EB',
                background: form.announcement_type ? '#E6F4F4' : '#F7F8FA',
                appearance: 'none',
                fontFamily: '"Instrument Sans", system-ui', fontSize: 14,
                color: form.announcement_type ? '#0D7377' : '#8A8D91',
                fontWeight: form.announcement_type ? 700 : 400,
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="">Type (optional)</option>
              {['Quiz','Activity','Output','Exam','Fees','Info','Learning Task','Project','Reporting'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown size={15} color={form.announcement_type ? '#0D7377' : '#65676B'} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        )}

        {/* Textarea */}
        <textarea
          placeholder="What's on your mind?"
          rows={5}
          value={form.caption}
          onChange={e => set('caption', e.target.value)}
          style={{
            width: '100%', border: 'none', outline: 'none', resize: 'none',
            fontFamily: '"Instrument Sans", system-ui', fontSize: 18, color: '#050505',
            background: 'transparent', lineHeight: 1.5,
          }}
        />

        {/* Subject selector */}
        <div style={{ position: 'relative', marginTop: 8 }}>
          <select
            value={form.subject_id}
            onChange={e => set('subject_id', e.target.value)}
            style={{
              width: '100%', padding: '11px 36px 11px 14px',
              borderRadius: 10, border: '1px solid #E4E6EB',
              background: '#F7F8FA', appearance: 'none',
              fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#050505',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="">No subject (General)</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <ChevronDown size={15} color="#65676B" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* Due date + time */}
        {showDueDate && (
          <div style={{ marginTop: 12 }}>
            <label style={{
              fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700,
              color: formIsDeadline ? '#E41E3F' : '#65676B',
              display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6,
              textTransform: 'uppercase', letterSpacing: 0.4,
            }}>
              📅 Due Date &amp; Time
              {formIsDeadline
                ? <span style={{ color: '#E41E3F', fontWeight: 700 }}>*</span>
                : <span style={{ fontWeight: 400, color: '#BCC0C4', fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              }
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="date"
                value={form.due_date}
                onChange={e => set('due_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  flex: 3, padding: '10px 12px', borderRadius: 10,
                  border: `1px solid ${form.due_date ? '#0D7377' : formIsDeadline ? '#E41E3F' : '#E4E6EB'}`,
                  fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#050505',
                  background: '#F7F8FA', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <input
                type="time"
                value={form.due_time}
                onChange={e => set('due_time', e.target.value)}
                disabled={!form.due_date}
                style={{
                  flex: 2, padding: '10px 12px', borderRadius: 10,
                  border: `1px solid ${form.due_time ? '#0D7377' : '#E4E6EB'}`,
                  fontFamily: '"Instrument Sans", system-ui', fontSize: 13,
                  color: form.due_date ? '#050505' : '#BCC0C4',
                  background: form.due_date ? '#F7F8FA' : '#F0F2F5',
                  outline: 'none', boxSizing: 'border-box',
                  opacity: form.due_date ? 1 : 0.5,
                  cursor: form.due_date ? 'text' : 'not-allowed',
                }}
              />
            </div>
          </div>
        )}

        {/* bottom padding */}
        <div style={{ height: 16 }} />
      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop: '1px solid #E4E6EB',
        background: 'white',
        flexShrink: 0,
        padding: '10px 16px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        display: 'flex', gap: 8,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1, padding: '13px 0', borderRadius: 12,
            border: '1.5px solid #E4E6EB', background: 'white',
            fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 15,
            color: '#65676B', cursor: 'pointer', transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#F7F8FA'}
          onMouseLeave={e => e.currentTarget.style.background = 'white'}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            flex: 2, padding: '13px 0',
            borderRadius: 12, border: 'none',
            background: loading ? '#7EC8C8' : '#0D7377',
            color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.15s, transform 0.1s',
          }}
          onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.985)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {loading && <Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} />}
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <style>{`
        @keyframes fullscreenIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
