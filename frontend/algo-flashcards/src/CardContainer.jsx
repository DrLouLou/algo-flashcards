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
        </li>
      ))}
    </ul>
  );
}

export default CardContainer;
