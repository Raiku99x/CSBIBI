import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const BRAND_PRIMARY = '#C0392B'
const BRAND_DARK    = '#922B21'
const BRAND_BLUE    = '#1A5276'

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
    <div style={{ minHeight: '100vh', background: '#F4F6F8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>

      <div style={{ width: '100%', maxWidth: 900, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 64 }}>

        {/* Left branding — desktop */}
        <div style={{ display: 'none', flexDirection: 'column', gap: 20, flex: 1, maxWidth: 360 }} className="lg-show">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Real logo */}
            <img
              src="/announce.png"
              alt="CSB Logo"
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 16px rgba(192,57,43,0.4)' }}
            />
            <div>
              <div style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 36, color: BRAND_PRIMARY, letterSpacing: '-1px', lineHeight: 1 }}>
                CSB
              </div>
              <div style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 11, color: BRAND_BLUE, letterSpacing: '1px', textTransform: 'uppercase' }}>
                Computer Science Board
              </div>
            </div>
          </div>

          <div style={{ width: 48, height: 4, borderRadius: 4, background: `linear-gradient(90deg, ${BRAND_PRIMARY}, ${BRAND_BLUE})` }} />

          <p style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 22, fontWeight: 400, color: '#1c1e21', lineHeight: 1.4, margin: 0 }}>
            Your official hub for CS announcements, deadlines & class updates.
          </p>

          {['📅 Track deadlines', '📢 Class announcements', '💬 Group chat', '📁 Share materials'].map(f => (
            <div key={f} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 20,
              background: 'white', border: '1px solid #DADDE1',
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 13, color: '#1c1e21',
              width: 'fit-content',
            }}>{f}</div>
          ))}
        </div>

        {/* Right — form card */}
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 28 }} className="lg-hide">
            <img
              src="/announce.png"
              alt="CSB Logo"
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 20px rgba(192,57,43,0.4)' }}
            />
            <div style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 32, color: BRAND_PRIMARY, letterSpacing: '-1px' }}>
              CSB
            </div>
            <div style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 11, color: BRAND_BLUE, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Computer Science Board
            </div>
          </div>

          {/* Form card */}
          <div style={{
            background: 'white', borderRadius: 20, padding: '28px 28px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
            border: '1px solid #DADDE1',
            borderTop: `4px solid ${BRAND_PRIMARY}`,
          }}>
            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: 4, padding: 4, background: '#F4F6F8', borderRadius: 12, marginBottom: 24 }}>
              {['login', 'register'].map(m => (
                <button key={m} onClick={() => setMode(m)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 9,
                    fontSize: 14, fontWeight: 600,
                    fontFamily: '"Instrument Sans", system-ui',
                    background: mode === m ? `linear-gradient(135deg, ${BRAND_PRIMARY}, ${BRAND_DARK})` : 'transparent',
                    color: mode === m ? 'white' : '#65676B',
                    border: 'none', cursor: 'pointer',
                    boxShadow: mode === m ? '0 2px 8px rgba(192,57,43,0.3)' : 'none',
                    transition: 'all 0.18s ease',
                  }}>
                  {m === 'login' ? 'Log In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mode === 'register' && (
                <InputField icon={<User size={16} color="#65676B" />} type="text" placeholder="Full name" value={form.displayName} onChange={e => set('displayName', e.target.value)} required />
              )}
              <InputField icon={<Mail size={16} color="#65676B" />} type="email" placeholder="Email address" value={form.email} onChange={e => set('email', e.target.value)} required />
              <InputField
                icon={<Lock size={16} color="#65676B" />}
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required minLength={6}
                suffix={
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}>
                    {showPass ? <EyeOff size={16} color="#65676B" /> : <Eye size={16} color="#65676B" />}
                  </button>
                }
              />

              <button type="submit" disabled={loading}
                style={{
                  marginTop: 8, width: '100%', padding: '14px 0',
                  borderRadius: 12, border: 'none',
                  background: loading ? '#E5A39D' : `linear-gradient(135deg, ${BRAND_PRIMARY}, ${BRAND_DARK})`,
                  color: 'white',
                  fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 16,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: loading ? 'none' : '0 4px 12px rgba(192,57,43,0.35)',
                  transition: 'all 0.15s',
                }}
                onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                {loading && <Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} />}
                {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#DADDE1' }} />
              <span style={{ color: '#65676B', fontSize: 13, fontFamily: '"Instrument Sans", system-ui' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#DADDE1' }} />
            </div>

            <p style={{ textAlign: 'center', fontSize: 14, color: '#65676B', fontFamily: '"Instrument Sans", system-ui', margin: 0 }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                style={{ background: 'none', border: 'none', color: BRAND_PRIMARY, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: '"Instrument Sans", system-ui' }}>
                {mode === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#BCC0C4', marginTop: 20, fontFamily: '"Instrument Sans", system-ui' }}>
            CSB · Computer Science Board · Announcement Platform
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (min-width: 1024px) { .lg-show { display: flex !important; } .lg-hide { display: none !important; } }
      `}</style>
    </div>
  )
}

function InputField({ icon, type, placeholder, value, onChange, required, minLength, suffix }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 14px', height: 50, borderRadius: 12,
      border: `1.5px solid ${focused ? BRAND_PRIMARY : '#DADDE1'}`,
      background: focused ? '#fff' : '#F7F8FA',
      boxShadow: focused ? `0 0 0 3px rgba(192,57,43,0.12)` : 'none',
      transition: 'all 0.15s',
    }}>
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange}
        required={required} minLength={minLength}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 15, color: '#1c1e21', fontFamily: '"Instrument Sans", system-ui' }}
      />
      {suffix}
    </div>
  )
}
