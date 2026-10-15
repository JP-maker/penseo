import { TestBed } from '@angular/core/testing';
import { InMemoryNoteRepository } from '../../testing/in-memory-note-repository';
import { LIMITS } from './models';
import { NoteRepository } from './note-repository';
import { NotesStore } from './notes.store';

const BLOCK = 'v1.600000.c2VsMTIzNDU2Nzg5MA==.aXYxMjM0NTY3OA==.Y2lwaGVydGV4dA==';

function setup() {
  TestBed.configureTestingModule({
    providers: [{ provide: NoteRepository, useClass: InMemoryNoteRepository }],
  });
  return TestBed.inject(NotesStore);
}

describe('NotesStore : notes chiffrées', () => {
  it('garde le bloc chiffré tel quel et ne garde aucune case en clair', async () => {
    const store = setup();
    const note = await store.addNote({
      title: 'Codes',
      content: BLOCK,
      categoryIds: [],
      encrypted: true,
      items: [{ id: crypto.randomUUID(), text: 'en clair', done: false }],
    });

    expect(note?.encrypted).toBe(true);
    expect(note?.content).toBe(BLOCK);
    expect(note?.items).toEqual([]);
  });

  it('ne raccourcit pas un bloc chiffré au-delà de la limite d\'un texte normal', async () => {
    const store = setup();
    const block = 'v1.600000.c2Vs.aXY=.' + 'QUJD'.repeat(10_000); // 40 000 caractères
    const note = await store.addNote({ title: '', content: block, categoryIds: [], encrypted: true });

    expect(note?.content).toBe(block);
    expect(block.length).toBeGreaterThan(LIMITS.content);
  });

  it('raccourcit toujours un texte normal à la limite', async () => {
    const store = setup();
    const note = await store.addNote({ title: '', content: 'a'.repeat(LIMITS.content + 5), categoryIds: [] });

    expect(note?.content.length).toBe(LIMITS.content);
    expect(note?.encrypted).toBe(false);
  });

  it('retire le chiffrement quand on enregistre la note en clair', async () => {
    const store = setup();
    const note = await store.addNote({ title: 'Codes', content: BLOCK, categoryIds: [], encrypted: true });

    const clear = await store.updateNote(note!.id, { title: 'Codes', content: 'en clair', categoryIds: [] });

    expect(clear?.encrypted).toBe(false);
    expect(clear?.content).toBe('en clair');
  });
});
