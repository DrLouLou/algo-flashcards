import { Link } from 'react-router-dom'
import './styles/Card.css'

function Card({ card }) {
  const diffClass = card.difficulty.toLowerCase()

  return (
    <div className="card-preview">
      <h3 className="problem">{card.problem}</h3>
      <p className="difficulty">
        <strong>Difficulty:</strong>{' '}
        <span className={`difficulty-text ${diffClass}`}>
          {card.difficulty}
        </span>
      </p>
      <Link to={`/cards/${card.id}`} onClick={() => console.log(`Clicked view for card ${card.id}`)}>
        <button className="view-details">View</button>
      </Link>
    </div>
  )
}

export default Card
