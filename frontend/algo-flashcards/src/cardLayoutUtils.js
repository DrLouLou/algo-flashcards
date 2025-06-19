// Utility for robust CardType layout fallback

// Classic Starter Deck fields
const STARTER_FIELDS = ['problem', 'difficulty', 'category', 'hint', 'pseudo', 'solution', 'complexity'];
const STARTER_FRONT = ['problem', 'difficulty', 'category', 'hint', 'pseudo'];
const STARTER_BACK = ['solution', 'complexity'];

// Helper to detect if a CardType is the Starter Deck (by fields)
export function isStarterCardType(cardType) {
  if (!cardType || !Array.isArray(cardType.fields)) return false;
  // Must have all starter fields, and no extras
  return STARTER_FIELDS.every(f => cardType.fields.includes(f)) && cardType.fields.length === STARTER_FIELDS.length;
}

// Main layout resolver
export function getCardLayout(cardType, cardData) {
  // Defensive: always arrays
  const fields = Array.isArray(cardType?.fields) ? cardType.fields : Object.keys(cardData || {});
  const layout = cardType?.layout || {};

  // Starter Deck: always classic split if layout missing/invalid
  if (isStarterCardType(cardType)) {
    const front = Array.isArray(layout.front) && layout.front.length > 0 ? layout.front : STARTER_FRONT;
    const back = Array.isArray(layout.back) && layout.back.length > 0 ? layout.back : STARTER_BACK;
    return { front, back };
  }

  // Custom CardType: use layout if valid, else all fields on front
  const front = Array.isArray(layout.front) && layout.front.length > 0 ? layout.front : fields;
  const back = Array.isArray(layout.back) && layout.back.length > 0 ? layout.back : [];
  return { front, back };
}
