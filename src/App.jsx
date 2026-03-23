import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import FeedPage from './pages/FeedPage'
import MessagesPage from './pages/MessagesPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import EnrolledSubjectsPage from './pages/EnrolledSubjectsPage'
import AppsPage from './pages/AppsPage'
import ProfilePage from './pages/ProfilePage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 16px rgba(192,57,43,0.3)' }}>
            <img src="/announce.png" alt="CSB" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <p style={{ fontSize: 13, color: '#8A8D91', fontFamily: '"Instrument Sans", system-ui', fontWeight: 500, margin: 0 }}>
            Loading CSB…
          </p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/auth" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<ProtectedRoute><Layout><FeedPage /></Layout></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Layout><MessagesPage /></Layout></ProtectedRoute>} />
      <Route path="/announcements" element={<ProtectedRoute><Layout><AnnouncementsPage /></Layout></ProtectedRoute>} />
      <Route path="/subjects" element={<ProtectedRoute><Layout><EnrolledSubjectsPage /></Layout></ProtectedRoute>} />
      <Route path="/apps" element={<ProtectedRoute><Layout><AppsPage /></Layout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
      {/* old /chat route redirects to /messages so no broken links */}
      <Route path="/chat" element={<Navigate to="/messages" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  )
}
