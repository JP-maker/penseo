import { Component, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

type Mode = 'login' | 'register';

/** Connexion / création de compte. Une fois connecté, la page le retire d'elle-même (user non nul). */
@Component({
  selector: 'app-auth-form',
  templateUrl: './auth-form.html',
  styleUrl: './auth-form.scss',
})
export class AuthForm {
  private readonly auth = inject(AuthService);

  protected readonly mode = signal<Mode>('login');
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected valueOf(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected toggle(): void {
    this.mode.update((m) => (m === 'login' ? 'register' : 'login'));
    this.error.set(null);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return; // évite le double envoi
    this.busy.set(true);
    this.error.set(null);

    const error =
      this.mode() === 'login'
        ? await this.auth.login(this.email(), this.password())
        : await this.auth.register(this.name(), this.email(), this.password());

    this.busy.set(false);
    if (error) {
      this.error.set(error);
      return;
    }
    this.password.set(''); // le mot de passe ne reste pas en mémoire plus longtemps que nécessaire
  }
}
