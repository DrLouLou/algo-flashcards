// Utility for robust CardType layout fallback

// Classic Starter Deck fields
const STARTER_FIELDS = ['problem', 'difficulty', 'category', 'hint', 'pseudo', 'solution', 'complexity'];
const STARTER_FRONT = ['problem', 'difficulty', 'category', 'hint', 'pseudo'];
const STARTER_BACK = ['solution', 'complexity'];

// Remove 'tags' from all layout helpers and field lists
const FILTERED_STARTER_FIELDS = STARTER_FIELDS.filter(f => f !== 'tags');
const FILTERED_STARTER_FRONT = STARTER_FRONT.filter(f => f !== 'tags');
const FILTERED_STARTER_BACK = STARTER_BACK.filter(f => f !== 'tags');

// Helper to detect if a CardType is the Starter Deck (by fields)
export function isStarterCardType(cardType) {
  if (!cardType || !Array.isArray(cardType.fields)) return false;
  // Must have all starter fields (except 'tags'), and no extras
  return FILTERED_STARTER_FIELDS.every(f => cardType.fields.includes(f)) && cardType.fields.length === FILTERED_STARTER_FIELDS.length;
}

// Main layout resolver
export function getCardLayout(cardType, cardData) {
  // Defensive: always arrays, filter out 'tags'
  const fields = (Array.isArray(cardType?.fields) ? cardType.fields : Object.keys(cardData || {})).filter(f => f !== 'tags');
  const layout = cardType?.layout || {};

  // Starter Deck: always classic split if layout missing/invalid
  if (isStarterCardType(cardType)) {
    const front = Array.isArray(layout.front) && layout.front.length > 0 ? layout.front.filter(f => f !== 'tags') : FILTERED_STARTER_FRONT;
    const back = Array.isArray(layout.back) && layout.back.length > 0 ? layout.back.filter(f => f !== 'tags') : FILTERED_STARTER_BACK;
    // FIX: Always return hidden fields if present in layout
    const hidden = Array.isArray(layout.hidden) ? layout.hidden : [];
    return { front, back, hidden };
  }

  // Custom CardType: use layout if valid, else all fields on front
  const front = Array.isArray(layout.front) && layout.front.length > 0 ? layout.front.filter(f => f !== 'tags') : fields;
  const back = Array.isArray(layout.back) && layout.back.length > 0 ? layout.back.filter(f => f !== 'tags') : [];
  const hidden = Array.isArray(layout.hidden) ? layout.hidden : [];
  return { front, back, hidden };
}
