import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
} from 'react-router-dom';
import fetchWithAuth from './api';
import { HiOutlineTrash, HiOutlinePencil, HiPlus } from 'react-icons/hi';

import NavBar        from './NavBar';
import Auth          from './Auth';
import CardContainer from './CardContainer';
import CardDetail    from './CardDetail';
import DeckDetail    from './DeckDetail';
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
import CardTypeManager from './CardTypeManager';
import CardTypeManagement from './CardTypeManagement';
import './styles/App.css';


// Simple error boundary for debugging
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    // You can log errorInfo here if needed
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{color:'red',padding:20}}>
        <h2>Something went wrong.</h2>
        <pre>{this.state.error && this.state.error.toString()}</pre>
      </div>;
    }
    return this.props.children;
  }
}

function AppRoutes({ token, setToken, decks, setDecks, busyId, setBusyId, selectedDeckTags, setSelectedDeckTags, reloadDecks }) {
  const navigate = useNavigate();
  const [showCardTypeModal, setShowCardTypeModal] = useState(false);
  const [showCardTypeManagement, setShowCardTypeManagement] = useState(false);
  // Pagination and search state for decks
  const [deckCursor, setDeckCursor] = useState(null);
  const [deckPrevCursors, setDeckPrevCursors] = useState([]);
  const [deckNextCursor, setDeckNextCursor] = useState(null);
  const [deckSearch, setDeckSearch] = useState('');
  const [pagedDecks, setPagedDecks] = useState([]);
  const [deckLoading, setDeckLoading] = useState(false);

  // All unique tags from all decks
  const allDeckTags = Array.isArray(decks)
    ? Array.from(new Set(decks.flatMap(d => (d.tags || '').split(',').map(t => t.trim()).filter(Boolean))))
    : [];

  // Fetch paginated decks with filters/search
  useEffect(() => {
    setDeckLoading(true);
    let url = `${import.meta.env.VITE_API_BASE_URL}/decks/`;
    let params = [];
    if (deckCursor) params.push(`cursor=${encodeURIComponent(deckCursor)}`);
    if (selectedDeckTags.length > 0) params.push(`tags=${encodeURIComponent(selectedDeckTags.join(','))}`);
    if (deckSearch.trim()) params.push(`search=${encodeURIComponent(deckSearch.trim())}`);
    if (params.length > 0) url += '?' + params.join('&');
    fetchWithAuth(url)
      .then(r => r.json())
      .then(d => {
        // Defensive: handle both paginated and non-paginated responses
        if (Array.isArray(d)) {
          setPagedDecks(d);
          setDeckNextCursor(null);
        } else {
          setPagedDecks(d.results || []);
          setDeckNextCursor(d.next ? new URL(d.next).searchParams.get('cursor') : null);
        }
      })
      .catch(() => {
        setPagedDecks([]);
        setDeckNextCursor(null);
      })
      .finally(() => setDeckLoading(false));
  }, [deckCursor, selectedDeckTags, deckSearch, reloadDecks]);

  // Reset pagination when filters/search change
  useEffect(() => {
    setDeckCursor(null);
    setDeckPrevCursors([]);
  }, [selectedDeckTags, deckSearch]);

  // Pagination handlers
  const handleDeckNext = () => {
    if (deckNextCursor) {
      setDeckPrevCursors(prev => [...prev, deckCursor]);
      setDeckCursor(deckNextCursor);
    }
  };
  const handleDeckPrev = () => {
    if (deckPrevCursors.length > 0) {
      const prev = [...deckPrevCursors];
      const last = prev.pop();
      setDeckPrevCursors(prev);
      setDeckCursor(last);
    }
  };

  /* ---------- helpers ---------- */
  // const goNext = () => {
  //   if (!nextURL) return;
  //   fetchWithAuth(nextURL)
  //     .then(r => r.json())
  //     .then(d => {
  //       setCards(d.results);
  //       setNextURL(d.next);
  //       setPrevURL(d.previous);
  //     })
  //     .catch(console.error);
  // };

  // const goPrev = () => {
  //   if (!prevURL) return;
  //   fetchWithAuth(prevURL)
  //     .then(r => r.json())
  //     .then(d => {
  //       setCards(d.results);
  //       setNextURL(d.next);
  //       setPrevURL(d.previous);
  //     })
  //     .catch(console.error);
  // };

  // Compute all unique tags from all decks
  // const allDeckTags = Array.from(new Set(decks.flatMap(d => (d.tags || '').split(',').map(t => t.trim()).filter(Boolean))));
  // Filter decks by selected tags
  // const visibleDecks = selectedDeckTags.length === 0
  //   ? decks
  //   : decks.filter(d => selectedDeckTags.every(tag => (d.tags || '').split(',').includes(tag)));

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



  return (
    <>
      <NavBar
        onLogout={() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setToken(null);
          setDecks([]);
        }}
        showLogout={!!token}
      />
      {showCardTypeModal && (
        <CardTypeManager open={showCardTypeModal} onClose={() => setShowCardTypeModal(false)} />
      )}
      {showCardTypeManagement && (
        <CardTypeManagement open={showCardTypeManagement} onClose={() => setShowCardTypeManagement(false)} decks={Array.isArray(decks) ? decks : []} />
      )}
      {/* main content */}
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

                        {/* Manage Decks */}
                        <main className="col-span-12 sm:col-span-12 lg:col-span-12 px-4 py-8">
                          {/* header */}
                          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
                            <div>
                              <h2 className="text-3xl font-semibold tracking-tight">Your Decks</h2>
                              {/* Tag filter for decks */}
                              <div className="mt-2">
                                <TagEditor
                                  tags={selectedDeckTags}
                                  onChange={setSelectedDeckTags}
                                  allTags={allDeckTags}
                                  addButtonLabel="Filter by Tag"
                                />
                              </div>
                              {/* Search bar for deck name */}
                              <div className="mt-2">
                                <input
                                  type="text"
                                  value={deckSearch}
                                  onChange={e => setDeckSearch(e.target.value)}
                                  placeholder="Search decks by name..."
                                  className="rounded border px-3 py-1 text-sm w-full max-w-xs mt-1"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => setShowCardTypeModal(true)}
                                className="inline-flex items-center gap-2 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 border border-gray-300"
                              >
                                <HiPlus className="h-5 w-5" />
                                New Card Type
                              </button>
                              <button
                                onClick={() => setShowCardTypeManagement(true)}
                                className="inline-flex items-center gap-2 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 border border-gray-300"
                              >
                                Manage Card Types
                              </button>
                              <button
                                onClick={() => navigate('/decks/new')}
                                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                              >
                                <HiPlus className="h-5 w-5" />
                                New Deck
                              </button>
                            </div>
                          </div>
                          {/* deck grid */}
                          {deckLoading ? (
                            <div className="p-8">Loading…</div>
                          ) : (
                            <>
                              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {(Array.isArray(pagedDecks) ? pagedDecks : []).map(d => {
                                  const kebab = d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                                  return (
                                    <Link key={d.id} to={`/decks/${kebab}`} state={{ id: d.id }} className="group relative rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-lg block">
                                      <h3 className="mb-1 truncate text-lg font-semibold">{d.name}</h3>
                                      <p className="mb-4 line-clamp-3 text-sm text-gray-600">{d.description || 'No description'}</p>
                                      <div className="mb-2 flex flex-wrap gap-1">
                                        {(d.tags || '').split(',').filter(Boolean).map(tag => (
                                          <span key={tag} className="inline-block bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{tag}</span>
                                        ))}
                                      </div>
                                      {/* action bar (appears on hover) */}
                                      <div className="absolute inset-x-0 bottom-0 flex justify-between border-t border-gray-200 bg-gray-50 px-4 py-2 opacity-0 transition group-hover:opacity-100">
                                        <button
                                          onClick={e => { e.preventDefault(); navigate(`/decks/${d.id}/edit`); }}
                                          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-600"
                                        >
                                          <HiOutlinePencil className="h-4 w-4" />
                                          Edit
                                        </button>
                                        <button
                                          disabled={busyId === d.id}
                                          onClick={e => { e.preventDefault(); handleDelete(d.id); }}
                                          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 disabled:opacity-50"
                                        >
                                          <HiOutlineTrash className="h-4 w-4" />
                                          Delete
                                        </button>
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                              {/* Pagination controls */}
                              <div className="flex justify-center gap-4 mt-6">
                                <button
                                  className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                                  onClick={handleDeckPrev}
                                  disabled={deckPrevCursors.length === 0}
                                >
                                  « Prev
                                </button>
                                <button
                                  className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                                  onClick={handleDeckNext}
                                  disabled={!deckNextCursor}
                                >
                                  Next »
                                </button>
                              </div>
                              {pagedDecks.length === 0 && !deckLoading && (
                                <div className="col-span-full rounded-lg border border-dashed border-gray-300 p-10 text-center">
                                  <p className="mb-4 text-gray-600">No decks found.</p>
                                  <button
                                    onClick={() => navigate('/decks/new')}
                                    className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                                  >
                                    Create your first deck
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </main>

                        {/* main column */}
                        {/* <main className="col-span-12 sm:col-span-8 lg:col-span-9">
                          <CardContainer cardData={visibleCards} />

                          <div className="mt-6 flex justify-center gap-4">
                            <button
                              className="btn btn-outline"
                              onClick={goPrev}
                              disabled={!prevURL}
                            ></button>
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
              {/* Card detail: slug only */}
              <Route path="/cards/:slug"  element={<CardDetail decks={decks} />} />
              <Route path="/cards/new"  element={<CreateCard decks={decks} />} />
              <Route path="/decks/new"  element={<CreateDeck reloadDecks={reloadDecks} />} />
              <Route
                path="/learn/:deckId"
                element={<Learn />}
              />
              <Route path="/profile" element={<Profile />} />
              <Route path="/alarm" element={<StudyAlarm />} />
              {/* Deck detail: slug only */}
              <Route
                path="/decks/:slug"
                element={<DeckDetail decks={Array.isArray(decks?.results) ? decks.results : []} reloadDecks={reloadDecks} />}
              />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  /* ---------- state ---------- */
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [decks, setDecks] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [selectedDeckTags, setSelectedDeckTags] = useState([]);

  const reloadDecks = useCallback(() => {
    if (!token) return;
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/decks/`)
      .then(r => r.json())
      .then(setDecks)
      .catch(console.error);
  }, [token])

  useEffect(reloadDecks, [reloadDecks]);


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
      <ErrorBoundary>
        {/* <div style={{position:'fixed',top:0,left:0,zIndex:9999,background:'#ff0',padding:'2px 8px',fontSize:12}}>App mounted</div> */}
        <Router>
          <AppRoutes
            token={token}
            setToken={setToken}
            decks={decks}
            setDecks={setDecks}
            busyId={busyId}
            setBusyId={setBusyId}
            selectedDeckTags={selectedDeckTags}
            setSelectedDeckTags={setSelectedDeckTags}
            reloadDecks={reloadDecks}
          />
        </Router>
      </ErrorBoundary>
    </SettingsProvider>
  );
}
