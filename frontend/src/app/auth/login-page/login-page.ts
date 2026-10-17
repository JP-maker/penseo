import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthForm } from '../auth-form/auth-form';
import { AuthService } from '../auth.service';

/** Page dédiée à la connexion et à la création de compte. */
@Component({
  selector: 'app-login-page',
  imports: [AuthForm],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  constructor() {
    // Connecté (à l'instant, ou déjà en arrivant ici) : retour à la liste des notes.
    effect(() => {
      if (this.auth.user()) void this.router.navigateByUrl('/');
    });
  }

  protected home(event: Event): void {
    event.preventDefault();
    void this.router.navigateByUrl('/');
  }
}
