import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url, role, is_banned, is_muted, muted_until, banned_at, banned_reason, created_at, is_verified, student_code, identifier, section, force_logout_at, username')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  // ── Google OAuth ───────────────────────────────────────────
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) throw error
  }

  // ── Email OTP: send code ───────────────────────────────────
  async function signInWithOTP(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })
    if (error) throw error
  }

  // ── Email OTP: verify code ─────────────────────────────────
  async function verifyOTP(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    if (error) throw error
    return data
  }

  // ── Keep for any legacy usage ──────────────────────────────
  async function signUp(email, password, displayName) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        display_name: displayName,
        avatar_url: '',
      })
    }
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select('id, email, display_name, avatar_url, role, is_banned, is_muted, muted_until, banned_at, banned_reason, created_at, is_verified, student_code, identifier, section, force_logout_at, username')
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }

  async function refreshProfile() {
    if (!user) return
    await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signInWithGoogle,
      signInWithOTP,
      verifyOTP,
      signUp,   // legacy
      signIn,   // legacy
      signOut,
      updateProfile,
      fetchProfile: () => fetchProfile(user?.id),
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
