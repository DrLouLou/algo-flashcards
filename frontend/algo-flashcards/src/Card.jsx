import { Link } from 'react-router-dom';
import { getPreviewFields } from './cardPreviewUtils';

function Card({ card }) {
  const COLORS = {
    easy:   'text-green-600',
    medium: 'text-yellow-500',
    hard:   'text-red-600',
  };

  // Always use card.deck as object if present
  const deckObj = card.deck && typeof card.deck === 'object' ? card.deck : null;
  const deckId = deckObj ? deckObj.id : card.deck_id || card.deck;
  const deckName = deckObj ? deckObj.name : card.deck_name || card.deckName || card.deck_name;
  const problem = card.data && card.data.problem;
  const kebab = problem ? problem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : card.id;

  // Use deckObj.card_type for preview fields if available
  const cardType = deckObj?.card_type || card.card_type || {};
  const previewFields = getPreviewFields(cardType, card.data);

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Render only preview fields for deck overview */}
      {previewFields.map(field => (
        <div key={field} className="mb-1">
          <span className="font-semibold capitalize text-gray-800">{field}:</span>{' '}
          {field === 'difficulty' ? (
            <span className={`${COLORS[(card.data[field] || '').toLowerCase()]}`}>{card.data[field]}</span>
          ) : (
            <span>{card.data[field]}</span>
          )}
        </div>
      ))}
      <div className="mt-auto flex gap-2">
        <Link
          to={`/cards/${kebab}`}
          state={{ id: card.id, deckId, deckName, cards: card._allCardsForDeck || undefined }}
          className="flex-1"
        >
          <button
            className="w-full rounded-md border border-indigo-600 bg-white text-indigo-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-indigo-600 hover:text-white"
          >
            View
          </button>
        </Link>
      </div>
    </div>
  );
}

export default Card;
