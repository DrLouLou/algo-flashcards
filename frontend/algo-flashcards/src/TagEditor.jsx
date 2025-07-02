// src/TagEditor.jsx
import React, { useState } from 'react';

export default function TagEditor({ tags = [], onChange, allTags = [], addButtonLabel, editable = false, pillClassName = '', inputClassName = '' }) {
  const [input, setInput] = useState('');
  const addTag = () => {
    const tag = input.trim();
    if (tag && !tags.includes(tag) && onChange) {
      onChange([...tags, tag]);
      setInput('');
    }
  };
  const removeTag = (tag) => {
    if (onChange) onChange(tags.filter(t => t !== tag));
  };
  // Suggestions for autocomplete
  const suggestions = allTags.filter(t => t && !tags.includes(t) && t.toLowerCase().includes(input.toLowerCase()));
  return (
    <div className="tag-editor flex flex-wrap gap-2 items-center bg-white/80 border border-sky/20 rounded-xl px-4 py-2 shadow-card">
      {/* Tag pills */}
      {tags.map(tag => (
        <span key={tag} className={pillClassName + ' flex items-center bg-sky/10 text-sky px-3 py-1 rounded-pill text-xs font-medium shadow-card animate-card-pop'}>
          {tag}
          {/* Always show remove button for filtering (not just in edit mode) */}
          {onChange && (
            <button
              type="button"
              className="ml-1 text-xs text-red-500 hover:text-red-700 font-bold"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              style={{ lineHeight: 1 }}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {/* Input for filtering/adding tags */}
      {onChange && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={addButtonLabel ? addButtonLabel + "..." : "Add or filter tags..."}
            className={inputClassName + " text-sm border-2 border-sky/40 rounded-pill px-3 py-1 focus:ring-2 focus:ring-sky bg-white/90 shadow-card"}
            style={{ minWidth: 120, maxWidth: 180 }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (input.trim()) {
                  e.preventDefault();
                  addTag();
                }
              }
            }}
          />
          {editable && (
            <button
              type="button"
              className="px-3 py-1 bg-sky text-white rounded-pill text-xs shadow-card font-semibold hover:bg-sky/80 transition-colors"
              disabled={!input.trim()}
              onClick={addTag}
            >
              {addButtonLabel || "Add"}
            </button>
          )}
        </div>
      )}
      {/* Tag suggestions dropdown */}
      {editable && suggestions.length > 0 && (
        <div className="tag-suggestions flex flex-wrap gap-1 ml-2">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              className="bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 text-xs hover:bg-indigo-200 border border-indigo-200 shadow-card"
              onClick={() => { onChange([...tags, s]); setInput(''); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
