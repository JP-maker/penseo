import { TestBed } from '@angular/core/testing';
import { LinkPreviewCard } from './link-preview-card';
import { LinkPreviewService } from '../../data/link-preview.service';
import { LinkPreview } from '../../data/models';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve));

async function render(result: LinkPreview | null) {
  TestBed.configureTestingModule({
    providers: [{ provide: LinkPreviewService, useValue: { get: async () => result } }],
  });
  const fixture = TestBed.createComponent(LinkPreviewCard);
  fixture.componentRef.setInput('url', 'https://exemple.test/page');
  fixture.detectChanges();
  await flush();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('LinkPreviewCard', () => {
  it('affiche le titre en texte, jamais en HTML', async () => {
    const el = await render({
      url: 'https://exemple.test/page',
      title: '<b>Titre</b>',
      description: 'Desc',
      image: null,
    });
    const strong = el.querySelector('strong')!;
    expect(strong.textContent).toBe('<b>Titre</b>');
    expect(strong.querySelector('b')).toBeNull();
    expect(el.textContent).toContain('exemple.test');
  });

  it('ouvre le lien dans un onglet isolé et n’envoie pas de referrer à l’image', async () => {
    const el = await render({
      url: 'https://exemple.test/page',
      title: 'T',
      description: null,
      image: 'https://exemple.test/i.png',
    });
    const link = el.querySelector('a')!;
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(el.querySelector('img')!.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('n’affiche rien si l’aperçu est indisponible', async () => {
    const el = await render(null);
    expect(el.querySelector('a')).toBeNull();
  });
});
