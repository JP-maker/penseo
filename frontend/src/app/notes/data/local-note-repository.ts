import { Injectable } from '@angular/core';
import { NoteRepository } from './note-repository';
import { Category, isCategory, isNote, Note, upgradeLegacy } from './models';

const KEYS = {
  notes: 'penseo.notes',
  categories: 'penseo.categories',
} as const;

/** Stockage dans le navigateur (mode par défaut sans compte) */
@Injectable({ providedIn: 'root' })
export class LocalNoteRepository extends NoteRepository {
  async listNotes(): Promise<Note[]> {
    return this.read(KEYS.notes, isNote);
  }

  async saveNote(note: Note): Promise<void> {
    this.upsert(KEYS.notes, note, isNote);
  }

  async deleteNote(id: string): Promise<void> {
    this.remove(KEYS.notes, id, isNote);
  }

  async listCategories(): Promise<Category[]> {
    return this.read(KEYS.categories, isCategory);
  }

  async saveCategory(category: Category): Promise<void> {
    this.upsert(KEYS.categories, category, isCategory);
  }

  async deleteCategory(id: string): Promise<void> {
    this.remove(KEYS.categories, id, isCategory);
  }

  /** Relit une liste : un JSON corrompu ou des entrées invalides sont ignorées */
  private read<T>(key: string, guard: (value: unknown) => value is T): T[] {
    try {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(upgradeLegacy).filter(guard) : [];
    } catch (e) {
      console.error(`Erreur de lecture du localStorage pour la clé ${key}`, e);
      return [];
    }
  }

  private upsert<T extends { id: string }>(
    key: string,
    item: T,
    guard: (value: unknown) => value is T,
  ): void {
    const others = this.read(key, guard).filter((i) => i.id !== item.id);
    this.write(key, [...others, item]);
  }

  private remove<T extends { id: string }>(
    key: string,
    id: string,
    guard: (value: unknown) => value is T,
  ): void {
    this.write(
      key,
      this.read(key, guard).filter((i) => i.id !== id),
    );
  }

  private write<T>(key: string, items: unknown[]): void {
    localStorage.setItem(key, JSON.stringify(items));
  }
}
