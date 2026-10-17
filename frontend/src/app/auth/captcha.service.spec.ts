import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CaptchaService, findNumber } from './captcha.service';

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

describe('findNumber', () => {
  it('retrouve le nombre caché derrière le hachage', async () => {
    const challenge = await sha256Hex('sel.123' + 42);
    expect(await findNumber({ challenge, salt: 'sel.123', maxnumber: 100 })).toBe(42);
  });

  it('échoue quand le défi est insoluble', async () => {
    await expect(findNumber({ challenge: 'zz', salt: 's', maxnumber: 5 })).rejects.toThrow();
  });
});

describe('CaptchaService', () => {
  it('récupère le défi puis renvoie la réponse en base64', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(CaptchaService);
    const http = TestBed.inject(HttpTestingController);

    const result = service.solve();
    http.expectOne('/api/captcha').flush({
      algorithm: 'SHA-256',
      challenge: await sha256Hex('s.1' + 7),
      salt: 's.1',
      signature: 'sig',
      maxnumber: 20,
    });
    const answer = JSON.parse(atob(await result));

    expect(answer).toEqual({
      algorithm: 'SHA-256',
      challenge: await sha256Hex('s.1' + 7),
      salt: 's.1',
      signature: 'sig',
      number: 7,
    });
    http.verify();
  });
});
