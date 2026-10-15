/** Taille de l'aperçu d'une note dans la liste. */
export const EXCERPT = { chars: 200, items: 10 } as const;

/** Coupe le texte à `max` caractères et ajoute « … » ; un texte assez court est rendu tel quel. */
export function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;

  let end = max;
  // Ne coupe pas un emoji en deux (il occupe deux unités : la première est comprise entre 0xD800 et 0xDBFF).
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end--;

  return text.slice(0, end).trimEnd() + '…';
}
