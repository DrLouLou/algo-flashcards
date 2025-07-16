import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import fetchWithAuth from './api';
import Editor from '@monaco-editor/react';
import TagEditor from './TagEditor';
import { HiCog, HiCode, HiDocumentText, HiTag, HiEyeOff, HiInformationCircle, HiPlus } from 'react-icons/hi';


// Utility to strictly enforce card data matches card type fields
function normalizeCardData(fields, data) {
  const result = {};
  (fields || []).forEach(f => { result[f] = data && data[f] !== undefined ? data[f] : ''; });
  return result;
}

export default function CreateCard({ decks, reloadDecks }) {
  const navigate = useNavigate();
  const { slug } = useParams();
  
  // Find the deck from the URL slug
  const selectedDeck = useMemo(() => {
    if (!decks || !slug) return null;
    return decks.find(d => {
      const kebab = d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return kebab === slug;
    });
  }, [decks, slug]);

  const [form, setForm] = useState({
    deck: selectedDeck?.id || '',
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

  // Get the card type fields for the selected deck, always as array
  const cardTypeFields = useMemo(() => {
    if (selectedDeck && selectedDeck.card_type && Array.isArray(selectedDeck.card_type.fields)) {
      return selectedDeck.card_type.fields;
    }
    // fallback to default fields if not available
    return ['problem','difficulty','category','hint','pseudo','solution','complexity'];
  }, [selectedDeck]);

  // Fields that are hidden for this card type (from the database)
  const hiddenFields = useMemo(() => {
    if (selectedDeck && selectedDeck.card_type && selectedDeck.card_type.layout && Array.isArray(selectedDeck.card_type.layout.hidden)) {
      console.log('Hidden fields from card type:', selectedDeck.card_type.layout.hidden);
      return selectedDeck.card_type.layout.hidden;
    }
    console.log('No hidden fields found or invalid structure');
    return [];
  }, [selectedDeck]);

  useEffect(() => {
    if (selectedDeck) {
      setForm(f => ({ ...f, deck: selectedDeck.id }));
    }
  }, [selectedDeck]);

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
      if (reloadDecks) reloadDecks();
      // Redirect to the deck detail page for the current deck
      const kebab = selectedDeck.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      setTimeout(() => navigate(`/decks/${kebab}`, { state: { id: selectedDeck.id } }), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Render deck select if multiple decks
  // Only render fields from cardTypeFields, never show 'tags' or (for starter deck) 'category' as fields
  const isStarter = Array.isArray(cardTypeFields) && cardTypeFields.includes('category') && cardTypeFields.includes('problem') && cardTypeFields.length === 7;

  // --- Metadata pills: tags and (for default deck) category ---
  // Show tags and, for starter deck, category as metadata above the form
  // (category is not editable here, just shown as a pill if present)

  // Handle case where deck is not found
  if (!selectedDeck) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HiInformationCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Deck Not Found</h2>
          <p className="text-gray-600 mb-6">The deck you're trying to create a card for doesn't exist.</p>
          <Link
            to="/decks"
            className="inline-block px-6 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-colors font-medium shadow-lg hover:shadow-xl"
          >
            Back to Decks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white px-8 py-6">
            <div className="flex items-center gap-3">
              <HiPlus className="w-8 h-8 text-sky-100" />
              <div>
                <h1 className="text-3xl font-bold">Create New Flashcard</h1>
                <p className="text-sky-100 mt-1">Add a new card to <span className="font-semibold">{selectedDeck.name}</span></p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Deck Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <HiCog className="w-5 h-5 text-sky-600" />
                  Deck Information
                </h3>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 bg-sky-500 rounded-full"></div>
                    <h4 className="font-semibold text-gray-800">{selectedDeck.name}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{selectedDeck.description}</p>
                  
                  {/* Hidden Fields Information */}
                  {hiddenFields.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <HiEyeOff className="w-4 h-4 text-amber-600" />
                        <h5 className="text-sm font-medium text-amber-800">Hidden Fields</h5>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {hiddenFields.map(field => (
                          <span 
                            key={field} 
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800"
                          >
                            {field.charAt(0).toUpperCase() + field.slice(1)}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-amber-700">
                        These fields are hidden as configured in your deck's card type settings.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Fields */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <HiDocumentText className="w-5 h-5 text-sky-600" />
                  Card Fields
                </h3>
                
                {showFieldWarning && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl mb-4">
                    <div className="flex items-center gap-2">
                      <HiInformationCircle className="w-5 h-5" />
                      <span>Warning: This card type has no fields. You can still add tags.</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {(Array.isArray(cardTypeFields) ? cardTypeFields : [])
                    .filter(field => field !== 'tags' && (!isStarter || field !== 'category'))
                    .map(field => (
                      <div key={field} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.charAt(0).toUpperCase() + field.slice(1)}
                          {Array.isArray(selectedDeck?.card_type?.fields) && selectedDeck.card_type.fields.includes(field) && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        {field === 'solution' ? (
                          <div className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-gray-100 px-3 py-2 flex items-center gap-2 border-b border-gray-200">
                              <HiCode className="w-4 h-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">Code Editor</span>
                            </div>
                            <Editor
                              height="200px"
                              defaultLanguage="python"
                              theme="vs-light"
                              value={form.solution}
                              onChange={val => setForm(f => ({ ...f, solution: val ?? '' }))}
                              options={{ 
                                minimap: { enabled: false }, 
                                fontSize: 14, 
                                scrollBeyondLastLine: false,
                                padding: { top: 10, bottom: 10 }
                              }}
                            />
                          </div>
                        ) : field === 'pseudo' ? (
                          <textarea
                            name={field}
                            value={form[field] || ''}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-base resize-none transition-all"
                            placeholder={`Enter ${field}...`}
                          />
                        ) : (
                          <input
                            name={field}
                            value={form[field] || ''}
                            onChange={handleChange}
                            required={Array.isArray(selectedDeck?.card_type?.fields) ? selectedDeck.card_type.fields.includes(field) : false}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-base transition-all"
                            placeholder={`Enter ${field}...`}
                          />
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Tags */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <HiTag className="w-5 h-5 text-sky-600" />
                  Tags
                </h3>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <TagEditor
                    tags={form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []}
                    onChange={tagsArr => setForm(f => ({ ...f, tags: tagsArr.join(',') }))}
                    allTags={Array.from(new Set((decks || []).flatMap(deck => (deck.tags || []).concat((deck.cards || []).flatMap(card => (card.tags || '').split(',').map(t => t.trim()).filter(Boolean))))))}
                    addButtonLabel="Add Tag"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div className="flex-1">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
                      {success}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedDeck) {
                        const kebab = selectedDeck.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                        navigate(`/decks/${kebab}`, { state: { id: selectedDeck.id } });
                      } else {
                        navigate('/decks');
                      }
                    }}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium shadow-lg hover:shadow-xl"
                    disabled={saving || !canSubmit}
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      'Create Card'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
