import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpNoteRepository } from './http-note-repository';
import { Note } from './models';

const note: Note = {
  id: 'n1',
  title: 'Titre',
  content: 'Texte',
  items: [],
  categoryIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('HttpNoteRepository', () => {
  let repo: HttpNoteRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(HttpNoteRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('liste les notes du serveur', async () => {
    const result = repo.listNotes();
    http.expectOne('/api/notes').flush([note]);
    expect(await result).toEqual([note]);
  });

  it('envoie la note sans id ni updatedAt, et encode l’id dans l’URL', async () => {
    const result = repo.saveNote({ ...note, id: 'a/b' });
    const req = http.expectOne((r) => r.method === 'PUT');
    expect(req.request.url).toBe('/api/notes/a%2Fb');
    expect(Object.keys(req.request.body).sort()).toEqual([
      'categoryIds',
      'content',
      'createdAt',
      'items',
      'title',
    ]);
    req.flush(note);
    await result;
  });

  it('supprime une note', async () => {
    const result = repo.deleteNote('n1');
    http
      .expectOne({ method: 'DELETE', url: '/api/notes/n1' })
      .flush(null, { status: 204, statusText: 'No Content' });
    await result;
  });
});
