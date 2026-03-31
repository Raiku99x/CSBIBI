import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNavVisibility } from '../components/Layout'
import { formatDistanceToNow } from 'date-fns'
import {
  Send, Trash2, AtSign, Loader2,
  ArrowLeft, Search, X, Check, CheckCheck, Users, Plus
} from 'lucide-react'
import toast from 'react-hot-toast'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','922B21','C0392B']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

const RED  = '#C0392B'
const BLUE = '#1A5276'
const DESKTOP_BP = 1024

const isTouchDevice = () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

// ── Inbox ─────────────────────────────────────────────────────────────────
function Inbox({ onOpenGroup, onOpenDM, currentUserId }) {
  const [dmConvos, setDmConvos]       = useState([])
  const [allUsers, setAllUsers]       = useState([])
  const [latestGroup, setLatestGroup] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [showNew, setShowNew]         = useState(false)

  const refresh = useCallback(async () => {
    const { data: dmRows } = await supabase
      .from('direct_messages')
      .select('*, sender:profiles!direct_messages_sender_id_fkey(*), receiver:profiles!direct_messages_receiver_id_fkey(*)')
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false })

    const seen = new Map()
    for (const msg of dmRows || []) {
      const pid = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id
      if (!seen.has(pid)) seen.set(pid, msg)
    }

    const { data: unread } = await supabase
      .from('direct_messages').select('sender_id')
      .eq('receiver_id', currentUserId).eq('is_read', false)
    const unreadMap = {}
    for (const r of unread || []) unreadMap[r.sender_id] = (unreadMap[r.sender_id] || 0) + 1

    setDmConvos(
      Array.from(seen.entries()).map(([pid, msg]) => ({
        partnerId: pid,
        partner: msg.sender_id === currentUserId ? msg.receiver : msg.sender,
        lastMsg: msg,
        unread: unreadMap[pid] || 0,
      }))
    )

    const { data: gc } = await supabase
      .from('chat')
      .select('*, sender:profiles!chat_sender_id_fkey(*)')
      .order('created_at', { ascending: false })
      .limit(1)
    if (gc?.[0]) setLatestGroup(gc[0])
    setLoading(false)
  }, [currentUserId])

  useEffect(() => {
    refresh()
    supabase.from('profiles').select('id, display_name, avatar_url, email')
      .neq('id', currentUserId).then(({ data }) => { if (data) setAllUsers(data) })

    const ch = supabase.channel('inbox-' + currentUserId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat' }, refresh)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [refresh, currentUserId])

  const q = search.toLowerCase()
  const filteredDMs  = dmConvos.filter(c => c.partner?.display_name?.toLowerCase().includes(q))
  const newableUsers = allUsers.filter(u =>
    u.display_name?.toLowerCase().includes(q) && !dmConvos.find(c => c.partnerId === u.id)
  )
  const groupVisible = !search || 'class chat'.includes(q)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #E4E6EB', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 20, color: '#050505' }}>Messages</span>
        <button onClick={() => setShowNew(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, background: showNew ? '#FADBD8' : '#F0F2F5', border: `1.5px solid ${showNew ? '#F5B7B1' : '#E4E6EB'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
          {showNew ? <X size={14} color={RED} /> : <Plus size={14} color="#65676B" strokeWidth={2.5} />}
          <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13, color: showNew ? RED : '#65676B' }}>Add Conversation</span>
        </button>
      </div>

      <div style={{ padding: '10px 12px 6px', background: 'white', borderBottom: '1px solid #F0F2F5', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0F2F5', borderRadius: 20, padding: '0 12px', height: 36 }}>
          <Search size={14} color="#8A8D91" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages…"
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: '"Instrument Sans", system-ui', fontSize: 13.5, color: '#050505' }} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={13} color="#8A8D91" /></button>}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: '#F0F2F5' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader2 size={22} color={RED} style={{ animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <>
            {showNew && newableUsers.length > 0 && (
              <div>
                <SectionLabel label="Start a conversation" />
                {newableUsers.map(u => (
                  <ConvoRow key={u.id} avatar={u.avatar_url || dicebearUrl(u.display_name)} name={u.display_name} preview="Tap to message" onClick={() => onOpenDM(u)} />
                ))}
                <Divider />
              </div>
            )}
            {groupVisible && (
              <>
                <SectionLabel label="Group" />
                <button onClick={onOpenGroup} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', background: 'white', borderBottom: '1px solid #F0F2F5', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F7F8FA'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, background: 'linear-gradient(135deg, #0084FF 0%, #0D7377 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,132,255,0.2)' }}>
                    <Users size={20} color="white" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 14.5, color: '#050505' }}>Class Chat</span>
                      {latestGroup && <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 11, color: '#BCC0C4', flexShrink: 0 }}>{formatDistanceToNow(new Date(latestGroup.created_at), { addSuffix: false })}</span>}
                    </div>
                    <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#8A8D91', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {latestGroup ? (latestGroup.sender_id === currentUserId ? `You: ${latestGroup.content}` : `${latestGroup.sender?.display_name}: ${latestGroup.content}`) : 'Group chat for the whole class'}
                    </p>
                  </div>
                </button>
                <Divider />
              </>
            )}
            {filteredDMs.length > 0 && <SectionLabel label="Direct Messages" />}
            {filteredDMs.map(c => (
              <ConvoRow key={c.partnerId}
                avatar={c.partner?.avatar_url || dicebearUrl(c.partner?.display_name)}
                name={c.partner?.display_name}
                preview={c.lastMsg ? (c.lastMsg.sender_id === currentUserId ? `You: ${c.lastMsg.content}` : c.lastMsg.content) : ''}
                timestamp={c.lastMsg?.created_at}
                unread={c.unread}
                onClick={() => onOpenDM(c.partner)}
              />
            ))}
            {!showNew && filteredDMs.length === 0 && !groupVisible && (
              <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
                <p style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 700, fontSize: 16, color: '#050505', margin: '0 0 4px' }}>No conversations</p>
                <p style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 13.5, color: '#65676B', margin: 0 }}>Tap + to start a new message</p>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function SectionLabel({ label }) {
  return (
    <div style={{ padding: '8px 14px 4px' }}>
      <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700, color: '#8A8D91', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</span>
    </div>
  )
}
function Divider() { return <div style={{ height: 6, background: '#E9EBEE' }} /> }

function ConvoRow({ avatar, name, preview, timestamp, unread = 0, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', background: 'white', borderBottom: '1px solid #F0F2F5', transition: 'background 0.12s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F7F8FA'}
      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img src={avatar} style={{ width: 46, height: 46, borderRadius: 14, objectFit: 'cover', display: 'block' }} alt="" />
        {unread > 0 && (
          <div style={{ position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, background: RED, color: 'white', fontSize: 10, fontWeight: 700, fontFamily: '"Instrument Sans", system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid white' }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: unread > 0 ? 700 : 600, fontSize: 14.5, color: '#050505', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          {timestamp && <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 11, color: '#BCC0C4', flexShrink: 0 }}>{formatDistanceToNow(new Date(timestamp), { addSuffix: false })}</span>}
        </div>
        {preview && (
          <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: unread > 0 ? '#1c1e21' : '#8A8D91', fontWeight: unread > 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {preview}
          </p>
        )}
      </div>
    </button>
  )
}

// ── ClassChat ─────────────────────────────────────────────────────────────
function ClassChat({ onBack, currentUser, profile }) {
  const [messages, setMessages]       = useState([])
  const [users, setUsers]             = useState([])
  const [text, setText]               = useState('')
  const [tagUser, setTagUser]         = useState(null)
  const [tagPublic, setTagPublic]     = useState(true)
  const [showTagMenu, setShowTagMenu] = useState(false)
  const [sending, setSending]         = useState(false)
  const [loading, setLoading]         = useState(true)
  const bottomRef  = useRef()
  const tagMenuRef = useRef()
  const inputRef   = useRef()

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat')
      .select('*, sender:profiles!chat_sender_id_fkey(*), tagged:profiles!chat_tag_user_id_fkey(*)')
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMessages()
    supabase.from('profiles').select('id, display_name, avatar_url')
      .neq('id', currentUser.id).then(({ data }) => { if (data) setUsers(data) })

    const ch = supabase.channel('class-chat-msg')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat' }, async (payload) => {
        const { data } = await supabase.from('chat')
          .select('*, sender:profiles!chat_sender_id_fkey(*), tagged:profiles!chat_tag_user_id_fkey(*)')
          .eq('id', payload.new.id).single()
        if (data) setMessages(prev => [...prev, data])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat' },
        (payload) => setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetchMessages, currentUser.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

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
      const { data: inserted, error } = await supabase.from('chat').insert({
        sender_id: currentUser.id,
        content: text.trim(),
        is_whisper: false,
        is_deleted: false,
        receiver_id: null,
        tag_user_id: tagUser ? tagUser.id : null,
        tag_public: tagUser ? tagPublic : null,
      }).select('id').single()
      if (error) throw error

      if (tagUser && tagPublic) {
        await supabase.from('notifications').insert({ user_id: tagUser.id, chat_message_id: inserted.id, type: 'tag', message: `🏷️ ${profile?.display_name} mentioned you in chat`, is_read: false })
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
    await supabase.from('chat').update({ is_deleted: true }).eq('id', id).eq('sender_id', currentUser.id)
  }

  const grouped = messages.map((msg, i) => ({
    ...msg,
    isFirst: i === 0 || messages[i - 1].sender_id !== msg.sender_id,
    isLast: i === messages.length - 1 || messages[i + 1].sender_id !== msg.sender_id,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexShrink: 0, position: 'sticky', top: 0, zIndex: 20, background: 'white', borderBottom: '1px solid #E4E6EB', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: RED, padding: '4px 4px 4px 0' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: 'linear-gradient(135deg, #0084FF 0%, #0D7377 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={18} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 14.5, color: '#050505' }}>Class Chat</p>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#22C55E', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
            {users.length + 1} members · Live
          </p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 4px', display: 'flex', flexDirection: 'column', gap: 2, background: '#E9EBEE' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Loader2 size={26} color={RED} style={{ animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ fontSize: 44 }}>💬</div>
            <p style={{ fontFamily: '"Instrument Sans", system-ui', color: '#65676B', fontSize: 14, margin: 0 }}>No messages yet — say hello!</p>
          </div>
        ) : grouped.map(m => (
          <GroupBubble key={m.id} msg={m} currentUserId={currentUser.id} onDelete={deleteMessage} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ flexShrink: 0, background: 'white', borderTop: '1px solid #E4E6EB', padding: '8px 10px' }}>
        {tagUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, marginBottom: 8, background: '#F0F2F5', border: '1px solid #DADDE1' }}>
            <AtSign size={12} color="#65676B" />
            <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 600, color: '#050505', flex: 1 }}>Tagging @{tagUser.display_name}</span>
            <button onClick={() => setTagPublic(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', fontSize: 11, fontFamily: '"Instrument Sans", system-ui', fontWeight: 600 }}>{tagPublic ? 'Public' : 'Private'}</button>
            <button onClick={() => setTagUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={13} color="#65676B" /></button>
          </div>
        )}
        <form onSubmit={send} style={{ display: 'flex', alignItems: 'flex-end', gap: 7 }}>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0, paddingBottom: 5 }}>
            <div ref={tagMenuRef} style={{ position: 'relative' }}>
              <IconBtn active={!!tagUser} onClick={() => setShowTagMenu(t => !t)} title="Tag someone">
                <AtSign size={19} />
              </IconBtn>
              {showTagMenu && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, width: 230, background: 'white', borderRadius: 12, border: '1px solid #E4E6EB', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 50, animation: 'slideUp 0.18s ease' }}>
                  <p style={{ margin: 0, padding: '10px 14px 6px', fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tag someone</p>
                  {users.length === 0
                    ? <p style={{ margin: 0, padding: '10px 14px 12px', fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#BCC0C4' }}>No other members yet</p>
                    : users.map(u => (
                      <button key={u.id} type="button" onClick={() => { setTagUser(u); setShowTagMenu(false) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left', fontFamily: '"Instrument Sans", system-ui', fontSize: 13.5, color: '#050505', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F0F2F5'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <img src={u.avatar_url || dicebearUrl(u.display_name)} style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} alt="" />
                        <span style={{ fontWeight: 600 }}>{u.display_name}</span>
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, background: '#F0F2F5', borderRadius: 22, padding: '8px 14px' }}>
            <textarea ref={inputRef} rows={1} value={text}
              onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !isTouchDevice()) { e.preventDefault(); send(e) } }}
              onFocus={() => { setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 300) }}
              placeholder="Message the class…"
              style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontFamily: '"Instrument Sans", system-ui', fontSize: 14.5, color: '#050505', resize: 'none', lineHeight: 1.4, maxHeight: 100, overflow: 'hidden', display: 'block' }}
            />
          </div>

          <button type="submit" disabled={sending || !text.trim()}
            style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: text.trim() ? '#0084FF' : '#E4E6EB', border: 'none', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, transform 0.1s' }}
            onMouseDown={e => { if (text.trim()) e.currentTarget.style.transform = 'scale(0.92)' }}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
            {sending ? <Loader2 size={16} color="white" style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={16} color={text.trim() ? 'white' : '#BCC0C4'} />}
          </button>
        </form>
      </div>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  )
}

function GroupBubble({ msg, currentUserId, onDelete }) {
  const [hovered, setHovered] = useState(false)
  if (msg.is_deleted) {
    return (
      <div style={{ display: 'flex', justifyContent: msg.sender_id === currentUserId ? 'flex-end' : 'flex-start', padding: '1px 0' }}>
        <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#8A8D91', fontStyle: 'italic', background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: 16 }}>
          {msg.sender_id === currentUserId ? 'You' : msg.sender?.display_name} deleted a message
        </span>
      </div>
    )
  }
  const isOwn = msg.sender_id === currentUserId
  return (
    <div style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 5, padding: '1px 0', marginTop: msg.isFirst ? 10 : 0 }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {!isOwn && (
        <div style={{ width: 26, flexShrink: 0 }}>
          {msg.isLast && <img src={msg.sender?.avatar_url || dicebearUrl(msg.sender?.display_name)} style={{ width: 26, height: 26, borderRadius: 8, objectFit: 'cover', display: 'block' }} alt="" />}
        </div>
      )}
      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap: 2 }}>
        {!isOwn && msg.isFirst && <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 600, color: '#65676B', marginLeft: 10 }}>{msg.sender?.display_name}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexDirection: isOwn ? 'row-reverse' : 'row' }}>
          <div style={{ padding: '8px 13px', background: isOwn ? '#0084FF' : 'white', color: isOwn ? 'white' : '#050505', borderRadius: isOwn ? `18px ${msg.isFirst ? 18 : 4}px ${msg.isLast ? 4 : 18}px 18px` : `${msg.isFirst ? 18 : 4}px 18px 18px ${msg.isLast ? 4 : 18}px`, boxShadow: isOwn ? 'none' : '0 1px 2px rgba(0,0,0,0.08)', border: !isOwn ? '1px solid #E4E6EB' : 'none' }}>
            {msg.tag_user_id && <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 13, fontWeight: 700, color: isOwn ? 'rgba(255,255,255,0.85)' : '#0D7377', marginRight: 4 }}>@{msg.tagged?.display_name}</span>}
            <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 14.5, lineHeight: 1.4, wordBreak: 'break-word' }}>{msg.content}</span>
          </div>
          {isOwn && hovered && (
            <button onClick={() => onDelete(msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#BCC0C4', display: 'flex', padding: 3, transition: 'color 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.color = RED} onMouseLeave={e => e.currentTarget.style.color = '#BCC0C4'}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
        {msg.isLast && <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 10, color: '#BCC0C4', marginLeft: isOwn ? 0 : 10, marginRight: isOwn ? 3 : 0 }}>{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>}
      </div>
    </div>
  )
}

// ── DMConversation ────────────────────────────────────────────────────────
function DMConversation({ partner, currentUserId, onBack }) {
  const [messages, setMessages] = useState([])
  const [text, setText]         = useState('')
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState(false)
  const bottomRef = useRef()
  const inputRef  = useRef()

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('direct_messages')
      .select('*, sender:profiles!direct_messages_sender_id_fkey(*)')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
    setLoading(false)
    await supabase.from('direct_messages').update({ is_read: true })
      .eq('sender_id', partner.id).eq('receiver_id', currentUserId).eq('is_read', false)
  }, [currentUserId, partner.id])

  useEffect(() => {
    fetchMessages()
    const ch = supabase.channel(`dm-${[currentUserId, partner.id].sort().join('-')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, async (payload) => {
        const msg = payload.new
        const relevant = (msg.sender_id === currentUserId && msg.receiver_id === partner.id) || (msg.sender_id === partner.id && msg.receiver_id === currentUserId)
        if (!relevant) return
        const { data } = await supabase.from('direct_messages').select('*, sender:profiles!direct_messages_sender_id_fkey(*)').eq('id', msg.id).single()
        if (data) {
          setMessages(prev => [...prev, data])
          if (data.receiver_id === currentUserId)
            await supabase.from('direct_messages').update({ is_read: true }).eq('id', data.id)
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages' },
        (payload) => setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetchMessages, currentUserId, partner.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    const content = text.trim()
    setText('')
    try {
      const { error } = await supabase.from('direct_messages').insert({ sender_id: currentUserId, receiver_id: partner.id, content, is_read: false })
      if (error) throw error
    } catch (err) {
      toast.error(err.message)
      setText(content)
    } finally {
      setSending(false)
    }
  }

  async function deleteMsg(id) {
    await supabase.from('direct_messages').update({ is_deleted: true }).eq('id', id).eq('sender_id', currentUserId)
  }

  const grouped = messages.map((msg, i) => ({
    ...msg,
    isFirst: i === 0 || messages[i - 1].sender_id !== msg.sender_id,
    isLast: i === messages.length - 1 || messages[i + 1].sender_id !== msg.sender_id,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexShrink: 0, position: 'sticky', top: 0, zIndex: 20, background: 'white', borderBottom: '1px solid #E4E6EB', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: RED, padding: '4px 4px 4px 0' }}>
          <ArrowLeft size={20} />
        </button>
        <img src={partner.avatar_url || dicebearUrl(partner.display_name)} style={{ width: 38, height: 38, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }} alt="" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 14.5, color: '#050505', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{partner.display_name}</p>
          <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#8A8D91' }}>{partner.email}</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px 4px', display: 'flex', flexDirection: 'column', gap: 2, background: '#E9EBEE' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Loader2 size={24} color={RED} style={{ animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <img src={partner.avatar_url || dicebearUrl(partner.display_name)} style={{ width: 60, height: 60, borderRadius: 18, objectFit: 'cover' }} alt="" />
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 700, fontSize: 16, color: '#050505' }}>{partner.display_name}</p>
              <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 13.5, color: '#8A8D91' }}>Send a message to start chatting</p>
            </div>
          </div>
        ) : grouped.map(msg => (
          <DMBubble key={msg.id} msg={msg} isOwn={msg.sender_id === currentUserId} onDelete={deleteMsg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ flexShrink: 0, background: 'white', borderTop: '1px solid #E4E6EB', padding: '8px 10px' }}>
        <form onSubmit={send} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ flex: 1, background: '#F0F2F5', borderRadius: 22, padding: '8px 14px' }}>
            <textarea ref={inputRef} rows={1} value={text}
              onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !isTouchDevice()) { e.preventDefault(); send(e) } }}
              onFocus={() => { setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 300) }}
              placeholder={`Message ${partner.display_name}…`}
              style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontFamily: '"Instrument Sans", system-ui', fontSize: 14.5, color: '#050505', resize: 'none', lineHeight: 1.4, maxHeight: 120, overflow: 'hidden', display: 'block' }}
            />
          </div>
          <button type="submit" disabled={sending || !text.trim()}
            style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: text.trim() ? RED : '#E4E6EB', border: 'none', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, transform 0.1s', boxShadow: text.trim() ? '0 2px 8px rgba(192,57,43,0.3)' : 'none' }}
            onMouseDown={e => { if (text.trim()) e.currentTarget.style.transform = 'scale(0.92)' }}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
            {sending ? <Loader2 size={17} color="white" style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={16} color={text.trim() ? 'white' : '#BCC0C4'} />}
          </button>
        </form>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function DMBubble({ msg, isOwn, onDelete }) {
  const [hovered, setHovered] = useState(false)
  if (msg.is_deleted) {
    return (
      <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', padding: '1px 0' }}>
        <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#8A8D91', fontStyle: 'italic', background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: 16 }}>
          {isOwn ? 'You deleted a message' : 'Message deleted'}
        </span>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 5, padding: '1px 0', marginTop: msg.isFirst ? 8 : 0 }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {!isOwn && (
        <div style={{ width: 26, flexShrink: 0 }}>
          {msg.isLast && <img src={msg.sender?.avatar_url || dicebearUrl(msg.sender?.display_name)} style={{ width: 26, height: 26, borderRadius: 8, objectFit: 'cover', display: 'block' }} alt="" />}
        </div>
      )}
      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexDirection: isOwn ? 'row-reverse' : 'row' }}>
          <div style={{ padding: '9px 13px', background: isOwn ? RED : 'white', color: isOwn ? 'white' : '#050505', borderRadius: isOwn ? `18px ${msg.isFirst ? 18 : 4}px ${msg.isLast ? 4 : 18}px 18px` : `${msg.isFirst ? 18 : 4}px 18px 18px ${msg.isLast ? 4 : 18}px`, boxShadow: isOwn ? '0 2px 8px rgba(192,57,43,0.22)' : '0 1px 2px rgba(0,0,0,0.08)', border: !isOwn ? '1px solid #E4E6EB' : 'none' }}>
            <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 14.5, lineHeight: 1.45, wordBreak: 'break-word' }}>{msg.content}</span>
          </div>
          {isOwn && hovered && (
            <button onClick={() => onDelete(msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#BCC0C4', display: 'flex', padding: 3 }}
              onMouseEnter={e => e.currentTarget.style.color = RED} onMouseLeave={e => e.currentTarget.style.color = '#BCC0C4'}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
        {msg.isLast && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: isOwn ? 0 : 10, marginRight: isOwn ? 2 : 0 }}>
            <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 10, color: '#BCC0C4' }}>{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
            {isOwn && (msg.is_read ? <CheckCheck size={12} color={BLUE} /> : <Check size={12} color="#BCC0C4" />)}
          </div>
        )}
      </div>
    </div>
  )
}

