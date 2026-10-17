import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Penséo',
    loadComponent: () => import('./notes/notes-page/notes-page').then((m) => m.NotesPage),
  },
  {
    path: 'connexion',
    title: 'Connexion · Penséo',
    loadComponent: () => import('./auth/login-page/login-page').then((m) => m.LoginPage),
  },
  { path: '**', redirectTo: '' },
];
