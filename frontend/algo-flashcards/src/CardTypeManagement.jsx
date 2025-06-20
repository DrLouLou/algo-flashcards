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
        // Default: all card types are showable
        setShowable(Object.fromEntries((data || []).map(ct => [ct.id, true])));
      })
      .catch(() => setError('Could not load card types'))
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

  // After editing, update the card type in memory
  const handleManagerClose = (updated) => {
    setShowCardTypeManager(false);
    setEditCardType(null);
    if (updated && updated.id) {
      setCardTypes(prev => prev.map(ct => ct.id === updated.id ? updated : ct));
    }
  };

  // Helper: get decks for a card type
  const getDecksForCardType = (cardTypeId) =>
    decks.filter(d => d.card_type && (d.card_type.id === cardTypeId));

  const handleDelete = async ct => {
    const decksToDelete = getDecksForCardType(ct.id);
    const deckNames = decksToDelete.map(d => `\n- ${d.name}`).join('');
    const confirmMsg =
      decksToDelete.length > 0
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
          aria-label="Close"
        >×</button>
        <h2 className="text-2xl font-semibold mb-4">Manage Card Types</h2>
        {loading && <div>Loading…</div>}
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <div className="mb-4 text-sm text-gray-600">Toggle which card types are available for deck creation. Deleting a card type will also delete all decks using it.</div>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {cardTypes.map(ct => {
            const decksForType = getDecksForCardType(ct.id);
            return (
              <div key={ct.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-gray-50">
                <div>
                  <div className="font-semibold text-lg text-indigo-700">{ct.name}</div>
                  <div className="text-gray-500 text-sm mb-1">{ct.description}</div>
                  <div className="flex flex-wrap gap-2 text-xs mb-1">
                    {ct.fields.map(f => <span key={f} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{f}</span>)}
                  </div>
                  {decksForType.length > 0 && (
                    <div className="text-xs text-red-600 mb-1">
                      Decks using this card type:
                      <ul className="list-disc list-inside ml-2">
                        {decksForType.map(d => <li key={d.id}>{d.name}</li>)}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => handleEdit(ct)} className="rounded bg-blue-600 text-white px-3 py-1 text-xs font-medium hover:bg-blue-700">Edit Layout</button>
                    <button onClick={() => handleDelete(ct)} className="rounded bg-red-600 text-white px-3 py-1 text-xs font-medium hover:bg-red-700">Delete</button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!showable[ct.id]}
                      onChange={() => handleShowableToggle(ct.id)}
                    />
                    <span>Show in Deck Creation</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
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
