import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import fetchWithAuth from './api';
import Editor from '@monaco-editor/react';
import TagEditor from './TagEditor';


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
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
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
      // Only include fields present in cardTypeFields
      const data = {};
      (Array.isArray(cardTypeFields) ? cardTypeFields : []).forEach(field => {
        data[field] = form[field] || '';
      });
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
        setSaving(false);
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
  return (
    <div className="mx-auto w-full max-w-full lg:max-w-6xl px-10 py-6 bg-white rounded-lg shadow-lg">
      <h2 className="mb-8 text-3xl font-semibold text-gray-800 text-center">
        New Flashcard
      </h2>
      {error && (
        <p className="mb-6 rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-6 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">
          {success}
        </p>
      )}
      {showFieldWarning && (
        <p className="mb-6 rounded-md bg-yellow-50 px-4 py-2 text-sm text-yellow-700">
          Warning: This card type has no fields. You can still add tags.
        </p>
      )}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Only show deck select if NOT in DeckDetail (no defaultDeckId) and more than one deck */}
        {(!defaultDeckId && Array.isArray(decks) && decks.length > 1) && (
          <div className="col-span-full mb-4">
            <label className="mb-1 text-sm font-medium text-gray-700">Deck</label>
            <select
              name="deck"
              value={form.deck}
              onChange={handleChange}
              required
              className="rounded-md border border-gray-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
            <label className="mb-1 text-sm font-medium text-gray-700">Deck</label>
            <input
              type="text"
              value={selectedDeck.name}
              disabled
              className="rounded-md border border-gray-300 py-2 px-3 text-sm shadow-sm bg-gray-100 text-gray-700 cursor-not-allowed"
            />
          </div>
        )}
        {/* Only render fields from cardTypeFields */}
        {(Array.isArray(cardTypeFields) ? cardTypeFields : []).filter(field => field !== 'tags').map(field => (
          <div key={field} className="flex flex-col col-span-1">
            <label className="mb-1 text-sm font-medium text-gray-700">
              {field.charAt(0).toUpperCase() + field.slice(1)}
            </label>
            {field === 'solution' ? (
              <div className="rounded-md border border-gray-300 shadow-sm overflow-hidden">
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
                className="rounded-md border border-gray-300 py-2 px-3 text-sm shadow-sm resize-y focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            ) : (
              <input
                name={field}
                value={form[field] || ''}
                onChange={handleChange}
                required={Array.isArray(selectedDeck?.card_type?.fields) ? selectedDeck.card_type.fields.includes(field) : false}
                className="rounded-md border border-gray-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            )}
          </div>
        ))}
        {/* TAGS always shown */}
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
            className="rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white shadow transition hover:bg-red-700"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-green-600 px-5 py-2 text-sm font-medium text-white shadow transition hover:bg-green-700"
            disabled={saving || !canSubmit}
          >
            {saving ? 'Saving...' : 'Create Card'}
          </button>
        </div>
      </form>
    </div>
  );
}
