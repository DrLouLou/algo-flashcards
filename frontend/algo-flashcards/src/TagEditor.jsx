// src/TagEditor.jsx
import React, { useState } from 'react';

export default function TagEditor({ tags = [], onChange, allTags = [], addButtonLabel }) {
  const [input, setInput] = useState('');
  const addTag = () => {
    const tag = input.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
      setInput('');
    }
  };
  const removeTag = (tag) => {
    onChange(tags.filter(t => t !== tag));
  };
  // Suggestions for autocomplete
  const suggestions = allTags.filter(t => t && !tags.includes(t) && t.toLowerCase().includes(input.toLowerCase()));
  return (
    <div className="tag-editor flex flex-wrap gap-2 items-center">
      {tags.map(tag => (
        <span key={tag} className="tag bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full flex items-center">
          {tag}
          <button
            type="button"
            className="ml-1 text-xs text-red-500 hover:text-red-700"
            onClick={() => removeTag(tag)}
            aria-label={`Remove tag ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      {/* Replace <form> with <div> to prevent accidental form submission */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={addButtonLabel ? addButtonLabel + "..." : "Add tag..."}
          className="border rounded px-2 py-1 text-sm"
          style={{ minWidth: 80 }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (input.trim()) {
                e.preventDefault();
                addTag();
              }
              // else: allow form submit
            }
          }}
        />
        <button
          type="button"
          className="px-2 py-1 bg-indigo-500 text-white rounded text-xs"
          disabled={!input.trim()}
          onClick={addTag}
        >
          {addButtonLabel || "Add"}
        </button>
      </div>
      {suggestions.length > 0 && (
        <div className="tag-suggestions flex flex-wrap gap-1 ml-2">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              className="bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-xs hover:bg-indigo-200"
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
