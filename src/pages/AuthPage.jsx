import { useState } from 'react'
import { useDarkMode } from '../contexts/DarkModeContext'
import { useAuth } from '../contexts/AuthContext'
import { Mail, ArrowRight, Loader2, BookOpen, Bell, MessageSquare, FileText, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const RED   = '#C0392B'
const DARK  = '#922B21'
const BLUE  = '#1A5276'

const FEATURES = [
  { icon: <Bell size={15} />,        text: 'Class announcements & reminders' },
  { icon: <BookOpen size={15} />,    text: 'Subject materials & deadlines'   },
  { icon: <MessageSquare size={15}/>, text: 'Real-time group chat'            },
  { icon: <FileText size={15} />,    text: 'File & media sharing'            },
]

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

function startCooldownTimer(setResendCooldown, seconds = 180) {
  setResendCooldown(seconds)
  const timer = setInterval(() => {
    setResendCooldown(prev => {
      if (prev <= 1) { clearInterval(timer); return 0 }
      return prev - 1
    })
  }, 1000)
}

export default function AuthPage() {
  const [step, setStep]           = useState('choose')
  const [email, setEmail]         = useState('')
  const [otp, setOtp]             = useState(['', '', '', '', '', ''])
  const [loading, setLoading]     = useState(false)
  const [otpAttempts, setOtpAttempts] = useState(0)
  const [resendCooldown, setResendCooldown] = useState(0)
  const { signInWithGoogle, signInWithOTP, verifyOTP } = useAuth()
  const { dark, colors } = useDarkMode()

  async function handleGoogle() {
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed')
      setLoading(false)
    }
  }

  async function handleSendOTP(e) {
    e.preventDefault()
    if (!email.trim()) { toast.error('Enter your email'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Enter a valid email address')
      return
    }
    if (resendCooldown > 0) {
      toast.error(`Please wait ${Math.floor(resendCooldown / 60)}:${String(resendCooldown % 60).padStart(2, '0')} before resending.`)
      return
    }
    setLoading(true)
    try {
      await signInWithOTP(email.trim().toLowerCase())
      toast.success('Code sent! Check your email.')
      setStep('otp-verify')
      setOtpAttempts(0)
      startCooldownTimer(setResendCooldown, 180)
    } catch (err) {
      // Start cooldown even on Supabase rate limit error
      startCooldownTimer(setResendCooldown, 180)
      toast.error(err.message || 'Failed to send code')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault()
    const token = otp.join('')
    if (token.length !== 6) { toast.error('Enter the full 6-digit code'); return }

    if (otpAttempts >= 5) {
      toast.error('Too many failed attempts. Request a new code.', { duration: 5000 })
      setStep('otp-email')
      setOtpAttempts(0)
      setOtp(['','','','','',''])
      return
    }

    setLoading(true)
    try {
      await verifyOTP(email.trim().toLowerCase(), token)
    } catch (err) {
      const attemptsLeft = 4 - otpAttempts
      setOtpAttempts(a => a + 1)
      toast.error(attemptsLeft > 0
        ? `Invalid code. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`
        : 'Last attempt failed. Request a new code.'
      )
      setOtp(['', '', '', '', '', ''])
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(idx, val) {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[idx] = val
    setOtp(next)
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus()
    }
  }

  function handleOtpKeyDown(idx, e) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus()
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault()
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!paste) return
    const next = Array(6).fill('')
    paste.split('').forEach((ch, i) => { next[i] = ch })
    setOtp(next)
    document.getElementById(`otp-${Math.min(paste.length, 5)}`)?.focus()
  }

  return (
    <>
      <style>{`
        @keyframes spin       { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes floatA     { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(24px,-28px) scale(1.06)} 70%{transform:translate(-12px,16px) scale(0.96)} }
        @keyframes floatB     { 0%,100%{transform:translate(0,0) scale(1)} 35%{transform:translate(-20px,22px) scale(1.08)} 65%{transform:translate(14px,-12px) scale(0.94)} }
        @keyframes floatC     { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(16px,24px) scale(1.05)} }
        @keyframes floatD     { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-18px,-20px) scale(1.07)} }
        @keyframes fadeSlideUp{ from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

        .auth-page { min-height:100vh; display:flex; font-family:'Instrument Sans',system-ui,sans-serif; }

        .auth-left {
          display:none; flex:0 0 44%;
          background:linear-gradient(160deg,#7B241C 0%,#C0392B 42%,#1A5276 100%);
          flex-direction:column; justify-content:center;
          padding:56px 52px; position:relative; overflow:hidden;
        }
        .auth-left-dots {
          position:absolute; inset:0; pointer-events:none;
          background-image:radial-gradient(rgba(255,255,255,0.07) 1.5px,transparent 1.5px);
          background-size:26px 26px;
        }
        .auth-right {
          flex:1; position:relative; display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          padding:32px 20px; min-height:100vh; overflow:hidden;
          background:
            radial-gradient(ellipse 60% 40% at 90% 10%,rgba(192,57,43,0.22) 0%,transparent 65%),
            radial-gradient(ellipse 55% 45% at 10% 85%,rgba(26,82,118,0.2) 0%,transparent 65%),
            radial-gradient(ellipse 40% 35% at 85% 80%,rgba(192,57,43,0.14) 0%,transparent 60%),
            radial-gradient(ellipse 45% 40% at 15% 20%,rgba(26,82,118,0.12) 0%,transparent 60%),
            #EEF0F3;
        }
        .auth-right::before {
          content:''; position:absolute; inset:0; pointer-events:none; z-index:0;
          background-image:radial-gradient(rgba(100,100,140,0.09) 1px,transparent 1px);
          background-size:20px 20px;
        }
        .blob-1 { position:absolute; top:-140px; right:-100px; width:460px; height:460px; border-radius:50%; background:radial-gradient(circle at 38% 38%,rgba(192,57,43,0.32) 0%,rgba(192,57,43,0.12) 40%,transparent 68%); animation:floatA 10s ease-in-out infinite; pointer-events:none; }
        .blob-2 { position:absolute; bottom:-120px; right:20px; width:420px; height:420px; border-radius:50%; background:radial-gradient(circle at 50% 55%,rgba(26,82,118,0.30) 0%,rgba(26,82,118,0.10) 42%,transparent 68%); animation:floatB 12s ease-in-out infinite; pointer-events:none; }
        .blob-3 { position:absolute; top:30%; left:-80px; width:340px; height:340px; border-radius:50%; background:radial-gradient(circle at 60% 42%,rgba(192,57,43,0.20) 0%,rgba(192,57,43,0.06) 50%,transparent 68%); animation:floatC 14s ease-in-out infinite; pointer-events:none; }
        .blob-4 { position:absolute; top:10%; right:30%; width:240px; height:240px; border-radius:50%; background:radial-gradient(circle,rgba(26,82,118,0.18) 0%,transparent 68%); animation:floatD 16s ease-in-out infinite; pointer-events:none; }

        .auth-card { position:relative; z-index:1; animation:fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .auth-mobile-logo { display:flex; }
        .otp-input:focus { border-color:${RED} !important; box-shadow:0 0 0 3px rgba(192,57,43,0.15); }

        /* Dark mode overrides */
        ${dark ? `
          .auth-right {
            background:
              radial-gradient(ellipse 60% 40% at 90% 10%,rgba(192,57,43,0.28) 0%,transparent 65%),
              radial-gradient(ellipse 55% 45% at 10% 85%,rgba(26,82,118,0.24) 0%,transparent 65%),
              ${colors.pageBg} !important;
          }
          .auth-right::before {
            background-image:radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px) !important;
          }
        ` : ''}

        @media (min-width:900px) {
          .auth-left { display:flex; }
          .auth-mobile-logo { display:none; }
        }
      `}</style>

      <div className="auth-page">
        <div className="auth-left">
          <div className="auth-left-dots"/>
          <div style={{ position:'absolute',top:-80,right:-60,width:280,height:280,borderRadius:'50%',background:'rgba(255,255,255,0.06)',filter:'blur(45px)',pointerEvents:'none' }}/>
          <div style={{ position:'absolute',bottom:-60,left:-40,width:240,height:240,borderRadius:'50%',background:'rgba(26,82,118,0.35)',filter:'blur(55px)',pointerEvents:'none' }}/>
          <div style={{ position:'relative',zIndex:1 }}>
            <div style={{ display:'flex',alignItems:'center',gap:16,marginBottom:44 }}>
              <div style={{ width:62,height:62,borderRadius:16,overflow:'hidden',flexShrink:0,border:'2.5px solid rgba(255,255,255,0.3)',boxShadow:'0 4px 20px rgba(0,0,0,0.25)' }}>
                <img src="/announce.png" alt="CSB" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
              </div>
              <div>
                <div style={{ fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:38,color:'white',letterSpacing:'-1.5px',lineHeight:1 }}>CSB</div>
                <div style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:10.5,color:'rgba(255,255,255,0.6)',letterSpacing:'1.8px',textTransform:'uppercase',marginTop:3 }}>Computer Science Board</div>
              </div>
            </div>
            <p style={{ fontFamily:'"Instrument Sans",system-ui',fontSize:21,fontWeight:700,color:'white',lineHeight:1.45,margin:'0 0 10px' }}>
              Your official hub for CS class coordination.
            </p>
            <p style={{ fontFamily:'"Instrument Sans",system-ui',fontSize:14,color:'rgba(255,255,255,0.6)',lineHeight:1.65,margin:'0 0 40px',fontWeight:400 }}>
              Announcements, deadlines, materials, and class chat — all in one place.
            </p>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display:'flex',alignItems:'center',gap:13,padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ width:32,height:32,borderRadius:9,flexShrink:0,background:'rgba(255,255,255,0.18)',display:'flex',alignItems:'center',justifyContent:'center',color:'white' }}>{f.icon}</div>
                  <span style={{ fontFamily:'"Instrument Sans",system-ui',fontSize:13.5,color:'rgba(255,255,255,0.88)',fontWeight:500 }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="blob-1"/><div className="blob-2"/>
          <div className="blob-3"/><div className="blob-4"/>

          <div className="auth-mobile-logo" style={{ flexDirection:'column',alignItems:'center',gap:8,marginBottom:28,position:'relative',zIndex:1 }}>
            <div style={{ width:72,height:72,borderRadius:18,overflow:'hidden',border:'3px solid white',boxShadow:'0 4px 20px rgba(192,57,43,0.25)' }}>
              <img src="/announce.png" alt="CSB" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:28,color:RED,letterSpacing:'-1px' }}>CSB</div>
              <div style={{ fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:10,color:BLUE,letterSpacing:'1.5px',textTransform:'uppercase' }}>Computer Science Board</div>
            </div>
          </div>

          <div className="auth-card" style={{ width:'100%',maxWidth:420,background:dark?colors.cardBg:'rgba(255,255,255,0.88)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderRadius:20,padding:'32px 30px',boxShadow:'0 16px 56px rgba(0,0,0,0.14),0 2px 12px rgba(0,0,0,0.08)',border:dark?`1px solid ${colors.border}`:'1px solid rgba(255,255,255,0.95)' }}>

            {step === 'choose' && (
              <>
                <div style={{ textAlign:'center',marginBottom:28 }}>
                  <h1 style={{ margin:'0 0 6px',fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:24,color:colors.textPri }}>
                    Welcome to CSB 👋
                  </h1>
                  <p style={{ margin:0,fontSize:13.5,color:colors.textSec,fontFamily:'"Instrument Sans",system-ui' }}>
                    Sign in to access your class
                  </p>
                </div>

                <button onClick={handleGoogle} disabled={loading}
                  style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'13px 0',borderRadius:11,border:`1.5px solid ${colors.border}`,background:colors.cardBg,cursor:loading?'not-allowed':'pointer',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:15,color:colors.textPri,marginBottom:12,transition:'all 0.15s',boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}
                  onMouseEnter={e => { if(!loading){e.currentTarget.style.background=colors.surface;e.currentTarget.style.borderColor=colors.borderStrong}}}
                  onMouseLeave={e => { e.currentTarget.style.background=colors.cardBg;e.currentTarget.style.borderColor=colors.border }}>
                  {loading ? <Loader2 size={17} style={{ animation:'spin 0.8s linear infinite' }}/> : <GoogleIcon/>}
                  Continue with Google
                </button>

                <div style={{ display:'flex',alignItems:'center',gap:12,margin:'8px 0' }}>
                  <div style={{ flex:1,height:1,background:colors.border }}/>
                  <span style={{ color:colors.textMut,fontSize:12,fontFamily:'"Instrument Sans",system-ui' }}>or</span>
                  <div style={{ flex:1,height:1,background:colors.border }}/>
                </div>

                <button onClick={() => setStep('otp-email')}
                  style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'13px 0',borderRadius:11,border:'none',background:RED,cursor:'pointer',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:15,color:'white',marginTop:8,transition:'all 0.15s',boxShadow:'0 4px 16px rgba(192,57,43,0.32)' }}
                  onMouseEnter={e => e.currentTarget.style.background=DARK}
                  onMouseLeave={e => e.currentTarget.style.background=RED}>
                  <Mail size={17}/>
                  Continue with Email
                </button>

                <p style={{ textAlign:'center',fontSize:11.5,color:'#BCC0C4',margin:'20px 0 0',fontFamily:'"Instrument Sans",system-ui',lineHeight:1.6 }}>
                  By continuing, you agree to CSB's terms.<br/>
                  A student code is required after login.
                </p>
              </>
            )}

            {step === 'otp-email' && (
              <>
                <button onClick={() => setStep('choose')} style={{ display:'flex',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',color:colors.textSec,fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:13,marginBottom:20,padding:0 }}>
                  <ChevronLeft size={15}/> Back
                </button>
                <div style={{ marginBottom:24 }}>
                  <div style={{ width:44,height:44,borderRadius:12,background:'#FADBD8',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14 }}>
                    <Mail size={20} color={RED}/>
                  </div>
                  <h2 style={{ margin:'0 0 6px',fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:22,color:colors.textPri }}>
                    Enter your email
                  </h2>
                  <p style={{ margin:0,fontSize:13.5,color:colors.textSec,fontFamily:'"Instrument Sans",system-ui' }}>
                    We'll send a 6-digit code to sign you in.
                  </p>
                </div>
                <form onSubmit={handleSendOTP}>
                  <div style={{ display:'flex',alignItems:'center',gap:10,padding:'0 14px',height:52,borderRadius:11,border:`1.5px solid ${colors.border}`,background:colors.inputBg,marginBottom:14,transition:'all 0.15s' }}
                    onFocusCapture={e => e.currentTarget.style.borderColor=RED}
                    onBlurCapture={e => e.currentTarget.style.borderColor=colors.border}>
                    <Mail size={16} color={colors.textMut}/>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com" required autoFocus maxLength={100}
                      style={{ flex:1,border:'none',background:'transparent',outline:'none',fontSize:15,color:colors.textPri,fontFamily:'"Instrument Sans",system-ui' }}/>
                  </div>
                  <button type="submit" disabled={loading || !email.trim()}
                    style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'13px 0',borderRadius:11,border:'none',background:email.trim()?RED:'#E4E6EB',color:email.trim()?'white':'#BCC0C4',cursor:email.trim()?'pointer':'default',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:15,transition:'all 0.15s',boxShadow:email.trim()?'0 4px 16px rgba(192,57,43,0.32)':'none' }}
                    onMouseEnter={e => { if(email.trim()) e.currentTarget.style.background=DARK }}
                    onMouseLeave={e => { if(email.trim()) e.currentTarget.style.background=RED }}>
                    {loading ? <Loader2 size={17} style={{ animation:'spin 0.8s linear infinite' }}/> : <><span>Send Code</span><ArrowRight size={15}/></>}
                  </button>
                </form>
              </>
            )}

            {step === 'otp-verify' && (
              <>
                <button onClick={() => { setStep('otp-email'); setOtp(['','','','','','']); setOtpAttempts(0) }}
                  style={{ display:'flex',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',color:colors.textSec,fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:13,marginBottom:20,padding:0 }}>
                  <ChevronLeft size={15}/> Back
                </button>
                <div style={{ marginBottom:24 }}>
                  <div style={{ width:44,height:44,borderRadius:12,background:'#FADBD8',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14 }}>
                    <span style={{ fontSize:22 }}>📬</span>
                  </div>
                  <h2 style={{ margin:'0 0 6px',fontFamily:'"Bricolage Grotesque",system-ui',fontWeight:800,fontSize:22,color:colors.textPri }}>
                    Check your email
                  </h2>
                  <p style={{ margin:0,fontSize:13.5,color:colors.textSec,fontFamily:'"Instrument Sans",system-ui',lineHeight:1.5 }}>
                    We sent a 6-digit code to<br/>
                    <strong style={{ color:colors.textPri }}>{email}</strong>
                  </p>
                </div>

                {/* Attempts warning */}
                {otpAttempts >= 3 && (
                  <div style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 12px',background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:9,marginBottom:14 }}>
                    <span style={{ fontSize:14 }}>⚠️</span>
                    <p style={{ margin:0,fontFamily:'"Instrument Sans",system-ui',fontSize:12,fontWeight:600,color:'#C2410C' }}>
                      {5 - otpAttempts} attempt{5 - otpAttempts !== 1 ? 's' : ''} remaining before lockout
                    </p>
                  </div>
                )}

                <form onSubmit={handleVerifyOTP}>
                  <div style={{ display:'flex',gap:8,justifyContent:'center',marginBottom:20 }} onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input key={idx} id={`otp-${idx}`} className="otp-input"
                        type="text" inputMode="numeric" maxLength={1} value={digit}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                        autoFocus={idx === 0}
                        style={{ width:46,height:54,borderRadius:12,border:`1.5px solid ${colors.border}`,background:colors.inputBg,textAlign:'center',fontSize:22,fontWeight:800,fontFamily:'"Bricolage Grotesque",system-ui',color:colors.textPri,outline:'none',transition:'all 0.15s',caretColor:RED }}/>
                    ))}
                  </div>
                  <button type="submit" disabled={loading || otp.join('').length !== 6}
                    style={{ width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'13px 0',borderRadius:11,border:'none',background:otp.join('').length===6?RED:'#E4E6EB',color:otp.join('').length===6?'white':'#BCC0C4',cursor:otp.join('').length===6?'pointer':'default',fontFamily:'"Instrument Sans",system-ui',fontWeight:700,fontSize:15,transition:'all 0.15s',boxShadow:otp.join('').length===6?'0 4px 16px rgba(192,57,43,0.32)':'none' }}>
                    {loading ? <Loader2 size={17} style={{ animation:'spin 0.8s linear infinite' }}/> : 'Verify & Continue'}
                  </button>
                </form>

                <button
                  onClick={e => { setOtpAttempts(0); handleSendOTP(e) }}
                  disabled={loading || resendCooldown > 0}
                  style={{ width:'100%',marginTop:12,padding:'10px',borderRadius:10,border:'none',background:'transparent',cursor:resendCooldown>0?'default':'pointer',fontFamily:'"Instrument Sans",system-ui',fontWeight:600,fontSize:13,color:resendCooldown>0?'#BCC0C4':'#65676B',transition:'color 0.12s' }}
                  onMouseEnter={e => { if(!resendCooldown && !loading) e.currentTarget.style.color=RED }}
                  onMouseLeave={e => { if(!resendCooldown) e.currentTarget.style.color='#65676B' }}>
                  {resendCooldown > 0
                    ? `Resend in ${Math.floor(resendCooldown / 60)}:${String(resendCooldown % 60).padStart(2, '0')}`
                    : "Didn't receive it? Resend code"}
                </button>
              </>
            )}
          </div>

          <p style={{ textAlign:'center',fontSize:11.5,color:dark?colors.textMut:'rgba(100,100,120,0.6)',marginTop:24,fontFamily:'"Instrument Sans",system-ui',position:'relative',zIndex:1 }}>
            CSB · Computer Science Board · Announcement Platform
          </p>
        </div>
      </div>
    </>
  )
}