function IconBtn({ onClick, active, children, title }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button type="button" onClick={onClick} title={title}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', background: active ? '#E6F4F4' : hovered ? '#F0F2F5' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#0D7377' : '#65676B', transition: 'background 0.12s, color 0.12s' }}>
      {children}
    </button>
  )
}

// ── Main export ───────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { user, profile } = useAuth()
  const { setHideNav } = useNavVisibility()
  const [view, setView] = useState('inbox')

  // FIX #9: detect desktop so we don't subtract non-existent bottom nav height
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= DESKTOP_BP)
  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth >= DESKTOP_BP)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const isChat = view !== 'inbox'

  useEffect(() => {
    setHideNav(isChat)
    return () => setHideNav(false)
  }, [isChat, setHideNav])

  // FIX #9: on desktop there is no bottom nav, so don't subtract its 52px from inbox height
  const pageHeight = isChat || isDesktop
    ? 'calc(100dvh - 52px)'
    : 'calc(100dvh - 52px - 52px)'

  function goToChat(dest) { setView(dest) }
  function goBack()       { setView('inbox') }

  return (
    <div style={{ height: pageHeight, display: 'flex', flexDirection: 'column' }}>
      {view === 'inbox' ? (
        <Inbox currentUserId={user.id} onOpenGroup={() => goToChat('group')} onOpenDM={partner => goToChat({ type: 'dm', partner })} />
      ) : view === 'group' ? (
        <ClassChat onBack={goBack} currentUser={user} profile={profile} />
      ) : (
        <DMConversation partner={view.partner} currentUserId={user.id} onBack={goBack} />
      )}
    </div>
  )
}
