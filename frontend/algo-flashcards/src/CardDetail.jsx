import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import fetchWithAuth from './api'
import './styles/CardDetail.css'

export default function CardDetail() {
  const { id } = useParams()
  const [formData, setFormData] = useState(null)
  const [initialData, setInitialData] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const API = import.meta.env.VITE_API_BASE_URL

  useEffect(() => {
    fetchWithAuth(`${API}/cards/${id}/`)
      .then(res => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json()
      })
      .then(card => {
        setFormData(card)
        setInitialData(card)
      })
      .catch(console.error)
  }, [API, id])

  if (!formData) return <p>Loading…</p>

  // Shared handlers
  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  const handleSave = () => {
    fetchWithAuth(`${API}/cards/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
      .then(res => {
        if (!res.ok) throw new Error('Save failed')
        return res.json()
      })
      .then(updated => {
        setFormData(updated)
        setInitialData(updated)
        setIsEditing(false)
        alert('Saved successfully!')
      })
      .catch(err => alert(`Error: ${err.message}`))
  }
  const handleReset = () => setFormData(initialData)
  const handleCancel = () => {
    setFormData(initialData)
    setIsEditing(false)
  }
  const toggleFlip = () => {
    setIsFlipped(f => !f)
    setShowHint(false)
  }

  return (
    <div>
        <Link to={'/'}>
            <button>Back</button>
        </Link>
        <div className="card-detail container">
        <h1>{formData.problem}</h1>

        {isEditing ? (
            // EDIT MODE: show all fields as inputs
            <>
            <label>
                Difficulty
                <input
                type="text"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                />
            </label>

            <label>
                Category
                <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                />
            </label>

            <label>
                Hint
                <input
                type="text"
                name="hint"
                value={formData.hint}
                onChange={handleChange}
                />
            </label>

            <label>
                Pseudocode
                <textarea
                name="pseudo"
                value={formData.pseudo}
                onChange={handleChange}
                />
            </label>

            <label>
                Solution
                <textarea
                name="solution"
                value={formData.solution}
                onChange={handleChange}
                />
            </label>

            <label>
                Complexity
                <input
                type="text"
                name="complexity"
                value={formData.complexity}
                onChange={handleChange}
                />
            </label>
            </>
        ) : (
            // VIEW MODE: front or back
            <>
            {!isFlipped ? (
                // FRONT SIDE
                <>
                <h2>Difficulty</h2>
                <p>
                    <span className={`difficulty-text ${formData.difficulty.toLowerCase()}`}>
                    {formData.difficulty}
                    </span>
                </p>

                <div className="hint-section">
                    <button onClick={() => setShowHint(h => !h)}>
                    {showHint ? 'Hide Hint' : 'Show Hint'}
                    </button>
                    {showHint && (
                    <>
                        <h3>Hint</h3>
                        <p>{formData.hint}</p>
                    </>
                    )}
                </div>
                </>
            ) : (
                // BACK SIDE
                <>
                <h2>Pseudocode</h2>
                <pre>{formData.pseudo}</pre>

                <h2>Solution</h2>
                <pre>{formData.solution}</pre>

                <h2>Complexity</h2>
                <p>{formData.complexity}</p>
                </>
            )}
            </>
        )}

        <div className="button-row">
            {isEditing ? (
            // EDIT MODE BUTTONS
            <>
                <button onClick={handleSave} className="save-btn">Save</button>
                <button onClick={handleReset} className="reset-btn">Reset</button>
                <button onClick={handleCancel} className="cancel-btn">Cancel</button>
            </>
            ) : (
            // VIEW MODE BUTTONS
            <>
                <button onClick={toggleFlip} className="flip-btn">
                    Flip
                {/* {isFlipped ? 'Show Front' : 'Show Back'} */}
                </button>
                <button onClick={() => setIsEditing(true)} className="edit-btn">
                Edit
                </button>
            </>
            )}
            
        </div>
        </div>
    </div>
  )
}
