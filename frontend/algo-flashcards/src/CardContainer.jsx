import Card from './Card'
import './styles/CardContainer.css'

function CardContainer({ cardData }) {
  return (
    <ul className="card-list">
      {cardData.map(card => (
        <li key={card.id} className="card-item">
          <Card card={card} />
        </li>
      ))}
    </ul>
  )
}

export default CardContainer
