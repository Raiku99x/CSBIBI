import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Loader2, KeyRound, ArrowRight, LogOut, CheckCircle2, Mail,
  User, ChevronLeft, Camera, Upload, ChevronDown, BookOpen,
  Calendar, ChevronRight, Check, X, Cake
} from 'lucide-react'
import { differenceInYears } from 'date-fns'
import toast from 'react-hot-toast'
import { useDarkMode } from '../contexts/DarkModeContext'

const RED  = '#C0392B'
const BLUE = '#1A5276'
const TEAL = '#0D7377'

const GENDERS = ['Male', 'Female', 'Prefer not to say']

// ── Sanitize text input — strip HTML/script chars ─────────────
function sanitize(str) {
  return str
    .replace(/[<>'"&]/g, c => ({'<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;','&':'&amp;'}[c]))
    .trim()
}

// ── Dicebear fallback ─────────────────────────────────────────
const AVATAR_HEX = ['0D7377','0A5C60','3D5166','4A6070','2D6A4F','3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42']
function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}

// ── Step indicator ────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Verify', 'Basic Info', 'Subjects', 'Photo']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
      {steps.map((label, i) => {
        const idx = i + 1
        const done = step > idx
        const active = step === idx
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: idx < steps.length ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', border: `2px solid ${done || active ? (done ? TEAL : RED) : '#D1D5DB'}`,
                background: done ? TEAL : active ? RED : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.25s',
              }}>
                {done
                  ? <Check size={13} color="white" strokeWidth={3}/>
                  : <span style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 12, color: active ? 'white' : '#9CA3AF' }}>{idx}</span>
                }
              </div>
              <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 9, fontWeight: 700, color: active ? RED : done ? TEAL : '#9CA3AF', letterSpacing: 0.3, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {idx < steps.length && (
              <div style={{ flex: 1, height: 2, background: done ? TEAL : '#E5E7EB', margin: '0 4px', marginBottom: 18, transition: 'background 0.25s' }}/>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Field({ label, children, error, required }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 11, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}{required && <span style={{ color: RED, marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 11.5, color: RED, fontWeight: 600 }}>{error}</p>}
    </div>
  )
}

