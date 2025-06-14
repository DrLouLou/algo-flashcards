import Editor from '@monaco-editor/react'
import { useState, useEffect, useRef } from 'react'

import { useParams, Link } from 'react-router-dom'
import fetchWithAuth from './api'
import './styles/CardDetail.css'
import TagEditor from './TagEditor'

export default function CardDetail() {
  const { id } = useParams()
  const [formData, setFormData] = useState(null)
  const [initialData, setInitialData] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const API = import.meta.env.VITE_API_BASE_URL
  const editorRef = useRef(null)

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
  // Tag change handler
  const handleTagsChange = tags => {
    setFormData(prev => ({ ...prev, tags: tags.join(',') }));
  };
  // Add status update handler (if userCardId/status available)
  const updateStatus = (status) => {
    if (!formData.userCardId) return;
    fetchWithAuth(`${API}/usercards/${formData.userCardId}/set_status/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
      .then(r => r.ok ? r.json() : Promise.reject('Status update failed'))
      .then(() => setFormData(f => ({ ...f, status })))
      .catch(console.error);
  };

  return (
    <div className="">
      <Link to={'/'}>
        <button>Back</button>
      </Link>
      <div className="card-detail container">
        <h1>{formData.problem}</h1>
        {/* TAGS: show in both modes */}
        <div className="mb-4">
          <strong>Tags:</strong>{' '}
          {isEditing ? (
            <TagEditor
              tags={formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []}
              onChange={tagsArr => handleTagsChange(tagsArr)}
            />
          ) : (
            (formData.tags || '').split(',').filter(Boolean).map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))
          )}
        </div>
        {/* Status controls if available */}
        {formData.status && (
          <div className="mb-4 flex gap-2">
            <strong>Status:</strong>
            {['new','review','known'].map(s => (
              <button
                key={s}
                className={`px-3 py-1 rounded-full border text-xs ${formData.status === s ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => updateStatus(s)}
                disabled={formData.status === s}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}

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
                <Editor
                height="300px"
                defaultLanguage="javascript"
                value={formData.solution}
                onChange={(value) =>
                    setFormData(prev => ({ ...prev, solution: value }))
                }
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                }}
                onMount={(editor) => (editorRef.current = editor)}
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
                <Editor
                    height="300px"
                    defaultLanguage="python"
                    value={formData.pseudo}
                    options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    }}
                />
                <h2>Solution</h2>
                <div className="solution-editor">
                <Editor
                    height="300px"
                    defaultLanguage="python"
                    value={formData.solution}
                    options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    }}
                />
                </div>

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
