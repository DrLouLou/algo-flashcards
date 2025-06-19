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

  // Always use formData.deck as object if present
  const deckObj = formData && formData.deck && typeof formData.deck === 'object' ? formData.deck :
    (formData && formData.deck ? (decks ? decks.find(d => String(d.id) === String(formData.deck)) : null) : null);
  const cardType = deckObj?.card_type || (formData && formData.card_type) || {};
  const { front: frontFields, back: backFields } = getCardLayout(cardType, formData?.data);

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
        if (slug !== kebab) {
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
    <div className="">
      <Link {...backToDeck}>
        <button>Back</button>
      </Link>
      <div className="card-detail container">
        {/* TAGS: show in both modes */}
        <div className="mb-4">
          <strong>Tags:</strong>{' '}
          {isEditing ? (
            <TagEditor
              tags={formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []}
              onChange={tagsArr => handleTagsChange(tagsArr)}
            />
          ) : (
            (formData.tags || '').split(',').filter(Boolean).map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))
          )}
        </div>
        {/* Status controls if available */}
        {formData.status && (
          <div className="mb-4 flex gap-2">
            <strong>Status:</strong>
            {['new','review','known'].map(s => (
              <button
                key={s}
                className={`px-3 py-1 rounded-full border text-xs ${formData.status === s ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => updateStatus(s)}
                disabled={formData.status === s}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}

        {isEditing ? (
          // EDIT MODE: show all fields as inputs
          <>
            {frontFields.concat(backFields.filter(f => !frontFields.includes(f))).map(field => (
              <label key={field}>
                {field.charAt(0).toUpperCase() + field.slice(1)}
                {field === 'solution' ? (
                  <Editor
                    height="300px"
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
                  />
                ) : (
                  <input
                    type="text"
                    name={field}
                    value={formData.data[field] || ''}
                    onChange={handleChange}
                  />
                )}
              </label>
            ))}
          </>
        ) : (
          // VIEW MODE: front or back
          <>
            {!isFlipped ? (
              // FRONT SIDE
              <>
                {frontFields.map(field => (
                  <div key={field} className="mb-2">
                    <span className="font-semibold capitalize text-gray-800">{field}:</span>{' '}
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
                {backFields.length > 0 ? backFields.map(field => (
                  <div key={field} className="mb-2">
                    <span className="font-semibold capitalize text-gray-800">{field}:</span>{' '}
                    {field === 'solution' ? (
                      <Editor
                        height="300px"
                        defaultLanguage="python"
                        value={formData.data[field] || ''}
                        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
                      />
                    ) : field === 'pseudo' ? (
                      <Editor
                        height="300px"
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

        <div className="button-row">
          {isEditing ? (
            // EDIT MODE BUTTONS
            <>
              <button onClick={handleSave} className="save-btn">Save</button>
              <button onClick={handleReset} className="reset-btn">Reset</button>
              <button onClick={handleCancel} className="cancel-btn">Cancel</button>
            </>
          ) : (
            // VIEW MODE BUTTONS
            <>
              <button onClick={toggleFlip} className="flip-btn">
                Flip
              </button>
              <button onClick={() => setIsEditing(true)} className="edit-btn">
                Edit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
