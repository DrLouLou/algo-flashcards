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
import About from './About'
import Info from './Info'
import Generate from './Generate'
import CreateDeck from './CreateDeck'
import StudyAlarm from './StudyAlarm'
import MainIcon from '../public/icon.png'
import Profile           from './Profile';
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
      <div className="main-content">
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
                        <div className="icon-title">
                          <img src={MainIcon} />
                          <h1>Card.io</h1>
                        </div>
                      </header>

                      <div className="content">
                        <div className="alarm">
                          <StudyAlarm />
                        </div>
                        <div className="card-and-buttons">
                          <div className="deck-row">
                            <DeckDropdown
                              decks={decks}
                              selectedDeckId={selectedDeckId}
                              onChange={setDeckId}
                            />
                            <Link to="/learn">
                              <button className="learn-btn" disabled={!selectedDeckId}>
                                Learn
                              </button>
                            </Link>
                            <Link to="/cards/new">
                              <button className="new-card-btn">+ New Card</button>
                            </Link>
                            <Link to="/decks/new">
                              <button className="new-deck-btn">+ New Deck</button>
                            </Link>
                          </div>
                          <div className="filter-buttons">
                            {difficultyOptions.map((diff) => (
                              <button
                                key={diff}
                                className={`
                                  filter-btn
                                  ${diff.toLowerCase()}-btn
                                  ${selectedDifficulties.includes(diff) ? "active" : ""}
                                `}
                                onClick={() => toggleDifficulty(diff)}
                              >
                                {diff}
                              </button>
                            ))}
                          </div>
                          <div className="card-container">
                            <CardContainer cardData={filteredCards} />
                          </div>
                        </div>
                      </div>
                  </>
                }
              />
              {/* About */}
              <Route path="/about" element={<About />} />

              {/* Generate */}
              <Route path="/generate" element={<Generate />} />

              {/* Spaced-Repetition */}
              <Route path="/info" element={<Info />} />

              {/* Detail */}
              <Route path="/cards/:id" element={<CardDetail />} />
              
              {/* Create Card */}
              <Route path="/cards/new" element={<CreateCard decks={decks} />} />

              {/* Create Deck */}
              <Route path="/decks/new" element={<CreateDeck />} />

              {/* Learn */}
              <Route
                path="/learn"
                element={
                  <Learn
                    selectedDeckId={selectedDeckId} 
                  />
                }
              />
              <Route path="/profile" element={<Profile />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      </div>
    </Router>
  )
}