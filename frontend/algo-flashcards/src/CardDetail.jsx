import Editor from '@monaco-editor/react'
import { useState, useEffect, useMemo } from 'react'
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'
import fetchWithAuth from './api'
import './styles/CardDetail.css'
import TagEditor from './TagEditor'
import { getCardLayout } from './cardLayoutUtils';

export default function CardDetail({ decks }) {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const API = import.meta.env.VITE_API_BASE_URL;

  // Robustly resolve cardType for all cases (custom and default)
  // Defensive: always use Array.isArray(decks) for .find
  let deckObj = null;
  let cardType = {};
  if (formData) {
    if (formData.deck && typeof formData.deck === 'object') {
      deckObj = formData.deck;
      cardType = deckObj.card_type || formData.card_type || {};
    } else if (formData.card_type && typeof formData.card_type === 'object') {
      cardType = formData.card_type;
    } else if (formData.deck && Array.isArray(decks)) {
      deckObj = decks.find(d => String(d.id) === String(formData.deck));
      cardType = deckObj?.card_type || {};
    }
    // Defensive: if cardType is still missing fields, try to infer from formData.data
    if (!Array.isArray(cardType.fields) && formData.data) {
      cardType.fields = Object.keys(formData.data);
    }
  }
  const { front: frontFields, back: backFields } = getCardLayout(cardType, formData?.data);

  // Get hidden fields from cardType.layout.hidden (array of field names)
  const hiddenFields = Array.isArray(cardType?.layout?.hidden) ? cardType.layout.hidden : [];

  // Get hidden fields for front and back, preserving order
  const hiddenFrontFields = Array.isArray(cardType?.layout?.front)
    ? cardType.layout.front.filter(f => hiddenFields.includes(f))
    : [];
  const hiddenBackFields = Array.isArray(cardType?.layout?.back)
    ? cardType.layout.back.filter(f => hiddenFields.includes(f))
    : [];

  // Filter out hidden fields from front/back for main display
  const visibleFrontFields = frontFields.filter(f => !hiddenFields.includes(f));
  const visibleBackFields = backFields.filter(f => !hiddenFields.includes(f));

  // Try to get cards from navigation state (DeckDetail passes them), else fallback to decks
  const cardsFromState = location.state && location.state.cards;

  const cardId = useMemo(() => {
    if (location.state && location.state.id) return location.state.id;
    // Use cards from navigation state if available
    if (cardsFromState) {
      const match = cardsFromState.find(c => {
        const kebab = (c.data.problem || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        return kebab === slug;
      });
      if (match) return match.id;
    }
    // fallback: look up by slug from all decks' cards (legacy, less reliable)
    if (decks) {
      for (const deck of decks) {
        if (deck.cards) {
          const match = deck.cards.find(c => {
            const kebab = (c.data.problem || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            return kebab === slug;
          });
          if (match) return match.id;
        }
      }
    }
    return null;
  }, [location.state, slug, decks, cardsFromState]);

  useEffect(() => {
    if (!cardId) return;
    fetchWithAuth(`${API}/cards/${cardId}/`)
      .then(res => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(card => {
        setFormData(card);
        setInitialData(card);
        // Set document title to card problem or deck name if available
        if (card.data && card.data.problem) {
          document.title = card.data.problem;
        } else if (location.state && location.state.deckName) {
          document.title = location.state.deckName;
        } else {
          document.title = 'Card Detail';
        }
        // If the slug in the URL does not match, replace it with the correct one
        const kebab = (card.data.problem || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        // Only navigate if both are non-empty and different
        if (kebab && slug && slug !== kebab) {
          navigate(`/cards/${kebab}`, { replace: true, state: location.state });
        }
      })
      .catch(console.error);
  }, [API, cardId, slug, location.state, navigate]);

  // --- Show error if cardId is not found ---
  if (cardId === null) {
    return (
      <div className="p-8 text-center">
        <div className="mb-4 text-2xl text-red-600 font-semibold">Card not found.</div>
        <div className="mb-6 text-gray-500">The card you are looking for does not exist or could not be found in this deck.</div>
        <button
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow transition hover:bg-indigo-700"
          onClick={() => navigate(-1)}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!formData) return <p>Loading…</p>;

  // --- Metadata pills: tags and (for default deck) category ---
  // Show tags and, for starter deck, category as metadata above the card
  const tagsArr = (formData.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  const isStarter = Array.isArray(cardType?.fields) && cardType.fields.includes('category') && cardType.fields.includes('problem') && cardType.fields.length === 7;
  const category = formData.data?.category;

  // Shared handlers
  const handleSave = () => {
    // Strictly enforce data layout before saving
    const normalizedData = normalizeCardData(cardType.fields, formData.data);
    fetchWithAuth(`${API}/cards/${cardId}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, data: normalizedData }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Save failed')
        return res.json()
      })
      .then(updated => {
        setFormData(updated)
        setInitialData(updated)
        setIsEditing(false)
        alert('Saved successfully!')
      })
      .catch(err => alert(`Error: ${err.message}`))
  }
  const handleCancel = () => {
    setFormData(initialData)
    setIsEditing(false)
  }
  const toggleFlip = () => {
    setIsFlipped(f => !f)
  }
  // Tag change handler
  const handleTagsChange = tags => {
    setFormData(prev => ({ ...prev, tags: tags.join(',') }));
  };
  // Add status update handler (if userCardId/status available)
  const updateStatus = (status) => {
    if (!formData.userCardId) return;
    fetchWithAuth(`${API}/usercards/${formData.userCardId}/set_status/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
      .then(r => r.ok ? r.json() : Promise.reject('Status update failed'))
      .then(() => setFormData(f => ({ ...f, status })))
      .catch(console.error);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-subtle font-sans">
      <div className="relative max-w-2xl w-full mx-auto bg-white/90 rounded-2xl shadow-card p-10 space-y-8 border border-gray-100 backdrop-blur-md">
        {/* Edit button (top-right, always visible) */}
        <button
          onClick={() => setIsEditing(true)}
          className={`absolute top-6 right-6 z-20 px-4 py-2 rounded-xl bg-sky text-white shadow-card hover:bg-accent-purple transition-colors font-semibold flex items-center gap-2 animate-card-pop ${isEditing ? 'hidden' : ''}`}
          aria-label="Edit Card"
        >
          <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.232 5.232l3.536 3.536M9 11l6 6M3 21v-4.586a1 1 0 01.293-.707l12-12a1 1 0 011.414 0l4.586 4.586a1 1 0 010 1.414l-12 12a1 1 0 01-.707.293H3z' /></svg>
          <span>Edit</span>
        </button>
        {/* METADATA PILLS: tags and (for starter deck) category, with inline TagEditor in edit mode */}
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          {isStarter && category && (
            <span className="bg-accent-purple/10 text-accent-purple px-3 py-1 rounded-pill text-xs font-medium shadow-card animate-card-pop">{category}</span>
          )}
          {/* Tags as pills, editable inline in edit mode */}
          <TagEditor
            tags={tagsArr}
            onChange={isEditing ? handleTagsChange : undefined}
            editable={isEditing}
            pillClassName="bg-sky/10 text-sky px-3 py-1 rounded-pill text-xs font-medium shadow-card animate-card-pop"
            inputClassName="border border-sky rounded-pill px-2 py-1 text-xs ml-2 focus:ring-2 focus:ring-sky"
            addButtonLabel="Add"
          />
        </div>
        {/* ...existing code... */}
        {/* Status controls if available */}
        {formData.status && (
          <div className="flex gap-2 items-center">
            <span className="font-semibold text-midnight">Status:</span>
            {['new','review','known'].map(s => (
              <button
                key={s}
                className={`px-4 py-1.5 rounded-pill border text-xs font-semibold transition-colors shadow-card ${formData.status === s ? 'bg-sky text-white' : 'bg-lightgray text-midnight hover:bg-sky/10'}`}
                onClick={() => updateStatus(s)}
                disabled={formData.status === s}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}
        {/* Card fields - unified layout for both modes, but editable in edit mode */}
        <div className="space-y-5">
          {!isFlipped ? (
            // FRONT SIDE
            visibleFrontFields.filter(field => field !== 'tags' && (!isStarter || field !== 'category')).map(field => (
              <div key={field} className="flex items-center space-x-2 text-base text-midnight bg-lightgray rounded-xl px-5 py-3 shadow-card border-l-4 border-sky animate-card-pop">
                <span className="font-semibold w-32 text-sky">{field}:</span>
                {isEditing ? (
                  field === 'solution' ? (
                    <Editor
                      height="180px"
                      defaultLanguage="python"
                      value={formData.data[field] || ''}
                      onChange={val => setFormData(prev => ({ ...prev, data: { ...prev.data, [field]: val ?? '' } }))}
                      options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
                    />
                  ) : field === 'pseudo' ? (
                    <textarea
                      name={field}
                      value={formData.data[field] || ''}
                      onChange={e => setFormData(prev => ({ ...prev, data: { ...prev.data, [field]: e.target.value } }))}
                      className="w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-sky focus:border-sky transition-colors bg-white"
                    />
                  ) : (
                    <input
                      type="text"
                      name={field}
                      value={formData.data[field] || ''}
                      onChange={e => setFormData(prev => ({ ...prev, data: { ...prev.data, [field]: e.target.value } }))}
                      className="w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-sky focus:border-sky transition-colors bg-white"
                    />
                  )
                ) : (
                  field === 'difficulty' ? (
                    <span className={`difficulty-text ${(formData.data[field] || '').toLowerCase()}`}>{formData.data[field]}</span>
                  ) : (
                    <span>{formData.data[field]}</span>
                  )
                )}
              </div>
            ))
          ) : (
            // BACK SIDE
            visibleBackFields.filter(field => field !== 'tags' && (!isStarter || field !== 'category')).length > 0 ? visibleBackFields.filter(field => field !== 'tags' && (!isStarter || field !== 'category')).map(field => (
              <div key={field} className="flex items-center space-x-2 text-base text-midnight bg-lightgray rounded-xl px-5 py-3 shadow-card border-l-4 border-sky animate-card-pop">
                <span className="font-semibold w-32 text-sky">{field}:</span>
                {isEditing ? (
                  field === 'solution' || field === 'pseudo' ? (
                    <Editor
                      height="180px"
                      defaultLanguage="python"
                      value={formData.data[field] || ''}
                      onChange={val => setFormData(prev => ({ ...prev, data: { ...prev.data, [field]: val ?? '' } }))}
                      options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
                    />
                  ) : (
                    <input
                      type="text"
                      name={field}
                      value={formData.data[field] || ''}
                      onChange={e => setFormData(prev => ({ ...prev, data: { ...prev.data, [field]: e.target.value } }))}
                      className="w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-sky focus:border-sky transition-colors bg-white"
                    />
                  )
                ) : (
                  <span>{formData.data[field]}</span>
                )}
              </div>
            )) : <div className="text-gray-400 italic">No back fields defined.</div>
          )}
          {/* Show hidden fields in edit mode as well */}
          {isEditing && hiddenFields.filter(field => field !== 'tags' && (!isStarter || field !== 'category')).length > 0 && hiddenFields.filter(field => field !== 'tags' && (!isStarter || field !== 'category')).map(field => (
            <div key={field} className="flex items-center space-x-2 text-base text-midnight bg-lightgray rounded-xl px-5 py-3 shadow-card border-l-4 border-sky animate-card-pop">
              <span className="font-semibold w-32 text-sky">{field}:</span>
              <input
                type="text"
                name={field}
                value={formData.data[field] || ''}
                onChange={e => setFormData(prev => ({ ...prev, data: { ...prev.data, [field]: e.target.value } }))}
                className="w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-sky focus:border-sky transition-colors bg-white"
              />
            </div>
          ))}
        </div>
        {/* Hidden fields reveal buttons and display */}
        {(hiddenFrontFields.length > 0 || hiddenBackFields.length > 0) && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hidden fields on the front side */}
            {!isFlipped && hiddenFrontFields.map(field => (
              <HiddenFieldReveal
                key={field}
                field={field}
                value={formData.data[field]}
              />
            ))}
            {/* Hidden fields on the back side */}
            {isFlipped && hiddenBackFields.map(field => (
              <HiddenFieldReveal
                key={field}
                field={field}
                value={formData.data[field]}
              />
            ))}
          </div>
        )}
        {/* Flip button (bottom-center, always visible) */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 z-20 flex flex-col items-center">
          <button
            onClick={toggleFlip}
            className="rounded-full bg-accent-purple text-white shadow-card hover:bg-sky transition-colors flex items-center justify-center w-16 h-16 text-2xl font-bold border-4 border-white focus:outline-none focus:ring-2 focus:ring-sky animate-card-pop"
            aria-label="Flip Card"
            type="button"
          >
            {isFlipped ? (
              // Arrow down for back
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            ) : (
              // Arrow up for front
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            )}
          </button>
        </div>
      </div>
      {/* Edit mode actions (Cancel/Save) below card, only in edit mode */}
      {isEditing && (
        <div className="flex justify-center gap-6 mt-8">
          <button onClick={handleCancel} className="px-8 py-3 bg-gray-400 text-white rounded-xl hover:bg-gray-500 transition-colors flex items-center gap-2 shadow-card font-semibold animate-card-pop"><svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' /></svg><span>Cancel</span></button>
          <button onClick={handleSave} className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 shadow-card font-semibold animate-card-pop"><svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' /></svg><span>Save</span></button>
        </div>
      )}
    </div>
  );
}

function HiddenFieldReveal({ field, value }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl p-5 text-center transition-all duration-300 shadow-md border border-blue-200 flex flex-col items-center min-h-[90px]">
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="text-blue-700 font-semibold text-base tracking-wide">{field.charAt(0).toUpperCase() + field.slice(1)}</span>
        <button
          className={`ml-2 text-sm px-4 py-1 rounded-lg bg-blue-200 hover:bg-blue-300 text-blue-800 font-semibold transition shadow`}
          onClick={() => setRevealed(v => !v)}
          type="button"
          aria-expanded={revealed}
          aria-controls={`hidden-field-${field}`}
        >
          {revealed ? 'Hide' : 'Reveal'}
        </button>
      </div>
      <div
        id={`hidden-field-${field}`}
        className={`w-full transition-all duration-300 overflow-hidden ${revealed ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
        aria-hidden={!revealed}
      >
        <div className="bg-white rounded p-3 border border-blue-300 text-blue-900 text-center break-words shadow-inner min-h-[32px]">
          {value || <span className="italic text-blue-400">(No value)</span>}
        </div>
      </div>
    </div>
  );
}

// Unified field renderer for all card fields
function CardField({
  label,
  value,
  type = 'text',
  isEditing,
  onChange,
  multiline = false,
  ...props
}) {
  // Use Editor for code fields, textarea for multiline, input for others
  if (type === 'code') {
    return (
      <div className="flex items-start gap-2 text-base text-midnight bg-lightgray rounded-xl px-5 py-3 shadow-card border-l-4 border-sky animate-card-pop">
        <span className="font-semibold w-32 text-sky pt-1">{label}:</span>
        <div className="flex-1">
          <Editor
            height="180px"
            defaultLanguage="python"
            value={value || ''}
            onChange={isEditing ? v => onChange(v ?? '') : undefined}
            options={{
              readOnly: !isEditing,
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              lineNumbers: 'off',
              renderLineHighlight: 'none',
              scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
            }}
            className={
              'rounded-xl border border-transparent focus:border-sky transition-colors bg-white/90' +
              (isEditing ? ' ring-2 ring-sky' : '')
            }
          />
        </div>
      </div>
    );
  }
  if (multiline) {
    return (
      <div className="flex items-center gap-2 text-base text-midnight bg-lightgray rounded-xl px-5 py-3 shadow-card border-l-4 border-sky animate-card-pop">
        <span className="font-semibold w-32 text-sky">{label}:</span>
        <textarea
          className={
            'flex-1 bg-transparent border-none outline-none resize-y min-h-[80px] text-midnight' +
            (isEditing ? ' border border-sky bg-white/90 rounded-xl px-2 py-1 shadow-card focus:ring-2 focus:ring-sky' : '')
          }
          value={value || ''}
          onChange={isEditing ? e => onChange(e.target.value) : undefined}
          readOnly={!isEditing}
          disabled={!isEditing}
          {...props}
        />
      </div>
    );
  }
  // Default: input for text/number
  return (
    <div className="flex items-center gap-2 text-base text-midnight bg-lightgray rounded-xl px-5 py-3 shadow-card border-l-4 border-sky animate-card-pop">
      <span className="font-semibold w-32 text-sky">{label}:</span>
      <input
        className={
          'flex-1 bg-transparent border-none outline-none text-midnight' +
          (isEditing ? ' border border-sky bg-white/90 rounded-xl px-2 py-1 shadow-card focus:ring-2 focus:ring-sky' : '')
        }
        type="text"
        value={value || ''}
        onChange={isEditing ? e => onChange(e.target.value) : undefined}
        readOnly={!isEditing}
        disabled={!isEditing}
        {...props}
      />
    </div>
  );
}

// Utility to strictly enforce card data matches card type fields
function normalizeCardData(fields, data) {
  const result = {};
  (fields || []).forEach(f => { result[f] = data && data[f] !== undefined ? data[f] : ''; });
  return result;
}