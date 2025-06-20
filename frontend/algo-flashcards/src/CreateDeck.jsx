// src/CreateDeck.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import fetchWithAuth from './api'
import './styles/CreateDeck.css'
import TagEditor from './TagEditor'
import { Info } from "lucide-react";

// Helper to get showable card type IDs from localStorage (set by CardTypeManagement)
function getShowableCardTypeIds() {
  try {
    const raw = localStorage.getItem('showableCardTypeIds');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function CreateDeck({reloadDecks}) {
  const [form, setForm] = useState({ name: '', description: '', card_type: '', tags: '' })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null);
  const [cardTypes, setCardTypes] = useState([])
  const nav = useNavigate()

  // Fetch card types on mount
  useEffect(() => {
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/cardtypes/`)
      .then(r => r.json())
      .then(data => {
        // Filter by showable if set
        const showableIds = getShowableCardTypeIds();
        if (showableIds) {
          setCardTypes(data.filter(ct => showableIds.includes(ct.id)));
        } else {
          setCardTypes(data);
        }
      })
      .catch(() => setCardTypes([]))
  }, [])

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleTagsChange = tagsArr => {
    setForm(f => ({ ...f, tags: tagsArr.join(',') }));
  };

  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!form.card_type) {
      setError('Please select a card type.');
      return;
    }
    try {
      // Always send card_type as a number, and do not send card_type_id
      const submitForm = {
        ...form,
        card_type: form.card_type ? parseInt(form.card_type, 10) : undefined,
      };
      const res = await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/decks/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitForm),
        }
      )
      if (!res.ok) {
        let errMsg = 'Could not create deck';
        // try {
        //   const data = await res.json();
        //   if (typeof data === 'string') errMsg = data;
        //   else if (data && (data.name || data.card_type)) {
        //     errMsg = data.name || data.card_type || errMsg;
        //   }
        // } catch {} // ignore JSON parse errors
        setError(errMsg);
        return;
      }
      setSuccess('Deck created! Redirecting...');
      reloadDecks();
      setTimeout(() => nav(-1), 1200);
    } catch (err) {
      setError(err.message)
    }
  }

  // Find the selected card type object
  const selectedCardType = cardTypes.find(ct => String(ct.id) === String(form.card_type));

  return (
    <div className="create-deck-page">
      <h2>New Deck</h2>
      {error && <p className="error bg-red-50 text-red-700 px-3 py-2 rounded mb-2">{error}</p>}
      {success && <p className="bg-green-50 text-green-700 px-3 py-2 rounded mb-2">{success}</p>}
      <form onSubmit={handleSubmit} className="create-deck-form">
        <label>
          Name
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
          />
        </label>
        <label>
          Tags
          <TagEditor
            tags={form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []}
            onChange={handleTagsChange}
            addButtonLabel="Add Tag"
          />
        </label>
        <label>
          Card Type
          <div className="flex gap-2 items-center">
            <select
              name="card_type"
              value={form.card_type}
              onChange={handleChange}
              required
            >
              <option value="">Select a card type…</option>
              {cardTypes.map(ct => (
                <option key={ct.id} value={ct.id}>{ct.name}</option>
              ))}
            </select>
          </div>
        </label>
        {/* Show card type fields preview if a card type is selected */}
        {selectedCardType && (
          <div className="mb-6 mt-2 p-4 bg-white border border-indigo-200 rounded-lg shadow-sm">
            <div className="font-semibold text-indigo-700 mb-2 flex items-center gap-2">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="#6366f1" opacity="0.1"/><rect x="3" y="5" width="18" height="14" rx="2" stroke="#6366f1" strokeWidth="1.5"/><path d="M7 9h10M7 13h6" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Fields for this Card Type
              <span className="relative group ml-1">
                <Info size={18} className="text-indigo-400 cursor-pointer" />
                <span className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 shadow-lg">
                  These are the fields that every card in this deck will have. You can only add cards with these fields.
                </span>
              </span>
            </div>
            <ul className="pl-0 space-y-1">
              {selectedCardType.fields && selectedCardType.fields.length > 0 ? (
                selectedCardType.fields.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 py-0.5 px-2 rounded hover:bg-indigo-50 transition-all" style={{listStyle:'none'}}>
                    <span className="inline-block w-2 h-2 bg-indigo-400 rounded-full"></span>
                    <span className="inline-block font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs border border-indigo-100">{f}</span>
                  </li>
                ))
              ) : (
                <li className="italic text-gray-400">No fields defined</li>
              )}
            </ul>
          </div>
        )}
        <button type="submit" className="save-btn">Create Deck</button>
        <button
          type="button"
          onClick={() => nav(-1)}
          className="cancel-btn"
        >
          Cancel
        </button>
      </form>
    </div>
  )
}
