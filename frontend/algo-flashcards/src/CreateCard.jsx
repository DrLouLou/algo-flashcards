import { useState, useEffect } from 'react';
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
    data: '{}', // Add data field as required by backend
  });
  const [error, setError] = useState(null);

  // Remove deck ownership restriction: allow card creation in any deck
  const isAllowedDeck = () => true;

  useEffect(() => {
    if (defaultDeckId) {
      setForm(f => ({ ...f, deck: defaultDeckId }));
    } else if (decks.length > 0) {
      setForm(f => ({ ...f, deck: decks[0].id }));
    }
  }, [defaultDeckId, decks]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!isAllowedDeck()) {
      setError('You can only add cards to your own decks or the Starter Deck.');
      return;
    }
    try {
      const submitForm = { ...form, deck: form.deck };
      const res = await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/cards/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitForm),
        },
      );
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(JSON.stringify(errJson));
      }
      reloadCards();
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* simple inputs */}
        {['problem','difficulty','category','hint','complexity'].map(field => (
          <div key={field} className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              {field.charAt(0).toUpperCase() + field.slice(1)}
            </label>
            <input
              name={field}
              value={form[field]}
              onChange={handleChange}
              required={field === 'problem' || field === 'difficulty'}
              className="rounded-md border border-gray-300 py-2 px-3 text-sm shadow-sm
                         focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        ))}

        {/* pseudocode */}
        <div className="col-span-full flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700">Pseudocode</label>
          <textarea
            name="pseudo"
            value={form.pseudo}
            onChange={handleChange}
            rows={4}
            className="rounded-md border border-gray-300 py-2 px-3 text-sm shadow-sm resize-y
                       focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* solution */}
        <div className="col-span-full flex flex-col">
            <label className="mb-1 block text-sm font-medium text-gray-700">
                Solution
            </label>

            {/* wrapper adds border + rounded corners to match other inputs */}
            <div className="rounded-md border border-gray-300 shadow-sm overflow-hidden">
                <Editor
                height="30vh"               /* fixed height; grows with rows */
                defaultLanguage="python"     /* change to javascript, cpp, etc. */
                theme="vs-light"             /* match default UI; use vs-dark if you prefer */
                value={form.solution}
                onChange={(val) =>
                    setForm((f) => ({ ...f, solution: val ?? '' }))
                }
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                }}
                />
            </div>
        </div>

        {/* TAGS */}
        <div className="flex flex-col col-span-full">
          <label className="mb-1 text-sm font-medium text-gray-700">Tags</label>
          <TagEditor
            tags={form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []}
            onChange={tagsArr => setForm(f => ({ ...f, tags: tagsArr.join(',') }))}
            allTags={Array.from(new Set((decks || []).flatMap(deck => (deck.tags || []).concat((deck.cards || []).flatMap(card => (card.tags || '').split(',').map(t => t.trim()).filter(Boolean))))))}
            addButtonLabel="Add Tag"
          />
        </div>

        {/* Hidden data field for backend compatibility */}
        <input type="hidden" name="data" value={form.data} />

        {/* buttons */}
        <div className="col-span-full flex justify-end gap-4 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white shadow
                       transition hover:bg-red-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-green-600 px-5 py-2 text-sm font-medium text-white shadow
                       transition hover:bg-green-700"
          >
            Create Card
          </button>
        </div>
      </form>
    </div>
  );
}
