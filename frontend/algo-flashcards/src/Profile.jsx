import { useEffect, useState } from 'react'
import fetchWithAuth from './api'
import SettingsPanel from './SettingsPanel'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [decks, setDecks] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/me/`)
      .then(res => res.json())
      .then(setUser)
      .catch(() => setError('Could not load user info'))
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/decks/`)
      .then(res => res.json())
      .then(setDecks)
      .catch(() => setError('Could not load decks'))
  }, [])

  const toggleShare = async (deck) => {
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/decks/${deck.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared: !deck.shared })
      })
      if (!res.ok) throw new Error('Failed to update deck')
      setDecks(decks => decks.map(d => d.id === deck.id ? { ...d, shared: !d.shared } : d))
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
        {decks.filter(d => d.owner === user.username).map(deck => (
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
