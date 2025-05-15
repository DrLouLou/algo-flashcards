// src/Login.jsx
import { useState } from 'react'
import './styles/Login.css'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/token/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
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

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-card">
        <h2 className="login-title">Welcome To Loopy</h2>
        {error && <p className="login-error">{error}</p>}
        <div className="login-field">
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="login-field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="login-button">Log In</button>
      </form>
    </div>
  )
}
