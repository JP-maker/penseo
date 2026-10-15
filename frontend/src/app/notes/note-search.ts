import { Note } from './models';

/** Minuscules et sans accents : « ecole » trouve « École ». */
const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

/**
 * Vrai si chaque mot de la recherche apparaît quelque part dans la note
 * (titre, texte, éléments de liste ou nom d'une de ses catégories). Recherche vide : tout passe.
 */
export function matchesQuery(note: Note, categoryNames: string[], query: string): boolean {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = fold(
    [note.title, note.content, ...note.items.map((i) => i.text), ...categoryNames].join('\n'),
  );
  return terms.every((term) => haystack.includes(term));
}
