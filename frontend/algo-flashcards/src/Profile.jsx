import { useEffect, useState } from 'react'
import fetchWithAuth from './api'
import SettingsPanel from './SettingsPanel'

export default function Profile() {
  // Defensive: check for token before fetching user or decks
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || typeof token !== 'string' || token.length < 10) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  }, []);

  const [user, setUser] = useState(null)
  const [decks, setDecks] = useState({ results: [] })
  const [error, setError] = useState('')

  const loadUser = () => {
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/me/`)
      .then(res => res.json())
      .then(setUser)
      .catch(() => setError('Could not load user info'))
  }

  const loadDecks = () => {
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/decks/`)
      .then(res => res.json())
      .then(setDecks)
      .catch(() => setError('Could not load decks'))
  }

  useEffect(() => {
    loadUser()
    loadDecks()
  }, [])

  const toggleShare = async (deck) => {
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/decks/${deck.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared: !deck.shared })
      })
      if (!res.ok) throw new Error('Failed to update deck')
      loadDecks() // Reload decks from backend after update
    } catch {
      setError('Failed to update deck')
    }
  }

  if (error) return <div>{error}</div>
  if (!user) return <div>Loading...</div>

  return (
    <div className="profile-page">
      <h2>User Profile</h2>
      <p><b>Username:</b> {user.username}</p>
      <p><b>Email:</b> {user.email}</p>
      <h3>Your Decks</h3>
      <ul>
        {Array.isArray(decks.results) && decks.results.map(deck => (
          <li key={deck.id}>
            <b>{deck.name}</b> - Shared: {deck.shared ? 'Yes' : 'No'}
            <button style={{marginLeft:8}} onClick={() => toggleShare(deck)}>
              {deck.shared ? 'Unshare' : 'Share'}
            </button>
          </li>
        ))}
      </ul>
      <SettingsPanel />
    </div>
  )
}
