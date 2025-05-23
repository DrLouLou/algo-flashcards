// src/CreateCard.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import fetchWithAuth from './api'
import './styles/CreateCard.css'

export default function CreateCard({ decks }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    deck: decks.length ? decks[0].id : '',
    problem: '',
    difficulty: '',
    category: '',
    hint: '',
    pseudo: '',
    solution: '',
    complexity: ''
  })
  const [error, setError] = useState(null)

  const handleChange = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/cards/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(JSON.stringify(data))
      }
      navigate('/')  // back to list
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="create-card-page">
      <h2>New Flashcard</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit} className="create-card-form">
        <label>
          Deck
          <select name="deck" value={form.deck} onChange={handleChange} required>
            {decks.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>

        {['problem','difficulty','category','hint','complexity'].map(field => (
          <label key={field}>
            {field.charAt(0).toUpperCase() + field.slice(1)}
            <input
              name={field}
              value={form[field]}
              onChange={handleChange}
              required={field === 'problem' || field === 'difficulty'}
            />
          </label>
        ))}

        <label>
          Pseudocode
          <textarea name="pseudo" value={form.pseudo} onChange={handleChange} />
        </label>

        <label>
          Solution
          <textarea name="solution" value={form.solution} onChange={handleChange} />
        </label>

        <button type="submit" className="save-btn">Create Card</button>
        <button type="button" onClick={() => navigate(-1)} className="cancel-btn">
          Cancel
        </button>
      </form>
    </div>
  )
}
