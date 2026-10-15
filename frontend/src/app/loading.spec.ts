import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LoadingState, loadingInterceptor } from './loading';

describe('loadingInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let loading: LoadingState;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([loadingInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(LoadingState);
  });

  afterEach(() => controller.verify());

  it('est actif pendant la requête, puis inactif après la réponse', () => {
    http.get('/a').subscribe();
    expect(loading.active()).toBe(true);

    controller.expectOne('/a').flush({});
    expect(loading.active()).toBe(false);
  });

  it('redevient inactif aussi après une erreur', () => {
    http.get('/a').subscribe({ error: () => undefined });

    controller.expectOne('/a').flush({}, { status: 500, statusText: 'Server Error' });

    expect(loading.active()).toBe(false);
  });

  it('reste actif tant qu’une requête est encore en cours', () => {
    http.get('/a').subscribe();
    http.get('/b').subscribe();

    controller.expectOne('/a').flush({});
    expect(loading.active()).toBe(true);

    controller.expectOne('/b').flush({});
    expect(loading.active()).toBe(false);
  });
});