export default function CodeGatePage() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const { dark, colors } = useDarkMode()

  const [step, setStep]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)

  const [code, setCode]           = useState('')
  const [codeRow, setCodeRow]     = useState(null)
  const [codeError, setCodeError] = useState('')

  const [fullName, setFullName]         = useState('')
  const [gender, setGender]             = useState('')
  const [birthday, setBirthday]         = useState('')
  const [nameError, setNameError]       = useState('')
  const [genderError, setGenderError]   = useState('')
  const [bdayError, setBdayError]       = useState('')

  const [subjects, setSubjects]                 = useState([])
  const [selectedSubjects, setSelectedSubjects] = useState(new Set())
  const [subjectError, setSubjectError]         = useState('')
  const [subjectsLoading, setSubjectsLoading]   = useState(false)

  const [avatarFile, setAvatarFile]       = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    if (step === 3 && subjects.length === 0) {
      setSubjectsLoading(true)
      supabase.from('subjects').select('*').order('name')
        .then(({ data }) => {
          if (data) setSubjects(data)
          setSubjectsLoading(false)
        })
    }
  }, [step])

  // ── Step 1: verify code ───────────────────────────────────
  async function handleVerify(e) {
    e.preventDefault()
    const trimmed = code.trim().toLowerCase()
    if (!trimmed) { setCodeError('invalid'); return }
    if (trimmed.length > 100 || /<|>|script/i.test(trimmed)) { setCodeError('invalid'); return }

    setLoading(true)
    setCodeError('')
    try {
      const { data: row } = await supabase
        .from('allowed_codes').select('*').eq('code', trimmed).single()

      if (!row) { setCodeError('invalid'); setLoading(false); return }
      if (row.is_used) { setCodeError('used'); setLoading(false); return }

      setCodeRow(row)
      setFullName('')
      setStep(2)
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: basic info ────────────────────────────────────
  function handleBasicNext() {
    let ok = true
    setNameError(''); setGenderError(''); setBdayError('')

    if (!fullName.trim()) { setNameError('Full name is required'); ok = false }
    else if (fullName.trim().length < 2) { setNameError('Name is too short'); ok = false }
    else if (fullName.trim().length > 50) { setNameError('Name is too long'); ok = false }
    else if (!/^[a-zA-Z][a-zA-Z\s\-'.]*[a-zA-Z]$|^[a-zA-Z]$/.test(fullName.trim())) { setNameError('Name must start and end with a letter'); ok = false }

    if (!gender) { setGenderError('Please select your gender'); ok = false }

    if (!birthday) {
      setBdayError('Birthday is required'); ok = false
    } else {
      const age = differenceInYears(new Date(), new Date(birthday))
      if (age < 15) { setBdayError('Must be at least 15 years old'); ok = false }
      else if (age > 40) { setBdayError('Please enter a valid birthday'); ok = false }
    }

    if (ok) setStep(3)
  }

  // ── Step 3: subjects ──────────────────────────────────────
  function toggleSubject(id) {
    setSelectedSubjects(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setSubjectError('')
  }

  function handleSubjectsNext() {
    if (selectedSubjects.size === 0) {
      setSubjectError('Please select at least one subject.')
      return
    }
    setStep(4)
  }

  // ── Step 4: photo ─────────────────────────────────────────
  function handlePhotoPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Select an image file'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  // ── Final submit ──────────────────────────────────────────
  async function handleFinish(skipPhoto = false) {
    setLoading(true)
    try {
      const { error: claimErr } = await supabase
        .from('allowed_codes').update({ is_used: true, user_id: user.id })
        .eq('id', codeRow.id).eq('is_used', false)
      if (claimErr) { toast.error('Code was just claimed. Try again.'); setLoading(false); return }

      let avatarUrl = dicebearUrl(fullName.trim())
      if (!skipPhoto && avatarFile) {
        const ext = avatarFile.name.split('.').pop().toLowerCase()
        const path = `avatars/${user.id}_${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('post-media').upload(path, avatarFile, { upsert: true })
        if (upErr) throw upErr
        const { data } = supabase.storage.from('post-media').getPublicUrl(path)
        avatarUrl = data.publicUrl
      }

      if (selectedSubjects.size > 0) {
        const inserts = [...selectedSubjects].map(subject_id => ({ user_id: user.id, subject_id }))
        await supabase.from('user_subjects').insert(inserts)
      }

      const safeName = sanitize(fullName.trim())
      const safeUsername = codeRow.identifier
        ? codeRow.identifier.replace('@', '').toLowerCase()
        : safeName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')

      await updateProfile({
        display_name: safeName,
        username:     safeUsername,
        identifier:   codeRow.identifier,
        section:      codeRow.section,
        student_code: codeRow.code,
        is_verified:  true,
        avatar_url:   avatarUrl,
        gender:       gender,
        birthday:     birthday,
      })

      // ── Auto-complete PAST DUE deadlines only ─────────────
      // Only mark deadlines as done if their due date (+ time) is already in the past.
      // We never touch today's or future deadlines.
      try {
        const enrolledSubjectIds = [...selectedSubjects]
        const now = new Date()

        // Fetch deadlines from enrolled subjects + general (no subject)
        let deadlineQuery = supabase
          .from('posts')
          .select('id, due_date, due_time')
          .eq('post_type', 'announcement')
          .not('due_date', 'is', null)

        if (enrolledSubjectIds.length > 0) {
          deadlineQuery = deadlineQuery.or(
            `subject_id.in.(${enrolledSubjectIds.join(',')}),subject_id.is.null`
          )
        } else {
          deadlineQuery = deadlineQuery.is('subject_id', null)
        }

        const { data: allDeadlines } = await deadlineQuery

        // Filter client-side: only truly past-due (respecting due_time)
        const pastDueDeadlines = (allDeadlines || []).filter(d => {
          const [y, m, day] = d.due_date.split('-').map(Number)
          const dt = new Date(y, m - 1, day)
          if (d.due_time) {
            const [h, min] = d.due_time.split(':').map(Number)
            dt.setHours(h, min, 0, 0)
          } else {
            dt.setHours(23, 59, 0, 0)
          }
          return dt < now
        })

        if (pastDueDeadlines.length > 0) {
          const completions = pastDueDeadlines.map(d => ({
            user_id: user.id,
            post_id: d.id,
          }))
          await supabase
            .from('deadline_completions')
            .upsert(completions, { onConflict: 'user_id,post_id' })
        }
      } catch (err) {
        // Non-critical — don't block the success flow
        console.error('Auto-complete past-due deadlines failed:', err)
      }

      setSuccess(true)
      toast.success(`Welcome, ${safeName.split(' ')[0]}! 🎉`)
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ECEEF2', padding: 24 }}>
        <style>{`@keyframes fadeSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes pop{0%{transform:scale(0.7)}70%{transform:scale(1.12)}100%{transform:scale(1)}}`}</style>
        <div style={{ textAlign: 'center', animation: 'fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#DCFCE7', border: '2.5px solid #86EFAC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'pop 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
            <CheckCircle2 size={40} color="#16a34a"/>
          </div>
          <p style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 24, color: '#050505', margin: '0 0 8px' }}>You're in!</p>
          <p style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#65676B', margin: 0 }}>Setting up your account…</p>
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
        @keyframes floatA      { 0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-20px)} }
        @keyframes floatB      { 0%,100%{transform:translate(0,0)}50%{transform:translate(-16px,18px)} }
        @keyframes stepIn      { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:translateX(0)} }
        .csb-input{width:100%;padding:12px 14px;border-radius:11px;border:1.5px solid #E4E6EB;background:#F7F8FA;font-family:"Instrument Sans",system-ui;font-size:14px;color:#050505;transition:border-color 0.15s,box-shadow 0.15s,background 0.15s;outline:none;}
        .csb-input:focus{border-color:${TEAL}!important;box-shadow:0 0 0 3px rgba(13,115,119,0.12)!important;background:#fff!important;}
        .csb-input::placeholder{color:#C0C4CC;}
        .csb-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 0;border-radius:12px;border:none;font-family:"Instrument Sans",system-ui;font-weight:700;font-size:15px;transition:all 0.15s;cursor:pointer;}
        .csb-btn:active{transform:scale(0.97);}
        .subject-chip{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:11px;border:1.5px solid #E4E6EB;background:white;cursor:pointer;transition:all 0.15s;font-family:"Instrument Sans",system-ui;font-size:13.5px;font-weight:600;color:#050505;text-align:left;}
        .subject-chip:hover{border-color:${TEAL};background:#F0FAFA;}
        .subject-chip.selected{border-color:${TEAL};background:#E6F4F4;color:${TEAL};}
        @media(max-width:480px){.csb-outer{padding:12px!important;}.csb-card{padding:20px 16px 24px!important;}}
      `}</style>

      <div className="csb-outer" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden',
        background: dark ? `radial-gradient(ellipse 70% 50% at 95% 5%,rgba(192,57,43,0.18) 0%,transparent 60%),radial-gradient(ellipse 60% 50% at 5% 90%,rgba(26,82,118,0.16) 0%,transparent 60%),${colors.pageBg}` : `radial-gradient(ellipse 70% 50% at 95% 5%,rgba(192,57,43,0.13) 0%,transparent 60%),radial-gradient(ellipse 60% 50% at 5% 90%,rgba(26,82,118,0.12) 0%,transparent 60%),#ECEEF2`
      }}>
        <div style={{ position:'absolute',top:-150,right:-100,width:480,height:480,borderRadius:'50%',background:'radial-gradient(circle,rgba(192,57,43,0.18) 0%,transparent 68%)',animation:'floatA 10s ease-in-out infinite',pointerEvents:'none'}}/>
        <div style={{ position:'absolute',bottom:-130,left:-50,width:440,height:440,borderRadius:'50%',background:'radial-gradient(circle,rgba(26,82,118,0.16) 0%,transparent 68%)',animation:'floatB 13s ease-in-out infinite',pointerEvents:'none'}}/>
        <div style={{ position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'radial-gradient(rgba(100,100,140,0.05) 1px,transparent 1px)',backgroundSize:'22px 22px'}}/>

        <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1, animation: 'fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 17, overflow: 'hidden', margin: '0 auto 11px', border: '3px solid white', boxShadow: '0 6px 24px rgba(192,57,43,0.22)' }}>
              <img src="/announce.png" alt="CSB" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            </div>
            <div style={{ fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 26, color: RED, letterSpacing: '-1px', lineHeight: 1 }}>CSB</div>
            <div style={{ fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 10, color: BLUE, letterSpacing: '2px', textTransform: 'uppercase', marginTop: 3 }}>Computer Science Board</div>
          </div>

          <div className="csb-card" style={{ background: dark ? colors.cardBg : 'rgba(255,255,255,0.93)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 22, padding: '26px 24px 30px', boxShadow: '0 20px 60px rgba(0,0,0,0.10),0 4px 16px rgba(0,0,0,0.06)', border: dark ? `1px solid ${colors.border}` : '1px solid rgba(255,255,255,0.98)' }}>

            <StepBar step={step}/>

            {/* ── STEP 1: VERIFY CODE ── */}
            {step === 1 && (
              <div style={{ animation: 'stepIn 0.22s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, paddingBottom: 16, borderBottom: '1.5px solid #F0F2F5' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#FADBD8,#F5B7B1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <KeyRound size={18} color={RED}/>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 19, color: '#050505' }}>Student Verification</h2>
                    <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#65676B' }}>Signed in as <strong style={{ color: '#1a1a1a' }}>{profile?.email || user?.email}</strong></p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 13px', background: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', border: '1.5px solid #FCD34D', borderRadius: 11, marginBottom: 16 }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>💡</span>
                  <div>
                    <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 12.5, color: '#78350F' }}>YOUR CODE IS YOUR CSPC EMAIL</p>
                    <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#92400E' }}>Use your <strong>@my.cspc.edu.ph</strong> address</p>
                  </div>
                </div>

                {codeError === 'invalid' && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 13px', background: '#FEF2F2', border: '1.5px solid #FECACA', borderLeft: `4px solid ${RED}`, borderRadius: '0 10px 10px 0', marginBottom: 14, animation: 'stepIn 0.2s ease' }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>❌</span>
                    <div>
                      <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13, color: RED }}>Invalid code</p>
                      <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#B91C1C', lineHeight: 1.4 }}>
                        This code doesn't exist. Double-check your CSPC email or contact your admin.
                      </p>
                    </div>
                  </div>
                )}

                {codeError === 'used' && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 13px', background: '#FFF7ED', border: '1.5px solid #FED7AA', borderLeft: '4px solid #C2410C', borderRadius: '0 10px 10px 0', marginBottom: 14, animation: 'stepIn 0.2s ease' }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
                    <div>
                      <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13, color: '#C2410C' }}>Code already used</p>
                      <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#92400E', lineHeight: 1.4 }}>
                        This code has already been claimed. Contact your admin if you think this is a mistake.
                      </p>
                    </div>
                  </div>
                )}

                <Field label="Enter your code" required>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} color="#BCC0C4" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}/>
                    <input className="csb-input" style={{ paddingLeft: 38, borderColor: codeError ? RED : undefined }}
                      type="text" value={code}
                      onChange={e => { setCode(e.target.value.toLowerCase()); setCodeError('') }}
                      placeholder="yourname@my.cspc.edu.ph"
                      maxLength={100} autoFocus spellCheck={false} autoComplete="off" autoCapitalize="none" inputMode="email"/>
                  </div>
                </Field>

                <button className="csb-btn" onClick={handleVerify} disabled={loading || !code.trim()}
                  style={{ background: code.trim() ? RED : '#E4E6EB', color: code.trim() ? 'white' : '#BCC0C4', cursor: code.trim() ? 'pointer' : 'not-allowed', marginTop: 16, boxShadow: code.trim() ? '0 6px 20px rgba(192,57,43,0.26)' : 'none' }}>
                  {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }}/> Verifying…</> : <><span>Verify Code</span><ArrowRight size={15}/></>}
                </button>
              </div>
            )}

            {/* ── STEP 2: BASIC INFO ── */}
            {step === 2 && (
              <div style={{ animation: 'stepIn 0.22s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1.5px solid #F0F2F5' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#E6F4F4,#CCE9E9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={18} color={TEAL}/>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 19, color: '#050505' }}>Basic Info</h2>
                    <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#65676B' }}>Tell us a bit about yourself</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Field label="Full Name" required error={nameError}>
                    <div style={{ position: 'relative' }}>
                      <User size={15} color="#BCC0C4" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}/>
                      <input className="csb-input" style={{ paddingLeft: 38, borderColor: nameError ? RED : undefined }}
                        type="text" value={fullName}
                        onChange={e => { setFullName(e.target.value); setNameError('') }}
                        placeholder="e.g. Juan Dela Cruz"
                        maxLength={50} autoFocus/>
                    </div>
                  </Field>

                  <Field label="Gender" required error={genderError}>
                    <div style={{ position: 'relative' }}>
                      <select className="csb-input" value={gender}
                        onChange={e => { setGender(e.target.value); setGenderError('') }}
                        style={{ appearance: 'none', paddingRight: 36, borderColor: genderError ? RED : undefined, color: gender ? '#050505' : '#C0C4CC' }}>
                        <option value="" disabled>Select gender</option>
                        {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <ChevronDown size={14} color="#9CA3AF" style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}/>
                    </div>
                  </Field>

                  <Field label="Birthday" required error={bdayError}>
                    <div style={{ position: 'relative' }}>
                      <Cake size={15} color="#BCC0C4" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}/>
                      <input className="csb-input" type="date" value={birthday}
                        onChange={e => { setBirthday(e.target.value); setBdayError('') }}
                        max={new Date().toISOString().split('T')[0]}
                        style={{ paddingLeft: 38, borderColor: bdayError ? RED : undefined }}/>
                    </div>
                  </Field>
                </div>

                <button className="csb-btn" onClick={handleBasicNext}
                  style={{ background: TEAL, color: 'white', marginTop: 22, boxShadow: '0 6px 20px rgba(13,115,119,0.24)' }}>
                  <span>Next</span><ChevronRight size={15}/>
                </button>
              </div>
            )}

            {/* ── STEP 3: SUBJECTS ── */}
            {step === 3 && (
              <div style={{ animation: 'stepIn 0.22s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1.5px solid #F0F2F5' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#EBF5FB,#D6EAF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={18} color={BLUE}/>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 19, color: '#050505' }}>Enrolled Subjects</h2>
                    <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#65676B' }}>Select at least one subject</p>
                  </div>
                </div>

                {subjectError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 9, marginBottom: 12 }}>
                    <X size={13} color={RED}/>
                    <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 13, fontWeight: 600, color: RED }}>{subjectError}</p>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#65676B' }}>
                    {selectedSubjects.size > 0 ? <><strong style={{ color: TEAL }}>{selectedSubjects.size}</strong> selected</> : 'None selected'}
                  </span>
                  {selectedSubjects.size > 0 && (
                    <button onClick={() => setSelectedSubjects(new Set())}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: '"Instrument Sans", system-ui', fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}>
                      Clear all
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto', paddingRight: 2 }}>
                  {subjectsLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                      <Loader2 size={22} color={TEAL} style={{ animation: 'spin 0.8s linear infinite' }}/>
                    </div>
                  ) : subjects.length === 0 ? (
                    <p style={{ textAlign: 'center', fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: '#9CA3AF', padding: '20px 0' }}>No subjects available</p>
                  ) : subjects.map(s => {
                    const selected = selectedSubjects.has(s.id)
                    return (
                      <button key={s.id} className={`subject-chip${selected ? ' selected' : ''}`} onClick={() => toggleSubject(s.id)}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${selected ? TEAL : '#D1D5DB'}`, background: selected ? TEAL : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                          {selected && <Check size={11} color="white" strokeWidth={3}/>}
                        </div>
                        <span style={{ flex: 1 }}>{s.name}</span>
                      </button>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                  <button className="csb-btn" onClick={() => setStep(2)}
                    style={{ background: '#F0F2F5', color: '#65676B', flex: '0 0 80px', boxShadow: 'none' }}>
                    <ChevronLeft size={15}/>
                  </button>
                  <button className="csb-btn" onClick={handleSubjectsNext}
                    style={{ background: TEAL, color: 'white', flex: 1, boxShadow: '0 6px 20px rgba(13,115,119,0.24)' }}>
                    <span>Next</span><ChevronRight size={15}/>
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4: PHOTO ── */}
            {step === 4 && (
              <div style={{ animation: 'stepIn 0.22s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1.5px solid #F0F2F5' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#F3F4F6,#E5E7EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Camera size={18} color="#6B7280"/>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 19, color: '#050505' }}>Profile Photo</h2>
                    <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#65676B' }}>Optional — you can change it later</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                  <div style={{ position: 'relative' }}>
                    <img src={avatarPreview || dicebearUrl(fullName)}
                      style={{ width: 96, height: 96, borderRadius: 22, objectFit: 'cover', border: `3px solid ${avatarPreview ? TEAL : '#E4E6EB'}`, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', transition: 'border-color 0.2s' }}
                      alt="avatar preview"/>
                    {avatarPreview && (
                      <button onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                        style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: RED, border: '2px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={10} color="white" strokeWidth={3}/>
                      </button>
                    )}
                  </div>
                  <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                    {avatarPreview ? '✓ Photo selected' : 'Auto-generated from your name'}
                  </p>
                </div>

                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" style={{ display: 'none' }} onChange={handlePhotoPick}/>

                <button className="csb-btn" onClick={() => fileRef.current?.click()}
                  style={{ background: '#F0F2F5', color: '#050505', border: '1.5px dashed #D1D5DB', boxShadow: 'none', marginBottom: 10 }}>
                  <Upload size={16} color="#65676B"/><span>Upload Photo</span>
                </button>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="csb-btn" onClick={() => setStep(3)}
                    style={{ background: '#F0F2F5', color: '#65676B', flex: '0 0 80px', boxShadow: 'none' }}>
                    <ChevronLeft size={15}/>
                  </button>
                  <button className="csb-btn" onClick={() => handleFinish(!avatarFile)} disabled={loading}
                    style={{ background: loading ? '#7EC8C8' : TEAL, color: 'white', flex: 1, boxShadow: '0 6px 20px rgba(13,115,119,0.24)' }}>
                    {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }}/> Setting up…</> : <><span>{avatarFile ? 'Finish' : 'Skip & Finish'}</span><Check size={15}/></>}
                  </button>
                </div>
              </div>
            )}

          </div>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={signOut}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 12, color: '#9EA3A8', transition: 'color 0.12s', padding: '6px 10px', borderRadius: 8 }}
              onMouseEnter={e => e.currentTarget.style.color = RED}
              onMouseLeave={e => e.currentTarget.style.color = '#9EA3A8'}>
              <LogOut size={13}/> Sign out and use a different account
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
