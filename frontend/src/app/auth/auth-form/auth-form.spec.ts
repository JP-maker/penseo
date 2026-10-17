import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthForm } from './auth-form';
import { AuthService } from '../auth.service';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve));

function render(login: () => Promise<string | null>) {
  const auth = { login: vi.fn(login), register: vi.fn(async () => null) };
  TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: auth }] });
  const fixture = TestBed.createComponent(AuthForm);
  fixture.detectChanges();
  return { fixture, auth, el: fixture.nativeElement as HTMLElement };
}

function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function submit(el: HTMLElement) {
  el.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('AuthForm', () => {
  it('envoie l’email et le mot de passe saisis, avec un champ piège vide', async () => {
    const { fixture, auth, el } = render(async () => null);

    type(el.querySelector('input[name="email"]')!, 'a@x.test');
    type(el.querySelector('input[name="password"]')!, 'secret');
    fixture.detectChanges();
    submit(el);
    await flush();

    expect(auth.login).toHaveBeenCalledWith('a@x.test', 'secret', '');
  });

  it('transmet le champ piège quand un robot le remplit', async () => {
    const { fixture, auth, el } = render(async () => null);

    type(el.querySelector('input[name="website"]')!, 'http://spam.test');
    fixture.detectChanges();
    submit(el);
    await flush();

    expect(auth.login).toHaveBeenCalledWith('', '', 'http://spam.test');
  });

  it('cache le champ piège aux lecteurs d’écran et au clavier', () => {
    const { el } = render(async () => null);
    const trap = el.querySelector('.trap')!;

    expect(trap.getAttribute('aria-hidden')).toBe('true');
    expect(trap.querySelector('input')!.getAttribute('tabindex')).toBe('-1');
  });

  it('affiche l’erreur renvoyée, en texte', async () => {
    const { fixture, el } = render(async () => 'Identifiants invalides.');

    submit(el);
    await flush();
    fixture.detectChanges();

    expect(el.querySelector('.error')?.textContent).toBe('Identifiants invalides.');
  });

  it('bascule vers l’inscription : le champ nom apparaît', () => {
    const { fixture, el } = render(async () => null);
    expect(el.querySelector('input[name="name"]')).toBeNull();

    (el.querySelector('.toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('input[name="name"]')).not.toBeNull();
  });
});
