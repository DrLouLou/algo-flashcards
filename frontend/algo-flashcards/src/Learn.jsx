// src/Learn.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import fetchWithAuth from './api'
import ChartDropdown from './ChartDropdown.jsx'

import './styles/Learn.css'

export default function Learn({ selectedDeckId }) {
  const [queue, setQueue]       = useState([])
  const [distribution, setDistribution] = useState({
    none: 0, again: 0, hard: 0, good: 0, easy: 0
  })
//   console.log("distribution is: ", distribution)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)   // <-- new
  const navigate                = useNavigate()
  const API                     = import.meta.env.VITE_API_BASE_URL

  // 1) fetch the “due now” queue
  const fetchQueue = useCallback(() => {
    let url = `${API}/usercards/queue/`
    if (selectedDeckId) url += `?deck=${selectedDeckId}`

    return fetchWithAuth(url)
      .then(r => r.json())
      .then(raw => {
        const items = Array.isArray(raw) ? raw : raw.results || []
        setQueue(items.map(uc => ({
          ...uc.card,
          userCardId: uc.id,
          last_rating: uc.last_rating
        })))
        setIsFlipped(false)
        setShowHint(false)
      })
      .catch(console.error)
  }, [API, selectedDeckId])

  // 2) fetch the full‐deck rating distribution
  const fetchDistribution = useCallback(() => {
    if (!selectedDeckId) return Promise.resolve()
    const url = `${API}/usercards/?deck=${selectedDeckId}`
    return fetchWithAuth(url)
      .then(r => r.json())
      .then(raw => {
        const items = Array.isArray(raw) ? raw : raw.results || []
        const dist = items.reduce((acc, uc) => {
          const key = uc.last_rating || 'none'
          if (acc[key] != null) acc[key]++
          return acc
        }, { none:0, again:0, hard:0, good:0, easy:0 })
        setDistribution(dist)
      })
      .catch(console.error)
  }, [API, selectedDeckId])

  // 3) on mount or deck change
  useEffect(() => {
    fetchQueue()
    fetchDistribution()
  }, [fetchQueue, fetchDistribution])

  // nothing due?
  if (queue.length === 0) {
    return (
      <div className="learn-page">
        <p>No cards available to learn.</p>
        <button onClick={() => navigate(-1)} className="back-btn">
          Back
        </button>
      </div>
    )
  }

  // front of the queue
  const card = queue[0]

  // handle rating
  function handleRating(rating) {
    setQueue(q => q.slice(1))
    setIsFlipped(false)
    setShowHint(false)

    fetchWithAuth(`${API}/usercards/${card.userCardId}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ last_rating: rating }),
    })
      .then(r => (r.ok ? r.json() : Promise.reject('Save failed')))
      .then(() => Promise.all([fetchQueue(), fetchDistribution()]))
      .catch(console.error)
  }

  const handleFlip = () => {
    setIsFlipped(f => !f)
    setShowHint(false)
  }

  // called once user confirms in modal
  const doResetAll = () => {
    setShowConfirm(false)
    fetchWithAuth(`${API}/usercards/reset/?deck=${selectedDeckId}`, {
      method: 'POST',
    })
      .then(r => {
        if (!r.ok) throw new Error('Reset failed')
        return r.json()
      })
      .then(() => {
        fetchQueue()
        fetchDistribution()
      })
      .catch(console.error)
  }

  return (
    <div className="learn-page">
      {/* confirm‐reset modal */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <p>Are you sure you want to reset all progress?</p>
            <div className="modal-buttons">
              <button onClick={() => setShowConfirm(false)}>Cancel</button>
              <button onClick={doResetAll} className="reset-btn">Yes, reset</button>
            </div>
          </div>
        </div>
      )}

      {/* top row: Back + Reset */}
      <div className="top-button-row">
        <button onClick={() => navigate(-1)} className="back-btn">
          Back
        </button>
        <button onClick={() => setShowConfirm(true)} className="reset-btn">
          Reset Progress
        </button>
      </div>

      <ChartDropdown distribution={distribution} />

      {/* the card itself */}
      <div className="learn-card-row">
        <div className="learn-card-container">
          <div className={`learn-card ${isFlipped ? 'flipped' : ''}`}>
            <div className="flip-inner">

              {/* FRONT: show full-deck distribution */}
              <div className="flip-front">
                <div className="rating-summary">
                  <span className="none-text">None: {distribution.none}</span>
                  <span className="again-text">Again: {distribution.again}</span>
                  <span className="hard-text">Hard: {distribution.hard}</span>
                  <span className="good-text">Good: {distribution.good}</span>
                  <span className="easy-text">Easy: {distribution.easy}</span>
                </div>

                <h3 className="learn-problem">{card.problem}</h3>
                <p>
                  <strong>Difficulty:</strong>{' '}
                  <span className={`diff-text ${card.difficulty.toLowerCase()}`}>
                    {card.difficulty}
                  </span>
                </p>

                <button
                  onClick={() => setShowHint(h => !h)}
                  className="hint-btn"
                >
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </button>
                {showHint && <p>{card.hint}</p>}
              </div>

              {/* BACK: code + rating buttons */}
              <div className="flip-back">
                <h3>Pseudocode</h3>
                <Editor
                  height="200px"
                  defaultLanguage="javascript"
                  value={card.pseudo}
                  options={{ readOnly: true, minimap: { enabled: false }, wordWrap: 'on' }}
                />

                <h3>Solution</h3>
                <Editor
                  height="200px"
                  defaultLanguage="javascript"
                  value={card.solution}
                  options={{ readOnly: true, minimap: { enabled: false }, wordWrap: 'on' }}
                />

                <h3>Complexity</h3>
                <p>{card.complexity}</p>

                <div className="learn-button-row">
                  {['again','hard','good','easy'].map(r => (
                    <button
                      key={r}
                      onClick={() => handleRating(r)}
                      className={`${r}-btn`}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* always-visible flip toggle */}
      <button onClick={handleFlip} className="flip-btn">
        {isFlipped ? 'Show Front' : 'Show Back'}
      </button>
    </div>
  )
}
