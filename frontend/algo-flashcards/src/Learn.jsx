// src/Learn.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './styles/Learn.css'

export default function Learn({ cards }) {
  const [index, setIndex] = useState(0)
  const navigate = useNavigate()
  const containerRef = useRef(null)

  // Scroll the carousel to the current card
  useEffect(() => {
    const container = containerRef.current
    if (container && container.children[index]) {
      container.children[index].scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
      })
    }
  }, [index])

  if (!cards || cards.length === 0) {
    return (
      <div className="learn-page">
        <p>No cards available to learn.</p>
        <button onClick={() => navigate(-1)} className="back-btn">
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="learn-page">
      <button onClick={() => navigate(-1)} className="back-btn top-left">
        Back
      </button>

      <div className="learn-carousel" ref={containerRef}>
        {cards.map((card, i) => (
          <div key={card.id} className="learn-card">
            <h2>
              Card {i + 1} of {cards.length}
            </h2>
            <h3 className="learn-problem">{card.problem}</h3>
            <p>
              <strong>Difficulty:</strong>{' '}
              <span className={`diff-text ${card.difficulty.toLowerCase()}`}>
                {card.difficulty}
              </span>
            </p>
            {/* you can expose hint, pseudo, etc. here if desired */}
          </div>
        ))}
      </div>

      <div className="learn-button-row">
        <button
          onClick={() => setIndex(i => Math.max(i - 1, 0))}
          className="prev-btn"
          disabled={index === 0}
        >
          Prev
        </button>
        <button
          onClick={() => setIndex(i => Math.min(i + 1, cards.length - 1))}
          className="next-btn"
          disabled={index === cards.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  )
}
