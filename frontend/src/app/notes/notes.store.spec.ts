import { TestBed } from '@angular/core/testing';
import { InMemoryNoteRepository } from '../testing/in-memory-note-repository';
import { DEFAULT_COLOR, Note } from './models';
import { NoteRepository } from './note-repository';
import { NotesStore } from './notes.store';

function setup() {
  TestBed.configureTestingModule({
    providers: [{ provide: NoteRepository, useClass: InMemoryNoteRepository }],
  });
  return {
    store: TestBed.inject(NotesStore),
    repo: TestBed.inject(NoteRepository) as InMemoryNoteRepository,
  };
}

const blank = { title: 'A', content: '', categoryIds: [] as string[] };

describe('NotesStore', () => {
  it('ajoute une note, la persiste et la nettoie des espaces', async () => {
    const { store, repo } = setup();
    const note = await store.addNote({ title: '  Courses  ', content: 'Lait', categoryIds: [] });
    expect(note?.title).toBe('Courses');
    expect(store.notes().length).toBe(1);
    expect(repo.notes.length).toBe(1);
  });

  it('refuse une note entièrement vide', async () => {
    const { store } = setup();
    expect(await store.addNote({ title: ' ', content: '', categoryIds: [] })).toBeNull();
    expect(store.notes().length).toBe(0);
  });

  it('ne garde que les catégories qui existent, sans doublon', async () => {
    const { store } = setup();
    const work = await store.addCategory('Travail');
    const note = await store.addNote({ ...blank, categoryIds: [work!.id, work!.id, 'inconnue'] });
    expect(note?.categoryIds).toEqual([work!.id]);
  });

  it('associe plusieurs catégories à une note, visible dans chacune', async () => {
    const { store } = setup();
    const work = await store.addCategory('Travail');
    const home = await store.addCategory('Maison');
    await store.addNote({ ...blank, categoryIds: [work!.id, home!.id] });

    store.selectCategory(work!.id);
    expect(store.notes().length).toBe(1);
    store.selectCategory(home!.id);
    expect(store.notes().length).toBe(1);
  });

  it('supprime une note', async () => {
    const { store, repo } = setup();
    const note = await store.addNote(blank);
    await store.deleteNote(note!.id);
    expect(store.notes()).toEqual([]);
    expect(repo.notes).toEqual([]);
  });

  it('ne crée pas deux catégories au même nom (insensible à la casse)', async () => {
    const { store } = setup();
    const a = await store.addCategory('Travail');
    const b = await store.addCategory('  travail ');
    expect(b?.id).toBe(a?.id);
    expect(store.categories().length).toBe(1);
  });

  it('enregistre la couleur choisie, ou la couleur par défaut si elle est invalide', async () => {
    const { store } = setup();
    expect((await store.addCategory('A', '#e74c3c'))?.color).toBe('#e74c3c');
    expect((await store.addCategory('B', 'javascript:alert(1)'))?.color).toBe(DEFAULT_COLOR);
    expect((await store.addCategory('C'))?.color).toBe(DEFAULT_COLOR);
  });

  it('filtre les notes par catégorie', async () => {
    const { store } = setup();
    const work = await store.addCategory('Travail');
    await store.addNote({ ...blank, title: 'A', categoryIds: [work!.id] });
    await store.addNote({ ...blank, title: 'B' });

    store.selectCategory(work!.id);
    expect(store.notes().map((n) => n.title)).toEqual(['A']);
    store.selectCategory(null);
    expect(store.notes().length).toBe(2);
  });

  it('supprimer une catégorie garde ses notes, qui perdent seulement cette catégorie', async () => {
    const { store, repo } = setup();
    const work = await store.addCategory('Travail');
    const home = await store.addCategory('Maison');
    await store.addNote({ ...blank, categoryIds: [work!.id, home!.id] });
    store.selectCategory(work!.id);

    await store.deleteCategory(work!.id);

    expect(store.categories().map((c) => c.name)).toEqual(['Maison']);
    expect(repo.categories.length).toBe(1);
    expect(store.selectedCategoryId()).toBeNull();
    expect(store.notes()[0].categoryIds).toEqual([home!.id]);
    expect(repo.notes[0].categoryIds).toEqual([home!.id]);
  });

  it('nettoie la checklist : espaces retirés, éléments vides ignorés', async () => {
    const { store } = setup();
    const note = await store.addNote({
      title: '',
      content: '',
      categoryIds: [],
      items: [
        { id: 'a', text: '  Lait ', done: false },
        { id: 'b', text: '   ', done: false },
      ],
    });
    expect(note?.items).toEqual([{ id: 'a', text: 'Lait', done: false }]);
  });

  it('coche et décoche une case, et le persiste', async () => {
    const { store, repo } = setup();
    const note = await store.addNote({
      title: 'Courses',
      content: '',
      categoryIds: [],
      items: [{ id: 'a', text: 'Lait', done: false }],
    });
    await store.toggleItem(note!.id, 'a');
    expect(store.notes()[0].items[0].done).toBe(true);
    expect(repo.notes[0].items[0].done).toBe(true);
    await store.toggleItem(note!.id, 'a');
    expect(store.notes()[0].items[0].done).toBe(false);
  });

  it('modifie une note en gardant son id et sa date de création', async () => {
    const { store } = setup();
    const note = await store.addNote(blank);
    const updated = await store.updateNote(note!.id, {
      title: 'B',
      content: 'texte',
      categoryIds: [],
    });
    expect(updated?.id).toBe(note!.id);
    expect(updated?.createdAt).toBe(note!.createdAt);
    expect(store.notes()[0].title).toBe('B');
  });

  it('refuse de vider complètement une note à la modification', async () => {
    const { store } = setup();
    const note = await store.addNote(blank);
    expect(
      await store.updateNote(note!.id, { title: ' ', content: '', categoryIds: [] }),
    ).toBeNull();
    expect(store.notes()[0].title).toBe('A');
  });

  it('compte les notes par catégorie, quel que soit le filtre actif', async () => {
    const { store } = setup();
    const work = await store.addCategory('Travail');
    const home = await store.addCategory('Maison');
    await store.addNote({ ...blank, categoryIds: [work!.id, home!.id] });
    await store.addNote({ ...blank, categoryIds: [work!.id] });
    await store.addNote({ ...blank, categoryIds: [] });

    store.selectCategory(home!.id); // le filtre ne doit pas fausser les compteurs
    expect(store.total()).toBe(3);
    expect(store.counts().get(work!.id)).toBe(2);
    expect(store.counts().get(home!.id)).toBe(1);

    await store.deleteNote(store.notes()[0].id);
    expect(store.total()).toBe(2);
    expect(store.counts().get(home!.id) ?? 0).toBe(0);
  });

  /** Dépôt qui simule un serveur lent, et qui peut échouer. */
  class SlowRepository extends InMemoryNoteRepository {
    saves = 0;
    fail = false;

    override async saveNote(note: Note): Promise<void> {
      this.saves++;
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      if (this.fail) throw new Error('boom');
      await super.saveNote(note);
    }
  }

  describe('NotesStore : cases cochées en rafale', () => {
    const done = (note: Note) => note.items.map((i) => i.done);

    async function withNote() {
      TestBed.configureTestingModule({
        providers: [{ provide: NoteRepository, useClass: SlowRepository }],
      });
      const store = TestBed.inject(NotesStore);
      const repo = TestBed.inject(NoteRepository) as SlowRepository;
      const note = await store.addNote({
        title: 'Courses',
        content: '',
        categoryIds: [],
        items: ['a', 'b', 'c'].map((id) => ({ id, text: id, done: false })),
      });
      repo.saves = 0;
      return { store, repo, id: note!.id };
    }

    it('affiche tout de suite les cases cochées, sans attendre le serveur', async () => {
      const { store, id } = await withNote();

      const pending = ['a', 'b', 'c'].map((item) => store.toggleItem(id, item));
      expect(done(store.notes()[0])).toEqual([true, true, true]); // avant toute réponse

      await Promise.all(pending);
    });

    it('enregistre la version finale, avec peu de requêtes', async () => {
      const { store, repo, id } = await withNote();

      await Promise.all(['a', 'b', 'c'].map((item) => store.toggleItem(id, item)));

      expect(done(repo.notes[0])).toEqual([true, true, true]);
      expect(repo.saves).toBeLessThanOrEqual(2);
    });

    it('un clic pendant un enregistrement est rattrapé par une requête suivante', async () => {
      const { store, repo, id } = await withNote();

      const first = store.toggleItem(id, 'a');
      await new Promise((resolve) => setTimeout(resolve, 2)); // la requête 1 est partie, sans réponse
      const second = store.toggleItem(id, 'b');
      await Promise.all([first, second]);

      expect(done(repo.notes[0])).toEqual([true, true, false]);
      expect(repo.saves).toBe(2);
    });

    it('en cas d’échec, l’écran retrouve la version enregistrée', async () => {
      const { store, repo, id } = await withNote();
      repo.fail = true;

      await expect(store.toggleItem(id, 'a')).rejects.toThrow('boom');

      expect(done(store.notes()[0])).toEqual([false, false, false]);
    });
  });
});
