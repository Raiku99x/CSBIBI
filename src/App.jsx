import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect } from 'react'
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

// ── Maintenance mode hook ─────────────────────────────────────
// Fetches the app_settings row for maintenance_mode and subscribes
// to realtime changes so flipping the toggle takes effect immediately
// without any page refresh.
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

    // Realtime: update instantly when admin toggles maintenance mode
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
 
  // Still loading auth or maintenance setting
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
 
  // Not logged in → auth page
  if (!user) return <Navigate to="/auth" replace />
 
  // Ban gate
  if (profile?.is_banned) return <BannedScreen />
 
  // Maintenance gate — superadmins bypass
  const isSuperadmin = profile?.role === 'superadmin'
  if (maintenance.enabled && !isSuperadmin) {
    return <MaintenanceScreen message={maintenance.message} />
  }
 
  // ── Student code gate ──────────────────────────────────
  const needsVerification = !profile?.is_verified && profile?.role === 'user'
  if (needsVerification) {
    return <CodeGatePage />
  }
 
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  const [showSearch, setShowSearch] = useState(false)
  const [subjects, setSubjects] = useState([])

  useEffect(() => {
    supabase.from('subjects').select('*').order('name').then(({ data }) => {
      if (data) setSubjects(data)
    })
  }, [])

  return (
    <>
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
    </BrowserRouter>
  )
}
