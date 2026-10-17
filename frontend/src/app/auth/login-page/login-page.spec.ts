import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService, User } from '../auth.service';
import { LoginPage } from './login-page';

function render(initial: User | null) {
  const user = signal<User | null>(initial);
  const navigateByUrl = vi.fn(async () => true);
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { user, login: vi.fn(), register: vi.fn() } },
      { provide: Router, useValue: { navigateByUrl } },
    ],
  });
  const fixture = TestBed.createComponent(LoginPage);
  fixture.detectChanges();
  return { fixture, user, navigateByUrl, el: fixture.nativeElement as HTMLElement };
}

describe('LoginPage', () => {
  it('affiche le formulaire et le lien pour continuer sans compte', () => {
    const { el } = render(null);

    expect(el.querySelector('app-auth-form')).not.toBeNull();
    expect(el.querySelector('.guest')?.textContent).toContain('sans compte');
  });

  it('« Continuer sans compte » revient à la liste sans recharger la page', () => {
    const { el, navigateByUrl } = render(null);

    (el.querySelector('.guest') as HTMLAnchorElement).click();

    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('renvoie vers les notes dès que l’utilisateur est connecté', () => {
    const { fixture, user, navigateByUrl } = render(null);
    expect(navigateByUrl).not.toHaveBeenCalled();

    user.set({ name: 'Alice', email: 'a@x.test' });
    fixture.detectChanges();

    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });
});
