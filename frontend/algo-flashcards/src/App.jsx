import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from 'react-router-dom';
import fetchWithAuth from './api';
import { HiOutlineTrash, HiOutlinePencil, HiPlus } from 'react-icons/hi';

import NavBar        from './NavBar';
import Auth          from './Auth';
import CardContainer from './CardContainer';
import CardDetail    from './CardDetail';
import DeckDropdown  from './DeckDropdown';
import Learn         from './Learn';
import CreateCard    from './CreateCard';
import About         from './About';
import Generate      from './Generate';
import CreateDeck    from './CreateDeck';
import StudyAlarm    from './StudyAlarm';
import MainIcon      from '../public/icon.png';
import Profile           from './Profile';
import { SettingsProvider } from './SettingsContext';
import SettingsPanel from './SettingsPanel';
import TagEditor      from './TagEditor';
import ManageDecks from './ManageDecks'
import './styles/App.css';

export default function App() {
  /* ---------- state ---------- */
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [decks, setDecks] = useState([]);
  // const [selectedDeckId, setDeckId]= useState(null);
  const [cards, setCards] = useState([]);
  const [nextURL, setNextURL] = useState(null);
  const [prevURL, setPrevURL] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);
  const [selectedTags, setSelectedTags]       = useState([]);


  /* ---------- helpers ---------- */
  const goNext = () => {
    if (!nextURL) return;
    fetchWithAuth(nextURL)
      .then(r => r.json())
      .then(d => {
        setCards(d.results);
        setNextURL(d.next);
        setPrevURL(d.previous);
      })
      .catch(console.error);
  };

  const goPrev = () => {
    if (!prevURL) return;
    fetchWithAuth(prevURL)
      .then(r => r.json())
      .then(d => {
        setCards(d.results);
        setNextURL(d.next);
        setPrevURL(d.previous);
      })
      .catch(console.error);
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this deck and all its cards?')) return;
    setBusyId(id);
    try {
      await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/decks/${id}/`,
        { method: 'DELETE' },
      );
      reloadDecks();        // refresh list in parent
    } catch (err) {
      console.error(err);
      alert('Delete failed.');
    } finally {
      setBusyId(null);
    }
  };

  /* ---------- load decks ---------- */
  const reloadDecks = useCallback(() => {
    if (!token) return;
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/decks/`)
      .then(r => r.json())
      .then(setDecks)
      .catch(console.error);
  }, [token])

  useEffect(reloadDecks, [reloadDecks]);

  /* ---------- load cards ---------- */
  const reloadCards = useCallback(() => {
    if (!token) return;
    const query = buildBaseQuery(
      // selectedDeckId,
      selectedDifficulties,
      selectedTags,
      null
    );
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/cards/?${query}`)
      .then(r => r.json())
      .then(d => {
        setCards(d.results);
        setNextURL(d.next);
        setPrevURL(d.previous);
      })
      .catch(console.error);
  // }, [token, selectedDeckId, selectedDifficulties, selectedTags]);
  }, [token, selectedDifficulties, selectedTags]);

  useEffect(reloadCards, [reloadCards]);

  /* ---------- difficulty helpers ---------- */
  const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

  function buildBaseQuery(deckId, diffs, tags, status) {
    const p = new URLSearchParams();
    if (deckId) p.append('deck', deckId);
    diffs.forEach(d => p.append('difficulty', d));
    // tags.forEach(t => p.append('tag', t));
    if (status) p.append('status', status);
    return p.toString();
  }

  const toggleDifficulty = diff => {
    setSelectedDifficulties(prev => {
      const next = prev.includes(diff)
        ? prev.filter(d => d !== diff)
        : [...prev, diff];
  
      return next.length === 0 || next.length === DIFFICULTIES.length
        ? []
        : next;
    });
  };
  
  // Tag filter logic
  const allTags = Array.from(new Set(cards.flatMap(c => ((c.data?.tags || '').split(',')).map(t => t.trim()).filter(Boolean))));
  const visibleCards =
    (selectedDifficulties.length === 0 ? cards : cards.filter(c => selectedDifficulties.includes(c.data?.difficulty))).filter(c => selectedTags.length === 0 || ((c.data?.tags || '').split(',').includes) && selectedTags.every(tag => (c.data?.tags || '').split(',').includes(tag)));

  // Persist selectedDeckId in localStorage
  // useEffect(() => {
  //   const storedDeckId = localStorage.getItem('selectedDeckId');
  //   if (storedDeckId && !selectedDeckId) {
  //     setDeckId(storedDeckId);
  //   }
  // }, [selectedDeckId]);

  // Whenever selectedDeckId changes, persist it
  // useEffect(() => {
  //   if (selectedDeckId) {
  //     localStorage.setItem('selectedDeckId', selectedDeckId);
  //   } else {
  //     localStorage.removeItem('selectedDeckId');
  //   }
  // }, [selectedDeckId]);

  // Wrap setDeckId to also update localStorage
  // const handleSetDeckId = id => {
  //   setDeckId(id);
  //   if (id) {
  //     localStorage.setItem('selectedDeckId', id);
  //   } else {
  //     localStorage.removeItem('selectedDeckId');
  //   }
  // };

  return (
    <SettingsProvider>
      <Router>
        <NavBar
          onLogout={() => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setToken(null);
            setCards([]);
            setDecks([]);
            setDeckId(null);
          }}
          showLogout={!!token}
        />

        <div className="main-content pt-16">
          <Routes>
            {/* ---------- PUBLIC ---------- */}
            <Route
              path="/login"
              element={
                token
                  ? <Navigate to="/" replace />
                  : <Auth onLogin={setToken} />
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
                      {/* logo + title */}
                      <div className="mx-auto max-w-7xl flex items-center justify-center gap-3 px-4 mb-6">
                        <img src={MainIcon} alt="Card.io logo" className="h-20 w-20" />
                        <h1 className="text-4xl font-semibold tracking-tight">Card.io</h1>
                      </div>

                      {/* page content */}
                      <div className="px-4">
                        <div className="mx-auto max-w-7xl grid grid-cols-12 gap-6">
                          {/* sidebar */}
                          {/* <aside className="col-span-12 sm:col-span-4 lg:col-span-3 space-y-5">
                            <div className="space-y-3"> */}
                              {/* deck selector */}
                              {/* <div className="relative">
                                <DeckDropdown
                                  decks={decks}
                                  selectedDeckId={selectedDeckId}
                                  onChange={handleSetDeckId}
                                />
                              </div> */}

                              {/* learn */}
                              {/* <Link to="/learn" className="w-full block">
                                <button
                                  // disabled={!selectedDeckId}
                                  className="
                                    w-full rounded-md px-4 py-2 text-sm font-medium shadow transition
                                    text-gray-700 bg-white border border-gray-300 hover:bg-gray-50
                                    disabled:opacity-50 disabled:hover:bg-white disabled:cursor-not-allowed
                                  "
                                >
                                  Learn
                                </button>
                              </Link> */}

                              {/* new card */}
                              {/* <Link to="/cards/new" className="w-full block">
                                <button className="
                                  w-full rounded-md px-4 py-2 text-sm font-medium shadow
                                  text-gray-700 bg-white border border-gray-300
                                  hover:bg-gray-50
                                  transition hover:shadow-lg
                                ">
                                  + New Card
                                </button>
                              </Link> */}

                              {/* new deck */}
                              {/* <Link to="/decks/new" className="w-full block">
                                <button className="
                                  w-full rounded-md px-4 py-2 text-sm font-medium shadow
                                  transition
                                  text-gray-700 bg-white border border-gray-300
                                  hover:bg-gray-50
                                ">
                                  + New Deck
                                </button>
                              </Link> */}

                              {/* manage decks */}
                              {/* <Link to="/decks/manage" className="w-full block">
                                <button className="
                                  w-full rounded-md px-4 py-2 text-sm font-medium shadow
                                  transition
                                  text-gray-700 bg-white border border-gray-300
                                  hover:bg-gray-50
                                ">
                                  Manage Decks
                                </button>
                              </Link>
                            </div> */}

                            {/* difficulty filter */}
                            {/* <div className="flex flex-wrap gap-2">
                              {DIFFICULTIES.map(diff => {
                                const active = selectedDifficulties.length === 0 || selectedDifficulties.includes(diff);
                                const COLOR = {
                                  Easy:   '#28a745',
                                  Medium: '#ffc107',
                                  Hard:   '#dc3545',
                                }[diff];
                                return (
                                  <button
                                    key={diff}
                                    onClick={() => toggleDifficulty(diff)}
                                    className={`
                                      px-3 py-1 rounded-full text-sm border transition
                                      ${active ? 'text-white' : 'text-gray-700 hover:bg-gray-50'}
                                    `}
                                    style={
                                      active
                                        ? { backgroundColor: COLOR, borderColor: COLOR }
                                        : { borderColor: '#d1d5db' } 
                                    }
                                  >
                                    {diff}
                                  </button>
                                );
                              })}
                            </div> */}

                            {/* Tag filter UI */}
                            {/* <div className="mb-4">
                              <div className="font-medium mb-1">Filter by Tag</div>
                              <TagEditor 
                                tags={selectedTags} 
                                onChange={setSelectedTags} 
                                allTags={allTags} 
                                addButtonLabel="Search Tag"
                              />
                            </div>
                          </aside> */}

                          {/* manage  decks */}
                          <main className="col-span-12 sm:col-span-12 lg:col-span-12 px-4 py-8">
                            {/* header */}
                            <div className="mb-8 flex items-center justify-between">
                              <h2 className="text-3xl font-semibold tracking-tight">Your Decks</h2>
                              <button
                                onClick={() => navigate('/decks/new')}
                                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2
                                            text-sm font-medium text-white transition hover:bg-indigo-700"
                              >
                                <HiPlus className="h-5 w-5" />
                                New
                              </button>
                            </div>
                      
                            {/* deck grid */}
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                              {decks.map(d => (
                                <div
                                  key={d.id}
                                  className="group relative rounded-lg border border-gray-200 bg-white p-5 shadow-sm
                                              transition hover:shadow-lg"
                                >
                                  <h3 className="mb-1 truncate text-lg font-semibold">{d.name}</h3>
                                  <p className="mb-4 line-clamp-3 text-sm text-gray-600">
                                    {d.description || 'No description'}
                                  </p>
                      
                                  {/* action bar (appears on hover) */}
                                  <div className="absolute inset-x-0 bottom-0 flex justify-between
                                                  border-t border-gray-200 bg-gray-50 px-4 py-2
                                                  opacity-0 transition group-hover:opacity-100">
                                    <button
                                      onClick={() => navigate(`/decks/${d.id}/edit`)}
                                      className="inline-flex items-center gap-1 text-sm text-gray-600
                                                  hover:text-indigo-600"
                                    >
                                      <HiOutlinePencil className="h-4 w-4" />
                                      Edit
                                    </button>
                      
                                    <button
                                      disabled={busyId === d.id}
                                      onClick={() => handleDelete(d.id)}
                                      className="inline-flex items-center gap-1 text-sm text-gray-600
                                                  hover:text-red-600 disabled:opacity-50"
                                    >
                                      <HiOutlineTrash className="h-4 w-4" />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                      
                              {/* empty state */}
                              {decks.length === 0 && (
                                <div className="col-span-full rounded-lg border border-dashed border-gray-300 p-10 text-center">
                                  <p className="mb-4 text-gray-600">You don’t have any decks yet.</p>
                                  <button
                                    onClick={() => navigate('/decks/new')}
                                    className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white
                                                transition hover:bg-indigo-700"
                                  >
                                    Create your first deck
                                  </button>
                                </div>
                              )}
                            </div>
                          </main>

                          {/* main column */}
                          {/* <main className="col-span-12 sm:col-span-8 lg:col-span-9">
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
                          </main> */}
                        </div>
                      </div>
                    </>
                  }
                />

                {/* misc routes */}
                <Route path="/about"      element={<About />} />
                <Route path="/generate"   element={<Generate />} />
                <Route path="/cards/:id"  element={<CardDetail />} />
                <Route path="/cards/new"  element={<CreateCard decks={decks} reloadCards={reloadCards}/>} />
                <Route path="/decks/new"  element={<CreateDeck reloadDecks={reloadDecks} />} />
                <Route path="/decks/manage"  element={<ManageDecks decks={decks} reloadDecks={reloadDecks} />} />
                <Route
                  path="/learn"
                  element={
                    <Learn
                      // selectedDeckId={selectedDeckId}
                    />
                  }
                />
                <Route path="/profile" element={<Profile />} />
                <Route path="/alarm" element={<StudyAlarm />} />
              </>
            ) : (
              <Route path="*" element={<Navigate to="/login" replace />} />
            )}
          </Routes>
        </div>
      </Router>
    </SettingsProvider>
  );
}
