// src/DeckDropdown.jsx
import React from 'react'

export default function DeckDropdown({ decks, selectedDeckId, onChange }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select
        value={selectedDeckId || ''}
        onChange={e => onChange(e.target.value || null)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          padding: '0.5rem 2rem 0.5rem 0.75rem',
          border: '1px solid #ccc',
          borderRadius: '0.25rem',
          backgroundColor: '#fff',
          fontSize: '1rem',
          lineHeight: '1.5',
          cursor: 'pointer',
        }}
      >
        <option value="">All Decks</option>
        {decks.map(d => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      {/* Custom dropdown arrow */}
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          right: '0.75rem',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 0,
          height: 0,
          borderLeft: '0.4rem solid transparent',
          borderRight: '0.4rem solid transparent',
          borderTop: '0.4rem solid #333',
        }}
      />
    </div>
  )
}
