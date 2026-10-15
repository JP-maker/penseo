import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { NoteRepository } from './notes/data/note-repository';
import { ErrorNotifier } from './core/error-notifier';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { RoutingNoteRepository } from './notes/data/routing-note-repository';
import { AuthService } from './auth/auth.service';
import { loadingInterceptor } from './core/loading';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([loadingInterceptor])),
    { provide: ErrorHandler, useExisting: ErrorNotifier },
    { provide: NoteRepository, useClass: RoutingNoteRepository },
    provideAppInitializer(() => inject(AuthService).init()),
  ],
};
