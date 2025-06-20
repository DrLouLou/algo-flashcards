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
    e.preventDefault();
    setError('');
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
      );
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      if (!data.access || !data.refresh) {
        throw new Error('Login failed: missing tokens');
      }
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      onLogin(data.access); // update app state
    } catch (err) {
      setError(err.message);
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
        `${import.meta.env.VITE_API_BASE_URL}/register/`,
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
    <div className="fixed inset-0 min-h-screen bg-gray-100 flex items-center justify-center px-4 z-0">
      <div className="max-w-screen-xl w-full bg-white shadow-md rounded-xl overflow-hidden flex flex-col lg:flex-row">
        {/* Form Section */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12">
          <h2 className="mt-8 text-2xl font-extrabold text-center text-gray-900 flex items-center justify-center gap-3">
            <img
              src="/icon.png"
              alt="Card.io Logo"
              className="w-10 h-10 inline-block"
              style={{ marginBottom: 2 }}
            />
            {isSignUp ? 'Create your Card.io account' : 'Log in to Card.io'}
          </h2>

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
              {error}
            </p>
          )}

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="mt-8 space-y-4">
            <input
              name="username"
              type="text"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {isSignUp && (
              <input
                name="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            )}
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {isSignUp && (
              <input
                name="password2"
                type="password"
                placeholder="Confirm Password"
                value={formData.password2}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            )}
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              {isSignUp ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              className="text-indigo-600 hover:underline font-medium"
              onClick={() => {
                setError('')
                setIsSignUp(prev => !prev)
              }}
            >
              {isSignUp ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </div>

        {/* Image Section */}
        <div className="hidden lg:flex w-full lg:w-1/2 bg-indigo-100 items-center justify-center">
          <div
            className="m-12 w-full max-w-md bg-contain bg-center bg-no-repeat"
            style={{
              backgroundImage:
                "url('https://storage.googleapis.com/devitary-image-host.appspot.com/15848031292911696601-undraw_designer_life_w96d.svg')",
              height: '400px',
            }}
          />
        </div>
      </div>
    </div>
  )
}
