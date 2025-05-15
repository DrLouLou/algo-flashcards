// src/App.jsx
import { useState, useEffect } from 'react'
import fetchWithAuth from './api'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'
import { Link } from 'react-router-dom'


import NavBar        from './NavBar'
import Login         from './Login'
import CardContainer from './CardContainer'
import CardDetail    from './CardDetail'
import Learn from './Learn'

import './styles/App.css'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('accessToken'))
  const [decks, setDecks] = useState([])
  const [selectedDeckId, setDeckId] = useState(null)
  const [cards, setCards] = useState([])
  const [selectedDifficulties, setSelectedDifficulties] = useState([])

  // 1) Load decks once we have a token
  useEffect(() => {
    if (!token) return
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/decks/`)
      .then(r => r.json())
      .then(setDecks)
      .catch(console.error)
  }, [token])

  // 2) Load cards when token or deck changes
  useEffect(() => {
    if (!token) return
    let url = `${import.meta.env.VITE_API_BASE_URL}/cards/`
    if (selectedDeckId) url += `?deck=${selectedDeckId}`
    fetchWithAuth(url)
      .then(r => r.json())
      .then(setCards)
      .catch(console.error)
  }, [token, selectedDeckId])

  // Difficulty filter
  const ORDER = ['Easy','Medium','Hard']
  const diffs = Array.from(new Set(cards.map(c=>c.difficulty).filter(Boolean)))
  const difficultyOptions = ORDER.filter(d=>diffs.includes(d))

  const toggleDifficulty = d => {
    setSelectedDifficulties(prev =>
      prev.includes(d) ? prev.filter(x=>x!==d) : [...prev,d]
    )
  }
  const filtered = selectedDifficulties.length
    ? cards.filter(c=>selectedDifficulties.includes(c.difficulty))
    : cards

  return (
    <Router>
      {/* Navbar always, but hide logout if not authed */}
      <NavBar
        onLogout={()=>{
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          setToken(null)
        }}
        showLogout={!!token}
      />

      <Routes>
        {/* LOGIN */}
        <Route
          path="/login"
          element={
            token
              ? <Navigate to="/" replace />
              : <Login onLogin={tok=>setToken(tok)} />
          }
        />
        <Route
          path="/learn"
          element={<Learn cards={cards} />}
        />

        {/* HOME: deck selector + card list */}
        <Route
          path="/"
          element={
            token
              ? (
                <>
                  <header className="header">
                    <h1>Flashcards by Deck</h1>
                    <select
                      value={selectedDeckId||''}
                      onChange={e=>setDeckId(e.target.value||null)}
                    >
                      <option value="">All Decks</option>
                      {decks.map(d=>(
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    
                  </header>

                  <div className="card-list-page">
                    <h3>Your Flashcards:</h3>
                    <Link to="/learn">
                      <button
                        className="learn-btn"
                        disabled={!selectedDeckId}
                      >
                        Learn
                      </button>
                    </Link>
                    <div className="filter-buttons">
                      {difficultyOptions.map(diff=>{
                        const active = selectedDifficulties.includes(diff)
                        return (
                          <button
                            key={diff}
                            className={`filter-btn ${diff.toLowerCase()}-btn ${active?'active':''}`}
                            onClick={()=>toggleDifficulty(diff)}
                          >
                            {diff}
                          </button>
                        )
                      })}
                    </div>
                    <CardContainer cardData={filtered} />
                  </div>
                </>
              )
              : <Navigate to="/login" replace />
          }
        />

        {/* DETAIL */}
        <Route
          path="/cards/:id"
          element={
            token
              ? <CardDetail />
              : <Navigate to="/login" replace />
          }
        />

        {/* CATCH-ALL */}
        <Route
          path="*"
          element={<Navigate to={token ? "/" : "/login"} replace />}
        />
      </Routes>

      <footer>
        <p>created by LCC</p>
      </footer>
    </Router>
  )
}
