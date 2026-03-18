import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

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
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-4">

      {/* ── Desktop layout: side by side ── */}
      <div className="w-full max-w-[900px] flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">

        {/* Left — branding (visible on desktop) */}
        <div className="hidden lg:flex flex-col gap-4 flex-1 max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0D7377] flex items-center justify-center shadow-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 19l4-4m0 0l4-4m-4 4l4 4m4-8l4-4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </div>
            <span
              style={{ fontFamily: '"Bricolage Grotesque", system-ui, sans-serif', fontWeight: 800, fontSize: 28, letterSpacing: '-0.5px', color: '#1c1e21' }}
            >
              EduBoard
            </span>
          </div>
          <p style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 26, fontWeight: 400, color: '#1c1e21', lineHeight: 1.3 }}>
            Connect with your class and stay on top of everything.
          </p>
        </div>

        {/* Right — card */}
        <div className="w-full max-w-[396px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center gap-2 mb-8">
            <div className="w-14 h-14 rounded-3xl bg-[#0D7377] flex items-center justify-center shadow-lg">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M4 19l4-4m0 0l4-4m-4 4l4 4m4-8l4-4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 26, letterSpacing: '-0.5px', color: '#1c1e21' }}>
              EduBoard
            </span>
          </div>

          {/* Main form card */}
          <div className="bg-white rounded-2xl px-6 py-8 shadow-sm border border-[#DADDE1]">

            {/* Tab switcher — pill style */}
            <div className="flex gap-1 p-1 bg-[#F0F2F5] rounded-xl mb-6">
              {['login', 'register'].map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: '"Instrument Sans", system-ui',
                    transition: 'all 0.18s ease',
                    background: mode === m ? 'white' : 'transparent',
                    color: mode === m ? '#1c1e21' : '#65676B',
                    boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {m === 'login' ? 'Log In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mode === 'register' && (
                <InputField
                  icon={<User size={16} color="#65676B" />}
                  type="text"
                  placeholder="Full name"
                  value={form.displayName}
                  onChange={e => set('displayName', e.target.value)}
                  required
                />
              )}

              <InputField
                icon={<Mail size={16} color="#65676B" />}
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
              />

              <InputField
                icon={<Lock size={16} color="#65676B" />}
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required
                minLength={6}
                suffix={
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}>
                    {showPass ? <EyeOff size={16} color="#65676B" /> : <Eye size={16} color="#65676B" />}
                  </button>
                }
              />

              {mode === 'login' && (
                <div style={{ textAlign: 'right', marginTop: -4 }}>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#0D7377', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: '"Instrument Sans", system-ui' }}>
                    Forgot password?
                  </button>
                </div>
              )}

              {/* CTA button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 4,
                  width: '100%',
                  padding: '14px 0',
                  borderRadius: 12,
                  border: 'none',
                  background: loading ? '#7EC8C8' : '#0D7377',
                  color: 'white',
                  fontFamily: '"Instrument Sans", system-ui',
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s ease, transform 0.1s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                {loading && <Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} />}
                {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#DADDE1' }} />
              <span style={{ color: '#65676B', fontSize: 13, fontWeight: 500, fontFamily: '"Instrument Sans", system-ui' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#DADDE1' }} />
            </div>

            {/* Switch mode */}
            <p style={{ textAlign: 'center', fontSize: 14, color: '#65676B', fontFamily: '"Instrument Sans", system-ui', margin: 0 }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                style={{ background: 'none', border: 'none', color: '#0D7377', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: '"Instrument Sans", system-ui' }}
              >
                {mode === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>

          {/* Footer note */}
          <p style={{ textAlign: 'center', fontSize: 12, color: '#65676B', marginTop: 20, fontFamily: '"Instrument Sans", system-ui' }}>
            EduBoard · Student Announcement Platform
          </p>
        </div>
      </div>

      {/* Spin keyframe for loader */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

/* ── Reusable input field ── */
function InputField({ icon, type, placeholder, value, onChange, required, minLength, suffix }) {
  const [focused, setFocused] = useState(false)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        height: 50,
        borderRadius: 12,
        border: `1.5px solid ${focused ? '#0D7377' : '#DADDE1'}`,
        background: focused ? '#fff' : '#F7F8FA',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        boxShadow: focused ? '0 0 0 3px rgba(13,115,119,0.12)' : 'none',
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          border: 'none',
          background: 'transparent',
          outline: 'none',
          fontSize: 15,
          color: '#1c1e21',
          fontFamily: '"Instrument Sans", system-ui',
        }}
      />
      {suffix}
    </div>
  )
}
