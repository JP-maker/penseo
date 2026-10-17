import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { DonatePage } from './donate-page';

function render() {
  const navigateByUrl = vi.fn(async () => true);
  TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { navigateByUrl } }] });
  const fixture = TestBed.createComponent(DonatePage);
  fixture.detectChanges();
  return { navigateByUrl, el: fixture.nativeElement as HTMLElement };
}

describe('DonatePage', () => {
  it('affiche le QR code avec un texte alternatif', () => {
    const { el } = render();
    const img = el.querySelector('img.qr')!;

    expect(img.getAttribute('src')).toBe('paypal-qr.png');
    expect(img.getAttribute('alt')).toContain('QR code');
  });

  it('ne contient aucun lien vers PayPal', () => {
    const { el } = render();

    expect(el.querySelector('a[href*="paypal"]')).toBeNull();
  });

  it('« Retour aux notes » revient à la liste sans recharger la page', () => {
    const { el, navigateByUrl } = render();

    (el.querySelector('a.back') as HTMLAnchorElement).click();

    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });
});
