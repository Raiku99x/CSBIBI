import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, User, Eye, EyeOff, Loader2, BookOpen, Bell, MessageSquare, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const RED  = '#C0392B'
const DARK = '#922B21'
const BLUE = '#1A5276'

const FEATURES = [
  { icon: <Bell size={16} />, text: 'Class announcements & reminders' },
  { icon: <BookOpen size={16} />, text: 'Subject materials & deadlines' },
  { icon: <MessageSquare size={16} />, text: 'Real-time group chat' },
  { icon: <FileText size={16} />, text: 'File & media sharing' },
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
    <div style={{
      minHeight: '100vh',
      background: '#F0F2F5',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>

      {/* Background decorations */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 240,
        background: `linear-gradient(135deg, ${RED} 0%, ${BLUE} 100%)`,
        zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
        backgroundSize: '28px 28px', zIndex: 0, pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: 960,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 64, position: 'relative', zIndex: 1,
      }}>

        {/* ── Left branding (desktop) ── */}
        <div style={{ display: 'none', flexDirection: 'column', gap: 24, flex: 1, maxWidth: 380 }}
          className="lg-show">

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, overflow: 'hidden',
              boxShadow: '0 6px 24px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.2)',
              border: '3px solid rgba(255,255,255,0.3)',
            }}>
              <img src="/announce.png" alt="CSB" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{
                fontFamily: '"Bricolage Grotesque", system-ui',
                fontWeight: 800, fontSize: 38, color: 'white',
                letterSpacing: '-1.5px', lineHeight: 1,
                textShadow: '0 2px 12px rgba(0,0,0,0.2)',
              }}>CSB</div>
              <div style={{
                fontFamily: '"Instrument Sans", system-ui',
                fontWeight: 600, fontSize: 11,
                color: 'rgba(255,255,255,0.8)',
                letterSpacing: '1.5px', textTransform: 'uppercase',
              }}>Computer Science Board</div>
            </div>
          </div>

          <p style={{
            fontFamily: '"Instrument Sans", system-ui',
            fontSize: 18, color: 'rgba(255,255,255,0.92)',
            lineHeight: 1.55, margin: 0, fontWeight: 400,
          }}>
            Your official platform for CS class announcements, deadlines & collaboration.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 16px', borderRadius: 12,
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.9)',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>{f.icon}</span>
                <span style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 500, fontSize: 14 }}>
                  {f.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Form card ── */}
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Mobile logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 28 }}
            className="lg-hide">
            <div style={{
              width: 72, height: 72, borderRadius: 20, overflow: 'hidden',
              boxShadow: '0 6px 24px rgba(255,255,255,0.3)',
              border: '3px solid rgba(255,255,255,0.4)',
            }}>
              <img src="/announce.png" alt="CSB" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: '"Bricolage Grotesque", system-ui',
                fontWeight: 800, fontSize: 30, color: 'white', letterSpacing: '-1px',
              }}>CSB</div>
              <div style={{
                fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 10,
                color: 'rgba(255,255,255,0.75)', letterSpacing: '1.2px', textTransform: 'uppercase',
              }}>Computer Science Board</div>
            </div>
          </div>

          {/* Card */}
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: '28px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.8)',
          }}>
            {/* Heading */}
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <h1 style={{
                margin: '0 0 4px',
                fontFamily: '"Bricolage Grotesque", system-ui',
                fontWeight: 800, fontSize: 22, color: '#050505',
              }}>
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h1>
              <p style={{
                margin: 0, fontFamily: '"Instrument Sans", system-ui',
                fontSize: 13.5, color: '#65676B',
              }}>
                {mode === 'login'
                  ? 'Log in to your CSB account'
                  : 'Join the CS community today'
                }
              </p>
            </div>

            {/* Mode tabs */}
            <div style={{
              display: 'flex', gap: 4, padding: 4,
              background: '#F0F2F5', borderRadius: 12, marginBottom: 24,
            }}>
              {['login', 'register'].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: '9px 0', borderRadius: 9,
                  fontSize: 13.5, fontWeight: 700,
                  fontFamily: '"Instrument Sans", system-ui',
                  background: mode === m
                    ? 'white'
                    : 'transparent',
                  color: mode === m ? '#050505' : '#65676B',
                  border: 'none', cursor: 'pointer',
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                  transition: 'all 0.18s ease',
                }}>
                  {m === 'login' ? 'Log In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mode === 'register' && (
                <InputField
                  icon={<User size={16} color="#BCC0C4" />}
                  type="text" placeholder="Full name"
                  value={form.displayName}
                  onChange={e => set('displayName', e.target.value)}
                  required
                />
              )}
              <InputField
                icon={<Mail size={16} color="#BCC0C4" />}
                type="email" placeholder="Email address"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
              />
              <InputField
                icon={<Lock size={16} color="#BCC0C4" />}
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required minLength={6}
                suffix={
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{
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
                marginTop: 6, width: '100%', padding: '13px 0',
                borderRadius: 11, border: 'none',
                background: loading ? '#E5A39D' : RED,
                color: 'white',
                fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 15.5,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 16px rgba(192,57,43,0.3)',
                transition: 'all 0.15s',
              }}
                onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)' }}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {loading && <Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} />}
                {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 18px' }}>
              <div style={{ flex: 1, height: 1, background: '#E4E6EB' }} />
              <span style={{ color: '#BCC0C4', fontSize: 12, fontFamily: '"Instrument Sans", system-ui' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#E4E6EB' }} />
            </div>

            <p style={{
              textAlign: 'center', fontSize: 13.5, color: '#65676B',
              fontFamily: '"Instrument Sans", system-ui', margin: 0,
            }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{
                background: 'none', border: 'none', color: RED, fontWeight: 700,
                fontSize: 13.5, cursor: 'pointer', fontFamily: '"Instrument Sans", system-ui',
                padding: 0,
              }}>
                {mode === 'login' ? 'Sign up free' : 'Log in'}
              </button>
            </p>
          </div>

          <p style={{
            textAlign: 'center', fontSize: 11.5, color: 'rgba(255,255,255,0.5)',
            marginTop: 20, fontFamily: '"Instrument Sans", system-ui',
          }}>
            CSB · Computer Science Board · Announcement Platform
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        @media (min-width:1024px) { .lg-show{display:flex!important} .lg-hide{display:none!important} }
      `}</style>
    </div>
  )
}

function InputField({ icon, type, placeholder, value, onChange, required, minLength, suffix }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 14px', height: 50, borderRadius: 11,
      border: `1.5px solid ${focused ? RED : '#E4E6EB'}`,
      background: focused ? 'white' : '#F7F8FA',
      boxShadow: focused ? '0 0 0 3px rgba(192,57,43,0.1)' : 'none',
      transition: 'all 0.15s',
    }}>
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', color: focused ? RED : '#BCC0C4', transition: 'color 0.15s' }}>
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
