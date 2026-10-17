import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface Challenge {
  algorithm: 'SHA-256';
  challenge: string;
  salt: string;
  signature: string;
  maxnumber: number;
}

/**
 * Anti-robot par preuve de travail : le serveur donne un défi, le navigateur retrouve le nombre
 * dont le hachage SHA-256 (avec le sel) correspond. Quelques dixièmes de seconde, sans saisie ni image.
 * Comme les notes chiffrées, cela demande `crypto.subtle` (HTTPS ou localhost).
 */
@Injectable({ providedIn: 'root' })
export class CaptchaService {
  private readonly http = inject(HttpClient);

  /** Retourne la réponse à joindre à la requête (JSON en base64). */
  async solve(): Promise<string> {
    const c = await firstValueFrom(this.http.get<Challenge>('/api/captcha'));
    const number = await findNumber(c);
    return btoa(
      JSON.stringify({ algorithm: c.algorithm, challenge: c.challenge, salt: c.salt, signature: c.signature, number }),
    );
  }
}

/** Essaie 0, 1, 2… jusqu'à `maxnumber` ; lève une erreur si aucun ne convient (défi invalide). */
export async function findNumber(c: Pick<Challenge, 'challenge' | 'salt' | 'maxnumber'>): Promise<number> {
  const encoder = new TextEncoder();
  for (let n = 0; n <= c.maxnumber; n++) {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(c.salt + n));
    if (toHex(digest) === c.challenge) return n;
  }
  throw new Error('Défi anti-robot insoluble');
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}
