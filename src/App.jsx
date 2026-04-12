import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import Navbar from './components/Navbar'
import ParticleCanvas from './components/ParticleCanvas'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Calculator from './pages/Calculator'
import Chat from './pages/Chat'
import Optimizer from './pages/Optimizer'
import Profile from './pages/Profile'
import DesktopTracker from './components/DesktopTracker'
import FloatingNotification from './components/FloatingNotification'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="loading-screen">
      <div className="loading-logo">🌿 Eco AI Tracker</div>
      <div className="loading-spinner" />
    </div>
  )
  if (!user) return <Navigate to="/" replace />
  return children
}

function AppInner() {
  const location = useLocation()
  const isOverlay = location.pathname === '/tracker' || location.pathname === '/notification'

  return (
    <>
      {!isOverlay && <ParticleCanvas />}
      {!isOverlay && <div className="bg-gradient" />}
      {!isOverlay && <Navbar />}
      <Routes>
        <Route path="/tracker"      element={<DesktopTracker />} />
        <Route path="/notification" element={<FloatingNotification />} />
        <Route path="/"             element={<Landing />} />
        <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/calculator"  element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
        <Route path="/chat"        element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/optimizer"   element={<ProtectedRoute><Optimizer /></ProtectedRoute>} />
        <Route path="/profile"     element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppInner />
      </DataProvider>
    </AuthProvider>
  )
}
