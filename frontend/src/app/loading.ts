import { HttpInterceptorFn } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';

/** Nombre de requêtes serveur en cours ; `active` vaut true tant qu'il en reste au moins une. */
@Injectable({ providedIn: 'root' })
export class LoadingState {
  private readonly count = signal(0);
  readonly active = computed(() => this.count() > 0);

  start(): void {
    this.count.update((n) => n + 1);
  }

  stop(): void {
    this.count.update((n) => Math.max(0, n - 1));
  }
}

/** Compte chaque requête HTTP. finalize s'exécute aussi bien après un succès que sur erreur ou annulation. */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingState);
  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};
