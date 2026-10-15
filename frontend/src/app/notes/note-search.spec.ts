import { Note } from './models';
import { matchesQuery } from './note-search';

const note = {
  id: '1',
  title: 'Réunion produit',
  content: 'Préparer la **démo**',
  items: [{ id: 'a', text: 'Acheter du lait', done: false }],
  categoryIds: [],
} as unknown as Note;

describe('matchesQuery', () => {
  it('laisse tout passer quand la recherche est vide', () => {
    expect(matchesQuery(note, [], '   ')).toBe(true);
  });

  it('ignore la casse et les accents', () => {
    expect(matchesQuery(note, [], 'REUNION')).toBe(true);
    expect(matchesQuery(note, [], 'demo')).toBe(true);
  });

  it('cherche aussi dans les cases à cocher et les catégories', () => {
    expect(matchesQuery(note, [], 'lait')).toBe(true);
    expect(matchesQuery(note, ['Travail'], 'travail')).toBe(true);
  });

  it('exige tous les mots, dans n\'importe quel ordre', () => {
    expect(matchesQuery(note, [], 'produit reunion')).toBe(true);
    expect(matchesQuery(note, [], 'produit voiture')).toBe(false);
  });
});
