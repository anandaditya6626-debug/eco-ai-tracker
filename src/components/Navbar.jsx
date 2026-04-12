import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthModal from './AuthModal'
import TrackerToggle from './TrackerToggle'

const NAV_LINKS = [
  { path: '/dashboard',  label: 'Dashboard',  icon: '📊' },
  { path: '/calculator', label: 'Calculator', icon: '🧮' },
  { path: '/chat',       label: 'AI Chat',    icon: '🤖' },
  { path: '/optimizer',  label: 'Optimizer',  icon: '⚡' },
  { path: '/profile',    label: 'Profile',    icon: '🏆' },
]

export default function Navbar() {
  const { user, logout }    = useAuth()
  const location            = useLocation()
  const navigate            = useNavigate()
  const [authOpen, setAuthOpen]     = useState(false)
  const [authMode, setAuthMode]     = useState('login')
  const [menuOpen, setMenuOpen]     = useState(false)

  const openLogin    = () => { setAuthMode('login');    setAuthOpen(true) }
  const openSignup   = () => { setAuthMode('register'); setAuthOpen(true) }
  const handleLogout = () => { logout(); navigate('/') }

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="nav-logo">
          <svg viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="#00ff88" strokeWidth="2" opacity="0.3"/>
            <path d="M20 8 C12 14 10 22 20 28 C30 22 28 14 20 8Z" fill="#00ff88" opacity="0.8"/>
            <path d="M20 28 L20 36" stroke="#00ff88" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="20" cy="20" r="4" fill="#00ffe5"/>
          </svg>
          Eco AI Tracker
        </Link>

        {user && (
          <ul className="nav-links">
            {NAV_LINKS.map(l => (
              <li key={l.path}>
                <Link to={l.path} className={location.pathname === l.path ? 'active' : ''}>
                  {l.icon} {l.label}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="nav-actions">
          {window.electron && (
            <TrackerToggle />
          )}
          {user ? (
            <div className="nav-user">
              <div className="nav-user-info">
                <span className="nav-user-name">👤 {user.name}</span>
                <span className="nav-user-pts">⚡ {user.ecoPoints ?? 0} pts</span>
              </div>
              <button className="nav-btn nav-btn-outline" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <div className="nav-auth-btns">
              <button className="nav-btn nav-btn-ghost" onClick={openLogin}>Log In</button>
              <button className="nav-btn nav-btn-primary" onClick={openSignup}>Get Started</button>
            </div>
          )}
          <button className="mobile-toggle" onClick={() => setMenuOpen(m => !m)} aria-label="Menu">
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {user ? (
            <>
              {NAV_LINKS.map(l => (
                <Link key={l.path} to={l.path} className="mobile-link" onClick={() => setMenuOpen(false)}>
                  {l.icon} {l.label}
                </Link>
              ))}
              <button className="nav-btn nav-btn-outline" style={{marginTop:8}} onClick={() => { handleLogout(); setMenuOpen(false) }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button className="nav-btn nav-btn-ghost" onClick={() => { openLogin(); setMenuOpen(false) }}>Log In</button>
              <button className="nav-btn nav-btn-primary" onClick={() => { openSignup(); setMenuOpen(false) }}>Get Started</button>
            </>
          )}
        </div>
      )}

      <AuthModal isOpen={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} onSwitchMode={setAuthMode} />
    </>
  )
}
