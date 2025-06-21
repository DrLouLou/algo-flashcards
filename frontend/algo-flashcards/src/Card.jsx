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
    <div className="flex h-full flex-col gap-4 p-7 font-sans">
      {/* Render only preview fields for deck overview */}
      {previewFields.map(field => (
        <div key={field} className="mb-1 flex items-center gap-2">
          <span className="font-semibold capitalize text-midnight text-base">{field}:</span>{' '}
          {field === 'difficulty' ? (
            <span className={`inline-flex items-center gap-1 ${COLORS[(card.data[field] || '').toLowerCase()]}`}>{card.data[field]}{' '}
              {card.data[field]?.toLowerCase() === 'easy' && <svg className="w-4 h-4" fill="none" stroke="#3AAFFF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>}
              {card.data[field]?.toLowerCase() === 'medium' && <svg className="w-4 h-4" fill="none" stroke="#ffc107" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>}
              {card.data[field]?.toLowerCase() === 'hard' && <svg className="w-4 h-4" fill="none" stroke="#dc3545" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>}
            </span>
          ) : (
            <span>{card.data[field]}</span>
          )}
        </div>
      ))}
      {/* Progress bar placeholder */}
      <div className="mt-auto flex gap-2">
        <Link
          to={`/cards/${kebab}`}
          state={{ id: card.id, deckId, deckName, cards: card._allCardsForDeck || undefined }}
          className="flex-1"
        >
          <button
            className="w-full rounded-xl border border-sky bg-white text-sky px-4 py-2 text-base font-medium transition-colors hover:bg-sky hover:text-white shadow-card hover:shadow-card-hover animate-card-pop"
          >
            View
          </button>
        </Link>
      </div>
    </div>
  );
}

export default Card;
