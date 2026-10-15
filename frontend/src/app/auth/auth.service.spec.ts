import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve));
const ALICE = { name: 'Alice', email: 'a@x.test' };
const invalid = { status: 422, statusText: 'Unprocessable Entity' };

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify()); // échoue si une requête inattendue est restée sans réponse

  /** Amène le service à l'état "connecté" sans passer par login. */
  async function signIn() {
    localStorage.setItem('penseo.session', '1');
    const init = service.init();
    http.expectOne('/api/user').flush(ALICE);
    await init;
  }

  it('init : un invité ne déclenche aucune requête', async () => {
    await service.init();
    expect(service.user()).toBeNull();
  });

  it('init : retrouve la session quand un indice existe', async () => {
    await signIn();
    expect(service.user()).toEqual(ALICE);
  });

  it('init : session expirée (401) → invité, indice effacé', async () => {
    localStorage.setItem('penseo.session', '1');
    const init = service.init();
    http.expectOne('/api/user').flush({}, { status: 401, statusText: 'Unauthorized' });
    await init;

    expect(service.user()).toBeNull();
    expect(localStorage.getItem('penseo.session')).toBeNull();
  });

  it('login : demande le cookie CSRF, ouvre la session puis passe en mode connecté', async () => {
    const result = service.login('a@x.test', 'pw');
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    await tick();
    const req = http.expectOne('/api/login');
    expect(req.request.body).toEqual({ email: 'a@x.test', password: 'pw' });
    req.flush(ALICE);

    expect(await result).toBeNull();
    expect(service.user()).toEqual(ALICE);
    expect(localStorage.getItem('penseo.session')).toBe('1');
  });

  it('login : identifiants refusés → message du serveur, pas de session', async () => {
    const result = service.login('a@x.test', 'mauvais');
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    await tick();
    http.expectOne('/api/login').flush({ message: 'Identifiants invalides.' }, invalid);

    expect(await result).toBe('Identifiants invalides.');
    expect(service.user()).toBeNull();
    expect(localStorage.getItem('penseo.session')).toBeNull();
  });

  it('login : trop de tentatives (429) → message en français', async () => {
    const result = service.login('a@x.test', 'pw');
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    await tick();
    http.expectOne('/api/login').flush({}, { status: 429, statusText: 'Too Many Requests' });

    expect(await result).toContain('Trop de tentatives');
  });

  it('register : mot de passe refusé → message clair', async () => {
    const result = service.register('Alice', 'a@x.test', 'court');
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    await tick();
    http.expectOne('/api/register').flush({ message: 'x', errors: { password: ['x'] } }, invalid);

    expect(await result).toContain('12 caractères');
    expect(service.user()).toBeNull();
  });

  it('login : un import raté n’empêche pas la connexion et garde les notes locales', async () => {
    const note = {
      id: 'n1',
      title: 'A',
      content: '',
      items: [],
      categoryIds: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    localStorage.setItem('penseo.notes', JSON.stringify([note]));

    const result = service.login('a@x.test', 'pw');
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    await tick();
    http.expectOne('/api/login').flush(ALICE);
    await tick();
    http.expectOne('/api/notes/n1').flush({}, { status: 500, statusText: 'Server Error' });

    expect(await result).toBeNull();
    expect(service.user()).toEqual(ALICE);
    expect(service.notice()).toContain('importées');
    expect(JSON.parse(localStorage.getItem('penseo.notes')!)).toHaveLength(1);
  });

  it('logout : ferme la session et efface l’indice', async () => {
    await signIn();

    const result = service.logout();
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    await tick();
    http.expectOne('/api/logout').flush(null, { status: 204, statusText: 'No Content' });
    await result;

    expect(service.user()).toBeNull();
    expect(localStorage.getItem('penseo.session')).toBeNull();
  });
});
