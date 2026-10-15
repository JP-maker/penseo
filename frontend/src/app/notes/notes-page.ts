import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { AuthForm } from '../auth/auth-form';
import { AuthService } from '../auth/auth.service';
import { ErrorNotifier } from '../error-notifier';
import { LoadingState } from '../loading';
import { firstUrl } from './first-url';
import { LinkPreviewCard } from './link-preview-card';
import { Category, COLORS, DEFAULT_COLOR, LIMITS, Note } from './models';
import { NoteForm } from './note-form';
import { NotesStore } from './notes.store';
import { MarkdownView } from './markdown-view';
import { EXCERPT, truncateText } from './note-excerpt';
import { matchesQuery } from './note-search';

/** Page principale : en-tête et connexion, formulaire, filtres par catégorie, liste des notes. */
@Component({
  selector: 'app-notes-page',
  imports: [NoteForm, LinkPreviewCard, AuthForm, MarkdownView],
  templateUrl: './notes-page.html',
  styleUrl: './notes-page.scss',
})
export class NotesPage {
  protected readonly store = inject(NotesStore);
  protected readonly auth = inject(AuthService);
  protected readonly notifier = inject(ErrorNotifier);
  protected readonly loading = inject(LoadingState);
  protected readonly limits = LIMITS;
  protected readonly firstUrl = firstUrl;
  protected readonly colors = COLORS;

  /** Couleur choisie pour la prochaine catégorie créée. */
  protected readonly newColor = signal<string>(DEFAULT_COLOR);

  // shortcut: instantané de la note au moment du clic ; une case cochée dans la liste pendant
  // l'édition serait écrasée à l'enregistrement. À corriger si ça gêne à l'usage.
  protected readonly editing = signal<Note | null>(null);
  protected readonly showAuth = signal(false);

  /** Notes dépliées par l'utilisateur (« Voir plus »). */
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());

  /** Texte tapé dans la recherche. */
  protected readonly query = signal('');

  /** Notes du filtre de catégorie, restreintes à celles qui correspondent à la recherche. */
  protected readonly visibleNotes = computed(() => {
    const query = this.query();
    return this.store
      .notes()
      .filter((n) => matchesQuery(n, this.noteCategories(n).map((c) => c.name), query));
  });

  /** Feuille de création / modification (élément <dialog> natif : focus piégé, Échap, fond grisé). */
  private readonly sheet = viewChild<ElementRef<HTMLDialogElement>>('sheet');
  /** Feuille de création d'une catégorie. */
  private readonly catSheet = viewChild<ElementRef<HTMLDialogElement>>('catSheet');

  constructor() {
    // Charge les notes au démarrage, puis à chaque connexion ou déconnexion (le dépôt change :
    // navigateur <-> serveur). Une édition en cours est abandonnée, pour ne rien garder d'un autre compte.
    effect(() => {
      this.auth.user();
      untracked(() => {
        this.closeForm();
        void this.store.init();
      });
    });
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected noteCategories(note: Note): Category[] {
    return this.store.categories().filter((c) => note.categoryIds.includes(c.id));
  }

  protected isExpanded(note: Note): boolean {
    return this.expanded().has(note.id);
  }

  protected toggleExpanded(id: string): void {
    this.expanded.update((ids) => {
      const next = new Set(ids);
      if (!next.delete(id)) next.add(id); // delete renvoie false si l'id n'y était pas : on l'ajoute alors
      return next;
    });
  }

  /** Vrai si l'aperçu cache quelque chose : le bouton « Voir plus » n'apparaît que dans ce cas. */
  protected isLong(note: Note): boolean {
    return note.content.length > EXCERPT.chars || note.items.length > EXCERPT.items;
  }

  protected excerpt(note: Note): string {
    return this.isExpanded(note) ? note.content : truncateText(note.content, EXCERPT.chars);
  }

  protected visibleItems(note: Note) {
    return this.isExpanded(note) ? note.items : note.items.slice(0, EXCERPT.items);
  }

  /** Ouvre la feuille : note à modifier, ou null pour en créer une. */
  protected openForm(note: Note | null): void {
    this.editing.set(note);
    this.show(this.sheet()?.nativeElement);
  }

  /** Ferme la feuille et abandonne l'édition en cours. */
  protected closeForm(): void {
    this.editing.set(null);
    this.hide(this.sheet()?.nativeElement);
  }

  protected openCategoryForm(): void {
    this.show(this.catSheet()?.nativeElement);
  }

  protected closeCategoryForm(): void {
    this.hide(this.catSheet()?.nativeElement);
  }

  private show(dialog?: HTMLDialogElement): void {
    if (!dialog || dialog.open) return;
    // shortcut: showModal absent de certains environnements de test (jsdom) : repli sur l'attribut.
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  private hide(dialog?: HTMLDialogElement): void {
    if (!dialog?.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  protected async onDelete(id: string): Promise<void> {
    if (this.editing()?.id === id) this.closeForm();
    await this.store.deleteNote(id);
  }

  protected async onAddCategory(event: Event, input: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (await this.store.addCategory(input.value, this.newColor())) {
      input.value = '';
      this.closeCategoryForm();
    }
  }
}