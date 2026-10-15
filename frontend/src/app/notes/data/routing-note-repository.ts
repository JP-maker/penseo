import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { HttpNoteRepository } from './http-note-repository';
import { LocalNoteRepository } from './local-note-repository';
import { Category, Note } from './models';
import { NoteRepository } from './note-repository';

/** Aiguilleur : serveur si l'utilisateur est connecté, navigateur sinon. Le store n'en sait rien. */
@Injectable()
export class RoutingNoteRepository extends NoteRepository {
  private readonly auth = inject(AuthService);
  private readonly local = inject(LocalNoteRepository);
  private readonly remote = inject(HttpNoteRepository);

  /** Relu à chaque appel : le changement de compte est pris en compte immédiatement. */
  private get target(): NoteRepository {
    return this.auth.user() ? this.remote : this.local;
  }

  listNotes(): Promise<Note[]> {
    return this.target.listNotes();
  }
  saveNote(note: Note): Promise<void> {
    return this.target.saveNote(note);
  }
  deleteNote(id: string): Promise<void> {
    return this.target.deleteNote(id);
  }
  listCategories(): Promise<Category[]> {
    return this.target.listCategories();
  }
  saveCategory(category: Category): Promise<void> {
    return this.target.saveCategory(category);
  }
  deleteCategory(id: string): Promise<void> {
    return this.target.deleteCategory(id);
  }
}
