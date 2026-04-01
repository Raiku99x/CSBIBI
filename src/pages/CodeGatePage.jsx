import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Loader2, KeyRound, ArrowRight, LogOut, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

const RED  = '#C0392B'
const BLUE = '#1A5276'

export default function CodeGatePage() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const [code, setCode]       = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) { toast.error('Enter your student code'); return }

    setLoading(true)
    try {
      // 1. Find the code — must exist and be unused
      const { data: codeRow, error: findError } = await supabase
        .from('allowed_codes')
        .select('*')
        .eq('code', trimmed)
        .eq('is_used', false)
        .single()

      if (findError || !codeRow) {
        toast.error('Invalid or already used code. Contact your admin.')
        setLoading(false)
        return
      }

      // 2. Claim it — atomic update prevents race condition
      const { error: claimError } = await supabase
        .from('allowed_codes')
        .update({ is_used: true, user_id: user.id })
        .eq('id', codeRow.id)
        .eq('is_used', false)   // double-check: still unused

      if (claimError) {
        toast.error('Code was just claimed by someone else. Try again.')
        setLoading(false)
        return
      }

      // 3. Update profile with student info
      await updateProfile({
        display_name: codeRow.name,
        identifier:   codeRow.identifier,
        section:      codeRow.section,
        student_code: codeRow.code,
        is_verified:  true,
      })

      // 4. Show success briefly then App.jsx re-routes automatically
      setSuccess(true)
      toast.success(`Welcome, ${codeRow.name}! 🎉`)

    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ── Success state ─────────────────────────────────────────
  if (success) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F0F2F5', padding:24 }}>
        <div style={{ textAlign:'center', animation:'fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{ width:72,height:72,borderRadius:'50%',background:'#DCFCE7',border:'2px solid #86EFAC',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px' }}>
            <CheckCircle2 size={36} color="#16a34a"/>
          </div>
          <p style={{ fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:22,color:'#050505',margin:'0 0 6px' }}>
            You're in!
          </p>
          <p style={{ fontFamily:'"Instrument Sans",system-ui',fontSize:14,color:'#65676B',margin:0 }}>
            Setting up your account…
          </p>
        </div>
        <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes spin        { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatA      { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(24px,-28px) scale(1.06)} 70%{transform:translate(-12px,16px) scale(0.96)} }
        @keyframes floatB      { 0%,100%{transform:translate(0,0) scale(1)} 35%{transform:translate(-20px,22px) scale(1.08)} 65%{transform:translate(14px,-12px) scale(0.94)} }
        .code-input:focus { border-color:${RED} !important; box-shadow:0 0 0 3px rgba(192,57,43,0.15) !important; outline:none; }
      `}</style>

      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', overflow:'hidden',
        background:`
          radial-gradient(ellipse 60% 40% at 90% 10%, rgba(192,57,43,0.18) 0%, transparent 65%),
          radial-gradient(ellipse 55% 45% at 10% 85%, rgba(26,82,118,0.16) 0%, transparent 65%),
          #EEF0F3
        `
      }}>

        {/* Background blobs */}
        <div style={{ position:'absolute',top:-140,right:-100,width:460,height:460,borderRadius:'50%',background:'radial-gradient(circle at 38% 38%,rgba(192,57,43,0.28) 0%,rgba(192,57,43,0.08) 40%,transparent 68%)',animation:'floatA 10s ease-in-out infinite',pointerEvents:'none' }}/>
        <div style={{ position:'absolute',bottom:-120,left:20,width:420,height:420,borderRadius:'50%',background:'radial-gradient(circle at 50% 55%,rgba(26,82,118,0.24) 0%,rgba(26,82,118,0.08) 42%,transparent 68%)',animation:'floatB 12s ease-in-out infinite',pointerEvents:'none' }}/>
        <div style={{ position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'radial-gradient(rgba(100,100,140,0.07) 1px,transparent 1px)',backgroundSize:'20px 20px' }}/>

        <div style={{ width:'100%',maxWidth:400,position:'relative',zIndex:1,animation:'fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>

          {/* Logo */}
          <div style={{ textAlign:'center',marginBottom:28 }}>
            <div style={{ width:64,height:64,borderRadius:16,overflow:'hidden',margin:'0 auto 12px',border:'3px solid white',boxShadow:'0 4px 20px rgba(192,57,43,0.22)' }}>
              <img src="/announce.png" alt="CSB" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
            </div>
            <div style={{ fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:26,color:RED,letterSpacing:'-1px',lineHeight:1 }}>CSB</div>
            <div style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:10,color:BLUE,letterSpacing:'1.5px',textTransform:'uppercase',marginTop:3 }}>Computer Science Board</div>
          </div>

          {/* Card */}
          <div style={{ background:'rgba(255,255,255,0.9)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderRadius:20,padding:'28px 26px 32px',boxShadow:'0 16px 56px rgba(0,0,0,0.12),0 2px 12px rgba(0,0,0,0.07)',border:'1px solid rgba(255,255,255,0.95)' }}>

            {/* Icon + title */}
            <div style={{ marginBottom:24 }}>
              <div style={{ width:48,height:48,borderRadius:14,background:'linear-gradient(135deg,#FADBD8,#F5B7B1)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14,boxShadow:'0 4px 12px rgba(192,57,43,0.2)' }}>
                <KeyRound size={22} color={RED}/>
              </div>
              <h1 style={{ margin:'0 0 8px',fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:22,color:'#050505' }}>
                Enter your student code
              </h1>
              <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:13.5,color:'#65676B',lineHeight:1.55 }}>
                You're logged in as <strong style={{ color:'#050505' }}>{profile?.email || user?.email}</strong>.<br/>
                Enter the code provided by your administrator to continue.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:14 }}>
                <input
                  className="code-input"
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BSCS-001"
                  maxLength={20}
                  autoFocus
                  spellCheck={false}
                  autoComplete="off"
                  style={{ width:'100%',padding:'14px 16px',borderRadius:11,border:'1.5px solid #E4E6EB',background:'#F7F8FA',fontFamily:'"JetBrains Mono","Bricolage Grotesque",monospace',fontSize:18,fontWeight:700,color:'#050505',letterSpacing:'0.08em',textAlign:'center',transition:'all 0.15s',boxSizing:'border-box' }}
                />
                <p style={{ margin:'8px 0 0',fontFamily:'"Instrument Sans",system-ui',fontSize:11.5,color:'#BCC0C4',textAlign:'center' }}>
                  Codes are case-insensitive · Contact admin if you lost yours
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !code.trim()}
                style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px 0',borderRadius:11,border:'none',background:code.trim()?RED:'#E4E6EB',color:code.trim()?'white':'#BCC0C4',cursor:code.trim()?'pointer':'default',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:15.5,transition:'all 0.15s',boxShadow:code.trim()?'0 4px 16px rgba(192,57,43,0.32)':'none' }}
                onMouseEnter={e => { if(code.trim()) e.currentTarget.style.background='#922B21' }}
                onMouseLeave={e => { if(code.trim()) e.currentTarget.style.background=RED }}
                onMouseDown={e => { if(code.trim()) e.currentTarget.style.transform='scale(0.98)' }}
                onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
              >
                {loading
                  ? <><Loader2 size={17} style={{ animation:'spin 0.8s linear infinite' }}/> Verifying…</>
                  : <><span>Verify Code</span><ArrowRight size={16}/></>
                }
              </button>
            </form>

            {/* Info box */}
            <div style={{ marginTop:18,padding:'12px 14px',background:'#EBF5FB',borderRadius:10,border:'1px solid #AED6F1',display:'flex',gap:10,alignItems:'flex-start' }}>
              <span style={{ fontSize:16,flexShrink:0,marginTop:1 }}>ℹ️</span>
              <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:12.5,color:BLUE,lineHeight:1.55 }}>
                Each code is unique and can only be used once. Once verified, it will be permanently linked to your account.
              </p>
            </div>
          </div>

          {/* Sign out link */}
          <div style={{ textAlign:'center',marginTop:18 }}>
            <button
              onClick={signOut}
              style={{ display:'inline-flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:13,color:'#8A8D91',transition:'color 0.12s',padding:'4px 8px',borderRadius:8 }}
              onMouseEnter={e => e.currentTarget.style.color=RED}
              onMouseLeave={e => e.currentTarget.style.color='#8A8D91'}
            >
              <LogOut size={13}/> Sign out and use a different account
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
