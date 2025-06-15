// src/Learn.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import fetchWithAuth from './api'
import ChartDropdown from './ChartDropdown.jsx'
import { useSettings } from './SettingsContext';
import ProgressBar from './ProgressBar.jsx';
import StudyAlarm from './StudyAlarm';

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
  const { settings } = useSettings();
  const [userInput, setUserInput] = useState('');
  const [showAnswerInput, setShowAnswerInput] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  // Find current deck name
  const [deckName, setDeckName] = useState('');
  const [totalCards, setTotalCards] = useState(0);
  // Add a state to control if answer is revealed
  const [revealed, setRevealed] = useState(false);
  // Add a loading state for stats and progress
  const [loading, setLoading] = useState(true);

  // navigation handlers
  const goNext = useCallback(() => {
    setCurrentIdx(i => (i < queue.length - 1 ? i + 1 : i));
    setIsFlipped(false);
    setShowHint(false);
    setUserInput('');
    setShowAnswerInput(true);
    setRevealed(false);
  }, [queue.length]);
  const goPrev = useCallback(() => {
    setCurrentIdx(i => (i > 0 ? i - 1 : i));
    setIsFlipped(false);
    setShowHint(false);
    setUserInput('');
    setShowAnswerInput(true);
    setRevealed(false);
  }, []);

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
        // Clamp currentIdx if out of bounds
        setCurrentIdx(idx => (items.length === 0 ? 0 : Math.min(idx, items.length - 1)))
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

  // Helper to fetch total number of cards in the deck (regardless of rating)
  const fetchTotalCards = useCallback(() => {
    if (!selectedDeckId) return Promise.resolve();
    const url = `${API}/usercards/?deck=${selectedDeckId}`;
    return fetchWithAuth(url)
      .then(r => r.json())
      .then(raw => {
        const items = Array.isArray(raw) ? raw : raw.results || [];
        setTotalCards(items.length);
      })
      .catch(() => setTotalCards(0));
  }, [API, selectedDeckId])

  // 3) on mount or deck change
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchQueue(),
      fetchDistribution(),
      fetchTotalCards()
    ]).then(() => setLoading(false));
  }, [fetchQueue, fetchDistribution, fetchTotalCards])

  // swipe support (left/right)
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev]);

  // Get deck name on mount or when selectedDeckId changes
  useEffect(() => {
    if (!selectedDeckId) {
      setDeckName('All Decks');
      return;
    }
    // Try to get deck name from localStorage or API
    fetchWithAuth(`${API}/decks/${selectedDeckId}/`)
      .then(r => r.ok ? r.json() : null)
      .then(deck => setDeckName(deck?.name || ''))
      .catch(() => setDeckName(''));
  }, [selectedDeckId, API]);

  // Helper to reset all state to initial values
  const resetLearnState = useCallback(() => {
    setQueue([]);
    setDistribution({ none: 0, again: 0, hard: 0, good: 0, easy: 0 });
    setIsFlipped(false);
    setShowHint(false);
    setShowConfirm(false);
    setUserInput('');
    setShowAnswerInput(true);
    setCurrentIdx(0);
    setDeckName('');
    setTotalCards(0);
    setRevealed(false);
    setLoading(true);
  }, []);

  // Reset all state on mount (including after refresh)
  useEffect(() => {
    resetLearnState();
  }, [resetLearnState, selectedDeckId]);

  // Ensure all state is reset on unmount (leaving Learn mode)
  useEffect(() => {
    return () => {
      resetLearnState();
    };
  }, [resetLearnState]);

  // nothing due?
  if (loading) {
    return (
      <div className="learn-page">
        <div className="learn-header" style={{display:'flex',alignItems:'center',gap:24,marginBottom:16}}>
          <StudyAlarm />
          <h2 className="text-xl font-semibold mb-2" style={{margin:0}}>{deckName ? `Learning: ${deckName}` : 'No Deck Selected'}</h2>
        </div>
        <hr style={{marginBottom:16}}/>
        <p>Loading cards and stats…</p>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="learn-page">
        <div className="learn-header" style={{display:'flex',alignItems:'center',gap:24,marginBottom:16}}>
          <StudyAlarm />
          <h2 className="text-xl font-semibold mb-2" style={{margin:0}}>{deckName ? `Learning: ${deckName}` : 'No Deck Selected'}</h2>
        </div>
        <hr style={{marginBottom:16}}/>
        <p>No cards available to learn in this deck. Try selecting a different deck or adding new cards.</p>
        <button onClick={() => navigate(-1)} className="back-btn">
          Back
        </button>
      </div>
    )
  }

  // Always derive safeIdx and card just before rendering
  // Clamp currentIdx if queue shrinks (defensive, in case of async updates)
  const safeIdx = Math.max(0, Math.min(currentIdx, queue.length - 1));
  const card = queue[safeIdx] || queue[0];

  // handle rating
  function handleRating(rating) {
    // Save the current index before queue update
    const prevIdx = currentIdx;
    fetchWithAuth(`${API}/usercards/${card.userCardId}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ last_rating: rating }),
    })
      .then(r => (r.ok ? r.json() : Promise.reject('Save failed')))
      .then(() => {
        // Fetch the new queue, then update currentIdx and stats
        fetchQueue().then(() => {
          setQueue(q => {
            let nextIdx = prevIdx;
            if (prevIdx >= q.length) nextIdx = Math.max(0, q.length - 1);
            else if (q.length > 1) nextIdx = Math.min(prevIdx, q.length - 1);
            setCurrentIdx(nextIdx);
            // Immediately update stats after queue update
            fetchDistribution();
            fetchTotalCards();
            setShowAnswerInput(true);
            setRevealed(false);
            setUserInput('');
            return q;
          });
        });
      })
      .catch(console.error);
    setIsFlipped(false);
    setShowHint(false);
  }

  const handleReveal = (e) => {
    e.preventDefault();
    setShowAnswerInput(false);
    setIsFlipped(true);
    setRevealed(true);
  }
  const handleFlip = () => {
    setIsFlipped(f => !f);
    setShowHint(false);
    if (!isFlipped) {
      setShowAnswerInput(false);
      setRevealed(true);
    }
  }

  // called once user confirms in modal
  const doResetAll = () => {
    setShowConfirm(false);
    fetchWithAuth(`${API}/usercards/reset/?deck=${selectedDeckId}`, {
      method: 'POST',
    })
      .then(r => {
        if (!r.ok) throw new Error('Reset failed');
        return r.json();
      })
      .then(() => {
        fetchQueue();
        fetchDistribution();
        fetchTotalCards();
        setCurrentIdx(0); // Go to first flashcard after reset
        setIsFlipped(false);
        setShowHint(false);
        setUserInput('');
        setShowAnswerInput(true);
        setRevealed(false);
      })
      .catch(console.error);
  }

  // Add status update handler
  const updateStatus = (status) => {
    if (!card.userCardId) return;
    fetchWithAuth(`${API}/usercards/${card.userCardId}/set_status/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
      .then(r => r.ok ? r.json() : Promise.reject('Status update failed'))
      .then(() => fetchQueue())
      .catch(console.error);
  };

  return (
    <div className={`learn-page ${settings.theme === 'dark' ? 'dark' : ''}`} style={{ fontSize: settings.fontSize }}>
      <div className="learn-header" style={{display:'flex',alignItems:'center',gap:24,marginBottom:16}}>
        <StudyAlarm />
        <h2 className="text-xl font-semibold mb-2" style={{margin:0}}>{deckName ? `Learning: ${deckName}` : 'No Deck Selected'}</h2>
      </div>
      <hr style={{marginBottom:16}}/>
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
        <button onClick={() => {
          (async () => {
            await fetchWithAuth(`${API}/usercards/reset/?deck=${selectedDeckId}`, { method: 'POST' });
            resetLearnState();
            setTimeout(() => {
              setDistribution({ none: 0, again: 0, hard: 0, good: 0, easy: 0 });
              setTotalCards(0);
            }, 0);
            navigate(-1);
          })();
        }} className="back-btn">
          Back
        </button>
        <button onClick={() => setShowConfirm(true)} className="reset-btn">
          Reset Progress
        </button>
      </div>
      {/* Progress bar */}
      <ProgressBar current={totalCards === 0 ? 0 : safeIdx + 1} total={totalCards} />
      {/* Status controls */}
      <div className="flex justify-center gap-2 mb-2">
        {['new','review','known'].map(s => (
          <button
            key={s}
            className={`px-3 py-1 rounded-full border text-xs ${card.status === s ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => updateStatus(s)}
            disabled={card.status === s}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {/* Navigation */}
      <div className="flex justify-between w-full max-w-2xl mx-auto mb-4">
        <button onClick={goPrev} disabled={safeIdx === 0} className="prev-btn">Prev</button>
        <button onClick={goNext} disabled={safeIdx === queue.length - 1} className="next-btn">Next</button>
      </div>
      <ChartDropdown distribution={distribution} />

      {/* the card itself */}
      <div className="learn-card-row">
        <div className="learn-card-container">
          <div
            className={`learn-card ${isFlipped ? 'flipped' : ''}`}
            style={{
              transition: settings.animation ? 'transform 0.6s' : 'none',
              fontSize: settings.fontSize,
              background: settings.theme === 'dark' ? '#23272f' : '#fff',
              color: settings.theme === 'dark' ? '#f3f3f3' : '#222',
              boxShadow: settings.theme === 'dark' ? '0 4px 16px #1118' : '0 4px 16px rgba(0,0,0,0.1)',
            }}
          >
            <div className="flip-inner">

              {/* FRONT: show full-deck distribution */}
              <div className="flip-front">
                <div className="rating-summary">
                  {/* <span className="none-text">None: {distribution.none}</span> */}
                  <span className="again-text">Again: {distribution.again}</span>
                  <span className="hard-text">Hard: {distribution.hard}</span>
                  <span className="good-text">Good: {distribution.good}</span>
                  <span className="easy-text">Easy: {distribution.easy}</span>
                </div>

                <h3 className="learn-problem">{card.problem}</h3>
                {/* Active recall input */}
                {showAnswerInput && !revealed && (
                  <form
                    onSubmit={handleReveal}
                    className="mb-4 flex flex-col items-center"
                  >
                    <input
                      type="text"
                      value={userInput}
                      onChange={e => setUserInput(e.target.value)}
                      placeholder="Type your answer..."
                      className="rounded border px-3 py-2 text-lg w-full max-w-md mb-2"
                      autoFocus
                    />
                    <button type="submit" className="flip-btn">Reveal</button>
                  </form>
                )}

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
