// src/ManageDecks.jsx
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { HiOutlineTrash, HiOutlinePencil, HiPlus } from 'react-icons/hi';
import fetchWithAuth from './api';

export default function ManageDecks({
  /** Array of deck objects { id, name, description, created_at, … } */
  decks = [],

  /** Callback to re-fetch decks after create / delete / rename */
  reloadDecks,

  /** (optional) user auth token if you need it here */
  token,
}) {
  const [busyId, setBusyId] = useState(null);
  const navigate = useNavigate();

  /* ----- handlers ----- */
  const handleDelete = async id => {
    if (!window.confirm('Delete this deck and all its cards?')) return;
    setBusyId(id);
    try {
      await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/decks/${id}/`,
        { method: 'DELETE' },
      );
      reloadDecks();        // refresh list in parent
    } catch (err) {
      console.error(err);
      alert('Delete failed.');
    } finally {
      setBusyId(null);
    }
  };

  /* ----- render ----- */
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* header */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-3xl font-semibold tracking-tight">Manage Decks</h2>
        <button
          onClick={() => navigate('/decks/new')}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2
                     text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <HiPlus className="h-5 w-5" />
          New Deck
        </button>
      </div>

      {/* deck grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(Array.isArray(decks) ? decks : []).map(d => (
          <div
            key={d.id}
            className="group relative rounded-lg border border-gray-200 bg-white p-5 shadow-sm
                       transition hover:shadow-lg"
          >
            <h3 className="mb-1 truncate text-lg font-semibold">{d.name}</h3>
            <p className="mb-4 line-clamp-3 text-sm text-gray-600">
              {d.description || 'No description'}
            </p>
            {d.tags && (
              <div className="mb-2 flex flex-wrap gap-1">
                {d.tags.split(',').filter(Boolean).map(tag => (
                  <span key={tag} className="inline-block bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{tag}</span>
                ))}
              </div>
            )}

            {/* action bar (appears on hover) */}
            <div className="absolute inset-x-0 bottom-0 flex justify-between
                            border-t border-gray-200 bg-gray-50 px-4 py-2
                            opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => navigate(`/decks/${d.id}/edit`)}
                className="inline-flex items-center gap-1 text-sm text-gray-600
                           hover:text-indigo-600"
              >
                <HiOutlinePencil className="h-4 w-4" />
                Edit
              </button>

              <button
                disabled={busyId === d.id}
                onClick={() => handleDelete(d.id)}
                className="inline-flex items-center gap-1 text-sm text-gray-600
                           hover:text-red-600 disabled:opacity-50"
              >
                <HiOutlineTrash className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        ))}

        {/* empty state */}
        {decks.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-gray-300 p-10 text-center">
            <p className="mb-4 text-gray-600">You don’t have any decks yet.</p>
            <button
              onClick={() => navigate('/decks/new')}
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white
                         transition hover:bg-indigo-700"
            >
              Create your first deck
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
