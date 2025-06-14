// src/ProgressBar.jsx
import React from 'react';

export default function ProgressBar({ current, total }) {
  const percent = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="progress-bar-wrapper" style={{ width: '100%', margin: '1rem 0' }}>
      <div
        className="progress-bar-bg"
        style={{
          background: '#e0e0e0',
          borderRadius: '999px',
          height: '16px',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <div
          className="progress-bar-fill"
          style={{
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #007bff, #28a745)',
            height: '100%',
            borderRadius: '999px',
            transition: 'width 0.4s cubic-bezier(.4,2,.3,1)',
          }}
        />
      </div>
      <div className="progress-bar-label" style={{ textAlign: 'center', marginTop: 4, fontSize: 14, color: '#444' }}>
        Card {current} of {total}
      </div>
    </div>
  );
}
