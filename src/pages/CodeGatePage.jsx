import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Loader2, KeyRound, ArrowRight, LogOut, CheckCircle2, Mail } from 'lucide-react'
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
    const trimmed = code.trim().toLowerCase()
    if (!trimmed) { toast.error('Enter your student code'); return }

    setLoading(true)
    try {
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

      const { error: claimError } = await supabase
        .from('allowed_codes')
        .update({ is_used: true, user_id: user.id })
        .eq('id', codeRow.id)
        .eq('is_used', false)

      if (claimError) {
        toast.error('Code was just claimed by someone else. Try again.')
        setLoading(false)
        return
      }

      await updateProfile({
        display_name: codeRow.name,
        identifier:   codeRow.identifier,
        section:      codeRow.section,
        student_code: codeRow.code,
        is_verified:  true,
      })

      setSuccess(true)
      toast.success(`Welcome, ${codeRow.name}! 🎉`)

    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F0F2F5',padding:24 }}>
        <style>{`
          @keyframes fadeSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
          @keyframes pop{0%{transform:scale(0.7)}70%{transform:scale(1.12)}100%{transform:scale(1)}}
        `}</style>
        <div style={{ textAlign:'center',animation:'fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{ width:80,height:80,borderRadius:'50%',background:'#DCFCE7',border:'2.5px solid #86EFAC',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',animation:'pop 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
            <CheckCircle2 size={40} color="#16a34a"/>
          </div>
          <p style={{ fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:24,color:'#050505',margin:'0 0 8px' }}>You're in!</p>
          <p style={{ fontFamily:'"Instrument Sans",system-ui',fontSize:14,color:'#65676B',margin:0 }}>Setting up your account…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        @keyframes spin        { to{transform:rotate(360deg)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatA      { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(20px,-24px) scale(1.05)} 70%{transform:translate(-10px,14px) scale(0.97)} }
        @keyframes floatB      { 0%,100%{transform:translate(0,0) scale(1)} 35%{transform:translate(-18px,20px) scale(1.07)} 65%{transform:translate(12px,-10px) scale(0.95)} }
        .csb-input {
          width:100%;
          padding:14px 16px 14px 40px;
          border-radius:12px;
          border:2px solid #E4E6EB;
          background:#F7F8FA;
          font-family:'JetBrains Mono','Courier New',monospace;
          font-size:15px;
          font-weight:500;
          color:#050505;
          letter-spacing:0.02em;
          transition:border-color 0.15s,box-shadow 0.15s,background 0.15s;
          outline:none;
          -webkit-appearance:none;
          appearance:none;
        }
        .csb-input::placeholder{color:#C0C4CC;font-weight:400;letter-spacing:0;font-family:'Instrument Sans',system-ui;}
        .csb-input:focus{border-color:${RED}!important;box-shadow:0 0 0 4px rgba(192,57,43,0.12)!important;background:#fff!important;}
        .csb-btn{
          width:100%;display:flex;align-items:center;justify-content:center;
          gap:8px;padding:15px 0;border-radius:12px;border:none;
          font-family:'Instrument Sans',system-ui;font-weight:700;font-size:15px;
          letter-spacing:0.01em;transition:all 0.15s;cursor:pointer;
        }
        .csb-btn:active{transform:scale(0.97)!important;}
        @media(max-width:480px){
          .csb-outer{padding:14px!important;}
          .csb-card{padding:22px 18px 26px!important;border-radius:18px!important;}
          .csb-logo-img{width:60px!important;height:60px!important;border-radius:15px!important;}
          .csb-title{font-size:26px!important;}
          .csb-h1{font-size:19px!important;}
        }
      `}</style>

      <div className="csb-outer" style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24,position:'relative',overflow:'hidden',
        background:`radial-gradient(ellipse 70% 50% at 95% 5%,rgba(192,57,43,0.15) 0%,transparent 60%),radial-gradient(ellipse 60% 50% at 5% 90%,rgba(26,82,118,0.14) 0%,transparent 60%),#ECEEF2`
      }}>
        <div style={{ position:'absolute',top:-160,right:-120,width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle at 38% 38%,rgba(192,57,43,0.22) 0%,rgba(192,57,43,0.06) 45%,transparent 68%)',animation:'floatA 11s ease-in-out infinite',pointerEvents:'none'}}/>
        <div style={{ position:'absolute',bottom:-140,left:-40,width:460,height:460,borderRadius:'50%',background:'radial-gradient(circle at 50% 55%,rgba(26,82,118,0.20) 0%,rgba(26,82,118,0.06) 45%,transparent 68%)',animation:'floatB 13s ease-in-out infinite',pointerEvents:'none'}}/>
        <div style={{ position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'radial-gradient(rgba(100,100,140,0.055) 1px,transparent 1px)',backgroundSize:'22px 22px'}}/>

        <div style={{ width:'100%',maxWidth:420,position:'relative',zIndex:1,animation:'fadeSlideUp 0.45s cubic-bezier(0.16,1,0.3,1)' }}>

          {/* Logo */}
          <div style={{ textAlign:'center',marginBottom:22 }}>
            <div className="csb-logo-img" style={{ width:68,height:68,borderRadius:18,overflow:'hidden',margin:'0 auto 13px',border:'3px solid white',boxShadow:'0 8px 28px rgba(192,57,43,0.25),0 2px 8px rgba(0,0,0,0.08)' }}>
              <img src="/announce.png" alt="CSB" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
            </div>
            <div className="csb-title" style={{ fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:28,color:RED,letterSpacing:'-1.5px',lineHeight:1 }}>CSB</div>
            <div style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:10,color:BLUE,letterSpacing:'2px',textTransform:'uppercase',marginTop:4 }}>Computer Science Board</div>
          </div>

          {/* Card */}
          <div className="csb-card" style={{ background:'rgba(255,255,255,0.93)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',borderRadius:22,padding:'28px 26px 32px',boxShadow:'0 20px 60px rgba(0,0,0,0.11),0 4px 16px rgba(0,0,0,0.06)',border:'1px solid rgba(255,255,255,0.98)' }}>

            {/* Header row */}
            <div style={{ display:'flex',alignItems:'center',gap:13,marginBottom:22,paddingBottom:20,borderBottom:'1.5px solid #F0F2F5' }}>
              <div style={{ width:46,height:46,borderRadius:13,background:'linear-gradient(135deg,#FADBD8,#F5B7B1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 14px rgba(192,57,43,0.18)' }}>
                <KeyRound size={20} color={RED}/>
              </div>
              <div>
                <h1 className="csb-h1" style={{ margin:'0 0 4px',fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:20,color:'#050505',lineHeight:1.2 }}>
                  Student Verification
                </h1>
                <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:12.5,color:'#65676B',lineHeight:1.4 }}>
                  Signed in as <strong style={{ color:'#1a1a1a',fontWeight:600 }}>{profile?.email || user?.email}</strong>
                </p>
              </div>
            </div>

            {/* Tip banner */}
            <div style={{ display:'flex',alignItems:'center',gap:12,padding:'13px 15px',background:'linear-gradient(135deg,#FFFBEB,#FEF3C7)',border:'1.5px solid #FCD34D',borderRadius:13,marginBottom:18 }}>
              <div style={{ width:36,height:36,borderRadius:10,background:'#FEF08A',border:'1px solid #FCD34D',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:18 }}>
                💡
              </div>
              <div>
                <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:13,color:'#78350F',lineHeight:1.1 }}>
                  YOUR CODE IS YOUR CSPC EMAIL
                </p>
                <p style={{ margin:'3px 0 0',fontFamily:'"Instrument Sans",system-ui',fontSize:12,color:'#92400E',lineHeight:1.4 }}>
                  Use your <strong style={{ fontWeight:700 }}>@my.cspc.edu.ph</strong> address
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block',fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:11,color:'#666',letterSpacing:'0.6px',textTransform:'uppercase',marginBottom:8 }}>
                  Enter your code
                </label>
                <div style={{ position:'relative' }}>
                  <Mail size={15} color="#BCC0C4" style={{ position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }}/>
                  <input
                    className="csb-input"
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toLowerCase())}
                    placeholder="yourname@my.cspc.edu.ph"
                    maxLength={30}
                    autoFocus
                    spellCheck={false}
                    autoComplete="off"
                    autoCapitalize="none"
                    inputMode="email"
                  />
                </div>
                <p style={{ margin:'7px 0 0',fontFamily:'"Instrument Sans",system-ui',fontSize:11.5,color:'#C0C4CC' }}>
                  Not case-sensitive · Contact your admin if you need help
                </p>
              </div>

              <button
                className="csb-btn"
                type="submit"
                disabled={loading || !code.trim()}
                style={{ background:code.trim()?RED:'#E4E6EB',color:code.trim()?'white':'#BCC0C4',cursor:code.trim()?'pointer':'not-allowed',boxShadow:code.trim()?'0 6px 20px rgba(192,57,43,0.28)':'none',marginTop:4 }}
                onMouseEnter={e => { if(code.trim()) e.currentTarget.style.background='#A93226' }}
                onMouseLeave={e => { if(code.trim()) e.currentTarget.style.background=RED }}
              >
                {loading
                  ? <><Loader2 size={17} style={{ animation:'spin 0.8s linear infinite' }}/> Verifying…</>
                  : <><span>Verify Code</span><ArrowRight size={16}/></>
                }
              </button>
            </form>

            {/* Info */}
            <div style={{ marginTop:16,padding:'11px 14px',background:'#EBF5FB',borderRadius:11,border:'1px solid #AED6F1',display:'flex',gap:10,alignItems:'flex-start' }}>
              <span style={{ fontSize:15,flexShrink:0,marginTop:1 }}>ℹ️</span>
              <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:12,color:BLUE,lineHeight:1.55 }}>
                Each code is unique and can only be used <strong>once</strong>. Once verified, it will be permanently linked to your account.
              </p>
            </div>
          </div>

          {/* Sign out */}
          <div style={{ textAlign:'center',marginTop:18 }}>
            <button
              onClick={signOut}
              style={{ display:'inline-flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:12.5,color:'#9EA3A8',transition:'color 0.12s',padding:'6px 10px',borderRadius:8 }}
              onMouseEnter={e => e.currentTarget.style.color=RED}
              onMouseLeave={e => e.currentTarget.style.color='#9EA3A8'}
            >
              <LogOut size={13}/> Sign out and use a different account
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
