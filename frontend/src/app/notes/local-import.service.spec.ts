import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LocalImportService } from './local-import.service';
import { Note } from './models';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve));
const category = { id: 'c1', name: 'Travail', color: '#e74c3c' };
const note: Note = {
  id: 'n1',
  title: 'A',
  content: '',
  items: [],
  categoryIds: ['c1'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('LocalImportService', () => {
  let importer: LocalImportService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('penseo.categories', JSON.stringify([category]));
    localStorage.setItem('penseo.notes', JSON.stringify([note]));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    importer = TestBed.inject(LocalImportService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envoie les catégories puis les notes, et ne vide le navigateur qu’ensuite', async () => {
    const result = importer.run();
    await tick();
    http.expectOne('/api/categories/c1').flush(category); // la note n'est pas encore envoyée
    await tick();
    const noteRequest = http.expectOne('/api/notes/n1');
    expect(noteRequest.request.body.categoryIds).toEqual(['c1']);
    noteRequest.flush(note);

    expect(await result).toBe(1);
    expect(localStorage.getItem('penseo.notes')).toBe('[]');
    expect(localStorage.getItem('penseo.categories')).toBe('[]');
  });

  it('en cas d’échec, garde les notes du navigateur', async () => {
    const result = importer.run().then(
      () => null,
      (error: unknown) => error,
    );
    await tick();
    http.expectOne('/api/categories/c1').flush(category);
    await tick();
    http.expectOne('/api/notes/n1').flush({}, { status: 500, statusText: 'Server Error' });

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(JSON.parse(localStorage.getItem('penseo.notes')!)).toHaveLength(1);
  });
});
