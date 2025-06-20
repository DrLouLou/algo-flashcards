// src/DeckDropdown.jsx
import React from 'react';

export default function DeckDropdown({ decks, selectedDeckId, onChange }) {
  return (
    <div className="relative w-full">
      {/* native <select> */}
      <select
        value={selectedDeckId || ''}
        onChange={e => onChange(e.target.value || null)}
        className="
          block w-full appearance-none rounded-md border border-gray-300
          bg-white py-2 pl-3 pr-10 text-sm text-gray-700 shadow-sm
          focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500
          cursor-pointer
        "
      >
        <option value="">All Decks</option>
        {(Array.isArray(decks) ? decks : []).map(d => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      {/* arrow icon */}
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
