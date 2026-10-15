import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService, User } from '../auth/auth.service';
import { Note } from './models';
import { RoutingNoteRepository } from './routing-note-repository';

const note: Note = {
  id: 'n1',
  title: 'Titre',
  content: '',
  items: [],
  categoryIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('RoutingNoteRepository', () => {
  const user = signal<User | null>(null);
  let repo: RoutingNoteRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    user.set(null);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { user } },
        RoutingNoteRepository,
      ],
    });
    repo = TestBed.inject(RoutingNoteRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('invité : écrit dans le navigateur, sans aucune requête', async () => {
    await repo.saveNote(note);
    expect(localStorage.getItem('penseo.notes')).toContain('"n1"');
  });

  it('connecté : passe par le serveur et laisse le navigateur tranquille', async () => {
    user.set({ name: 'Alice', email: 'a@x.test' });

    const result = repo.listNotes();
    http.expectOne('/api/notes').flush([note]);

    expect(await result).toEqual([note]);
    expect(localStorage.getItem('penseo.notes')).toBeNull();
  });
});
