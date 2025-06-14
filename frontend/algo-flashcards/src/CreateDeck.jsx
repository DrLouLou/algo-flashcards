// src/CreateDeck.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import fetchWithAuth from './api'
import './styles/CreateDeck.css'

export default function CreateDeck({reloadDecks}) {
  const [form, setForm] = useState({ name: '', description: '' })
  const [error, setError] = useState(null)
  const nav = useNavigate()

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/decks/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(JSON.stringify(data))
      }
      const newDeck = await res.json()
      // go pick that deck in your dropdown
      reloadDecks();
      nav('/', { state: { selectDeck: newDeck.id } })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="create-deck-page">
      <h2>New Deck</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit} className="create-deck-form">
        <label>
          Name
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
          />
        </label>
        <button type="submit" className="save-btn">Create Deck</button>
        <button
          type="button"
          onClick={() => nav(-1)}
          className="cancel-btn"
        >
          Cancel
        </button>
      </form>
    </div>
  )
}
