import { Category, Note } from './models';

/**
 * Contrat de stockage (principe d'inversion des dépendances) :
 * le store ne connaît que cette classe, jamais le localStorage ni l'API.
 * Toutes les méthodes sont asynchrones car la future implémentation HTTP le sera.
 */
export abstract class NoteRepository {
    abstract listNotes(): Promise<Note[]>;
    abstract saveNote(note: Note): Promise<void>;
    abstract deleteNote(id: string): Promise<void>;

    abstract listCategories(): Promise<Category[]>;
    abstract saveCategory(category: Category): Promise<void>;
    abstract deleteCategory(id: string): Promise<void>;
}

