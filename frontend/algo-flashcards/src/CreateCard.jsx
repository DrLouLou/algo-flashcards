import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import fetchWithAuth from './api';
import Editor from '@monaco-editor/react';


export default function CreateCard({ decks }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    deck: decks.length ? decks[0].id : '',
    problem: '',
    difficulty: '',
    category: '',
    hint: '',
    pseudo: '',
    solution: '',
    complexity: '',
  });
  const [error, setError] = useState(null);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(
        `${import.meta.env.VITE_API_BASE_URL}/cards/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      );
      if (!res.ok) throw new Error(JSON.stringify(await res.json()));
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

        {/* deck */}
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700">Deck</label>
          <select
            name="deck"
            value={form.deck}
            onChange={handleChange}
            required
            className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm shadow-sm
                       focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            {decks.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

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
