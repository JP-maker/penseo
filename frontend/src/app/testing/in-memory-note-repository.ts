import { Category, Note } from '../notes/data/models';
import { NoteRepository } from '../notes/data/note-repository';

/** Double de test : même contrat que le vrai stockage, sans localStorage. */
export class InMemoryNoteRepository extends NoteRepository {
  notes: Note[] = [];
  categories: Category[] = [];

  async listNotes() { return [...this.notes]; }
  async saveNote(note: Note) { this.notes = [...this.notes.filter((n) => n.id !== note.id), note]; }
  async deleteNote(id: string) { this.notes = this.notes.filter((n) => n.id !== id); }

  async listCategories() { return [...this.categories]; }
  async saveCategory(c: Category) { this.categories = [...this.categories.filter((x) => x.id !== c.id), c]; }
  async deleteCategory(id: string) { this.categories = this.categories.filter((c) => c.id !== id); }
}