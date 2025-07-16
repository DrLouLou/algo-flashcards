// src/CreateDeck.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import fetchWithAuth from './api'
import TagEditor from './TagEditor'
import { HiInformationCircle, HiCollection, HiCog, HiTag, HiTemplate } from 'react-icons/hi';

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
  const [loading, setLoading] = useState(false)
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
    setLoading(true)
    if (!form.card_type) {
      setError('Please select a card type.');
      setLoading(false)
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
        setLoading(false)
        return;
      }
      setSuccess('Deck created! Redirecting...');
      reloadDecks();
      setTimeout(() => nav(-1), 1200);
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  // Find the selected card type object
  const selectedCardType = cardTypes.find(ct => String(ct.id) === String(form.card_type));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white px-8 py-6">
            <div className="flex items-center gap-3">
              <HiCollection className="w-8 h-8 text-sky-100" />
              <div>
                <h1 className="text-3xl font-bold">Create New Deck</h1>
                <p className="text-sky-100 mt-1">Set up a new flashcard deck with your preferred settings</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <HiCog className="w-5 h-5 text-sky-600" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deck Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-base transition-all"
                      placeholder="e.g., Algorithm Practice"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-base resize-none transition-all"
                      placeholder="Brief description of this deck"
                    />
                  </div>
                </div>
              </div>

              {/* Card Type Selection */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <HiTemplate className="w-5 h-5 text-sky-600" />
                  Card Type <span className="text-red-500">*</span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Card Type
                    </label>
                    <select
                      name="card_type"
                      value={form.card_type}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-base transition-all"
                    >
                      <option value="">Choose a card type...</option>
                      {cardTypes.map(ct => (
                        <option key={ct.id} value={ct.id}>{ct.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Card Type Preview */}
                  {selectedCardType && (
                    <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <HiInformationCircle className="w-5 h-5 text-indigo-500" />
                        <h4 className="font-semibold text-indigo-700">Card Type Preview</h4>
                      </div>
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Description:</strong> {selectedCardType.description || 'No description available'}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Fields ({selectedCardType.fields?.length || 0}):</strong>
                        </p>
                      </div>
                      
                      {selectedCardType.fields && selectedCardType.fields.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {selectedCardType.fields.map((field, index) => (
                            <div key={index} className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg">
                              <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                              <span className="text-sm font-medium text-indigo-700">{field}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No fields defined for this card type</p>
                      )}
                    </div>
                  )}
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
                    onChange={handleTagsChange}
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
                    onClick={() => nav(-1)}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !form.card_type}
                    className="px-8 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium shadow-lg hover:shadow-xl"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </span>
                    ) : (
                      'Create Deck'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
