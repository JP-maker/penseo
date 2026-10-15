import { TestBed } from '@angular/core/testing';
import { InMemoryNoteRepository } from '../testing/in-memory-note-repository';
import { NoteRepository } from './note-repository';
import { NotesPage } from './notes-page';
import { LoadingState } from '../loading';
import { NotesStore } from './notes.store';

// Laisse les promesses du store se terminer avant de relire le DOM.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve));

async function setup() {
  TestBed.configureTestingModule({
    imports: [NotesPage],
    providers: [{ provide: NoteRepository, useClass: InMemoryNoteRepository }],
  });
  const fixture = TestBed.createComponent(NotesPage);
  fixture.detectChanges();
  await flush();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('NotesPage', () => {
  it('affiche une note en texte, jamais en HTML', async () => {
    const { fixture, el } = await setup();

    type(el.querySelector('input[name="title"]')!, '<b>Courses</b>');
    el.querySelector('form.composer')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await flush();
    fixture.detectChanges();

    const title = el.querySelector('article h3')!;
    expect(title.textContent).toContain('<b>Courses</b>'); // affiché tel quel : le HTML est neutralisé
    expect(title.querySelector('b')).toBeNull();
  });

  it('crée une checklist et coche une case', async () => {
    const { fixture, el } = await setup();

    // Les champs de la feuille ne peuvent prendre le focus que si elle est ouverte.
    (el.querySelector('.fab') as HTMLButtonElement).click();
    fixture.detectChanges();

    (el.querySelector('.add-item') as HTMLButtonElement).click();
    fixture.detectChanges();
    type(el.querySelector('.item-text')!, 'Lait');
    el.querySelector('form.composer')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await flush();
    fixture.detectChanges();

    const box = el.querySelector('article input[type="checkbox"]') as HTMLInputElement;
    expect(box.checked).toBe(false);

    box.click();
    await flush();
    fixture.detectChanges();

    expect((el.querySelector('article input[type="checkbox"]') as HTMLInputElement).checked).toBe(
      true,
    );
    expect(el.querySelector('article .done')?.textContent).toContain('Lait');
  });

  it('Entrée crée la case suivante, une seule si la case courante est vide', async () => {
    const { fixture, el } = await setup();
    const enter = () =>
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    const fields = () => el.querySelectorAll<HTMLInputElement>('.item-text');

    // Les champs de la feuille ne peuvent prendre le focus que si elle est ouverte.
    (el.querySelector('.fab') as HTMLButtonElement).click();
    fixture.detectChanges();

    (el.querySelector('.add-item') as HTMLButtonElement).click();
    fixture.detectChanges();
    type(fields()[0], 'Lait');
    fields()[0].dispatchEvent(enter());
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fields().length).toBe(2);
    expect(document.activeElement).toBe(fields()[1]);

    // Entrée sur une case vide : rien de plus n'est créé.
    fields()[1].dispatchEvent(enter());
    fixture.detectChanges();
    expect(fields().length).toBe(2);
  });

  it('affiche la barre et « Chargement… » tant qu’une requête est en cours', async () => {
    const { fixture, el } = await setup();
    TestBed.inject(LoadingState).start();
    fixture.detectChanges();

    expect(el.querySelector('.progress')).not.toBeNull();
    expect(el.querySelector('.empty')?.textContent).toContain('Chargement');
  });

  it('associe plusieurs catégories à une note et les affiche avec leur pastille', async () => {
    const { fixture, el } = await setup();
    const store = TestBed.inject(NotesStore);
    await store.addCategory('Travail', '#e74c3c');
    await store.addCategory('Perso', '#2ecc71');
    fixture.detectChanges();

    type(el.querySelector('input[name="title"]')!, 'Idée');
    el.querySelectorAll<HTMLInputElement>('.cat-choice input').forEach((box) => box.click());
    fixture.detectChanges();
    el.querySelector('form.composer')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await flush();
    fixture.detectChanges();

    expect(el.querySelectorAll('article .tag').length).toBe(2);
    expect(el.querySelector('article .dot')).not.toBeNull();
  });
  it('affiche le nombre de notes sur chaque filtre', async () => {
    const { fixture, el } = await setup();
    const store = TestBed.inject(NotesStore);
    const work = await store.addCategory('Travail');
    await store.addNote({ title: 'A', content: '', categoryIds: [work!.id] });
    await store.addNote({ title: 'B', content: '', categoryIds: [] });
    fixture.detectChanges();

    const counts = Array.from(el.querySelectorAll('.chip .count')).map((c) =>
      c.textContent?.trim(),
    );
    expect(counts).toEqual(['2', '1']); // « Toutes » puis « Travail »
  });
  it('la barre de mise en forme entoure la sélection et la carte affiche le résultat', async () => {
    const { fixture, el } = await setup();
    const box = el.querySelector<HTMLTextAreaElement>('textarea[name="content"]')!;
    box.value = 'un mot';
    box.dispatchEvent(new Event('input'));
    box.setSelectionRange(3, 6);

    el.querySelector<HTMLButtonElement>('.tool-bold')!.click();
    fixture.detectChanges();
    expect(box.value).toBe('un **mot**');

    el.querySelector('form.composer')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await flush();
    fixture.detectChanges();

    expect(el.querySelector('article .b')?.textContent).toBe('mot');
  });

  it('n’affiche que 200 caractères et 10 cases, puis tout avec « Voir plus »', async () => {
    const { fixture, el } = await setup();
    await TestBed.inject(NotesStore).addNote({
      title: '',
      content: 'x'.repeat(250),
      categoryIds: [],
      items: Array.from({ length: 12 }, (_, i) => ({
        id: `i${i}`,
        text: `élément ${i}`,
        done: false,
      })),
    });
    fixture.detectChanges();

    expect(el.querySelectorAll('article .checklist li').length).toBe(10);
    expect(el.querySelector('article app-markdown')?.textContent?.trim()).toBe(
      'x'.repeat(200) + '…',
    );
    expect(el.querySelector('article .more')?.textContent?.trim()).toBe('Voir plus');

    el.querySelector<HTMLButtonElement>('article .more')!.click();
    fixture.detectChanges();

    expect(el.querySelectorAll('article .checklist li').length).toBe(12);
    expect(el.querySelector('article app-markdown')?.textContent?.trim()).toBe('x'.repeat(250));
    expect(el.querySelector('article .more')?.textContent?.trim()).toBe('Voir moins');
  });

  it('n’affiche pas « Voir plus » sur une note courte', async () => {
    const { fixture, el } = await setup();
    await TestBed.inject(NotesStore).addNote({
      title: 'Courte',
      content: 'Quelques mots',
      categoryIds: [],
      items: Array.from({ length: 10 }, (_, i) => ({
        id: `i${i}`,
        text: `élément ${i}`,
        done: false,
      })),
    });
    fixture.detectChanges();

    expect(el.querySelectorAll('article .checklist li').length).toBe(10);
    expect(el.querySelector('article .more')).toBeNull();
  });
  /** Ordre des éléments d'une carte, en ne gardant que titre, catégories et texte. */
  const order = (article: Element) =>
    Array.from(article.children)
      .map((c) =>
        c.tagName === 'H3'
          ? 'titre'
          : c.classList.contains('tags')
            ? 'categories'
            : c.tagName === 'APP-MARKDOWN'
              ? 'texte'
              : '',
      )
      .filter(Boolean);

  it('affiche le titre, puis les catégories, puis le texte', async () => {
    const { fixture, el } = await setup();
    const store = TestBed.inject(NotesStore);
    const work = await store.addCategory('Travail');
    await store.addNote({ title: 'Idée', content: 'du texte', categoryIds: [work!.id] });
    fixture.detectChanges();

    expect(order(el.querySelector('article')!)).toEqual(['titre', 'categories', 'texte']);
    expect(el.querySelector('article .tags .tag')?.textContent?.trim()).toBe('Travail');
    expect(el.querySelector('article footer .tag')).toBeNull();
  });

  it('sans titre, les catégories restent avant le texte ; sans catégorie, pas de ligne vide', async () => {
    const { fixture, el } = await setup();
    const store = TestBed.inject(NotesStore);
    const work = await store.addCategory('Travail');
    await store.addNote({ title: '', content: 'avec catégorie', categoryIds: [work!.id] });
    await store.addNote({ title: '', content: 'sans catégorie', categoryIds: [] });
    fixture.detectChanges();

    const [recent, older] = Array.from(el.querySelectorAll('article'));
    expect(order(recent)).toEqual(['texte']); // la note sans catégorie : texte seul
    expect(recent.querySelector('.tags')).toBeNull();
    expect(order(older)).toEqual(['categories', 'texte']);
  });
});
