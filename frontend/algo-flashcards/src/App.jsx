import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from 'react-router-dom';
import fetchWithAuth    from './api';

import NavBar           from './NavBar';
import Auth             from './Auth';
import CardContainer    from './CardContainer';
import CardDetail       from './CardDetail';
import DeckDropdown     from './DeckDropdown';
import Learn            from './Learn';
import CreateCard       from './CreateCard';
import About            from './About';
import Info             from './Info';
import Generate         from './Generate';
import CreateDeck       from './CreateDeck';
import StudyAlarm       from './StudyAlarm';
import MainIcon         from '../public/icon.png';
import './styles/App.css';

export default function App() {
  const [token, setToken]                   = useState(localStorage.getItem('accessToken'));
  const [decks, setDecks]                   = useState([]);
  const [selectedDeckId, setDeckId]         = useState(null);
  const [cards, setCards]                   = useState([]);
  const [nextURL, setNextURL]               = useState(null);
  const [prevURL, setPrevURL]               = useState(null);
  const [baseParams, setBaseParams]         = useState('');
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);

  /* ---------------- helpers ---------------- */
  const goNext = () => {
    if (!nextURL) return;
    fetchWithAuth(nextURL)
      .then(res => res.json())
      .then(data => {
        setCards(data.results);
        setNextURL(data.next);
        setPrevURL(data.previous);
      })
      .catch(console.error);
  };

  const goPrev = () => {
    if (!prevURL) return;
    fetchWithAuth(prevURL)
      .then(res => res.json())
      .then(data => {
        setCards(data.results);
        setNextURL(data.next);
        setPrevURL(data.previous);
      })
      .catch(console.error);
  };

  /* ---------- 1) load decks once logged in ---------- */
  useEffect(() => {
    if (!token) return;
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/decks/`)
      .then(res => res.json())
      .then(setDecks)
      .catch(console.error);
  }, [token]);

  /* ---------- 2) first page of cards on deck/difficulty change ---------- */
  useEffect(() => {
    if (!token) return;
    const query = buildBaseQuery(selectedDeckId, selectedDifficulties);
    setBaseParams(query);
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/cards/?${query}`)
      .then(res => res.json())
      .then(data => {
        setCards(data.results);
        setNextURL(data.next);
        setPrevURL(data.previous);
      })
      .catch(console.error);
  }, [token, selectedDeckId, selectedDifficulties]);

  /* ---------- difficulty helpers ---------- */
  const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

  function buildBaseQuery(deckId, diffs) {
    const p = new URLSearchParams();
    if (deckId) p.append('deck', deckId);
    diffs.forEach(d => p.append('difficulty', d));
    return p.toString();
  }

  const toggleDifficulty = diff =>
    setSelectedDifficulties(prev =>
      prev.includes(diff) ? prev.filter(x => x !== diff) : [...prev, diff],
    );

  const visibleCards =
    selectedDifficulties.length > 0
      ? cards.filter(c => selectedDifficulties.includes(c.difficulty))
      : cards;

  /* ---------------- JSX ---------------- */
  return (
    <Router>
      <NavBar
        onLogout={() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setToken(null);
          setCards([]);
          setNextURL(null);
          setPrevURL(null);
        }}
        showLogout={!!token}
      />

      <div className="main-content pt-16">
        <Routes>
          {/* ---------- PUBLIC ---------- */}
          <Route
            path="/login"
            element={
              token ? <Navigate to="/" replace /> : <Auth onLogin={setToken} />
            }
          />

          {/* ---------- PROTECTED ---------- */}
          {token ? (
            <>
              {/* Home */}
              <Route
                path="/"
                element={
                  <>
                    {/* --- logo + title --- */}
                    <div className="mx-auto max-w-7xl flex items-center justify-center gap-3 px-4 mb-6">
                      <img src={MainIcon} alt="Card.io logo" className="h-20 w-20" />
                      <h1 className="text-4xl font-semibold tracking-tight">Card.io</h1>
                    </div>

                    {/* --- page content --- */}
                    <div className="px-4">
                      <div className="mx-auto max-w-7xl grid grid-cols-12 gap-6">
                        {/* left sidebar */}
                        <aside className="col-span-12 sm:col-span-4 lg:col-span-3 space-y-5">
                          <DeckDropdown
                            decks={decks}
                            selectedDeckId={selectedDeckId}
                            onChange={setDeckId}
                          />

                          <Link to="/learn" className="w-full">      {/* was className="block" */}
                            <button
                              className="btn btn-primary w-full"
                              disabled={!selectedDeckId}
                            >
                              Learn
                            </button>
                          </Link>

                          <Link to="/cards/new" className="w-full">
                            <button className="btn w-full">+ New Card</button>
                          </Link>

                          <Link to="/decks/new" className="w-full">
                            <button className="btn w-full">+ New Deck</button>
                          </Link>

                          <div className="flex flex-wrap gap-2">
                            {DIFFICULTIES.map(diff => {
                              const active = selectedDifficulties.includes(diff);
                              return (
                                <button
                                  key={diff}
                                  onClick={() => toggleDifficulty(diff)}
                                  className={`px-3 py-1 rounded-full text-sm border transition
                                    ${active
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                >
                                  {diff}
                                </button>
                              );
                            })}
                          </div>
                        </aside>

                        {/* main card column */}
                        <main className="col-span-12 sm:col-span-8 lg:col-span-9">
                          <CardContainer cardData={visibleCards} />

                          <div className="mt-6 flex justify-center gap-4">
                            <button
                              className="btn btn-outline"
                              onClick={goPrev}
                              disabled={!prevURL}
                            >
                              « Prev
                            </button>
                            <button
                              className="btn btn-outline"
                              onClick={goNext}
                              disabled={!nextURL}
                            >
                              Next »
                            </button>
                          </div>
                        </main>
                      </div>
                    </div>
                  </>
                }
              />

              {/* misc routes */}
              <Route path="/about"      element={<About />} />
              <Route path="/generate"   element={<Generate />} />
              <Route path="/info"       element={<Info />} />
              <Route path="/cards/:id"  element={<CardDetail />} />
              <Route path="/cards/new"  element={<CreateCard decks={decks} />} />
              <Route path="/decks/new"  element={<CreateDeck />} />
              <Route
                path="/learn"
                element={<Learn selectedDeckId={selectedDeckId} />}
              />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      </div>
    </Router>
  );
}
