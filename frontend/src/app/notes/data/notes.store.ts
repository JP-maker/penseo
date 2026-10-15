import { computed, inject, Injectable, signal } from '@angular/core';
import { Category, COLORS, DEFAULT_COLOR, LIMITS, Note, NoteDraft } from './models';
import { NoteRepository } from './note-repository';

/** Partie d'une note qui vient de la saisie, une fois nettoyée. */
type CleanDraft = Pick<Note, 'title' | 'content' | 'categoryIds' | 'items'> & { encrypted: boolean };

/** État de l'application (signals) + règles métier. Ne sait pas où les données sont stockées. */
@Injectable({ providedIn: 'root' })
export class NotesStore {
  private readonly repo = inject(NoteRepository);

  private readonly _notes = signal<Note[]>([]);
  private readonly _categories = signal<Category[]>([]);
  private readonly _selectedCategoryId = signal<string | null>(null); // null = toutes

  readonly categories = this._categories.asReadonly();
  readonly selectedCategoryId = this._selectedCategoryId.asReadonly();

  /** Enregistrements en cours, par note : un seul à la fois pour chaque note, dans l'ordre. */
  private readonly saving = new Map<string, Promise<void>>();
  /** Notes modifiées pendant qu'un enregistrement était en cours : elles sont renvoyées juste après. */
  private readonly stale = new Set<string>();

  /** Notes affichées : une note à plusieurs catégories apparaît dans chacune d'elles. */
  readonly notes = computed(() => {
    const selected = this._selectedCategoryId();
    const all = this._notes();
    return selected === null ? all : all.filter((n) => n.categoryIds.includes(selected));
  });

  /** Nombre de notes par catégorie, sur toutes les notes (pas seulement celles affichées par le filtre). */
  readonly counts = computed(() => {
    const counts = new Map<string, number>();
    for (const note of this._notes()) {
      for (const id of note.categoryIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  });

  readonly total = computed(() => this._notes().length);

  async init(): Promise<void> {
    const [notes, categories] = await Promise.all([
      this.repo.listNotes(),
      this.repo.listCategories(),
    ]);
    this._notes.set(this.newestFirst(notes));
    this._categories.set(categories);
    this._selectedCategoryId.set(null); // le filtre d'un autre compte n'aurait plus de sens
  }

  selectCategory(id: string | null): void {
    this._selectedCategoryId.set(id);
  }

  /** Retourne la note créée, ou null si la saisie est vide. */
  async addNote(draft: NoteDraft): Promise<Note | null> {
    const clean = this.sanitize(draft);
    if (!clean) return null;

    const now = new Date().toISOString();
    const note: Note = { id: crypto.randomUUID(), ...clean, createdAt: now, updatedAt: now };
    await this.repo.saveNote(note); // si le stockage échoue, on s'arrête ici : l'écran ne ment pas
    this._notes.update((list) => [note, ...list]);
    return note;
  }

  /** Remplace le contenu d'une note. Null si la note n'existe plus ou si la saisie est vide. */
  async updateNote(id: string, draft: NoteDraft): Promise<Note | null> {
    const current = this._notes().find((n) => n.id === id);
    const clean = this.sanitize(draft);
    if (!current || !clean) return null;

    const note: Note = { ...current, ...clean, updatedAt: new Date().toISOString() };
    await this.repo.saveNote(note);
    this.replace(note);
    return note;
  }

  /** Coche ou décoche une case : l'écran change tout de suite, l'enregistrement suit en arrière-plan. */
  async toggleItem(noteId: string, itemId: string): Promise<void> {
    const current = this._notes().find((n) => n.id === noteId);
    if (!current) return;

    // Lue juste avant la modification : un second clic part donc de l'état déjà mis à jour par le premier.
    this.replace({
      ...current,
      items: current.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)),
      updatedAt: new Date().toISOString(),
    });

    try {
      await this.persist(noteId);
    } catch (error) {
      await this.resync(noteId); // l'écran ne doit pas montrer une case que le serveur n'a pas enregistrée
      throw error; // le gestionnaire d'erreurs global affiche le bandeau
    }
  }

  async deleteNote(id: string): Promise<void> {
    await this.repo.deleteNote(id);
    this._notes.update((list) => list.filter((n) => n.id !== id));
  }

