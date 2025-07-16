import { useEffect, useState } from 'react';
import fetchWithAuth from './api';
import CardTypeManager from './CardTypeManager';

export default function CardTypeManagement({ open, onClose, decks = [] }) {
  const [cardTypes, setCardTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editCardType, setEditCardType] = useState(null);
  const [showCardTypeManager, setShowCardTypeManager] = useState(false);
  const [showable, setShowable] = useState({}); // {id: true/false}

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/cardtypes/`)
      .then(r => r.json())
      .then(data => {
        setCardTypes(data);
        setShowable(Object.fromEntries((data || []).map(ct => [ct.id, true])));
      })
      .catch(() => {
        setError('Could not load card types');
      })
      .finally(() => setLoading(false));
  }, [open]);

  // Persist showable card type IDs in localStorage
  useEffect(() => {
    if (!open) return;
    localStorage.setItem('showableCardTypeIds', JSON.stringify(Object.entries(showable).filter(([, val]) => val).map(([id]) => parseInt(id, 10))));
  }, [showable, open]);

  const handleEdit = ct => {
    setEditCardType(ct);
    setShowCardTypeManager(true);
  };

  const handleManagerClose = (updated) => {
    setShowCardTypeManager(false);
    setEditCardType(null);
    if (updated && updated.id) {
      if (editCardType) {
        setCardTypes(prev => prev.map(ct => ct.id === updated.id ? updated : ct));
      } else {
        setCardTypes(prev => [...prev, updated]);
        setShowable(prev => ({ ...prev, [updated.id]: true }));
      }
    }
  };

  const getDecksForCardType = (cardTypeId) =>
    decks.filter(d => d.card_type && (d.card_type.id === cardTypeId));

  const handleDelete = async ct => {
    const decksToDelete = getDecksForCardType(ct.id);
    const deckNames = decksToDelete.map(d => `\n- ${d.name}`).join('');
    const confirmMsg = decksToDelete.length > 0
      ? `Delete this card type?\n\nThe following decks will also be deleted:${deckNames}\n\nThis action cannot be undone.`
      : 'Delete this card type? This action cannot be undone.';
    if (!window.confirm(confirmMsg)) return;
    
    setLoading(true);
    try {
      await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/cardtypes/${ct.id}/`, { method: 'DELETE' });
      setCardTypes(cardTypes.filter(c => c.id !== ct.id));
      setShowable(prev => {
        const copy = { ...prev };
        delete copy[ct.id];
        return copy;
      });
    } catch {
      setError('Could not delete card type');
    } finally {
      setLoading(false);
    }
  };

  const handleShowableToggle = id => {
    setShowable(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateNew = () => {
    setEditCardType(null);
    setShowCardTypeManager(true);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Manage Card Types</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={handleCreateNew}
            className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors"
          >
            + Create New Card Type
          </button>
          <div className="text-sm text-gray-600">
            {cardTypes.length} card types
          </div>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="text-gray-600">Loading card types...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {cardTypes.map(ct => {
              const decksForType = getDecksForCardType(ct.id);
              const isVisible = showable[ct.id];
              
              // Handle both string and array fields
              let fields = [];
              if (Array.isArray(ct.fields)) {
                fields = ct.fields;
              } else if (typeof ct.fields === 'string') {
                fields = ct.fields.split(',').map(f => f.trim()).filter(f => f.length > 0);
              }
              
              return (
                <div key={ct.id} className={`border rounded-lg p-4 ${isVisible ? 'border-sky-200 bg-sky-50' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{ct.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded ${isVisible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {isVisible ? 'Visible' : 'Hidden'}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{ct.description || 'No description'}</p>
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">Fields ({fields.length}):</div>
                        <div className="flex flex-wrap gap-2">
                          {fields.map(field => (
                            <span key={field} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-sm">
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Layout Preview */}
                      {ct.layout && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-gray-700 mb-2">Card Layout Preview:</div>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Front Preview */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                Front of Card
                              </div>
                              <div className="space-y-1">
                                {(ct.layout.front || []).map(field => (
                                  <div key={field} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                    {field}
                                  </div>
                                ))}
                                {(!ct.layout.front || ct.layout.front.length === 0) && (
                                  <div className="text-xs text-green-600 italic">No fields on front</div>
                                )}
                              </div>
                            </div>
                            
                            {/* Back Preview */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                Back of Card
                              </div>
                              <div className="space-y-1">
                                {(ct.layout.back || []).map(field => (
                                  <div key={field} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    {field}
                                  </div>
                                ))}
                                {(!ct.layout.back || ct.layout.back.length === 0) && (
                                  <div className="text-xs text-blue-600 italic">No fields on back</div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Preview Fields */}
                          <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="text-xs font-semibold text-yellow-800 mb-2 flex items-center gap-1">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              Preview Fields (shown in deck overview)
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(ct.layout.preview || []).map(field => (
                                <span key={field} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                                  {field}
                                </span>
                              ))}
                              {(!ct.layout.preview || ct.layout.preview.length === 0) && (
                                <span className="text-xs text-yellow-600 italic">No preview fields selected</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Hidden Fields */}
                          {ct.layout.hidden && ct.layout.hidden.length > 0 && (
                            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <div className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
                                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                Hidden Fields
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {ct.layout.hidden.map(field => (
                                  <span key={field} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                    {field}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {decksForType.length > 0 && (
                        <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded">
                          ⚠️ Used by {decksForType.length} deck{decksForType.length > 1 ? 's' : ''}: {decksForType.map(d => d.name).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(ct)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ct)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => handleShowableToggle(ct.id)}
                          className="w-4 h-4"
                        />
                        Show in Create Deck
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {cardTypes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No card types found. Create your first card type to get started.
              </div>
            )}
          </div>
        )}

        {showCardTypeManager && (
          <CardTypeManager
            open={showCardTypeManager}
            onClose={handleManagerClose}
            editCardType={editCardType}
          />
        )}
      </div>
    </div>
  );
}
