import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { NoteRepository } from './notes/note-repository';
import { ErrorNotifier } from './error-notifier';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { RoutingNoteRepository } from './notes/routing-note-repository';
import { AuthService } from './auth/auth.service';
import { loadingInterceptor } from './loading';

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
