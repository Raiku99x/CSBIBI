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
          0%,100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(18px, -22px) scale(1.06); }
        }
        @keyframes floatB {
          0%,100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-14px, 16px) scale(0.95); }
        }
        @keyframes floatC {
          0%,100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(10px, 20px) scale(1.04); }
        }

        .auth-page {
          min-height: 100vh;
          display: flex;
          position: relative;
          overflow: hidden;
          background: #F0F2F5;
        }

        /* ── Left colored panel ── */
        .auth-left {
          display: none;
          flex: 0 0 46%;
          background: linear-gradient(160deg, #7B241C 0%, #C0392B 42%, #1A5276 100%);
          flex-direction: column;
          justify-content: center;
          padding: 56px 52px 56px 52px;
          position: relative;
          z-index: 2;
        }
        .auth-left-dots {
          position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px);
          background-size: 26px 26px;
        }

        /* ── The wavy SVG divider — positioned over the seam ── */
        .auth-wave-divider {
          display: none;
          position: absolute;
          left: calc(46% - 60px);
          top: 0;
          width: 120px;
          height: 100%;
          z-index: 3;
          pointer-events: none;
        }

        /* ── Right panel ── */
        .auth-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          min-height: 100vh;
          position: relative;
          z-index: 2;
          background: #F0F2F5;
        }

        /* Blobs on the right side */
        .blob-red-top {
          position: absolute;
          top: -80px; right: -60px;
          width: 320px; height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(192,57,43,0.13) 0%, transparent 70%);
          animation: floatA 8s ease-in-out infinite;
          pointer-events: none;
        }
        .blob-blue-mid {
          position: absolute;
          top: 35%; right: 20px;
          width: 260px; height: 260px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(26,82,118,0.1) 0%, transparent 70%);
          animation: floatB 10s ease-in-out infinite;
          pointer-events: none;
        }
        .blob-red-bottom {
          position: absolute;
          bottom: -60px; right: 80px;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(192,57,43,0.09) 0%, transparent 70%);
          animation: floatC 9s ease-in-out infinite;
          pointer-events: none;
        }
        .blob-accent {
          position: absolute;
          top: 20%; left: 10%;
          width: 180px; height: 180px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(26,82,118,0.07) 0%, transparent 70%);
          animation: floatA 12s ease-in-out infinite reverse;
          pointer-events: none;
        }

        /* Dot grid on right */
        .auth-right-dots {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background-image: radial-gradient(rgba(192,57,43,0.08) 1px, transparent 1px);
          background-size: 22px 22px;
        }

        .auth-mobile-logo { display: flex; }

        @media (min-width: 900px) {
          .auth-left { display: flex; }
          .auth-wave-divider { display: block; }
          .auth-mobile-logo { display: none; }
        }
      `}</style>

      <div className="auth-page">

        {/* ── Left Panel ── */}
        <div className="auth-left">
          <div className="auth-left-dots" />

          {/* Glow blobs on left */}
          <div style={{
            position: 'absolute', top: -100, right: -80,
            width: 300, height: 300, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', filter: 'blur(50px)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -80, left: -60,
            width: 260, height: 260, borderRadius: '50%',
            background: 'rgba(26,82,118,0.3)', filter: 'blur(60px)',
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
                  fontWeight: 600, fontSize: 10.5, color: 'rgba(255,255,255,0.6)',
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
                    fontSize: 13.5, color: 'rgba(255,255,255,0.85)', fontWeight: 500,
                  }}>
                    {f.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Wavy SVG Divider ── */}
        {/*
          SVG is 120px wide, 100vh tall.
          Left half is filled with the gradient color (matching the left panel).
          The right edge is a multi-ripple wave path.
          Top and bottom waves bleed further right (infiltrating the white side).
          Middle stays closer to the seam.
        */}
        <div className="auth-wave-divider">
          <svg
            viewBox="0 0 120 900"
            preserveAspectRatio="none"
            width="100%"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#7B241C" />
                <stop offset="42%"  stopColor="#C0392B" />
                <stop offset="100%" stopColor="#1A5276" />
              </linearGradient>
            </defs>
            {/*
              Path: starts top-left, goes along the wave edge, ends bottom-left.
              The wave is defined so it bleeds into the right at top & bottom,
              and pulls back near the middle — multiple soft ripples.

              Coordinates in 120×900 space:
              - Left edge is x=0
              - Center seam is x=60
              - "Bleeding right" means x > 60 (into the grey side)
              - "Pulling back" means x < 60
            */}
            <path
              d={`
                M 0,0
                L 60,0
                C 100,0  110,40  90,80
                C 70,120  50,140  68,200
                C 86,260  105,290  88,360
                C 71,430  45,460  62,530
                C 79,600  108,630  92,700
                C 76,770  50,800  68,860
                C 86,900  100,900  60,900
                L 0,900
                Z
              `}
              fill="url(#waveGrad)"
            />
          </svg>
        </div>

        {/* ── Right Panel ── */}
        <div className="auth-right">
          {/* Background texture */}
          <div className="auth-right-dots" />

          {/* Floating blobs */}
          <div className="blob-red-top" />
          <div className="blob-blue-mid" />
          <div className="blob-red-bottom" />
          <div className="blob-accent" />

          {/* Mobile logo */}
          <div className="auth-mobile-logo" style={{
            flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 28,
            position: 'relative', zIndex: 1,
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
          <div style={{
            width: '100%', maxWidth: 420,
            background: 'white', borderRadius: 20,
            padding: '32px 30px',
            boxShadow: '0 8px 48px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.07)',
            border: '1px solid rgba(255,255,255,0.9)',
            position: 'relative', zIndex: 1,
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
                boxShadow: loading ? 'none' : '0 4px 16px rgba(192,57,43,0.3)',
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
            textAlign: 'center', fontSize: 11.5, color: '#BCC0C4',
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
