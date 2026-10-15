import { LocalNoteRepository } from './local-note-repository';
import { Note, DEFAULT_COLOR } from './models';

const note = (over: Partial<Note> = {}): Note => ({
  id: 'n1',
  title: 'Titre',
  content: 'Texte',
  items: [],
  categoryIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});
describe('LocalNoteRepository', () => {
  let repo: LocalNoteRepository;

  beforeEach(() => {
    localStorage.clear();
    repo = new LocalNoteRepository();
  });

  it('retourne une liste vide au départ', async () => {
    expect(await repo.listNotes()).toEqual([]);
  });

  it('sauvegarde puis relit une note', async () => {
    await repo.saveNote(note());
    expect(await repo.listNotes()).toEqual([note()]);
  });

  it('remplace une note qui a le même id', async () => {
    await repo.saveNote(note());
    await repo.saveNote(note({ title: 'Modifié' }));
    const notes = await repo.listNotes();
    expect(notes.length).toBe(1);
    expect(notes[0].title).toBe('Modifié');
  });

  it('supprime une note', async () => {
    await repo.saveNote(note());
    await repo.deleteNote('n1');
    expect(await repo.listNotes()).toEqual([]);
  });

  it('ignore un JSON corrompu', async () => {
    localStorage.setItem('penseo.notes', '{pas du json');
    expect(await repo.listNotes()).toEqual([]);
  });

  it('écarte les entrées de forme invalide', async () => {
    localStorage.setItem('penseo.notes', JSON.stringify([note(), { id: 42 }, 'texte', null]));
    expect(await repo.listNotes()).toEqual([note()]);
  });

  it('reprend les données enregistrées par une ancienne version', async () => {
    // Ancien format : une seule catégorie par note, et pas de couleur.
    localStorage.setItem(
      'penseo.notes',
      JSON.stringify([{ ...note(), categoryIds: undefined, categoryId: 'c1' }]),
    );
    localStorage.setItem('penseo.categories', JSON.stringify([{ id: 'c1', name: 'Travail' }]));

    expect((await repo.listNotes())[0].categoryIds).toEqual(['c1']);
    expect((await repo.listCategories())[0].color).toBe(DEFAULT_COLOR);
  });

  it('écarte une catégorie dont la couleur n’est pas un hexadécimal', async () => {
    localStorage.setItem(
      'penseo.categories',
      JSON.stringify([{ id: 'c1', name: 'Piégée', color: 'red; background:url(x)' }]),
    );

    expect(await repo.listCategories()).toEqual([]);
  });
});
