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
import { ChecklistItem, LIMITS, Note, NoteDraft } from '../../data/models';
import { encryptText, MIN_PASSPHRASE_LENGTH } from '../../utils/note-crypto';
import { packSecret } from '../../utils/note-secret';
import { NotesStore } from '../../data/notes.store';
import { applyFormat, FormatAction } from '../../utils/markdown';

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
  /** Émis après un enregistrement réussi (et pas à l'annulation), avec la note enregistrée. */
  readonly saved = output<Note>();
  /** Passphrase de la note si elle est déjà déverrouillée : on ne la redemande pas pour la modifier. */
  readonly passphraseHint = input('');
  protected readonly minPassphrase = MIN_PASSPHRASE_LENGTH;
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

  // Chiffrement : la passphrase vit seulement dans ces champs, elle n'est ni enregistrée ni envoyée.
  protected readonly encrypt = linkedSignal(() => this.note()?.encrypted === true);
  protected readonly passphrase = linkedSignal(() => this.passphraseHint());
  protected readonly confirmation = linkedSignal(() => this.passphraseHint());
  protected readonly formError = signal('');

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
    const current = this.note();

    this.saving.set(true);
    this.formError.set('');
    try {
      const draft = this.encrypt() ? await this.encryptedDraft() : this.plainDraft();
      if (!draft) return; // l'erreur est déjà affichée

      const saved = current
        ? await this.store.updateNote(current.id, draft)
        : await this.store.addNote(draft);
      // On ne vide le formulaire que si l'enregistrement a réussi : rien n'est perdu en cas d'échec.
      if (saved) {
        this.reset();
        this.saved.emit(saved);
        this.done.emit();
      }
    } finally {
      this.saving.set(false); // y compris sur erreur, sinon le bouton resterait bloqué
    }
  }

  private plainDraft(): NoteDraft {
    return {
      title: this.title(),
      content: this.content(),
      categoryIds: this.categoryIds(),
      items: this.items(),
    };
  }

  /** Chiffre le texte et les cases dans le navigateur. Null (avec un message) si la saisie ne convient pas. */
  private async encryptedDraft(): Promise<NoteDraft | null> {
    const passphrase = this.passphrase();
    if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
      this.formError.set(`La passphrase doit faire au moins ${MIN_PASSPHRASE_LENGTH} caractères.`);
      return null;
    }
    if (passphrase !== this.confirmation()) {
      this.formError.set('Les deux passphrases sont différentes.');
      return null;
    }
    // Même nettoyage que le store : ici le serveur ne verra plus rien, il ne pourra pas le refaire.
    const content = this.content().trim().slice(0, LIMITS.content);
    const items = this.items()
      .map((i) => ({ ...i, text: i.text.trim().slice(0, LIMITS.item) }))
      .filter((i) => i.text)
      .slice(0, LIMITS.items);
    if (!content && items.length === 0) {
      this.formError.set('Écris un texte ou ajoute une case avant de chiffrer la note.');
      return null;
    }

    try {
      const block = await encryptText(packSecret({ content, items }), passphrase);
      return { title: this.title(), content: block, categoryIds: this.categoryIds(), encrypted: true };
    } catch {
      // crypto.subtle n'existe qu'en HTTPS (ou sur localhost).
      this.formError.set('Le chiffrement n\'est pas disponible sur cette connexion (HTTPS requis).');
      return null;
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
    this.encrypt.set(false);
    this.passphrase.set('');
    this.confirmation.set('');
    this.formError.set('');
  }
}
