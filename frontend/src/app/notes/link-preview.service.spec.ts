import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LinkPreviewService } from './link-preview.service';

const URL = 'https://a.test/x?y=1&z=2';
const PREVIEW = { url: URL, title: 'T', description: null, image: null };
const isCall = (r: { url: string; params: { get(k: string): string | null } }) =>
  r.url === '/api/link-preview' && r.params.get('url') === URL;

describe('LinkPreviewService', () => {
  let service: LinkPreviewService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LinkPreviewService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('interroge l’API avec l’URL en paramètre', async () => {
    const result = service.get(URL);
    http.expectOne(isCall).flush(PREVIEW);
    expect(await result).toEqual(PREVIEW);
  });

  it('ne redemande pas une URL déjà connue', async () => {
    const first = service.get(URL);
    const second = service.get(URL);
    http.expectOne(isCall).flush(PREVIEW); // expectOne échoue s'il y a deux requêtes
    expect(await first).toEqual(await second);
  });

  it('retourne null si le serveur refuse', async () => {
    const result = service.get(URL);
    http
      .expectOne(isCall)
      .flush({ message: 'x' }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(await result).toBeNull();
  });
});
