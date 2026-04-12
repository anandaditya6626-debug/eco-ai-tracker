import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)
const API = import.meta.env.VITE_API_URL || '/api'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(() => localStorage.getItem('cm_token'))
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async (tk) => {
    if (!tk) { setLoading(false); return }
    try {
      const res = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${tk}` } })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else {
        localStorage.removeItem('cm_token')
        setToken(null)
      }
    } catch {
      /* network error — stay logged out */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMe(token) }, [token, fetchMe])

  const login = async (email, password) => {
    const res  = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    localStorage.setItem('cm_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const register = async (name, email, password) => {
    const res  = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')
    localStorage.setItem('cm_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const forgotPassword = async (email) => {
    const res = await fetch(`${API}/auth/forgot-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send reset link')
    return data
  }

  const resetPassword = async (tokenParam, newPassword) => {
    const res = await fetch(`${API}/auth/reset-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenParam, newPassword }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to reset password')
    return data
  }

  const logout = () => {
    localStorage.removeItem('cm_token')
    setToken(null)
    setUser(null)
  }

  const refreshUser = () => fetchMe(token)

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, forgotPassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
