import React, { useState, useEffect } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from 'react-router-dom'
import fetchWithAuth from './api'

import NavBar        from './NavBar'
import Auth          from './Auth'
import CardContainer from './CardContainer'
import CardDetail    from './CardDetail'
import DeckDropdown  from './DeckDropdown'
import Learn         from './Learn'
import CreateCard from './CreateCard'

import './styles/App.css'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('accessToken'))
  const [decks, setDecks] = useState([])
  const [selectedDeckId, setDeckId] = useState(null)
  const [cards, setCards] = useState([])
  const [selectedDifficulties, setSelectedDifficulties] = useState([])

  // 1) Load decks when authenticated
  useEffect(() => {
    if (!token) return
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/decks/`)
      .then(res => res.json())
      .then(setDecks)
      .catch(console.error)
  }, [token])

  // 2) Load cards whenever deck changes
  useEffect(() => {
    if (!token) return
    let url = `${import.meta.env.VITE_API_BASE_URL}/cards/`
    if (selectedDeckId) url += `?deck=${selectedDeckId}`
    fetchWithAuth(url)
      .then(res => res.json())
      .then(setCards)
      .catch(console.error)
  }, [token, selectedDeckId])

  // 3) Difficulty filter setup
  const ORDER = ['Easy', 'Medium', 'Hard']
  const diffs = Array.from(new Set(cards.map(c => c.difficulty).filter(Boolean)))
  const difficultyOptions = ORDER.filter(d => diffs.includes(d))

  const toggleDifficulty = diff =>
    setSelectedDifficulties(prev =>
      prev.includes(diff) ? prev.filter(x => x !== diff) : [...prev, diff]
    )

  const filteredCards = selectedDifficulties.length
    ? cards.filter(c => selectedDifficulties.includes(c.difficulty))
    : cards

  return (
    <Router>
      <NavBar
        onLogout={() => {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          setToken(null)
        }}
        showLogout={!!token}
      />

      <Routes>
        {/* PUBLIC */}
        <Route
          path="/login"
          element={
            token
              ? <Navigate to="/" replace />
              : <Auth onLogin={tok => setToken(tok)} />
          }
        />

        {/* PROTECTED */}
        {token ? (
          <>
            {/* Home */}
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
                  <Link to="/cards/new">
                    <button className="new-card-btn" disabled={!selectedDeckId}>
                      + New Card
                    </button>
                  </Link>
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

            {/* Detail */}
            <Route path="/cards/:id" element={<CardDetail />} />
            
            {/* Create Card */}
            <Route path="/cards/new" element={<CreateCard decks={decks} />} />

            {/* Learn */}
            <Route
              path="/learn"
              element={
                <Learn
                  selectedDeckId={selectedDeckId} 
                />
              }
            />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  )
}