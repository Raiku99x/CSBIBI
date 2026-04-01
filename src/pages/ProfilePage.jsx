import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Loader2, ArrowLeft, Camera, Mail, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','5C4A7A','6B5B8A','7A5C42','8A6A50','8A4A4B','7A3D3E','647A3A','596B32','1A7A80','156870','3A4F70','2E4260','7A3A35','6A2E2A','156A6E','0F5F63','4A3A7A','3E3068']
function avatarHex(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  return AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
}
function dicebearUrl(name = '') {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${avatarHex(name)}&textColor=ffffff`
}

export default function ProfilePage() {
  const { profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [focused, setFocused] = useState(null)

  // Pending avatar — local preview only, not uploaded until Save is pressed
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null)
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef()

  // Detect unsaved changes
  const nameChanged = displayName.trim() !== (profile?.display_name || '')
  const hasUnsavedChanges = nameChanged || !!pendingAvatarFile

  function handleBack() {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Discard and go back?')) {
        navigate(-1)
      }
    } else {
      navigate(-1)
    }
  }

  // Only preview locally — do NOT upload yet
  function handleAvatarPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    setPendingAvatarFile(file)
    setPendingAvatarPreview(URL.createObjectURL(file))
    e.target.value = ''
    toast('Photo selected — press Save Changes to apply', { icon: '📸' })
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!displayName.trim()) { toast.error('Name cannot be empty'); return }
    setSaving(true)
    try {
      let newAvatarUrl = profile?.avatar_url

      // Upload avatar only now, on Save
      if (pendingAvatarFile) {
        setUploadingAvatar(true)
        const ext = pendingAvatarFile.name.split('.').pop().toLowerCase()
        const path = `avatars/${profile.id}_${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(path, pendingAvatarFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('post-media').getPublicUrl(path)
        newAvatarUrl = data.publicUrl
        setUploadingAvatar(false)
      } else {
        // Regenerate dicebear only if still using it and name changed
        const currentIsDicebear = !profile?.avatar_url || profile.avatar_url.includes('dicebear.com')
        if (currentIsDicebear && nameChanged) {
          newAvatarUrl = dicebearUrl(displayName.trim())
        }
      }

      await updateProfile({ display_name: displayName.trim(), avatar_url: newAvatarUrl })

      // Clear pending state
      setPendingAvatarFile(null)
      setPendingAvatarPreview(null)
      toast.success('Profile updated!')
    } catch (err) {
      setUploadingAvatar(false)
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Show local preview if pending, otherwise show saved avatar
  const displayedAvatar = pendingAvatarPreview
    || profile?.avatar_url
    || dicebearUrl(profile?.display_name)

  return (
    <div style={{ paddingTop: 12 }}>
      <button
        onClick={handleBack}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px', fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 14, color: '#0D7377', marginBottom: 12 }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #DADDE1', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
        <div style={{ height: 100, background: 'linear-gradient(135deg, #0D7377 0%, #0A5C60 100%)' }} />

        <div style={{ padding: '0 20px 20px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: hasUnsavedChanges ? 12 : 16 }}>

            {/* Avatar */}
            <div style={{ position: 'relative', marginTop: -44, flexShrink: 0 }}>
              <img
                src={displayedAvatar}
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 16,   // rounded square — matches feed cards
                  objectFit: 'cover',
                  border: '4px solid white',
                  background: '#E4E6EB',
                  display: 'block',
                  opacity: saving && uploadingAvatar ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                  // teal ring when there's a pending unsaved photo
                  outline: pendingAvatarPreview ? '2.5px solid #0D7377' : 'none',
                  outlineOffset: 2,
                }}
                alt="avatar"
              />

              {/* UNSAVED badge */}
              {pendingAvatarPreview && (
                <div style={{
                  position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                  background: '#0D7377', color: 'white',
                  fontSize: 9, fontWeight: 700, fontFamily: '"Instrument Sans", system-ui',
                  padding: '2px 7px', borderRadius: 8, border: '2px solid white',
                  whiteSpace: 'nowrap', letterSpacing: 0.4,
                }}>
                  UNSAVED
                </div>
              )}

              {/* Camera button — rounded square to match avatar shape */}
              <div
                onClick={() => !(saving && uploadingAvatar) && fileInputRef.current?.click()}
                style={{
                  position: 'absolute', bottom: -6, right: -6,
                  width: 28, height: 28, borderRadius: 8,
                  background: saving && uploadingAvatar ? '#CED0D4' : '#050505',
                  border: '2px solid white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: saving && uploadingAvatar ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
                title="Change profile photo"
                onMouseEnter={e => { if (!(saving && uploadingAvatar)) e.currentTarget.style.background = '#0D7377' }}
                onMouseLeave={e => { if (!(saving && uploadingAvatar)) e.currentTarget.style.background = '#050505' }}
              >
                {saving && uploadingAvatar
                  ? <Loader2 size={13} color="#65676B" style={{ animation: 'spin 0.8s linear infinite' }} />
                  : <Camera size={13} color="white" />
                }
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleAvatarPick}
              />
            </div>

            {/* Name + email */}
            <div style={{ paddingBottom: 4, minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 20, color: '#050505', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName || profile?.display_name}
              </p>
              <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#65676B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.email}
              </p>
            </div>
          </div>

          {/* Unsaved changes warning bar */}
          {hasUnsavedChanges && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 12px',
              background: '#FFF7ED',
              border: '1px solid #FED7AA',
              borderLeft: '3px solid #F59E0B',
              borderRadius: '0 10px 10px 0',
              marginBottom: 14,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F59E0B', flexShrink: 0, animation: 'pulse 2s ease-in-out infinite' }} />
              <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 13, fontWeight: 600, color: '#92400E' }}>
                Unsaved changes — press <strong>Save Changes</strong> to apply
              </p>
            </div>
          )}

          <div style={{ height: 1, background: '#E4E6EB', marginBottom: 20 }} />

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Display Name" icon={<User size={16} color="#65676B" />} focused={focused === 'name'}>
              <input
                type="text" value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                placeholder="Your display name"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: '"Instrument Sans", system-ui', fontSize: 15, color: '#050505' }}
              />
            </FormField>

            <FormField label="Email Address" icon={<Mail size={16} color="#BCC0C4" />} disabled>
              <input type="email" value={profile?.email || ''} disabled
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: '"Instrument Sans", system-ui', fontSize: 15, color: '#BCC0C4' }}
              />
            </FormField>

            <button
              type="submit"
              disabled={saving || !hasUnsavedChanges}
              style={{
                padding: '13px 0', borderRadius: 10, border: 'none',
                background: saving ? '#7EC8C8' : !hasUnsavedChanges ? '#CED0D4' : '#0D7377',
                color: 'white',
                cursor: saving || !hasUnsavedChanges ? 'not-allowed' : 'pointer',
                fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s, transform 0.1s',
              }}
              onMouseDown={e => { if (!saving && hasUnsavedChanges) e.currentTarget.style.transform = 'scale(0.985)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {saving && <Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} />}
              {saving
                ? uploadingAvatar ? 'Uploading photo…' : 'Saving…'
                : 'Save Changes'
              }
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

function FormField({ label, icon, children, focused, disabled }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', height: 50, borderRadius: 12, border: `1.5px solid ${focused ? '#0D7377' : '#E4E6EB'}`, background: disabled ? '#F7F8FA' : focused ? 'white' : '#F7F8FA', boxShadow: focused ? '0 0 0 3px rgba(13,115,119,0.12)' : 'none', transition: 'all 0.15s' }}>
        {icon}
        {children}
      </div>
    </div>
  )
}
