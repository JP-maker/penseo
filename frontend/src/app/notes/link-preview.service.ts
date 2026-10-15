import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LinkPreview } from './models';

/** Demande au backend l'aperçu d'une URL. Retourne null si l'aperçu est indisponible. */
@Injectable({ providedIn: 'root' })
export class LinkPreviewService {
  private readonly http = inject(HttpClient);

  // shortcut: cache en mémoire jusqu'au rechargement, échecs compris (évite de saturer la limite de débit du serveur).
  private readonly cache = new Map<string, Promise<LinkPreview | null>>();

  get(url: string): Promise<LinkPreview | null> {
    let result = this.cache.get(url);
    if (!result) {
      // `params` encode l'URL correctement dans la query string.
      result = firstValueFrom(
        this.http.get<LinkPreview>('/api/link-preview', { params: { url } }),
      ).catch(() => null);
      this.cache.set(url, result);
    }
    return result;
  }
}
