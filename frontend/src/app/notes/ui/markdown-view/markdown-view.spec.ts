import { TestBed } from '@angular/core/testing';
import { MarkdownView } from './markdown-view';

function render(source: string): HTMLElement {
  const fixture = TestBed.createComponent(MarkdownView);
  fixture.componentRef.setInput('source', source);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('MarkdownView', () => {
  it('affiche gras, italique, barré et code', () => {
    const el = render('**g** *i* ~~s~~ `c`');
    expect(el.querySelector('.b')?.textContent).toBe('g');
    expect(el.querySelector('.i')?.textContent).toBe('i');
    expect(el.querySelector('.s')?.textContent).toBe('s');
    expect(el.querySelector('code')?.textContent).toBe('c');
  });

  it('n’interprète jamais le HTML saisi', () => {
    const el = render('<img src=x onerror=alert(1)> <script>alert(1)</script>');
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('script')).toBeNull();
    expect(el.textContent).toContain('<img');
  });

  it('ouvre les liens dans un onglet isolé et refuse javascript:', () => {
    const el = render('[Angular](https://angular.dev)');
    const link = el.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('https://angular.dev');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');

    expect(render('[x](javascript:alert(1))').querySelector('a')).toBeNull();
  });

  it('affiche titres et listes', () => {
    const el = render('# T\n- a\n- b\n1. x');
    expect(el.querySelector('h4.md-h1')?.textContent?.trim()).toBe('T');
    expect(el.querySelectorAll('ul li').length).toBe(2);
    expect(el.querySelectorAll('ol li').length).toBe(1);
  });
});
