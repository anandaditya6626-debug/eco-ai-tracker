import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthModal({ isOpen, mode, onClose, onSwitchMode }) {
  const { login, register, forgotPassword, resetPassword } = useAuth()
  const navigate = useNavigate()
  
  const [form, setForm]       = useState({ name: '', email: '', password: '', newPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [resetToken, setResetToken] = useState('') // Development mock

  // Reset internal states when modal closes or switches significantly
  useEffect(() => {
    if (!isOpen) {
      setForm({ name: '', email: '', password: '', newPassword: '' })
      setError('')
      setSuccess('')
      setResetToken('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
    setSuccess('')
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
        onClose()
        navigate('/dashboard')
      } else if (mode === 'register') {
        if (!form.name.trim()) { setError('Name is required'); setLoading(false); return }
        await register(form.name, form.email, form.password)
        onClose()
        navigate('/dashboard')
      } else if (mode === 'forgot-password') {
        const data = await forgotPassword(form.email)
        // Simulated behavior for local development
        setResetToken(data.resetToken)
        setSuccess('Simulated Email Sent! Redirecting to reset screen...')
        setTimeout(() => {
          setSuccess('')
          onSwitchMode('reset-password')
        }, 2000)
      } else if (mode === 'reset-password') {
        if (!form.newPassword) { setError('New password is required'); setLoading(false); return }
        await resetPassword(resetToken, form.newPassword)
        setSuccess('Password updated securely! Redirecting to login...')
        setTimeout(() => {
          setSuccess('')
          setForm(f => ({ ...f, password: '', newPassword: '' }))
          onSwitchMode('login')
        }, 2000)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      if (mode !== 'forgot-password' && mode !== 'reset-password') {
        setLoading(false)
      } else if (error) {
        setLoading(false) // Only clear loading immediately if error
      } else {
        setTimeout(() => setLoading(false), 2000) // Keep loading during redirect
      }
    }
  }

  const getTitle = () => {
    switch(mode) {
      case 'login': return 'Welcome Back'
      case 'register': return 'Join Eco AI Tracker'
      case 'forgot-password': return 'Reset Password'
      case 'reset-password': return 'New Password'
      default: return ''
    }
  }

  const getSubtitle = () => {
    switch(mode) {
      case 'login': return 'Track and reduce your carbon footprint'
      case 'register': return 'Start your eco journey today'
      case 'forgot-password': return "Enter your email and we'll send a reset link"
      case 'reset-password': return 'Enter your new secure password'
      default: return ''
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if(e.target === e.currentTarget) onClose() }}>
      <div className="modal-card">
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-logo">🌿</div>
        <h2 className="modal-title">{getTitle()}</h2>
        <p className="modal-sub">{getSubtitle()}</p>

        <form className="modal-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label>Name</label>
              <input type="text" name="name" placeholder="Your name" value={form.name} onChange={handleChange} required />
            </div>
          )}
          
          {(mode === 'login' || mode === 'register' || mode === 'forgot-password') && (
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Password</label>
              <input type="password" name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required minLength={6} />
              {mode === 'login' && (
                <button 
                  type="button" 
                  onClick={() => { setError(''); setSuccess(''); onSwitchMode('forgot-password'); }}
                  style={{ position: 'absolute', right: 0, top: 0, background: 'none', border: 'none', color: 'var(--green)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  Forgot?
                </button>
              )}
            </div>
          )}

          {mode === 'reset-password' && (
             <div className="form-group">
               <label>New Password</label>
               <input type="password" name="newPassword" placeholder="••••••••" value={form.newPassword} onChange={handleChange} required minLength={6} />
             </div>
          )}

          {error && <div className="form-error">⚠️ {error}</div>}
          {success && <div className="form-error" style={{ background: 'rgba(0,255,136,0.1)', borderColor: 'rgba(0,255,136,0.3)', color: 'var(--green)' }}>✅ {success}</div>}

          <button type="submit" className="modal-submit" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : null}
            {loading ? 'Please wait…' : 
              mode === 'login' ? 'Log In' : 
              mode === 'register' ? 'Create Account' : 
              mode === 'forgot-password' ? 'Send Reset Link' : 'Set New Password'
            }
          </button>
        </form>

        {(mode === 'login' || mode === 'register') && (
          <p className="modal-switch">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setError(''); setSuccess(''); onSwitchMode(mode === 'login' ? 'register' : 'login') }}>
              {mode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        )}
        
        {(mode === 'forgot-password' || mode === 'reset-password') && (
          <p className="modal-switch">
            Remembered your password?{' '}
            <button onClick={() => { setError(''); setSuccess(''); onSwitchMode('login') }}>
              Log In
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
