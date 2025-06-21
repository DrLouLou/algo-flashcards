import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import fetchWithAuth from './api';
import Editor from '@monaco-editor/react';
import TagEditor from './TagEditor';


// Utility to strictly enforce card data matches card type fields
function normalizeCardData(fields, data) {
  const result = {};
  (fields || []).forEach(f => { result[f] = data && data[f] !== undefined ? data[f] : ''; });
  return result;
}

export default function CreateCard({ decks, reloadCards, defaultDeckId }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    deck: defaultDeckId || (decks.length ? decks[0].id : ''),
    problem: '',
    difficulty: '',
    category: '',
    hint: '',
    pseudo: '',
    solution: '',
    complexity: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);

  // Find the selected deck object
  const selectedDeck = useMemo(() => (Array.isArray(decks) ? decks.find(d => String(d.id) === String(form.deck)) : null), [form.deck, decks]);
  // Get the card type fields for the selected deck, always as array
  const cardTypeFields = useMemo(() => {
    if (selectedDeck && selectedDeck.card_type && Array.isArray(selectedDeck.card_type.fields)) {
      return selectedDeck.card_type.fields;
    }
    // fallback to default fields if not available
    return ['problem','difficulty','category','hint','pseudo','solution','complexity'];
  }, [selectedDeck]);

  useEffect(() => {
    if (defaultDeckId) {
      setForm(f => ({ ...f, deck: defaultDeckId }));
    } else if (decks.length > 0) {
      setForm(f => ({ ...f, deck: decks[0].id }));
    }
  }, [defaultDeckId, decks]);

  // --- update form state to always have all fields ---
  useEffect(() => {
    if (!cardTypeFields) return;
    setForm(f => {
      const newForm = { ...f };
      cardTypeFields.forEach(field => {
        if (!(field in newForm)) newForm[field] = '';
      });
      // Remove any fields not in cardTypeFields
      Object.keys(newForm).forEach(key => {
        if (!cardTypeFields.includes(key) && !['deck','tags'].includes(key)) {
          delete newForm[key];
        }
      });
      return newForm;
    });
  }, [cardTypeFields]);

  // Only allow submit if a valid deck is selected
  const canSubmit = !!selectedDeck && !!selectedDeck.card_type;

  // Restore error/success state, but only use for rendering, not for logic
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Defensive: if no valid deck, show error and disable form
  useEffect(() => {
    if (!selectedDeck) {
      setError('No valid deck selected. Please return to the deck list and try again.');
    }
  }, [selectedDeck]);

  // Defensive: if cardTypeFields is empty, show warning
  const showFieldWarning = cardTypeFields.length === 0;

  const handleChange = e => {
    setError(null); setSuccess(null);
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!canSubmit) {
      setError('No valid deck or card type selected.');
      return;
    }
    setSaving(true);
    try {
      // Strictly enforce data layout
      const data = normalizeCardData(cardTypeFields, form);
      // Always send deck as a plain ID (string or number)
      const deckId = selectedDeck && typeof selectedDeck.id !== 'undefined' ? selectedDeck.id : form.deck;
      if (!deckId) throw new Error('Deck is required.');
      const submitForm = {
        deck_id: String(deckId),
        data,
        tags: form.tags,
      };
      const res = await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/cards/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitForm),
        },
      );
      if (!res.ok) {
        let errMsg = 'Could not create card';
        try {
          const data = await res.json();
          if (typeof data === 'string') errMsg = data;
          else if (data && (data.problem || data.deck || data.card_type)) {
            errMsg = data.problem || data.deck || data.card_type || errMsg;
          } else if (data && data.detail) {
            errMsg = data.detail;
          }
        } catch { /* ignore JSON parse errors */ }
        setError(errMsg);
        return;
      }
      setSuccess('Card created! Redirecting...');
      if (reloadCards) reloadCards();
      // Redirect to the deck detail page for the current deck
      const kebab = selectedDeck.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      setTimeout(() => navigate(`/decks/${kebab}`, { state: { id: deckId } }), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Render deck select if multiple decks
  // Only render fields from cardTypeFields, never show 'tags' or (for starter deck) 'category' as fields
  const isStarter = Array.isArray(cardTypeFields) && cardTypeFields.includes('category') && cardTypeFields.includes('problem') && cardTypeFields.length === 7;
  const category = form.category;

  // --- Metadata pills: tags and (for default deck) category ---
  // Show tags and, for starter deck, category as metadata above the form
  // (category is not editable here, just shown as a pill if present)

  return (
    <div className="min-h-screen w-full bg-gradient-subtle font-sans flex justify-center items-center py-14 px-2">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-card p-10">
        <h2 className="mb-8 text-3xl font-bold text-midnight text-center tracking-tight">New Flashcard</h2>
        {/* Metadata pills above form */}
        <div className="flex flex-wrap gap-2 mb-4">
          {isStarter && category && (
            <span className="bg-accent-purple/10 text-accent-purple px-3 py-1 rounded-pill text-xs font-medium shadow-card animate-card-pop">{category}</span>
          )}
          {(form.tags || '').split(',').map(t => t.trim()).filter(Boolean).map(tag => (
            <span key={tag} className="bg-sky/10 text-sky px-3 py-1 rounded-pill text-xs font-medium shadow-card animate-card-pop">{tag}</span>
          ))}
        </div>
        {error && (
          <p className="mb-6 rounded-md bg-red-50 px-4 py-2 text-base text-red-600 font-medium">
            {error}
          </p>
        )}
        {success && (
          <p className="mb-6 rounded-md bg-green-50 px-4 py-2 text-base text-green-700 font-medium">
            {success}
          </p>
        )}
        {showFieldWarning && (
          <p className="mb-6 rounded-md bg-yellow-50 px-4 py-2 text-base text-yellow-700 font-medium">
            Warning: This card type has no fields. You can still add tags.
          </p>
        )}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Only show deck select if NOT in DeckDetail (no defaultDeckId) and more than one deck */}
          {(!defaultDeckId && Array.isArray(decks) && decks.length > 1) && (
            <div className="col-span-full mb-4">
              <label className="mb-1 text-base font-semibold text-midnight">Deck</label>
              <select
                name="deck"
                value={form.deck}
                onChange={handleChange}
                required
                className="rounded-xl border border-gray-300 py-3 px-4 text-base shadow-sm focus:border-sky focus:ring-1 focus:ring-sky bg-lightgray"
              >
                {Array.isArray(decks) ? decks.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                )) : null}
              </select>
            </div>
          )}
          {/* If in DeckDetail, show deck name as read-only info */}
          {(defaultDeckId && selectedDeck) && (
            <div className="col-span-full mb-4">
              <label className="mb-1 text-base font-semibold text-midnight">Deck</label>
              <input
                type="text"
                value={selectedDeck.name}
                disabled
                className="rounded-xl border border-gray-300 py-3 px-4 text-base shadow-sm bg-lightgray text-midnight cursor-not-allowed"
              />
            </div>
          )}
          {/* Only render fields from cardTypeFields, never 'tags' or (for starter) 'category' */}
          {(Array.isArray(cardTypeFields) ? cardTypeFields : []).filter(field => field !== 'tags' && (!isStarter || field !== 'category')).map(field => (
            <div key={field} className="flex flex-col col-span-1">
              <label className="mb-1 text-base font-semibold text-midnight">
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </label>
              {field === 'solution' ? (
                <div className="rounded-xl border border-gray-300 shadow-sm overflow-hidden">
                  <Editor
                    height="30vh"
                    defaultLanguage="python"
                    theme="vs-light"
                    value={form.solution}
                    onChange={val => setForm(f => ({ ...f, solution: val ?? '' }))}
                    options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }}
                  />
                </div>
              ) : field === 'pseudo' ? (
                <textarea
                  name={field}
                  value={form[field] || ''}
                  onChange={handleChange}
                  rows={4}
                  className="rounded-xl border border-gray-300 py-3 px-4 text-base shadow-sm resize-y focus:border-sky focus:ring-1 focus:ring-sky bg-lightgray"
                />
              ) : (
                <input
                  name={field}
                  value={form[field] || ''}
                  onChange={handleChange}
                  required={Array.isArray(selectedDeck?.card_type?.fields) ? selectedDeck.card_type.fields.includes(field) : false}
                  className="rounded-xl border border-gray-300 py-3 px-4 text-base shadow-sm focus:border-sky focus:ring-1 focus:ring-sky bg-lightgray"
                />
              )}
            </div>
          ))}
          {/* TAGS editor always shown, but not as a field */}
          <div className="flex flex-col col-span-full">
            <TagEditor
              tags={form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []}
              onChange={tagsArr => setForm(f => ({ ...f, tags: tagsArr.join(',') }))}
              allTags={Array.from(new Set((decks || []).flatMap(deck => (deck.tags || []).concat((deck.cards || []).flatMap(card => (card.tags || '').split(',').map(t => t.trim()).filter(Boolean))))))}
              addButtonLabel="Add Tag"
            />
          </div>
          {/* buttons */}
          <div className="col-span-full flex justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl bg-red-500 px-6 py-3 text-base font-medium text-white shadow-card hover:bg-red-600 hover:shadow-card-hover transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-sky px-6 py-3 text-base font-semibold text-white shadow-card hover:bg-sky/90 hover:shadow-card-hover transition-colors animate-card-pop"
              disabled={saving || !canSubmit}
            >
              {saving ? 'Saving...' : 'Create Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