  /**
   * Retourne la catégorie créée (ou celle qui existe déjà avec ce nom), ou null si le nom est vide.
   * Une couleur hors palette est ramenée à la couleur par défaut.
   */
  async addCategory(rawName: string, color: string = DEFAULT_COLOR): Promise<Category | null> {
    const name = rawName.trim().slice(0, LIMITS.categoryName);
    if (!name) return null;

    const existing = this._categories().find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;

    const category: Category = {
      id: crypto.randomUUID(),
      name,
      color: COLORS.some((c) => c.value === color) ? color : DEFAULT_COLOR,
    };
    await this.repo.saveCategory(category);
    this._categories.update((list) => [...list, category]);
    return category;
  }

  /** Supprime la catégorie ; ses notes sont conservées (elles perdent juste cette catégorie). */
  async deleteCategory(id: string): Promise<void> {
    const without = (n: Note): Note => ({
      ...n,
      categoryIds: n.categoryIds.filter((c) => c !== id),
    });

    const affected = this._notes()
      .filter((n) => n.categoryIds.includes(id))
      .map(without);
    await Promise.all(affected.map((n) => this.repo.saveNote(n)));
    await this.repo.deleteCategory(id);

    this._notes.update((list) => list.map((n) => (n.categoryIds.includes(id) ? without(n) : n)));
    this._categories.update((list) => list.filter((c) => c.id !== id));
    if (this._selectedCategoryId() === id) this._selectedCategoryId.set(null);
  }

  /** Nettoie la saisie (espaces, longueurs, cases vides, catégories inconnues). Null si la note serait vide. */
  private sanitize(draft: NoteDraft): CleanDraft | null {
    const title = draft.title.trim().slice(0, LIMITS.title);
    const encrypted = draft.encrypted === true;
    // Un bloc chiffré est opaque : on ne le raccourcit pas comme un texte (il deviendrait indéchiffrable).
    // La limite est large exprès ; le formulaire garantit qu'un texte permis ne la dépasse pas une fois chiffré.
    const content = draft.content
      .trim()
      .slice(0, encrypted ? LIMITS.encryptedContent : LIMITS.content);
    // Les cases d'une note chiffrée sont dans le bloc : en clair à côté, elles annuleraient le chiffrement.
    const items = encrypted
      ? []
      : (draft.items ?? [])
          .map((i) => ({ id: i.id, text: i.text.trim().slice(0, LIMITS.item), done: i.done }))
          .filter((i) => i.text)
          .slice(0, LIMITS.items);
    if (!title && !content && items.length === 0) return null;

    // Sans doublon, et seulement des catégories qui existent.
    const known = new Set(this._categories().map((c) => c.id));
    const categoryIds = [...new Set(draft.categoryIds)]
      .filter((id) => known.has(id))
      .slice(0, LIMITS.categoriesPerNote);
    return { title, content, items, categoryIds, encrypted };
  }

  private replace(note: Note): void {
    this._notes.update((list) => list.map((n) => (n.id === note.id ? note : n)));
  }

  /**
   * Enregistre la version la plus récente d'une note, une requête à la fois par note.
   * Les modifications faites pendant l'attente sont regroupées dans une seule requête de rattrapage.
   */
  private persist(id: string): Promise<void> {
    const running = this.saving.get(id);
    if (running) {
      this.stale.add(id);
      return running; // l'appelant attend aussi la requête de rattrapage
    }
    const run = this.drain(id);
    this.saving.set(id, run);
    return run;
  }

  private async drain(id: string): Promise<void> {
    await Promise.resolve(); // suspend d'abord : persist() enregistre la promesse avant la fin de drain()
    try {
      do {
        this.stale.delete(id);
        const note = this._notes().find((n) => n.id === id);
        if (!note) return; // supprimée entre-temps
        await this.repo.saveNote(note);
      } while (this.stale.has(id));
    } finally {
      // Dans la même étape que le dernier test de la boucle : aucune modification ne peut se perdre entre les deux.
      this.saving.delete(id);
    }
  }

  /** Après un échec : remet à l'écran la version réellement enregistrée de cette note (et d'elle seule). */
  private async resync(id: string): Promise<void> {
    try {
      const saved = (await this.repo.listNotes()).find((n) => n.id === id);
      if (saved) this.replace(saved);
    } catch {
      // Dépôt injoignable : l'écran garde la modification, et le bandeau d'erreur prévient l'utilisateur.
    }
  }

  /** Plus récentes d'abord (les dates ISO se comparent comme du texte). */
  private newestFirst(notes: Note[]): Note[] {
    return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
