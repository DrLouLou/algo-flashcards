import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import './styles/Learn.css'

export default function Learn({ cards }) {
  const [index, setIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const navigate = useNavigate()

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

  const card = cards[index]

  const handlePrev = () => {
    setIsFlipped(false)
    setShowHint(false)
    setIndex(i => Math.max(i - 1, 0))
  }

  const handleNext = () => {
    setIsFlipped(false)
    setShowHint(false)
    setIndex(i => Math.min(i + 1, cards.length - 1))
  }

  const handleFlip = () => {
    setIsFlipped(f => !f)
    setShowHint(false)
  }

  return (
    <div className="learn-page">
      {/* Back button top-left */}
      <button onClick={() => navigate(-1)} className="back-btn">
        Back
      </button>

      {/* Card row: Prev | Card | Next */}
      <div className="learn-card-row">
        <button
          onClick={handlePrev}
          className="prev-btn"
          disabled={index === 0}
        >
          Prev
        </button>

        <div className="learn-card-container">
          <div className={`learn-card ${isFlipped ? 'flipped' : ''}`}>  
            <div className="flip-inner">
              {/* Front Side */}
              <div className="flip-front">
                <h2>
                  Card {index + 1} of {cards.length}
                </h2>
                <h3 className="learn-problem">{card.problem}</h3>
                <p>
                  <strong>Difficulty:</strong>{' '}
                  <span className={`diff-text ${card.difficulty.toLowerCase()}`}>
                    {card.difficulty}
                  </span>
                </p>
                <div className="hint-section">
                  <button
                    onClick={() => setShowHint(h => !h)}
                    className="hint-btn"
                  >
                    {showHint ? 'Hide Hint' : 'Show Hint'}
                  </button>
                  {showHint && (
                    <>
                      <h3>Hint</h3>
                      <p>{card.hint}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Back Side */}
              <div className="flip-back">
                <h3>Pseudocode</h3>
                <Editor
                  height="200px"
                  defaultLanguage="javascript"
                  value={card.pseudo}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    fontSize: 14,
                  }}
                />
                <h3 className="mt-4">Solution</h3>
                <Editor
                  height="200px"
                  defaultLanguage="javascript"
                  value={card.solution}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    fontSize: 14,
                  }}
                />
                <h3 className="mt-4">Complexity</h3>
                <p>{card.complexity || '–'}</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleNext}
          className="next-btn"
          disabled={index === cards.length - 1}
        >
          Next
        </button>
      </div>

      {/* Flip button bottom center */}
      <button onClick={handleFlip} className="flip-btn">
        Flip
      </button>
    </div>
  )
}