import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect, Component } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { SavedPostsProvider } from './contexts/SavedPostsContext'
import Layout from './components/Layout'
import SearchOverlay from './components/SearchOverlay'
import BannedScreen from './components/BannedScreen'
import MaintenanceScreen from './components/MaintenanceScreen'
import AuthPage from './pages/AuthPage'
import FeedPage from './pages/FeedPage'
import MessagesPage from './pages/MessagesPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import EnrolledSubjectsPage from './pages/EnrolledSubjectsPage'
import AppsPage from './pages/AppsPage'
import ProfilePage from './pages/ProfilePage'
import CodeGatePage from './pages/CodeGatePage'
import { supabase } from './lib/supabase'
import { useDeadlineReminders } from './hooks/useDeadlineReminders'
import { getCache, setCache } from './lib/cache'

// ── Error Boundary ───────────────────────────────────────────
// Catches render errors anywhere in the tree and shows a recovery
// screen instead of a blank white page.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[CSB ErrorBoundary]', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F0F2F5', padding:24 }}>
          <div style={{ width:'100%', maxWidth:420, background:'white', borderRadius:20, overflow:'hidden', boxShadow:'0 16px 48px rgba(0,0,0,0.14)' }}>
            <div style={{ background:'linear-gradient(135deg,#C0392B,#1A5276)', padding:'36px 28px 28px', textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>⚠️</div>
              <h1 style={{ margin:0, fontFamily:'"Bricolage Grotesque",system-ui', fontWeight:800, fontSize:22, color:'white' }}>Something went wrong</h1>
              <p style={{ margin:'8px 0 0', fontFamily:'"Instrument Sans",system-ui', fontSize:13, color:'rgba(255,255,255,0.75)' }}>
                CSB ran into an unexpected error.
              </p>
            </div>
            <div style={{ padding:'24px 28px 28px' }}>
              {this.state.error?.message && (
                <div style={{ background:'#F7F8FA', border:'1px solid #E4E6EB', borderLeft:'4px solid #C0392B', borderRadius:'0 10px 10px 0', padding:'12px 16px', marginBottom:20 }}>
                  <p style={{ margin:0, fontFamily:'"JetBrains Mono",monospace', fontSize:12, color:'#65676B', wordBreak:'break-word' }}>
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <button
                onClick={() => { this.setState({ hasError:false, error:null }); window.location.href = '/' }}
                style={{ width:'100%', padding:'13px 0', borderRadius:10, border:'none', background:'#C0392B', color:'white', cursor:'pointer', fontFamily:'"Instrument Sans",system-ui', fontWeight:700, fontSize:15 }}
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Short link resolver ───────────────────────────────────────
function ShortLinkResolver() {
  const { shortId } = useParams()

  useEffect(() => {
    async function resolve() {
      const { data } = await supabase
        .from('posts')
        .select('id')
        .eq('short_id', shortId)
        .single()
      window.location.replace(data?.id ? `/?post=${data.id}` : '/')
    }
    resolve()
  }, [shortId])

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F0F2F5' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
        <div style={{ width:48, height:48, borderRadius:14, overflow:'hidden' }}>
          <img src="/announce.png" alt="CSB" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        </div>
        <p style={{ fontSize:13, color:'#8A8D91', fontFamily:'"Instrument Sans", system-ui', fontWeight:500, margin:0 }}>
          Opening post…
        </p>
      </div>
    </div>
  )
}

// ── Maintenance mode hook ─────────────────────────────────────
function useMaintenanceMode() {
  const [maintenance, setMaintenance] = useState({ enabled: false, message: '' })
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function fetchSetting() {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single()

      if (data?.value) {
        try {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
          setMaintenance({ enabled: parsed.enabled ?? false, message: parsed.message ?? '' })
        } catch {
          // malformed value — treat as off
        }
      }
      setChecking(false)
    }

    fetchSetting()

    const ch = supabase
      .channel('maintenance-mode-watch')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.maintenance_mode' },
        (payload) => {
          const raw = payload.new?.value
          if (!raw) return
          try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
            setMaintenance({ enabled: parsed.enabled ?? false, message: parsed.message ?? '' })
          } catch { /* ignore */ }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [])

  return { maintenance, checking }
}

function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const { maintenance, checking } = useMaintenanceMode()
 
  if (loading || checking) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F0F2F5' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <div style={{ width:48, height:48, borderRadius:14, overflow:'hidden', boxShadow:'0 4px 16px rgba(192,57,43,0.3)' }}>
            <img src="/announce.png" alt="CSB" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
          <p style={{ fontSize:13, color:'#8A8D91', fontFamily:'"Instrument Sans", system-ui', fontWeight:500, margin:0 }}>
            Loading CSB…
          </p>
        </div>
      </div>
    )
  }
 
  if (!user) return <Navigate to="/auth" replace />
  if (profile?.is_banned) return <BannedScreen />
 
  const isSuperadmin = profile?.role === 'superadmin'
  if (maintenance.enabled && !isSuperadmin) {
    return <MaintenanceScreen message={maintenance.message} />
  }
 
  const needsVerification = !profile?.is_verified && profile?.role === 'user'
  if (needsVerification) {
    return <CodeGatePage />
  }
 
  return children
}

// Fires deadline reminder notifications once per day on app load
function DeadlineReminderRunner() {
  useDeadlineReminders()
  return null
}

function AppRoutes() {
  const { user } = useAuth()
  const [showSearch, setShowSearch] = useState(false)
  const [subjects, setSubjects] = useState([])

  useEffect(() => {
    const cached = getCache('subjects')
    if (cached) { setSubjects(cached); return }
    supabase.from('subjects').select('*').order('name').then(({ data }) => {
      if (data) { setSubjects(data); setCache('subjects', data, 5 * 60_000) }
    })
  }, [])

  return (
    <>
      {/* Deadline reminders fire on every authenticated session, once per day */}
      {user && <DeadlineReminderRunner />}

      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout onOpenSearch={() => setShowSearch(true)}>
              <FeedPage />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/messages" element={
          <ProtectedRoute>
            <Layout onOpenSearch={() => setShowSearch(true)}>
              <MessagesPage />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/announcements" element={
          <ProtectedRoute>
            <Layout onOpenSearch={() => setShowSearch(true)}>
              <AnnouncementsPage />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/subjects" element={
          <ProtectedRoute>
            <Layout onOpenSearch={() => setShowSearch(true)}>
              <EnrolledSubjectsPage />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/apps" element={
          <ProtectedRoute>
            <Layout onOpenSearch={() => setShowSearch(true)}>
              <AppsPage />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout onOpenSearch={() => setShowSearch(true)}>
              <ProfilePage />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/p/:shortId" element={<ShortLinkResolver />} />
        <Route path="/chat" element={<Navigate to="/messages" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showSearch && user && (
        <SearchOverlay
          onClose={() => setShowSearch(false)}
          subjects={subjects}
          currentUserId={user.id}
        />
      )}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <DarkModeProvider>
            <SavedPostsProvider>
              <AppRoutes />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#1e293b',
                  color: '#f8fafc',
                  borderRadius: '12px',
                  fontSize: '14px',
                  padding: '12px 16px',
                },
                success: { iconTheme: { primary: '#10b981', secondary: '#f8fafc' } },
                error: { iconTheme: { primary: '#f43f5e', secondary: '#f8fafc' } },
              }}
            />
            </SavedPostsProvider>
          </DarkModeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
