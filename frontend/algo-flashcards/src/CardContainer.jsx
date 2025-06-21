import Card from './Card';

function CardContainer({ cardData = [] }) {

  return (
    <ul
      className="w-full grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
    >
      {cardData.map(card => (
        <li
          key={card.id}
          className="rounded-2xl bg-white shadow-card hover:shadow-card-hover transition-shadow duration-200 animate-card-pop"
        >
          <Card card={card} />
          {/* Show tags below card preview */}
          {card.tags && card.tags.split(',').filter(Boolean).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 px-3 pb-3">
              {card.tags.split(',').filter(Boolean).map(tag => (
                <span key={tag} className="tag bg-sky/10 text-sky px-3 py-1 rounded-pill text-xs font-medium">{tag}</span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default CardContainer;
