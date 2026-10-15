import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Category, Note } from './models';
import { NoteRepository } from './note-repository';

/** Stockage sur le serveur (mode connecté). Les URLs sont relatives : le proxy les envoie à Laravel. */
@Injectable({ providedIn: 'root' })
export class HttpNoteRepository extends NoteRepository {
  private readonly http = inject(HttpClient);

  listNotes(): Promise<Note[]> {
    return firstValueFrom(this.http.get<Note[]>('/api/notes'));
  }

  async saveNote(note: Note): Promise<void> {
    // id et updatedAt sont gérés par le serveur ; createdAt n'est repris qu'à la création (import).
    const { title, content, items, categoryIds, createdAt } = note;
    await firstValueFrom(
      this.http.put(this.url('notes', note.id), {
        title,
        content,
        items,
        categoryIds,
        encrypted: note.encrypted === true,
        createdAt,
      }),
    );
  }

  async deleteNote(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(this.url('notes', id)));
  }

  listCategories(): Promise<Category[]> {
    return firstValueFrom(this.http.get<Category[]>('/api/categories'));
  }

  async saveCategory(category: Category): Promise<void> {
    await firstValueFrom(
      this.http.put(this.url('categories', category.id), {
        name: category.name,
        color: category.color,
      }),
    );
  }

  async deleteCategory(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(this.url('categories', id)));
  }

  /** L'id peut venir du localStorage (modifiable) : on l'encode pour qu'il reste un simple segment d'URL. */
  private url(resource: 'notes' | 'categories', id: string): string {
    return `/api/${resource}/${encodeURIComponent(id)}`;
  }
}
