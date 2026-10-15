import { inject, Injectable } from '@angular/core';
import { HttpNoteRepository } from './http-note-repository';
import { LocalNoteRepository } from './local-note-repository';

/** Déplace les notes du navigateur vers le compte, à la connexion. */
@Injectable({ providedIn: 'root' })
export class LocalImportService {
  private readonly local = inject(LocalNoteRepository);
  private readonly remote = inject(HttpNoteRepository);

  /** Retourne le nombre de notes importées. Lève une erreur si l'import échoue : le navigateur reste alors intact. */
  async run(): Promise<number> {
    const [categories, notes] = await Promise.all([
      this.local.listCategories(),
      this.local.listNotes(),
    ]);

    // Les catégories d'abord : les notes y font référence.
    for (const category of categories) await this.remote.saveCategory(category);
    for (const note of notes) await this.remote.saveNote(note);

    // On n'efface qu'après le succès complet. Le serveur fait un "créer ou remplacer" par id :
    // un import interrompu se rejoue donc sans créer de doublons.
    for (const note of notes) await this.local.deleteNote(note.id);
    for (const category of categories) await this.local.deleteCategory(category.id);
    return notes.length;
  }
}
