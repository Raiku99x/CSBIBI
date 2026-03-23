import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, User, Eye, EyeOff, Loader2, BookOpen, Bell, MessageSquare, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const RED  = '#C0392B'
const DARK = '#922B21'
const BLUE = '#1A5276'

const FEATURES = [
  { icon: <Bell size={15} />, text: 'Class announcements & reminders' },
  { icon: <BookOpen size={15} />, text: 'Subject materials & deadlines' },
  { icon: <MessageSquare size={15} />, text: 'Real-time group chat' },
  { icon: <FileText size={15} />, text: 'File & media sharing' },
]

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', displayName: '' })
  const { signIn, signUp } = useAuth()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password)
        toast.success('Welcome back!')
      } else {
        if (!form.displayName.trim()) { toast.error('Enter your name'); setLoading(false); return }
        await signUp(form.email, form.password, form.displayName)
        toast.success('Account created! Check your email to confirm.')
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        @keyframes floatA {
          0%,100% { transform: translate(0,0) scale(1); }
          40% { transform: translate(24px,-28px) scale(1.06); }
          70% { transform: translate(-12px,16px) scale(0.96); }
        }
        @keyframes floatB {
          0%,100% { transform: translate(0,0) scale(1); }
          35% { transform: translate(-20px,22px) scale(1.08); }
          65% { transform: translate(14px,-12px) scale(0.94); }
        }
        @keyframes floatC {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(16px,24px) scale(1.05); }
        }
        @keyframes floatD {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-18px,-20px) scale(1.07); }
        }

        .auth-page {
          min-height: 100vh;
          display: flex;
          font-family: 'Instrument Sans', system-ui, sans-serif;
        }

        /* ── Left panel ── */
        .auth-left {
          display: none;
          flex: 0 0 44%;
          background: linear-gradient(160deg, #7B241C 0%, #C0392B 42%, #1A5276 100%);
          flex-direction: column;
          justify-content: center;
          padding: 56px 52px;
          position: relative;
          overflow: hidden;
        }
        .auth-left-dots {
          position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px);
          background-size: 26px 26px;
        }

        /* ── Right panel ── */
        .auth-right {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          min-height: 100vh;
          overflow: hidden;

          /* Rich layered background */
          background:
            radial-gradient(ellipse 60% 40% at 90% 10%, rgba(192,57,43,0.22) 0%, transparent 65%),
            radial-gradient(ellipse 55% 45% at 10% 85%, rgba(26,82,118,0.2) 0%, transparent 65%),
            radial-gradient(ellipse 40% 35% at 85% 80%, rgba(192,57,43,0.14) 0%, transparent 60%),
            radial-gradient(ellipse 45% 40% at 15% 20%, rgba(26,82,118,0.12) 0%, transparent 60%),
            #EEF0F3;
        }

        /* Dot grid texture */
        .auth-right::before {
          content: '';
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background-image: radial-gradient(rgba(100,100,140,0.09) 1px, transparent 1px);
          background-size: 20px 20px;
        }

        /* Animated blobs on top of the gradient */
        .blob-1 {
          position: absolute;
          top: -140px; right: -100px;
          width: 460px; height: 460px;
          border-radius: 50%;
          background: radial-gradient(circle at 38% 38%,
            rgba(192,57,43,0.32) 0%,
            rgba(192,57,43,0.12) 40%,
            transparent 68%);
          animation: floatA 10s ease-in-out infinite;
          pointer-events: none;
        }
        .blob-2 {
          position: absolute;
          bottom: -120px; right: 20px;
          width: 420px; height: 420px;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 55%,
            rgba(26,82,118,0.30) 0%,
            rgba(26,82,118,0.10) 42%,
            transparent 68%);
          animation: floatB 12s ease-in-out infinite;
          pointer-events: none;
        }
        .blob-3 {
          position: absolute;
          top: 30%; left: -80px;
          width: 340px; height: 340px;
          border-radius: 50%;
          background: radial-gradient(circle at 60% 42%,
            rgba(192,57,43,0.20) 0%,
            rgba(192,57,43,0.06) 50%,
            transparent 68%);
          animation: floatC 14s ease-in-out infinite;
          pointer-events: none;
        }
        .blob-4 {
          position: absolute;
          top: 10%; right: 30%;
          width: 240px; height: 240px;
          border-radius: 50%;
          background: radial-gradient(circle,
            rgba(26,82,118,0.18) 0%,
            transparent 68%);
          animation: floatD 16s ease-in-out infinite;
          pointer-events: none;
        }

        .auth-mobile-logo { display: flex; }
        .auth-card { position: relative; z-index: 1; }

        @media (min-width: 900px) {
          .auth-left { display: flex; }
          .auth-mobile-logo { display: none; }
        }
      `}</style>

      <div className="auth-page">

        {/* ── Left Panel ── */}
        <div className="auth-left">
          <div className="auth-left-dots" />

          {/* Soft glow blobs inside left panel */}
          <div style={{
            position: 'absolute', top: -80, right: -60,
            width: 280, height: 280, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', filter: 'blur(45px)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -60, left: -40,
            width: 240, height: 240, borderRadius: '50%',
            background: 'rgba(26,82,118,0.35)', filter: 'blur(55px)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 44 }}>
              <div style={{
                width: 62, height: 62, borderRadius: 16, overflow: 'hidden', flexShrink: 0,
                border: '2.5px solid rgba(255,255,255,0.3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              }}>
                <img src="/announce.png" alt="CSB" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{
                  fontFamily: '"Bricolage Grotesque", system-ui',
                  fontWeight: 800, fontSize: 38, color: 'white',
                  letterSpacing: '-1.5px', lineHeight: 1,
                }}>CSB</div>
                <div style={{
                  fontFamily: '"Instrument Sans", system-ui',
                  fontWeight: 600, fontSize: 10.5,
                  color: 'rgba(255,255,255,0.6)',
                  letterSpacing: '1.8px', textTransform: 'uppercase', marginTop: 3,
                }}>Computer Science Board</div>
              </div>
            </div>

            <p style={{
              fontFamily: '"Instrument Sans", system-ui',
              fontSize: 21, fontWeight: 700, color: 'white',
              lineHeight: 1.45, margin: '0 0 10px',
            }}>
              Your official hub for CS class coordination.
            </p>
            <p style={{
              fontFamily: '"Instrument Sans", system-ui',
              fontSize: 14, color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.65, margin: '0 0 40px', fontWeight: 400,
            }}>
              Announcements, deadlines, materials, and class chat — all in one place.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 13,
                  padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: 'rgba(255,255,255,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white',
                  }}>
                    {f.icon}
                  </div>
                  <span style={{
                    fontFamily: '"Instrument Sans", system-ui',
                    fontSize: 13.5, color: 'rgba(255,255,255,0.88)', fontWeight: 500,
                  }}>
                    {f.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="auth-right">
          <div className="blob-1" />
          <div className="blob-2" />
          <div className="blob-3" />
          <div className="blob-4" />

          {/* Mobile logo */}
          <div className="auth-mobile-logo" style={{
            flexDirection: 'column', alignItems: 'center', gap: 8,
            marginBottom: 28, position: 'relative', zIndex: 1,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 18, overflow: 'hidden',
              border: '3px solid white',
              boxShadow: '0 4px 20px rgba(192,57,43,0.25)',
            }}>
              <img src="/announce.png" alt="CSB" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: '"Bricolage Grotesque", system-ui',
                fontWeight: 800, fontSize: 28, color: RED, letterSpacing: '-1px',
              }}>CSB</div>
              <div style={{
                fontFamily: '"Instrument Sans", system-ui',
                fontWeight: 600, fontSize: 10, color: BLUE,
                letterSpacing: '1.5px', textTransform: 'uppercase',
              }}>Computer Science Board</div>
            </div>
          </div>

          {/* Card */}
          <div className="auth-card" style={{
            width: '100%', maxWidth: 420,
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 20,
            padding: '32px 30px',
            boxShadow: '0 16px 56px rgba(0,0,0,0.14), 0 2px 12px rgba(0,0,0,0.08)',
            border: '1px solid rgba(255,255,255,0.95)',
          }}>
            <div style={{ marginBottom: 26, textAlign: 'center' }}>
              <h1 style={{
                margin: '0 0 5px',
                fontFamily: '"Bricolage Grotesque", system-ui',
                fontWeight: 800, fontSize: 23, color: '#050505',
              }}>
                {mode === 'login' ? 'Welcome back 👋' : 'Create account'}
              </h1>
              <p style={{
                margin: 0, fontSize: 13.5, color: '#65676B',
                fontFamily: '"Instrument Sans", system-ui',
              }}>
                {mode === 'login' ? 'Sign in to your CSB account' : 'Join the CS community today'}
              </p>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex', gap: 4, padding: 4,
              background: '#F0F2F5', borderRadius: 12, marginBottom: 24,
            }}>
              {[{ key: 'login', label: 'Log In' }, { key: 'register', label: 'Sign Up' }].map(m => (
                <button key={m.key} onClick={() => setMode(m.key)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 9,
                  fontSize: 14, fontWeight: 700,
                  fontFamily: '"Instrument Sans", system-ui',
                  background: mode === m.key ? 'white' : 'transparent',
                  color: mode === m.key ? '#050505' : '#8A8D91',
                  border: 'none', cursor: 'pointer',
                  boxShadow: mode === m.key ? '0 1px 5px rgba(0,0,0,0.12)' : 'none',
                  transition: 'all 0.18s ease',
                }}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Fields */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mode === 'register' && (
                <InputField icon={<User size={16} />} type="text" placeholder="Full name"
                  value={form.displayName} onChange={e => set('displayName', e.target.value)} required />
              )}
              <InputField icon={<Mail size={16} />} type="email" placeholder="Email address"
                value={form.email} onChange={e => set('email', e.target.value)} required />
              <InputField
                icon={<Lock size={16} />}
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required minLength={6}
                suffix={
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '0 2px', display: 'flex', alignItems: 'center',
                    color: '#BCC0C4', transition: 'color 0.12s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = '#65676B'}
                    onMouseLeave={e => e.currentTarget.style.color = '#BCC0C4'}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              <button type="submit" disabled={loading} style={{
                marginTop: 4, width: '100%', padding: '14px 0',
                borderRadius: 11, border: 'none',
                background: loading ? '#E5A39D' : RED,
                color: 'white',
                fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 15.5,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 16px rgba(192,57,43,0.32)',
                transition: 'background 0.15s, transform 0.1s',
              }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = DARK }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = RED }}
                onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)' }}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {loading && <Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} />}
                {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0 18px' }}>
              <div style={{ flex: 1, height: 1, background: '#EAECEF' }} />
              <span style={{ color: '#BCC0C4', fontSize: 12, fontFamily: '"Instrument Sans", system-ui' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#EAECEF' }} />
            </div>

            <p style={{
              textAlign: 'center', fontSize: 14, color: '#65676B', margin: 0,
              fontFamily: '"Instrument Sans", system-ui',
            }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{
                background: 'none', border: 'none', color: RED, fontWeight: 700,
                fontSize: 14, cursor: 'pointer', fontFamily: '"Instrument Sans", system-ui', padding: 0,
              }}>
                {mode === 'login' ? 'Sign up free' : 'Log in'}
              </button>
            </p>
          </div>

          <p style={{
            textAlign: 'center', fontSize: 11.5, color: 'rgba(100,100,120,0.6)',
            marginTop: 24, fontFamily: '"Instrument Sans", system-ui',
            position: 'relative', zIndex: 1,
          }}>
            CSB · Computer Science Board · Announcement Platform
          </p>
        </div>
      </div>
    </>
  )
}

function InputField({ icon, type, placeholder, value, onChange, required, minLength, suffix }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 14px', height: 52, borderRadius: 11,
      border: `1.5px solid ${focused ? RED : '#E4E6EB'}`,
      background: focused ? 'white' : '#F7F8FA',
      boxShadow: focused ? '0 0 0 3px rgba(192,57,43,0.1)' : 'none',
      transition: 'all 0.15s',
    }}>
      <span style={{
        flexShrink: 0, display: 'flex', alignItems: 'center',
        color: focused ? RED : '#BCC0C4', transition: 'color 0.15s',
      }}>
        {icon}
      </span>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={onChange} required={required} minLength={minLength}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          flex: 1, border: 'none', background: 'transparent', outline: 'none',
          fontSize: 15, color: '#1c1e21',
          fontFamily: '"Instrument Sans", system-ui',
        }}
      />
      {suffix}
    </div>
  )
}
