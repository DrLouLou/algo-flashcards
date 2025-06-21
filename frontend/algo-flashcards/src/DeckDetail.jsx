// src/DeckDetail.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import fetchWithAuth from './api';
import CardContainer from './CardContainer';
import TagEditor from './TagEditor';
import { HiPlus } from 'react-icons/hi';
import CreateCard from './CreateCard';

export default function DeckDetail({ decks, reloadDecks }) {
  // Always resolve decksArr as the array of decks, memoized
  const decksArr = useMemo(() => (
    Array.isArray(decks)
      ? decks
      : (decks && Array.isArray(decks.results) ? decks.results : [])
  ), [decks]);

  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [prevCursors, setPrevCursors] = useState([]); // stack for going back
  const [cursor, setCursor] = useState(null); // current cursor param
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddCard, setShowAddCard] = useState(false);

  // Find deck id: prefer location.state, else look up by slug
  const deck = useMemo(() => {
    if (!decksArr || decksArr.length === 0) return null;
    if (location.state && location.state.id) {
      return decksArr.find(d => String(d.id) === String(location.state.id));
    }
    // fallback: look up by slug
    const match = decksArr.find(d => {
      const kebab = d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return kebab === slug;
    });
    return match || null;
  }, [decksArr, location.state, slug]);

  const id = deck ? deck.id : null;

  useEffect(() => {
    if (deck && deck.name) {
      document.title = deck.name;
      // If the slug in the URL does not match, replace it with the correct one
      const kebab = deck.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (slug !== kebab) {
        navigate(`/decks/${kebab}`, { replace: true, state: { id: deck.id } });
      }
    }
  }, [deck, slug, navigate]);

  // Defensive: check for token before fetching cards
  React.useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || typeof token !== 'string' || token.length < 10) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  }, []);

  // Defensive: show loading if decks are not loaded yet
  const decksLoading = !decksArr || decksArr.length === 0;
  const deckNotFound = !decksLoading && !deck;

  // Fetch cards for this deck with cursor pagination and filters
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let url = `${import.meta.env.VITE_API_BASE_URL}/cards/?deck=${id}`;
    let params = [];
    if (cursor) params.push(`cursor=${encodeURIComponent(cursor)}`);
    if (selectedTags.length > 0) params.push(`tags=${encodeURIComponent(selectedTags.join(','))}`);
    if (selectedDifficulties.length > 0) params.push(`difficulties=${encodeURIComponent(selectedDifficulties.join(','))}`);
    if (params.length > 0) url += (url.includes('?') ? '&' : '?') + params.join('&');
    console.log('Fetching cards:', url);
    // Add a timeout to the fetch
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s
    fetchWithAuth(url, { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        console.log('Cards response:', d);
        // Always expect paginated object from backend
        setCards(Array.isArray(d.results) ? d.results : []);
        setNextCursor(d.next ? new URL(d.next).searchParams.get('cursor') : null);
      })
      .catch((e) => {
        if (e.name === 'AbortError') {
          setError('Request timed out.');
        } else {
          setError('Could not load cards');
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });
    return () => clearTimeout(timeout);
  }, [id, cursor, selectedTags, selectedDifficulties]);

  // Reset pagination when filters change
  useEffect(() => {
    setCursor(null);
    setPrevCursors([]);
  }, [selectedTags, selectedDifficulties, id]);

  // All tags in this deck
  const allTags = useMemo(() => Array.from(new Set(cards.flatMap(c => (c.tags || '').split(',').map(t => t.trim()).filter(Boolean)))), [cards]);

  // All difficulties present in this deck (for filter buttons)
  const DIFFICULTIES = useMemo(
    () => Array.from(new Set(cards.map(c => (c.difficulty || c.data?.difficulty || '').charAt(0).toUpperCase() + (c.difficulty || c.data?.difficulty || '').slice(1).toLowerCase()).filter(Boolean))),
    [cards]
  );

  // Toggle difficulty selection
  function toggleDifficulty(diff) {
    setSelectedDifficulties(diffs =>
      diffs.includes(diff)
        ? diffs.filter(d => d !== diff)
        : [...diffs, diff]
    );
  }

  // Pagination handlers
  const handleNext = () => {
    if (nextCursor) {
      setPrevCursors(prev => [...prev, cursor]);
      setCursor(nextCursor);
    }
  };
  const handlePrev = () => {
    if (prevCursors.length > 0) {
      const prev = [...prevCursors];
      const last = prev.pop();
      setPrevCursors(prev);
      setCursor(last);
    }
  };

  if (decksLoading) return <div className="p-8 text-center text-midnight font-sans">Loading decks...</div>;
  if (deckNotFound) return <div className="p-8 text-center text-midnight font-sans">Deck not found.</div>;
  if (loading) return <div className="p-8 text-center text-midnight font-sans">Loading…</div>;
  if (error) return <div className="p-8 text-center text-red-600 font-sans">{error}</div>;
  if (!deck) return <div className="p-8 text-center text-midnight font-sans">Deck not found.</div>;

  return (
    <div className="min-h-screen w-full bg-gradient-subtle font-sans flex justify-center items-start py-14 px-2">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-card p-10">
        <div className="mb-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-4 text-midnight">
              {deck.name}
              <Link to="/">
                <button className="ml-4 rounded-xl border border-sky bg-white px-5 py-2 text-base font-medium text-sky hover:bg-sky hover:text-white transition-colors shadow-card hover:shadow-card-hover">Back to Decks</button>
              </Link>
            </h2>
            <p className="text-gray-500 text-base mb-2">{deck.description}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddCard(true)}
              className="rounded-xl bg-sky px-6 py-3 text-base font-semibold text-white shadow-card hover:bg-sky/90 hover:shadow-card-hover transition-colors animate-card-pop"
              style={{boxShadow:'0 2px 8px rgba(58,175,255,0.10)'}}
            >
              <HiPlus className="h-6 w-6" />
              Add Card
            </button>
            <button
              onClick={() => navigate(`/learn/${deck.id}`)}
              className="inline-flex items-center gap-2 rounded-xl border border-accent-purple bg-white px-6 py-3 text-base font-semibold text-accent-purple shadow-card hover:bg-accent-purple hover:text-white hover:shadow-card-hover transition-colors"
            >
              Learn
            </button>
          </div>
        </div>
        {/* Add Card Modal/Inline */}
        {showAddCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full relative">
              <button
                onClick={() => setShowAddCard(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
                aria-label="Close"
              >
                ×
              </button>
              <CreateCard
                decks={decksArr}
                reloadCards={() => {
                  setShowAddCard(false);
                  fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/cards/?deck=${id}`)
                    .then(r => r.json())
                    .then(d => setCards(d.results || []));
                  if (reloadDecks) reloadDecks();
                }}
                defaultDeckId={deck.id}
              />
            </div>
          </div>
        )}
        {/* Difficulty filter */}
        <div className="mb-6 flex flex-wrap gap-3 items-center">
          {['Easy', 'Medium', 'Hard'].map(diff => {
            const active = selectedDifficulties.length === 0 || selectedDifficulties.includes(diff);
            const COLOR = {
              Easy:   '#3AAFFF',
              Medium: '#ffc107',
              Hard:   '#dc3545',
            }[diff];
            return (
              <button
                key={diff}
                onClick={() => toggleDifficulty(diff)}
                className={`px-4 py-1.5 rounded-pill text-base font-medium border transition-shadow transition-colors shadow-card ${active ? 'text-white' : 'text-midnight hover:bg-lightgray'} animate-card-pop`}
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
        </div>
        {/* Tag filter */}
        <div className="mb-8">
          <div className="font-semibold mb-2 text-midnight">Filter by Tag</div>
          <TagEditor
            tags={selectedTags}
            onChange={setSelectedTags}
            allTags={allTags}
            addButtonLabel="Search Tag"
          />
        </div>
        {/* Card list or empty state */}
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="text-xl font-semibold text-midnight mb-2">No cards for this filter</div>
          </div>
        ) : (
          <CardContainer cardData={cards} />
        )}
        {/* Cursor Pagination controls */}
        <div className="flex justify-center gap-4 mt-10">
          <button
            className="rounded-xl border border-sky bg-white px-5 py-2 text-base font-medium text-sky hover:bg-sky hover:text-white transition-colors shadow-card hover:shadow-card-hover"
            onClick={handlePrev}
            disabled={prevCursors.length === 0}
          >
            « Prev
          </button>
          <button
            className="rounded-xl border border-sky bg-white px-5 py-2 text-base font-medium text-sky hover:bg-sky hover:text-white transition-colors shadow-card hover:shadow-card-hover"
            onClick={handleNext}
            disabled={!nextCursor}
          >
            Next »
          </button>
        </div>
      </div>
    </div>
  );
}

// Note: The reloadDecks prop was previously used to refresh the parent deck list after card/deck changes.
// In the new workflow, DeckDetail only manages cards for a single deck, and deck list changes (create/delete/rename)
// are handled in the main deck grid and ManageDecks. DeckDetail only needs to update its own card list, not the global decks.
// When linking to DeckDetail elsewhere (e.g., in deck grid), use `/decks/${d.id}/${kebab}`
