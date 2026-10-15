import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { ChecklistItem, LIMITS, Note } from './models';
import { NotesStore } from './notes.store';
import { applyFormat, FormatAction } from './markdown';

/** Formulaire de note : crée une note, ou modifie celle reçue dans `note`. */
@Component({
  selector: 'app-note-form',
  templateUrl: './note-form.html',
  styleUrl: './note-form.scss',
})
export class NoteForm {
  protected readonly store = inject(NotesStore);
  protected readonly limits = LIMITS;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Note à modifier ; null = création. */
  readonly note = input<Note | null>(null);
  /** Émis quand la note est enregistrée, ou quand on annule. */
  readonly done = output<void>();
  protected readonly saving = signal(false);
  protected readonly tools: { action: FormatAction; label: string; text: string }[] = [
    { action: 'bold', label: 'Gras', text: 'B' },
    { action: 'italic', label: 'Italique', text: 'I' },
    { action: 'strike', label: 'Barré', text: 'S' },
    { action: 'heading', label: 'Titre', text: 'T' },
    { action: 'bullet', label: 'Liste à puces', text: '•' },
    { action: 'numbered', label: 'Liste numérotée', text: '1.' },
    { action: 'link', label: 'Lien', text: 'Lien' },
    { action: 'code', label: 'Code', text: '</>' },
  ];

  // linkedSignal : repart de la note reçue chaque fois que `note` change (entrée ou sortie du mode édition).
  protected readonly title = linkedSignal(() => this.note()?.title ?? '');
  protected readonly content = linkedSignal(() => this.note()?.content ?? '');
  protected readonly categoryIds = linkedSignal<string[]>(() => this.note()?.categoryIds ?? []);
  protected readonly items = linkedSignal<ChecklistItem[]>(() => this.note()?.items ?? []);

  protected valueOf(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  /** Coche ou décoche une catégorie ; la note peut en avoir plusieurs. */
  protected toggleCategory(id: string): void {
    this.categoryIds.update((ids) =>
      ids.includes(id) ? ids.filter((c) => c !== id) : [...ids, id],
    );
  }

  /** Applique une mise en forme à la sélection du champ texte, puis redonne le focus au champ. */
  protected format(box: HTMLTextAreaElement, action: FormatAction): void {
    const result = applyFormat(
      { text: box.value, start: box.selectionStart, end: box.selectionEnd },
      action,
    );
    if (result.text.length > LIMITS.content) return; // les marqueurs ne doivent pas dépasser la limite
    this.content.set(result.text);
    // La sélection ne peut être rétablie qu'une fois le champ remis à jour par Angular.
    afterNextRender(
      () => {
        box.focus();
        box.setSelectionRange(result.start, result.end);
      },
      { injector: this.injector },
    );
  }

  protected addItem(): void {
    if (this.items().length >= LIMITS.items) return;
    this.items.update((list) => [...list, { id: crypto.randomUUID(), text: '', done: false }]);
  }

  /** Entrée dans une case : insère une case vide juste après et lui donne le focus. */
  protected onItemEnter(event: Event, afterId: string): void {
    // Pendant une composition (clavier IME), Entrée valide le caractère : on n'y touche pas.
    if ((event as KeyboardEvent).isComposing) return;
    event.preventDefault(); // sinon Entrée enverrait tout le formulaire

    const list = this.items();
    const index = list.findIndex((i) => i.id === afterId);
    // Pas de case vide en cascade, et on respecte la limite.
    if (index === -1 || !list[index].text.trim() || list.length >= LIMITS.items) return;

    const created: ChecklistItem = { id: crypto.randomUUID(), text: '', done: false };
    this.items.set([...list.slice(0, index + 1), created, ...list.slice(index + 1)]);

    // Le focus ne peut se poser qu'une fois la nouvelle case rendue dans le DOM.
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLInputElement>(`[data-item-id="${created.id}"]`)
          ?.focus(),
      { injector: this.injector },
    );
  }

  protected setItemText(id: string, text: string): void {
    this.items.update((list) => list.map((i) => (i.id === id ? { ...i, text } : i)));
  }

  protected toggleItem(id: string): void {
    this.items.update((list) => list.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  protected removeItem(id: string): void {
    this.items.update((list) => list.filter((i) => i.id !== id));
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving()) return; // un second clic pendant l'attente créerait une note en double
    const draft = {
      title: this.title(),
      content: this.content(),
      categoryIds: this.categoryIds(),
      items: this.items(),
    };
    const current = this.note();

    this.saving.set(true);
    try {
      const saved = current
        ? await this.store.updateNote(current.id, draft)
        : await this.store.addNote(draft);
      // On ne vide le formulaire que si l'enregistrement a réussi : rien n'est perdu en cas d'échec.
      if (saved) {
        this.reset();
        this.done.emit();
      }
    } finally {
      this.saving.set(false); // y compris sur erreur, sinon le bouton resterait bloqué
    }
  }

  protected cancel(): void {
    this.reset();
    this.done.emit();
  }

  private reset(): void {
    this.title.set('');
    this.content.set('');
    this.categoryIds.set([]);
    this.items.set([]);
  }
}
