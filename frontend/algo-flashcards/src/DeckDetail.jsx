// src/DeckDetail.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import fetchWithAuth from './api';
import CardContainer from './CardContainer';
import TagEditor from './TagEditor';
import { HiPlus } from 'react-icons/hi';
import CreateCard from './CreateCard';

export default function DeckDetail({ decks, reloadDecks }) {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddCard, setShowAddCard] = useState(false);

  // Find deck id: prefer location.state, else look up by slug
  const deck = useMemo(() => {
    if (!decks) return null;
    if (location.state && location.state.id) {
      return decks.find(d => String(d.id) === String(location.state.id));
    }
    // fallback: look up by slug
    const match = decks.find(d => {
      const kebab = d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return kebab === slug;
    });
    return match || null;
  }, [decks, location.state, slug]);

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

  // Fetch cards for this deck
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/cards/?deck=${id}`)
      .then(r => r.json())
      .then(d => setCards(d.results || []))
      .catch(() => setError('Could not load cards'))
      .finally(() => setLoading(false));
  }, [id]);

  // All tags in this deck
  const allTags = useMemo(() => Array.from(new Set(cards.flatMap(c => (c.tags || '').split(',').map(t => t.trim()).filter(Boolean)))), [cards]);

  // All difficulties present in this deck (for filter buttons)
  const DIFFICULTIES = useMemo(
    () => Array.from(new Set(cards.map(c => (c.difficulty || c.data?.difficulty || '').charAt(0).toUpperCase() + (c.difficulty || c.data?.difficulty || '').slice(1).toLowerCase()).filter(Boolean))),
    [cards]
  );

  // Filtered cards (by tag and difficulty)
  const visibleCards = useMemo(() => {
    let filtered = cards;
    if (selectedTags.length > 0) {
      filtered = filtered.filter(c => selectedTags.every(tag => (c.tags || '').split(',').includes(tag)));
    }
    if (selectedDifficulties.length > 0) {
      filtered = filtered.filter(c => selectedDifficulties.includes((c.difficulty || c.data?.difficulty || '').charAt(0).toUpperCase() + (c.difficulty || c.data?.difficulty || '').slice(1).toLowerCase()));
    }
    return filtered;
  }, [cards, selectedTags, selectedDifficulties]);

  // Toggle difficulty selection
  function toggleDifficulty(diff) {
    setSelectedDifficulties(diffs =>
      diffs.includes(diff)
        ? diffs.filter(d => d !== diff)
        : [...diffs, diff]
    );
  }

  // When rendering CardContainer, ensure every card has a deck object
  const visibleCardsWithDeck = useMemo(() =>
    visibleCards.map(card =>
      card.deck && typeof card.deck === 'object'
        ? { ...card, _allCardsForDeck: visibleCards }
        : { ...card, deck, _allCardsForDeck: visibleCards }
    ),
    [visibleCards, deck]
  );

  if (loading) return <div className="p-8">Loading…</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!deck) return <div className="p-8">Deck not found.</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight mb-1">{deck.name}</h2>
          <p className="text-gray-600 text-sm mb-2">{deck.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddCard(true)}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
          >
            <HiPlus className="h-5 w-5" />
            Add Card
          </button>
          <button
            onClick={() => navigate(`/learn/${deck.id}`)}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            Learn
          </button>
        </div>
      </div>

      {/* Add Card Modal/Inline */}
      {showAddCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full relative">
            <button
              onClick={() => setShowAddCard(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
              aria-label="Close"
            >
              ×
            </button>
            <CreateCard
              decks={decks}
              reloadCards={() => {
                setShowAddCard(false);
                // re-fetch cards for this deck
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
      <div className="mb-4 flex flex-wrap gap-2">
        {['Easy', 'Medium', 'Hard'].map(diff => {
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
              className={`px-3 py-1 rounded-full text-sm border transition ${active ? 'text-white' : 'text-gray-700 hover:bg-gray-50'}`}
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
      <div className="mb-6">
        <div className="font-medium mb-1">Filter by Tag</div>
        <TagEditor
          tags={selectedTags}
          onChange={setSelectedTags}
          allTags={allTags}
          addButtonLabel="Search Tag"
        />
      </div>

      {/* Card list */}
      <CardContainer cardData={visibleCardsWithDeck} />

      {/* Back to decks */}
      <div className="mt-8">
        <Link to="/">
          <button className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Back to Decks</button>
        </Link>
      </div>
    </div>
  );
}

// Note: The reloadDecks prop was previously used to refresh the parent deck list after card/deck changes.
// In the new workflow, DeckDetail only manages cards for a single deck, and deck list changes (create/delete/rename)
// are handled in the main deck grid and ManageDecks. DeckDetail only needs to update its own card list, not the global decks.
// When linking to DeckDetail elsewhere (e.g., in deck grid), use `/decks/${d.id}/${kebab}`
