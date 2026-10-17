import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LocalImportService } from '../notes/data/local-import.service';
import { CaptchaService } from './captcha.service';

export interface User {
  name: string;
  email: string;
}

const SESSION_HINT = 'penseo.session';

/**
 * Indice (pas une preuve) qu'une session existe : évite d'appeler /api/user, et d'afficher un 401 rouge
 * en console, à chaque visite d'un invité. La vraie authentification reste le cookie de session HttpOnly.
 */
const hint = {
  has: () => {
    try {
      return localStorage.getItem(SESSION_HINT) === '1';
    } catch {
      return false;
    }
  },
  set: () => {
    try {
      localStorage.setItem(SESSION_HINT, '1');
    } catch {
      /* sans conséquence */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(SESSION_HINT);
    } catch {
      /* sans conséquence */
    }
  },
};

/** Authentification par cookie de session (Sanctum) : aucun jeton n'est jamais stocké côté navigateur. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly importer = inject(LocalImportService);
  private readonly captcha = inject(CaptchaService);

  private readonly _user = signal<User | null>(null);
  private readonly _notice = signal<string | null>(null);
  readonly user = this._user.asReadonly();
  /** Information à montrer à l'utilisateur (ex. : import incomplet). */
  readonly notice = this._notice.asReadonly();

  /** Au démarrage de l'appli : retrouve la session ouverte, s'il y en a une. */
  async init(): Promise<void> {
    if (!hint.has()) return;
    try {
      this._user.set(await firstValueFrom(this.http.get<User>('/api/user')));
    } catch (error) {
      // 401 = session expirée : on repart en invité. Autre erreur (serveur coupé) : on garde l'indice.
      if (error instanceof HttpErrorResponse && error.status === 401) hint.clear();
    }
  }

  /**
   * Retournent un message d'erreur, ou null si tout s'est bien passé.
   * `website` est le champ piège du formulaire : toujours vide pour un humain.
   */
  register(name: string, email: string, password: string, website = ''): Promise<string | null> {
    return this.authenticate('/api/register', { name, email, password }, website);
  }

  login(email: string, password: string, website = ''): Promise<string | null> {
    return this.authenticate('/api/login', { email, password }, website);
  }

  async logout(): Promise<void> {
    try {
      await this.csrf();
      await firstValueFrom(this.http.post('/api/logout', {}));
    } catch {
      // Serveur injoignable : on quitte quand même le mode connecté à l'écran.
    }
    hint.clear();
    this._notice.set(null);
    this._user.set(null); // la page recharge alors les notes du navigateur (vides après l'import)
  }

  private async authenticate(url: string, body: object, website: string): Promise<string | null> {
    this._notice.set(null);
    try {
      await this.csrf();
      // Défi anti-robot résolu juste avant l'envoi : il est à usage unique et expire au bout de 5 minutes.
      const captcha = await this.captcha.solve();
      const user = await firstValueFrom(this.http.post<User>(url, { ...body, captcha, website }));
      hint.set();
      // Import AVANT de passer en mode connecté : l'écran montre encore les notes locales pendant ce temps.
      await this.importLocalNotes();
      this._user.set(user);
      return null;
    } catch (error) {
      return friendlyError(error);
    }
  }

  /** Un import raté ne doit pas empêcher la connexion : on prévient, et les notes restent dans le navigateur. */
  private async importLocalNotes(): Promise<void> {
    try {
      await this.importer.run();
    } catch {
      this._notice.set(
        'Certaines notes de ce navigateur n’ont pas pu être importées : elles y restent, et l’import sera retenté à ta prochaine connexion.',
      );
    }
  }

  /** Demande à Laravel le cookie XSRF-TOKEN ; Angular le renvoie ensuite tout seul dans l'en-tête X-XSRF-TOKEN. */
  private csrf(): Promise<unknown> {
    return firstValueFrom(this.http.get('/sanctum/csrf-cookie'));
  }
}

/** Messages en français pour l'utilisateur : le détail technique du serveur n'est jamais affiché tel quel. */
function friendlyError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 429) return 'Trop de tentatives : réessaie dans une minute.';
    if (error.status === 422) {
      const errors = error.error?.errors ?? {};
      if (errors.captcha) return 'Vérification anti-robot échouée : réessaie.';
      if (errors.password) return 'Mot de passe invalide : 12 caractères minimum.';
      if (errors.email) return 'Adresse email invalide ou déjà utilisée.';
      if (errors.name) return 'Nom invalide.';
      return error.error?.message ?? 'Données invalides.';
    }
  }
  return 'Service indisponible, réessaie plus tard.';
}
