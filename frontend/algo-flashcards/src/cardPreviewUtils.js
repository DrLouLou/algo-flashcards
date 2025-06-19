// Utility to get preview fields for a card, with fallback for legacy CardTypes
export function getPreviewFields(cardType, cardData) {
  if (cardType?.layout && Array.isArray(cardType.layout.preview) && cardType.layout.preview.length > 0) {
    return cardType.layout.preview;
  }
  // Fallback: show 'problem', 'difficulty', or all fields if not present
  const fields = Array.isArray(cardType?.fields) ? cardType.fields : Object.keys(cardData || {});
  if (fields.includes('problem') && fields.includes('difficulty')) {
    return ['problem', 'difficulty'];
  }
  return fields.slice(0, 2); // fallback: first two fields
}
