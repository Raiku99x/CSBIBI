import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useMuteGate } from '../hooks/useMuteGate'
import { useDarkMode } from '../contexts/DarkModeContext'
import { formatDistanceToNow } from 'date-fns'
import { X, Send, Loader2, Trash2, MicOff, MessageCircle } from 'lucide-react'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','922B21','C0392B']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

const RED = '#C0392B'

export default function CommentsSheet({ postId, onClose, onCommentCountChange }) {
  const { user, profile } = useAuth()
  const { effectivelyMuted, getMuteMessage } = useMuteGate()
  const { colors } = useDarkMode()
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const inputRef = useRef()
  const bottomRef = useRef()

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles!comments_author_id_fkey(*)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (data) setComments(data)
    setLoading(false)
  }, [postId])

  useEffect(() => {
    fetchComments()
    const ch = supabase.channel('comments-' + postId)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'comments', filter:`post_id=eq.${postId}` }, async (payload) => {
        const { data } = await supabase.from('comments').select('*, profiles!comments_author_id_fkey(*)').eq('id', payload.new.id).single()
        if (data) { setComments(prev => [...prev, data]); onCommentCountChange?.(c => c + 1) }
      })
      .on('postgres_changes', { event:'DELETE', schema:'public', table:'comments', filter:`post_id=eq.${postId}` }, (payload) => {
        setComments(prev => prev.filter(c => c.id !== payload.old.id))
        onCommentCountChange?.(c => Math.max(0, c - 1))
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetchComments, postId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments])

  // Scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim() || effectivelyMuted) return
    setSending(true)
    const content = text.trim()
    setText('')
    try {
      const { error } = await supabase.from('comments').insert({ post_id: postId, author_id: user.id, content })
      if (error) throw error
      const { data: postRow } = await supabase.from('posts').select('author_id, caption').eq('id', postId).single()
      if (postRow?.author_id && postRow.author_id !== user.id) {
        const commenterName = profile?.display_name || 'Someone'
        await supabase.from('notifications').insert({
          user_id: postRow.author_id, post_id: postId, type: 'comment',
          message: `${commenterName} commented on your post "${postRow.caption?.slice(0,40)||'No caption'}…" — "${content.slice(0,50)}${content.length>50?'…':''}"`,
          is_read: false,
        })
      }
    } catch (err) { setText(content); console.error(err) }
    finally { setSending(false); inputRef.current?.focus() }
  }

  async function handleDelete(commentId) {
    await supabase.from('comments').delete().eq('id', commentId).eq('author_id', user.id)
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:60,background:'rgba(0,0,0,0.5)',animation:'cssFadeIn 0.2s ease' }}/>

      {/* Sheet */}
      <div style={{
        position:'fixed',
        bottom:0,
        left:'50%',
        transform:'translateX(-50%)',
        width:'100%',
        maxWidth:680,
        zIndex:61,
        background:colors.cardBg,
        borderRadius:'16px 16px 0 0',
        boxShadow:'0 -4px 32px rgba(0,0,0,0.25)',
        display:'flex',
        flexDirection:'column',
        maxHeight:'80vh',
        animationName:'cssSheetUp',
        animationDuration:'0.28s',
        animationTimingFunction:'cubic-bezier(0.16,1,0.3,1)',
        animationFillMode:'both',
      }}>
        {/* Drag handle */}
        <div style={{ display:'flex',justifyContent:'center',padding:'10px 0 4px' }}>
          <div style={{ width:36,height:4,borderRadius:2,background:colors.border }}/>
        </div>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 16px 12px',borderBottom:`1px solid ${colors.border}` }}>
          <span style={{ fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:16,color:colors.textPri }}>
            Comments {comments.length > 0 && <span style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:14,color:colors.textSec }}>· {comments.length}</span>}
          </span>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:'50%',background:colors.surface,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <X size={15} color={colors.textSec}/>
          </button>
        </div>

        {/* Comments list */}
        <div style={{ flex:1,overflowY:'auto',padding:'12px 16px',display:'flex',flexDirection:'column',gap:14 }}>
          {loading ? (
            <div style={{ display:'flex',justifyContent:'center',padding:32 }}>
              <Loader2 size={22} color={RED} style={{ animation:'cssSpin 0.8s linear infinite' }}/>
            </div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign:'center',padding:'32px 0' }}>
              <div style={{ display:'flex',justifyContent:'center',marginBottom:8 }}>
                <MessageCircle size={36} color={colors.textMut}/>
              </div>
              <p style={{ fontFamily:'"Instrument Sans",system-ui',fontSize:14,color:colors.textSec,margin:0 }}>No comments yet — be the first!</p>
            </div>
          ) : (
            comments.map(comment => (
              <CommentRow
                key={comment.id}
                comment={comment}
                isOwn={comment.author_id === user.id}
                onDelete={() => handleDelete(comment.id)}
                colors={colors}
              />
            ))
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input area */}
        <div style={{ borderTop:`1px solid ${colors.border}`,paddingBottom:'calc(10px + env(safe-area-inset-bottom))',background:colors.cardBg }}>
          {effectivelyMuted ? (
            <div style={{ margin:'10px 12px',padding:'12px 14px',background:'rgba(230,81,0,0.1)',border:'1px solid rgba(230,81,0,0.3)',borderRadius:12,display:'flex',alignItems:'center',gap:10 }}>
              <MicOff size={18} color="#E65100" style={{ flexShrink:0 }}/>
              <div>
                <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,color:'#E65100' }}>You are muted</p>
                <p style={{ margin:'2px 0 0',fontFamily:'"Instrument Sans",system-ui',fontSize:12,color:'#BF360C' }}>{getMuteMessage()}</p>
              </div>
            </div>
          ) : (
            <div style={{ padding:'10px 12px' }}>
              <form onSubmit={handleSend} style={{ display:'flex',alignItems:'flex-end',gap:8 }}>
                <img
                  src={profile?.avatar_url || dicebearUrl(profile?.display_name)}
                  style={{ width:34,height:34,borderRadius:10,objectFit:'cover',flexShrink:0 }}
                  alt=""
                />
                <div style={{ flex:1,background:colors.surface,borderRadius:20,padding:'8px 14px',display:'flex',alignItems:'center' }}>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={text}
                    onChange={e => {
                      setText(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
                    placeholder="Write a comment…"
                    style={{
                      flex:1,border:'none',background:'transparent',outline:'none',
                      fontFamily:'"Instrument Sans",system-ui',fontSize:14.5,color:colors.textPri,
                      resize:'none',lineHeight:1.4,maxHeight:100,overflow:'hidden',display:'block',width:'100%',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  style={{
                    width:38,height:38,borderRadius:'50%',flexShrink:0,
                    background:text.trim()?RED:colors.surface,
                    border:'none',cursor:text.trim()?'pointer':'default',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    transition:'background 0.15s, transform 0.1s',
                    boxShadow:text.trim()?'0 2px 8px rgba(192,57,43,0.3)':'none',
                  }}
                  onMouseDown={e => { if (text.trim()) e.currentTarget.style.transform = 'scale(0.92)' }}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {sending
                    ? <Loader2 size={16} color="white" style={{ animation:'cssSpin 0.8s linear infinite' }}/>
                    : <Send size={15} color={text.trim()?'white':colors.textMut}/>
                  }
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes cssFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cssSpin   { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes cssSheetUp {
          from { margin-bottom: -80vh; opacity: 0; }
          to   { margin-bottom: 0;     opacity: 1; }
        }
      `}</style>
    </>
  )
}

function CommentRow({ comment, isOwn, onDelete, colors }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{ display:'flex',gap:10,alignItems:'flex-start' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={comment.profiles?.avatar_url || dicebearUrl(comment.profiles?.display_name)}
        style={{ width:34,height:34,borderRadius:10,objectFit:'cover',flexShrink:0 }}
        alt=""
      />
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ background:colors.surface,borderRadius:'4px 16px 16px 16px',padding:'8px 12px',display:'inline-block',maxWidth:'100%' }}>
          <p style={{ margin:'0 0 3px',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,color:colors.textPri }}>
            {comment.profiles?.display_name || 'Unknown'}
          </p>
          <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:14,color:colors.textPri,lineHeight:1.45,wordBreak:'break-word' }}>
            {comment.content}
          </p>
        </div>
        <p style={{ margin:'4px 0 0 4px',fontFamily:'"Instrument Sans",system-ui',fontSize:11,color:colors.textMut }}>
          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
        </p>
      </div>
      {isOwn && hovered && (
        <button
          onClick={onDelete}
          style={{ background:'none',border:'none',cursor:'pointer',color:colors.textMut,padding:'4px',display:'flex',flexShrink:0,transition:'color 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
          onMouseLeave={e => e.currentTarget.style.color = colors.textMut}
        >
          <Trash2 size={13}/>
        </button>
      )}
    </div>
  )
}
