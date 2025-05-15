// src/App.jsx
import { useState, useEffect } from 'react'
import fetchWithAuth from './api'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from 'react-router-dom'

import NavBar        from './NavBar'
import Auth          from './Auth'
import CardContainer from './CardContainer'
import CardDetail    from './CardDetail'
import DeckDropdown  from './DeckDropdown'
import Learn         from './Learn'

import './styles/App.css'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('accessToken'))
  const [decks, setDecks]   = useState([])
  const [selectedDeckId, setDeckId] = useState(null)
  const [cards, setCards]   = useState([])
  const [selectedDifficulties, setSelectedDifficulties] = useState([])

  // Fetch decks when we get a token
  useEffect(() => {
    if (!token) return
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/decks/`)
      .then(r => r.json())
      .then(setDecks)
      .catch(console.error)
  }, [token])

  // Fetch cards whenever token or selectedDeckId changes
  useEffect(() => {
    if (!token) return
    let url = `${import.meta.env.VITE_API_BASE_URL}/cards/`
    if (selectedDeckId) url += `?deck=${selectedDeckId}`
    fetchWithAuth(url)
      .then(r => r.json())
      .then(setCards)
      .catch(console.error)
  }, [token, selectedDeckId])

  // Difficulty filter setup
  const ORDER = ['Easy','Medium','Hard']
  const diffs = Array.from(
    new Set(cards.map(c => c.difficulty).filter(Boolean))
  )
  const difficultyOptions = ORDER.filter(d => diffs.includes(d))

  const toggleDifficulty = d => {
    setSelectedDifficulties(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    )
  }
  const filteredCards = selectedDifficulties.length
    ? cards.filter(c => selectedDifficulties.includes(c.difficulty))
    : cards

  return (
    <Router>
      {/* Navbar always, but its logout button only shows when authed */}
      <NavBar
        onLogout={() => {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          setToken(null)
        }}
        showLogout={!!token}
      />

      <Routes>
        {/* PUBLIC: login & sign-up */}
        <Route
          path="/login"
          element={
            token
              ? <Navigate to="/" replace />
              : <Auth onLogin={tok => setToken(tok)} />
          }
        />

        {/* PROTECTED: everything else */}
        <Route
          path="/*"
          element={
            token
              ? <ProtectedApp
                  decks={decks}
                  selectedDeckId={selectedDeckId}
                  setDeckId={setDeckId}
                  cards={cards}
                  filteredCards={filteredCards}
                  difficultyOptions={difficultyOptions}
                  selectedDifficulties={selectedDifficulties}
                  toggleDifficulty={toggleDifficulty}
                />
              : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </Router>
  )
}

// A small sub-component to hold all of your protected routes:
function ProtectedApp({
  decks,
  selectedDeckId,
  setDeckId,
  cards,
  filteredCards,
  difficultyOptions,
  selectedDifficulties,
  toggleDifficulty,
}) {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <header className="header">
                <h1>Flashcards by Deck</h1>
                <DeckDropdown
                  decks={decks}
                  selectedDeckId={selectedDeckId}
                  onChange={setDeckId}
                />
                <Link to="/learn">
                  <button
                    className="learn-btn"
                    disabled={!selectedDeckId}
                  >
                    Learn
                  </button>
                </Link>
              </header>

              <div className="card-list-page">
                <h3>Your Flashcards:</h3>
                <div className="filter-buttons">
                  {difficultyOptions.map(diff => (
                    <button
                      key={diff}
                      className={`filter-btn ${diff.toLowerCase()}-btn ${
                        selectedDifficulties.includes(diff) ? 'active' : ''
                      }`}
                      onClick={() => toggleDifficulty(diff)}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
                <CardContainer cardData={filteredCards} />
              </div>
            </>
          }
        />

        <Route path="/cards/:id" element={<CardDetail />} />
        <Route path="/learn" element={<Learn cards={cards} />} />

        {/* any other path → back home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
