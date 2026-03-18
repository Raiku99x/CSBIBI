import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatDistanceToNow } from 'date-fns'
import { Send, Trash2, Lock, AtSign, Loader2, Smile } from 'lucide-react'
import toast from 'react-hot-toast'

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

  // Group messages by sender for visual grouping
  const grouped = messages.map((msg, i) => ({
    ...msg,
    isFirst: i === 0 || messages[i - 1].sender_id !== msg.sender_id,
    isLast: i === messages.length - 1 || messages[i + 1].sender_id !== msg.sender_id,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px - 56px)' }}>

      {/* ── Chat header ── */}
      <div style={{
        background: 'white', borderBottom: '1px solid #DADDE1',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        {/* Group avatar stack */}
        <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
          {users.slice(0, 2).map((u, i) => (
            <img
              key={u.id}
              src={u.avatar_url || dicebearUrl(u.display_name)}
              style={{
                width: 30, height: 30, borderRadius: '50%', objectFit: 'cover',
                position: 'absolute', border: '2px solid white',
                top: i === 0 ? 0 : 'auto', bottom: i === 1 ? 0 : 'auto',
                left: i === 0 ? 0 : 'auto', right: i === 1 ? 0 : 'auto',
              }}
              alt=""
            />
          ))}
        </div>
        <div>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 15, color: '#050505' }}>
            Class Chat
          </p>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#45BD62' }}>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#45BD62', marginRight: 4 }} />
            {users.length + 1} members · Live
          </p>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 12px 4px',
        display: 'flex', flexDirection: 'column', gap: 2,
        background: '#F0F2F5',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.15) transparent',
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Loader2 size={28} color="#0D7377" style={{ animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ fontSize: 48 }}>💬</div>
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
        background: 'white', borderTop: '1px solid #DADDE1',
        padding: '8px 12px',
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
              <button onClick={() => setTagPublic(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', fontSize: 11, fontFamily: '"Instrument Sans", system-ui', fontWeight: 600 }}>
                {tagPublic ? 'Public' : 'Private'}
              </button>
            )}
            <button onClick={() => setTagUser(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', display: 'flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}

        <form onSubmit={send} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          {/* Left icons */}
          <div style={{ display: 'flex', gap: 2, flexShrink: 0, paddingBottom: 6 }}>
            {/* Tag user */}
            <div ref={tagMenuRef} style={{ position: 'relative' }}>
              <IconBtn
                active={!!tagUser && !isWhisper}
                onClick={() => { setIsWhisper(false); setShowTagMenu(t => !t) }}
                title="Tag someone"
              >
                <AtSign size={20} />
              </IconBtn>
              {showTagMenu && (
                <div style={{
                  position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
                  width: 220, background: 'white',
                  borderRadius: 12, border: '1px solid #DADDE1',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  overflow: 'hidden', zIndex: 50,
                  animation: 'slideUp 0.18s ease',
                }}>
                  <p style={{ margin: 0, padding: '10px 14px 6px', fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Tag someone
                  </p>
                  {users.map(u => (
                    <button key={u.id} type="button"
                      onClick={() => { setTagUser(u); setShowTagMenu(false) }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 14px', border: 'none', cursor: 'pointer',
                        background: 'transparent', textAlign: 'left',
                        fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#050505',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F0F2F5'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <img src={u.avatar_url || dicebearUrl(u.display_name)}
                        style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                      <span style={{ fontWeight: 600 }}>{u.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Whisper */}
            <IconBtn
              active={isWhisper}
              onClick={() => { setIsWhisper(w => !w); if (!isWhisper && tagUser) {} }}
              title="Send whisper"
              color={isWhisper ? '#0D7377' : undefined}
            >
              <Lock size={20} />
            </IconBtn>
          </div>

          {/* Input bubble */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'flex-end',
            background: '#F0F2F5', borderRadius: 22,
            border: `1.5px solid ${isWhisper ? '#7EC8C8' : 'transparent'}`,
            padding: '8px 14px', gap: 8,
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
                fontFamily: '"Instrument Sans", system-ui', fontSize: 15, color: '#050505',
                resize: 'none', lineHeight: 1.4, maxHeight: 100, overflow: 'hidden',
              }}
            />
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={sending || !text.trim()}
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: text.trim() ? (isWhisper ? '#0D7377' : '#0084FF') : '#E4E6EB',
              border: 'none', cursor: text.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, transform 0.1s',
            }}
            onMouseDown={e => { if (text.trim()) e.currentTarget.style.transform = 'scale(0.92)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {sending
              ? <Loader2 size={18} color="white" style={{ animation: 'spin 0.8s linear infinite' }} />
              : <Send size={17} color={text.trim() ? 'white' : '#BCC0C4'} />
            }
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}

function IconBtn({ onClick, active, children, title, color }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
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
          fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#65676B', fontStyle: 'italic',
          background: 'rgba(255,255,255,0.7)', padding: '6px 14px', borderRadius: 18,
        }}>
          {isOwn ? 'You' : msg.sender?.display_name} deleted a message
        </span>
      </div>
    )
  }

  // Bubble colors
  const ownBg = isWhisper ? '#0D7377' : '#0084FF'
  const otherBg = isWhisper ? '#E6F4F4' : 'white'
  const ownText = 'white'
  const otherText = isWhisper ? '#0D7377' : '#050505'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems: 'flex-end', gap: 6,
        padding: '1px 0',
        marginTop: msg.isFirst ? 10 : 0,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar — only show on last message in a group */}
      {!isOwn && (
        <div style={{ width: 28, flexShrink: 0 }}>
          {msg.isLast && (
            <img
              src={msg.sender?.avatar_url || dicebearUrl(msg.sender?.display_name)}
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
              alt=""
            />
          )}
        </div>
      )}

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap: 2 }}>
        {/* Name label — first message in group from others */}
        {!isOwn && msg.isFirst && (
          <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 600, color: '#65676B', marginLeft: 12 }}>
            {msg.sender?.display_name}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: isOwn ? 'row-reverse' : 'row' }}>
          {/* Bubble */}
          <div style={{
            padding: '8px 14px',
            background: isOwn ? ownBg : otherBg,
            color: isOwn ? ownText : otherText,
            borderRadius: isOwn
              ? `${msg.isFirst ? 18 : 18}px ${msg.isFirst ? 18 : 4}px ${msg.isLast ? 4 : 18}px 18px`
              : `${msg.isFirst ? 18 : 4}px 18px 18px ${msg.isLast ? 4 : 18}px`,
            boxShadow: isOwn ? 'none' : '0 1px 2px rgba(0,0,0,0.08)',
            border: !isOwn && !isWhisper ? '1px solid #E4E6EB' : 'none',
          }}>
            {isWhisper && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, opacity: 0.75 }}>
                <Lock size={9} color={isOwn ? 'white' : '#0D7377'} />
                <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 10, fontWeight: 700, color: isOwn ? 'white' : '#0D7377', textTransform: 'uppercase', letterSpacing: 0.5 }}>Whisper</span>
              </div>
            )}
            {msg.tag_user_id && (
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 13, fontWeight: 700, color: isOwn ? 'rgba(255,255,255,0.85)' : '#0D7377', marginRight: 4 }}>
                @{msg.tagged?.display_name}
              </span>
            )}
            <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 15, lineHeight: 1.4, wordBreak: 'break-word' }}>
              {msg.content}
            </span>
          </div>

          {/* Delete — own messages only, on hover */}
          {isOwn && hovered && (
            <button
              onClick={() => onDelete(msg.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#BCC0C4', display: 'flex', padding: 4,
                transition: 'color 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#E41E3F'}
              onMouseLeave={e => e.currentTarget.style.color = '#BCC0C4'}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {/* Timestamp — only on last in group */}
        {msg.isLast && (
          <span style={{
            fontFamily: '"Instrument Sans", system-ui', fontSize: 10, color: '#BCC0C4',
            marginLeft: isOwn ? 0 : 12, marginRight: isOwn ? 4 : 0,
          }}>
            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  )
}
