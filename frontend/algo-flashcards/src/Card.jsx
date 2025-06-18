import { Link } from 'react-router-dom';

function Card({ card }) {

  const COLORS = {
    easy:   'text-green-600',
    medium: 'text-yellow-500',
    hard:   'text-red-600',
  };

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* title */}
      <h3 className="text-lg font-semibold leading-snug text-gray-900">
        {card.data.problem}
      </h3>

      {/* difficulty badge */}
      <p className="text-sm text-gray-600">
        <span className="font-medium">Difficulty:</span>{' '}
        <span className={`${COLORS[card.data.difficulty.toLowerCase()]}`}>
          {card.data.difficulty}
        </span>
      </p>

      <div className="mt-auto">
        <Link to={`/cards/${card.id}`}>
          <button
            className="
              w-full rounded-md border border-indigo-600
              bg-white  text-indigo-600
              px-4 py-2 text-sm font-medium
              transition-colors
              hover:bg-indigo-600 hover:text-white
            "
          >
            View
          </button>
        </Link>
      </div>
    </div>
  );
}

export default Card;
