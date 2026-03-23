import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatDistanceToNow } from 'date-fns'
import { Send, Trash2, Lock, AtSign, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Avatar helper ─────────────────────────────────────────────
const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','922B21','C0392B']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

export default function ChatPage() {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [text, setText] = useState('')
  const [isWhisper, setIsWhisper] = useState(false)
  const [tagUser, setTagUser] = useState(null)
  const [tagPublic, setTagPublic] = useState(true)
  const [showTagMenu, setShowTagMenu] = useState(false)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef()
  const tagMenuRef = useRef()
  const inputRef = useRef()

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat')
      .select('*, sender:profiles!chat_sender_id_fkey(*), receiver:profiles!chat_receiver_id_fkey(*), tagged:profiles!chat_tag_user_id_fkey(*)')
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) {
      setMessages(data.filter(m => !m.is_whisper || m.sender_id === user.id || m.receiver_id === user.id))
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchMessages()
    supabase.from('profiles').select('id, display_name, avatar_url')
      .neq('id', user.id).then(({ data }) => { if (data) setUsers(data) })

    const channel = supabase
      .channel('chat-room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat' },
        async (payload) => {
          const { data } = await supabase
            .from('chat')
            .select('*, sender:profiles!chat_sender_id_fkey(*), receiver:profiles!chat_receiver_id_fkey(*), tagged:profiles!chat_tag_user_id_fkey(*)')
            .eq('id', payload.new.id).single()
          if (data) {
            const visible = !data.is_whisper || data.sender_id === user.id || data.receiver_id === user.id
            if (visible) setMessages(prev => [...prev, data])
          }
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat' },
        (payload) => setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchMessages, user.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    function h(e) { if (tagMenuRef.current && !tagMenuRef.current.contains(e.target)) setShowTagMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function send(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    try {
      const { data: inserted, error } = await supabase
        .from('chat')
        .insert({
          sender_id: user.id,
          content: text.trim(),
          is_whisper: isWhisper,
          is_deleted: false,
          receiver_id: isWhisper && tagUser ? tagUser.id : null,
          tag_user_id: tagUser ? tagUser.id : null,
          tag_public: tagUser ? tagPublic : null,
        })
        .select('id').single()

      if (error) throw error

      if (isWhisper && tagUser) {
        await supabase.from('notifications').insert({
          user_id: tagUser.id, chat_message_id: inserted.id, type: 'whisper',
          message: `💬 ${profile?.display_name} sent you a whisper`, is_read: false,
        })
      } else if (tagUser && tagPublic) {
        await supabase.from('notifications').insert({
          user_id: tagUser.id, chat_message_id: inserted.id, type: 'tag',
          message: `🏷️ ${profile?.display_name} mentioned you in chat`, is_read: false,
        })
      }

      setText('')
      setTagUser(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  async function deleteMessage(id) {
    await supabase.from('chat').update({ is_deleted: true }).eq('id', id).eq('sender_id', user.id)
  }

  const grouped = messages.map((msg, i) => ({
    ...msg,
    isFirst: i === 0 || messages[i - 1].sender_id !== msg.sender_id,
    isLast: i === messages.length - 1 || messages[i + 1].sender_id !== msg.sender_id,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px - 52px)' }}>

      {/* ── Chat header ── */}
      <div style={{
        background: 'white', borderBottom: '1px solid #E4E6EB',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
          {users.slice(0, 2).map((u, i) => (
            <img key={u.id}
              src={u.avatar_url || dicebearUrl(u.display_name)}
              style={{
                width: 28, height: 28, borderRadius: '50%', objectFit: 'cover',
                position: 'absolute', border: '2px solid white',
                top: i === 0 ? 0 : 'auto', bottom: i === 1 ? 0 : 'auto',
                left: i === 0 ? 0 : 'auto', right: i === 1 ? 0 : 'auto',
              }} alt=""
            />
          ))}
        </div>
        <div>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 14.5, color: '#050505' }}>
            Class Chat
          </p>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#22C55E', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
            {users.length + 1} members · Live
          </p>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '10px 10px 4px',
        display: 'flex', flexDirection: 'column', gap: 2,
        background: '#E9EBEE',
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Loader2 size={26} color="#C0392B" style={{ animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ fontSize: 44 }}>💬</div>
            <p style={{ fontFamily: '"Instrument Sans", system-ui', color: '#65676B', fontSize: 14, margin: 0 }}>
              No messages yet — say hello!
            </p>
          </div>
        ) : (
          grouped.map(m => (
            <MessageBubble key={m.id} msg={m} currentUserId={user.id} onDelete={deleteMessage} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Compose bar ── */}
      <div style={{
        background: 'white', borderTop: '1px solid #E4E6EB',
        padding: '8px 10px',
        flexShrink: 0,
      }}>
        {/* Tag/whisper preview pill */}
        {tagUser && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 8, marginBottom: 8,
            background: isWhisper ? '#E6F4F4' : '#F0F2F5',
            border: `1px solid ${isWhisper ? '#7EC8C8' : '#DADDE1'}`,
          }}>
            {isWhisper ? <Lock size={12} color="#0D7377" /> : <AtSign size={12} color="#65676B" />}
            <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 600, color: isWhisper ? '#0D7377' : '#050505', flex: 1 }}>
              {isWhisper ? `Whispering to @${tagUser.display_name}` : `Tagging @${tagUser.display_name}`}
            </span>
            {!isWhisper && (
              <button onClick={() => setTagPublic(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', fontSize: 11, fontFamily: '"Instrument Sans", system-ui', fontWeight: 600 }}>
                {tagPublic ? 'Public' : 'Private'}
              </button>
            )}
            <button onClick={() => setTagUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', display: 'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}

        <form onSubmit={send} style={{ display: 'flex', alignItems: 'flex-end', gap: 7 }}>
          {/* Icons */}
          <div style={{ display: 'flex', gap: 2, flexShrink: 0, paddingBottom: 5 }}>
            {/* Tag button */}
            <div ref={tagMenuRef} style={{ position: 'relative' }}>
              <IconBtn active={!!tagUser && !isWhisper} onClick={() => { setIsWhisper(false); setShowTagMenu(t => !t) }} title="Tag someone">
                <AtSign size={19} />
              </IconBtn>
              {showTagMenu && (
                <div style={{
                  position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
                  width: 230, background: 'white',
                  borderRadius: 12, border: '1px solid #E4E6EB',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  overflow: 'hidden', zIndex: 50,
                  animation: 'slideUp 0.18s ease',
                }}>
                  <p style={{ margin: 0, padding: '10px 14px 6px', fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Tag someone
                  </p>
                  {users.length === 0 ? (
                    <p style={{ margin: 0, padding: '10px 14px 12px', fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#BCC0C4' }}>
                      No other members yet
                    </p>
                  ) : users.map(u => (
                    <button key={u.id} type="button"
                      onClick={() => { setTagUser(u); setShowTagMenu(false) }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 14px', border: 'none', cursor: 'pointer',
                        background: 'transparent', textAlign: 'left',
                        fontFamily: '"Instrument Sans", system-ui', fontSize: 13.5, color: '#050505',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F0F2F5'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <img
                        src={u.avatar_url || dicebearUrl(u.display_name)}
                        style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                        alt=""
                      />
                      <span style={{ fontWeight: 600 }}>{u.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Whisper button */}
            <IconBtn active={isWhisper} onClick={() => setIsWhisper(w => !w)} title="Send whisper" color={isWhisper ? '#0D7377' : undefined}>
              <Lock size={19} />
            </IconBtn>
          </div>

          {/* Input */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'flex-end',
            background: '#F0F2F5', borderRadius: 22,
            border: `1.5px solid ${isWhisper ? '#7EC8C8' : 'transparent'}`,
            padding: '8px 14px',
            transition: 'border-color 0.15s',
          }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={e => {
                setText(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
              placeholder={isWhisper ? '🔒 Send a whisper…' : 'Message the class…'}
              style={{
                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                fontFamily: '"Instrument Sans", system-ui', fontSize: 14.5, color: '#050505',
                resize: 'none', lineHeight: 1.4, maxHeight: 100, overflow: 'hidden',
              }}
            />
          </div>

          {/* Send */}
          <button type="submit" disabled={sending || !text.trim()} style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            background: text.trim() ? (isWhisper ? '#0D7377' : '#0084FF') : '#E4E6EB',
            border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s, transform 0.1s',
          }}
            onMouseDown={e => { if (text.trim()) e.currentTarget.style.transform = 'scale(0.92)' }}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {sending
              ? <Loader2 size={16} color="white" style={{ animation: 'spin 0.8s linear infinite' }} />
              : <Send size={16} color={text.trim() ? 'white' : '#BCC0C4'} />
            }
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}

function IconBtn({ onClick, active, children, title, color }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button type="button" onClick={onClick} title={title}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: active ? '#E6F4F4' : hovered ? '#F0F2F5' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active ? (color || '#0D7377') : '#65676B',
        transition: 'background 0.12s, color 0.12s',
      }}
    >
      {children}
    </button>
  )
}

function MessageBubble({ msg, currentUserId, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const isOwn = msg.sender_id === currentUserId
  const isWhisper = msg.is_whisper

  if (msg.is_deleted) {
    return (
      <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', padding: '1px 0' }}>
        <span style={{
          fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#8A8D91', fontStyle: 'italic',
          background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: 16,
        }}>
          {isOwn ? 'You' : msg.sender?.display_name} deleted a message
        </span>
      </div>
    )
  }

  const ownBg    = isWhisper ? '#0D7377' : '#0084FF'
  const otherBg  = isWhisper ? '#E6F4F4' : 'white'
  const ownText  = 'white'
  const otherText = isWhisper ? '#0D7377' : '#050505'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems: 'flex-end', gap: 5,
        padding: '1px 0',
        marginTop: msg.isFirst ? 10 : 0,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      {!isOwn && (
        <div style={{ width: 26, flexShrink: 0 }}>
          {msg.isLast && (
            <img
              src={msg.sender?.avatar_url || dicebearUrl(msg.sender?.display_name)}
              style={{ width: 26, height: 26, borderRadius: 8, objectFit: 'cover', display: 'block' }}
              alt=""
            />
          )}
        </div>
      )}

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap: 2 }}>
        {!isOwn && msg.isFirst && (
          <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 600, color: '#65676B', marginLeft: 10 }}>
            {msg.sender?.display_name}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexDirection: isOwn ? 'row-reverse' : 'row' }}>
          <div style={{
            padding: '8px 13px',
            background: isOwn ? ownBg : otherBg,
            color: isOwn ? ownText : otherText,
            borderRadius: isOwn
              ? `18px ${msg.isFirst ? 18 : 4}px ${msg.isLast ? 4 : 18}px 18px`
              : `${msg.isFirst ? 18 : 4}px 18px 18px ${msg.isLast ? 4 : 18}px`,
            boxShadow: isOwn ? 'none' : '0 1px 2px rgba(0,0,0,0.08)',
            border: !isOwn && !isWhisper ? '1px solid #E4E6EB' : 'none',
          }}>
            {isWhisper && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3, opacity: 0.75 }}>
                <Lock size={9} color={isOwn ? 'white' : '#0D7377'} />
                <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 10, fontWeight: 700, color: isOwn ? 'white' : '#0D7377', textTransform: 'uppercase', letterSpacing: 0.5 }}>Whisper</span>
              </div>
            )}
            {msg.tag_user_id && (
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 13, fontWeight: 700, color: isOwn ? 'rgba(255,255,255,0.85)' : '#0D7377', marginRight: 4 }}>
                @{msg.tagged?.display_name}
              </span>
            )}
            <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 14.5, lineHeight: 1.4, wordBreak: 'break-word' }}>
              {msg.content}
            </span>
          </div>

          {isOwn && hovered && (
            <button onClick={() => onDelete(msg.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#BCC0C4', display: 'flex', padding: 3,
              transition: 'color 0.12s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
              onMouseLeave={e => e.currentTarget.style.color = '#BCC0C4'}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {msg.isLast && (
          <span style={{
            fontFamily: '"Instrument Sans", system-ui', fontSize: 10, color: '#BCC0C4',
            marginLeft: isOwn ? 0 : 10, marginRight: isOwn ? 3 : 0,
          }}>
            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  )
}
