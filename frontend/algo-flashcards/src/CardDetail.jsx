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

  // Shared handlers
  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  const handleSave = () => {
    fetchWithAuth(`${API}/cards/${cardId}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
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
  const handleReset = () => setFormData(initialData)
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

  // Back button logic
  // Try to use deckId/deckName from location.state, else fallback
  const backToDeck = location.state && location.state.deckId && location.state.deckName
    ? { to: `/decks/${(location.state.deckName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`, state: { id: location.state.deckId } }
    : { to: '/', state: undefined };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">
      {/* Back button */}
      <div className="absolute top-6 left-6 z-10">
        <Link {...backToDeck} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold text-base transition"><svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' /></svg>Back</Link>
      </div>
      <div className="max-w-2xl w-full mx-auto bg-white/90 rounded-3xl shadow-2xl p-8 space-y-8 border border-gray-100 backdrop-blur-md">
        {/* TAGS */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight flex items-center gap-2"><svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6 text-blue-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 7h.01M7 11h.01M7 15h.01M11 7h2M11 11h2M11 15h2M15 7h.01M15 11h.01M15 15h.01' /></svg>Tags</h2>
          <div className="flex flex-wrap gap-2">
            {isEditing ? (
              <TagEditor
                tags={formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []}
                onChange={tagsArr => handleTagsChange(tagsArr)}
              />
            ) : (
              (formData.tags || '').split(',').filter(Boolean).map(tag => (
                <span key={tag} className="border-l-4 border-blue-400 pl-3 bg-blue-100 text-sm text-blue-700 rounded-full py-0.5 px-3 font-medium shadow-sm">{tag}</span>
              ))
            )}
          </div>
        </div>
        {/* Status controls if available */}
        {formData.status && (
          <div className="flex gap-2 items-center">
            <span className="font-semibold text-gray-700">Status:</span>
            {['new','review','known'].map(s => (
              <button
                key={s}
                className={`px-3 py-1 rounded-full border text-xs font-semibold transition ${formData.status === s ? 'bg-indigo-500 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => updateStatus(s)}
                disabled={formData.status === s}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}
        {/* Card fields */}
        <div className="space-y-5">
          {isEditing ? (
            // EDIT MODE: show all fields as inputs
            <>
              {visibleFrontFields.concat(visibleBackFields.filter(f => !visibleFrontFields.includes(f))).map(field => (
                <label key={field} className="block">
                  <span className="block font-semibold text-gray-700 mb-1 tracking-wide">{field.charAt(0).toUpperCase() + field.slice(1)}</span>
                  {field === 'solution' ? (
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
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                    />
                  ) : (
                    <input
                      type="text"
                      name={field}
                      value={formData.data[field] || ''}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                    />
                  )}
                </label>
              ))}
              {/* Show hidden fields in edit mode as well */}
              {hiddenFields.length > 0 && hiddenFields.map(field => (
                <label key={field} className="block">
                  <span className="block font-semibold text-gray-700 mb-1 tracking-wide">{field.charAt(0).toUpperCase() + field.slice(1)}</span>
                  <input
                    type="text"
                    name={field}
                    value={formData.data[field] || ''}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                  />
                </label>
              ))}
            </>
          ) : (
            // VIEW MODE: front or back
            <>
              {!isFlipped ? (
                // FRONT SIDE
                <>
                  {visibleFrontFields.map(field => (
                    <div key={field} className="flex items-center space-x-2 text-base text-gray-700 bg-blue-50 rounded-lg px-4 py-2 shadow-sm border-l-4 border-blue-300">
                      <span className="font-semibold w-32 text-blue-900">{field}:</span>
                      {field === 'difficulty' ? (
                        <span className={`difficulty-text ${(formData.data[field] || '').toLowerCase()}`}>{formData.data[field]}</span>
                      ) : (
                        <span>{formData.data[field]}</span>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                // BACK SIDE
                <>
                  {visibleBackFields.length > 0 ? visibleBackFields.map(field => (
                    <div key={field} className="flex items-center space-x-2 text-base text-gray-700 bg-blue-50 rounded-lg px-4 py-2 shadow-sm border-l-4 border-blue-300">
                      <span className="font-semibold w-32 text-blue-900">{field}:</span>
                      {field === 'solution' ? (
                        <Editor
                          height="180px"
                          defaultLanguage="python"
                          value={formData.data[field] || ''}
                          options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
                        />
                      ) : field === 'pseudo' ? (
                        <Editor
                          height="180px"
                          defaultLanguage="python"
                          value={formData.data[field] || ''}
                          options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
                        />
                      ) : (
                        <span>{formData.data[field]}</span>
                      )}
                    </div>
                  )) : <div className="text-gray-400 italic">No back fields defined.</div>}
                </>
              )}
            </>
          )}
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
        {/* Action buttons */}
        <div className="flex justify-between mt-8 gap-4">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 shadow"><svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' /></svg><span>Save</span></button>
              <button onClick={handleReset} className="px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition flex items-center gap-2 shadow"><svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582M20 20v-5h-.581M5 19l14-14' /></svg><span>Reset</span></button>
              <button onClick={handleCancel} className="px-5 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition flex items-center gap-2 shadow"><svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' /></svg><span>Cancel</span></button>
            </>
          ) : (
            <>
              <button onClick={toggleFlip} className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 shadow"><svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 12H5M12 5l-7 7 7 7' /></svg><span>Flip</span></button>
              <button onClick={() => setIsEditing(true)} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow"><svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15.232 5.232l3.536 3.536M9 11l6 6M3 21v-4.586a1 1 0 01.293-.707l12-12a1 1 0 011.414 0l4.586 4.586a1 1 0 010 1.414l-12 12a1 1 0 01-.707.293H3z' /></svg><span>Edit</span></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HiddenFieldReveal({ field, value }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl p-5 text-center transition-opacity duration-300 shadow-md border border-blue-200 flex flex-col items-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="text-blue-700 font-semibold text-base tracking-wide">{field.charAt(0).toUpperCase() + field.slice(1)}</span>
        <button
          className={`ml-2 text-sm px-4 py-1 rounded-lg bg-blue-200 hover:bg-blue-300 text-blue-800 font-semibold transition shadow`}
          onClick={() => setRevealed(v => !v)}
          type="button"
        >
          {revealed ? 'Hide' : 'Reveal'}
        </button>
      </div>
      <div className={`transition-opacity duration-300 ${revealed ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}> 
        {revealed && (
          <div className="w-full bg-white rounded p-3 border border-blue-300 text-blue-900 text-center break-words shadow-inner">
            {value || <span className="italic text-blue-400">(No value)</span>}
          </div>
        )}
      </div>
    </div>
  );
}
