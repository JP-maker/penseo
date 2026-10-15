import { ErrorHandler, Injectable, signal } from '@angular/core';

/** Gestionnaire d'erreurs global : journalise, puis affiche un message générique (jamais le détail technique). */
@Injectable({ providedIn: 'root' })
export class ErrorNotifier implements ErrorHandler {
  readonly message = signal<string | null>(null);

  handleError(error: unknown): void {
    console.error(error);
    this.message.set('Une erreur est survenue : vérifie ta connexion puis réessaie.');
  }

  dismiss(): void {
    this.message.set(null);
  }
}
