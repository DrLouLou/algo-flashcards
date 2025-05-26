// src/Generate.jsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import fetchWithAuth, { generateCard } from "./api"  // assume generateCard POSTS to /api/generate_card/
import "./styles/CreateCard.css"                   // reuse your CreateCard styles

export default function Generate() {
  const [input, setInput]     = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  const [decks, setDecks] = useState([])
  const [form, setForm]   = useState(null)

  const nav = useNavigate()
  const API = import.meta.env.VITE_API_BASE_URL

  // 1) load decks so user can assign the new card to one
  useEffect(() => {
    fetchWithAuth(`${API}/decks/`)
      .then(r => r.json())
      .then(setDecks)
      .catch(console.error)
  }, [API])

  // 2) after LLM returns, initialize the form
  const handleGenerate = async e => {
    e.preventDefault()
    setError("")
    setLoading(true)
    setForm(null)
    try {
      const data = await generateCard(input)
      // only difference from your old code: seed in the deck ID default
      setForm({
        deck: decks.length ? decks[0].id : "",
        problem:   data.problem    || "",
        difficulty:data.difficulty || "",
        category:  data.category   || "",
        hint:      data.hint       || "",
        pseudo:    data.pseudo     || "",
        solution:  data.solution   || "",
        complexity:data.complexity || "",
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 3) user-edited form state
  const handleChange = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  // 4) submit the final card to your backend
  const handleSave = async e => {
    e.preventDefault()
    try {
      const res = await fetchWithAuth(`${API}/cards/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(JSON.stringify(body))
      }
      // on success, go back home (or wherever)
      nav("/")
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="create-card-page" style={{ padding: "2rem" }}>
      <button onClick={() => nav(-1)} className="cancel-btn">
        ← Back
      </button>
      <h1>Generate a New Flashcard</h1>

      {/* step 1: your prompt form */}
      {!form && (
        <form onSubmit={handleGenerate} style={{ marginBottom: "2rem" }}>
          <textarea
            rows={6}
            style={{ width: "100%", marginBottom: "1rem" }}
            placeholder="Enter a problem name or full description…"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="login-button"
          >
            {loading ? "Generating…" : "Generate"}
          </button>
        </form>
      )}

      {error && <p className="error">{error}</p>}

      {/* step 2: once we have `form`, render a full CreateCard-style form */}
      {form && (
        <form
          onSubmit={handleSave}
          className="create-card-form"
          style={{ marginTop: "2rem" }}
        >
          <h2>Edit &amp; Save Your Flashcard</h2>

          <label>
            Deck
            <select
              name="deck"
              value={form.deck}
              onChange={handleChange}
              required
            >
              {decks.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          {[
            "problem",
            "difficulty",
            "category",
            "hint",
            "complexity",
          ].map(field => (
            <label key={field}>
              {field[0].toUpperCase() + field.slice(1)}
              <input
                name={field}
                value={form[field]}
                onChange={handleChange}
                required={field === "problem" || field === "difficulty"}
              />
            </label>
          ))}

          <label>
            Pseudocode
            <textarea
              name="pseudo"
              value={form.pseudo}
              onChange={handleChange}
            />
          </label>

          <label>
            Solution
            <textarea
              name="solution"
              value={form.solution}
              onChange={handleChange}
            />
          </label>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button type="submit" className="save-btn">
              Save Card
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="cancel-btn"
            >
              Regenerate
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
