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

function AppRoutes({ token, setToken, decks, setDecks, busyId, setBusyId, selectedDeckTags, setSelectedDeckTags, reloadDecks, reloadTrigger }) {
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

  // Defensive: If token is missing or invalid, force redirect to login
  React.useEffect(() => {
    if (!token || typeof token !== 'string' || token.length < 10) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setToken(null);
      setDecks([]);
      navigate('/login', { replace: true });
    }
  }, [token, setToken, setDecks, navigate]);

  // Fetch paginated decks with filters/search
  React.useEffect(() => {
    if (!token || typeof token !== 'string' || token.length < 10) return;
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
  }, [deckCursor, selectedDeckTags, deckSearch, reloadDecks, reloadTrigger, token]);

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
      <div className="main-content pt-16 min-h-screen bg-gradient-subtle font-sans">
        <Routes>
          {/* ---------- PUBLIC ---------- */}
          <Route
            path="/login"
            element={
              token
                ? <Navigate to="/decks" replace />
                : <Auth onLogin={setToken} />
            }
          />

          {/* ---------- PROTECTED ---------- */}
          {token ? (
            <>
              {/* Home - redirect to decks */}
              <Route path="/" element={<Navigate to="/decks" replace />} />
              
              {/* Decks list */}
              <Route
                path="/decks"
                element={
                  <>
                    {/* logo + title */}
                    <div className="mx-auto max-w-7xl flex items-center justify-center gap-3 px-4 mb-8">
                      <img src={MainIcon} alt="Card.io logo" className="h-20 w-20" />
                      <h1 className="text-5xl font-bold tracking-tight text-midnight">Card.io</h1>
                    </div>
                    {/* page content */}
                    <div className="px-4">
                      <div className="mx-auto max-w-7xl grid grid-cols-12 gap-8">
                        <main className="col-span-12 px-4 py-10">
                          {/* header */}
                          <div className="mb-10 flex items-center justify-between flex-wrap gap-6">
                            <div>
                              <h2 className="text-4xl font-bold tracking-tight text-midnight mb-2">Your Decks</h2>
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
                                  className="rounded-xl border border-gray-300 px-4 py-2 text-base w-full max-w-xs mt-1 bg-lightgray focus:border-sky focus:ring-1 focus:ring-sky"
                                />
                              </div>
                            </div>
                            <div className="flex gap-3 flex-wrap">
                              <button
                                onClick={() => setShowCardTypeModal(true)}
                                className="inline-flex items-center gap-2 rounded-xl border border-accent-purple bg-white px-5 py-2 text-base font-medium text-accent-purple shadow-card hover:bg-accent-purple hover:text-white hover:shadow-card-hover transition-colors"
                              >
                                <HiPlus className="h-5 w-5" />
                                New Card Type
                              </button>
                              <button
                                onClick={() => setShowCardTypeManagement(true)}
                                className="inline-flex items-center gap-2 rounded-xl border border-accent-purple bg-white px-5 py-2 text-base font-medium text-accent-purple shadow-card hover:bg-accent-purple hover:text-white hover:shadow-card-hover transition-colors"
                              >
                                Manage Card Types
                              </button>
                              <button
                                onClick={() => navigate('/decks/new')}
                                className="inline-flex items-center gap-2 rounded-xl bg-sky px-6 py-3 text-base font-semibold text-white shadow-card hover:bg-sky/90 hover:shadow-card-hover transition-colors animate-card-pop"
                              >
                                <HiPlus className="h-5 w-5" />
                                New Deck
                              </button>
                            </div>
                          </div>
                          {/* deck grid */}
                          {deckLoading ? (
                            <div className="p-8 text-center text-midnight font-sans">Loading…</div>
                          ) : (
                            <>
                              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                                {(Array.isArray(pagedDecks) ? pagedDecks : []).map(d => {
                                  const kebab = d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                                  return (
                                    <Link key={d.id} to={`/decks/${kebab}`} state={{ id: d.id }} className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-card transition hover:shadow-card-hover block animate-card-pop">
                                      <h3 className="mb-1 truncate text-xl font-bold text-midnight">{d.name}</h3>
                                      <p className="mb-4 line-clamp-3 text-base text-gray-600">{d.description || 'No description'}</p>
                                      <div className="mb-2 flex flex-wrap gap-2">
                                        {(d.tags || '').split(',').filter(Boolean).map(tag => (
                                          <span key={tag} className="inline-block bg-sky/10 text-sky px-3 py-1 rounded-pill text-xs font-medium">{tag}</span>
                                        ))}
                                      </div>
                                      {/* action bar (appears on hover) */}
                                      <div className="absolute inset-x-0 bottom-0 flex justify-between border-t border-gray-200 bg-lightgray px-4 py-2 opacity-0 transition group-hover:opacity-100 rounded-b-2xl">
                                        <button
                                          onClick={e => { e.preventDefault(); navigate(`/decks/${d.id}/edit`); }}
                                          className="inline-flex items-center gap-1 text-base text-gray-600 hover:text-accent-purple font-medium"
                                        >
                                          <HiOutlinePencil className="h-4 w-4" />
                                          Edit
                                        </button>
                                        <button
                                          disabled={busyId === d.id}
                                          onClick={e => { e.preventDefault(); handleDelete(d.id); }}
                                          className="inline-flex items-center gap-1 text-base text-gray-600 hover:text-red-600 font-medium disabled:opacity-50"
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
                              <div className="flex justify-center gap-4 mt-10">
                                <button
                                  className="rounded-xl border border-sky bg-white px-5 py-2 text-base font-medium text-sky hover:bg-sky hover:text-white transition-colors shadow-card hover:shadow-card-hover"
                                  onClick={handleDeckPrev}
                                  disabled={deckPrevCursors.length === 0}
                                >
                                  « Prev
                                </button>
                                <button
                                  className="rounded-xl border border-sky bg-white px-5 py-2 text-base font-medium text-sky hover:bg-sky hover:text-white transition-colors shadow-card hover:shadow-card-hover"
                                  onClick={handleDeckNext}
                                  disabled={!deckNextCursor}
                                >
                                  Next »
                                </button>
                              </div>
                              {pagedDecks.length === 0 && !deckLoading && (
                                <div className="col-span-full rounded-2xl border border-dashed border-gray-300 p-16 text-center bg-white shadow-card animate-card-pop">
                                  <img src="https://undraw.co/api/illustrations/empty?color=3AAFFF" alt="No decks" className="w-48 mb-6 opacity-80 mx-auto" />
                                  <p className="mb-4 text-gray-600 text-lg font-medium">No decks found.</p>
                                  <button
                                    onClick={() => navigate('/decks/new')}
                                    className="rounded-xl bg-sky px-6 py-3 text-base font-semibold text-white shadow-card hover:bg-sky/90 hover:shadow-card-hover transition-colors animate-card-pop"
                                  >
                                    Create your first deck
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </main>
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
              <Route path="/decks/new"  element={<CreateDeck reloadDecks={reloadDecks} />} />
              <Route
                path="/decks/:slug/cards/new"
                element={<CreateCard decks={Array.isArray(decks?.results) ? decks.results : []} reloadDecks={reloadDecks} />}
              />
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

  // Only fetch decks if token is present
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const reloadDecks = useCallback(() => {
    if (!token) return;
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/decks/`)
      .then(r => r.json())
      .then(setDecks)
      .catch(console.error);
    // Trigger a refresh of paginated decks by incrementing the trigger
    setReloadTrigger(prev => prev + 1);
  }, [token]);

  useEffect(() => {
    if (token) reloadDecks();
  }, [reloadDecks, token]);


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
            reloadTrigger={reloadTrigger}
          />
        </Router>
      </ErrorBoundary>
    </SettingsProvider>
  );
}
