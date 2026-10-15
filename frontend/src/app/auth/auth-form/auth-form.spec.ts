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
  it('envoie l’email et le mot de passe saisis', async () => {
    const { fixture, auth, el } = render(async () => null);

    type(el.querySelector('input[name="email"]')!, 'a@x.test');
    type(el.querySelector('input[name="password"]')!, 'secret');
    fixture.detectChanges();
    submit(el);
    await flush();

    expect(auth.login).toHaveBeenCalledWith('a@x.test', 'secret');
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

  it('désactive le bouton et l’indique pendant l’attente', async () => {
    let release!: (value: string | null) => void;
    const { fixture, el } = render(
      () => new Promise<string | null>((resolve) => (release = resolve)),
    );

    submit(el);
    fixture.detectChanges();
    const button = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Un instant');

    release(null);
    await flush();
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
  });
});
