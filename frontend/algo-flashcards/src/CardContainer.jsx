import Card from './Card';

function CardContainer({ cardData = [] }) {

  return (
    <ul
      className="
        w-full
        grid gap-6
        grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4
      "
    >
      {cardData.map(card => (
        <li
          key={card.id}
          className="rounded-lg bg-white shadow transition hover:shadow-lg"
        >
          <Card card={card} />
          {/* Show tags below card preview */}
          {card.tags && card.tags.split(',').filter(Boolean).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 px-2 pb-2">
              {card.tags.split(',').filter(Boolean).map(tag => (
                <span key={tag} className="tag bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{tag}</span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default CardContainer;
