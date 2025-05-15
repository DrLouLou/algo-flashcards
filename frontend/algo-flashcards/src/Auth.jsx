// src/Auth.jsx
import { useState } from 'react'
import './styles/Auth.css'


export default function Auth({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
  })
  const [error, setError] = useState('')

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const parseErrors = errData => {
    if (typeof errData === 'string') return errData
    if (errData.detail) return errData.detail
    const parts = []
    for (const [field, msgs] of Object.entries(errData)) {
      msgs.forEach(msg => {
        // pretty‐print field names
        const label = field === 'password2'
          ? 'Confirm Password'
          : field.charAt(0).toUpperCase() + field.slice(1)
        parts.push(`${label}: ${msg}`)
      })
    }
    return parts.join(' — ')
  }

  const handleLogin = async e => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/token/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
          }),
        }
      )
      if (!res.ok) throw new Error('Invalid credentials')
      const data = await res.json()
      localStorage.setItem('accessToken', data.access)
      localStorage.setItem('refreshToken', data.refresh)
      onLogin(data.access)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSignUp = async e => {
    e.preventDefault()
    setError('')
    if (formData.password !== formData.password2) {
      setError("Passwords don't match")
      return
    }
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/register/`, // adjust if your endpoint differs
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            password2: formData.password2,
          }),
        }
      )
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(parseErrors(errData))
      }
      // on successful signup, switch back to login
      setIsSignUp(false)
      setError('Account created! Please log in.')
      setFormData({ username: '', email: '', password: '', password2: '' })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>{isSignUp ? 'Sign Up' : 'Log In'}</h2>
        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
          <label className="auth-field">
            Username
            <input
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </label>

          {isSignUp && (
            <label className="auth-field">
              Email
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </label>
          )}

          <label className="auth-field">
            Password
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </label>

          {isSignUp && (
            <label className="auth-field">
              Confirm Password
              <input
                name="password2"
                type="password"
                value={formData.password2}
                onChange={handleChange}
                required
              />
            </label>
          )}

          <button type="submit" className="auth-button">
            {isSignUp ? 'Create Account' : 'Log In'}
          </button>
        </form>

        <p className="auth-toggle">
          {isSignUp
            ? 'Already have an account?'
            : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setError('')
              setIsSignUp(f => !f)
            }}
            className="toggle-btn"
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  )
}
