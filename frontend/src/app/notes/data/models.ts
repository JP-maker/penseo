/** Couleurs proposées pour la pastille d'une catégorie. */
export const COLORS = [
  { value: '#0098ff', label: 'Bleu' },
  { value: '#2ecc71', label: 'Vert' },
  { value: '#f1c40f', label: 'Jaune' },
  { value: '#e67e22', label: 'Orange' },
  { value: '#e74c3c', label: 'Rouge' },
  { value: '#9b59b6', label: 'Violet' },
  { value: '#e84393', label: 'Rose' },
  { value: '#7f8c8d', label: 'Gris' },
] as const;
export const DEFAULT_COLOR: string = COLORS[0].value;

/** Catégorie créée par l'utilisateur pour classer ses notes. */
export interface Category {
  id: string;
  name: string;
  color: string; // hexadécimal #rrggbb, vérifié par isCategory
}

/** Une case à cocher d'une checklist. */
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

/** Note. Les dates sont en ISO 8601 (texte) pour être sérialisables en JSON telles quelles. */
export interface Note {
  id: string;
  title: string;
  content: string;
  items: ChecklistItem[]; // vide = note de texte simple
  categoryIds: string[]; // vide = sans catégorie
  /**
   * Vrai si `content` est un bloc chiffré dans le navigateur (voir note-crypto.ts) : le texte ET les cases
   * à cocher y sont enfermés, `items` reste alors vide. Absent = false (notes enregistrées avant cette option).
   */
  encrypted?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Aperçu d'une page web, calculé par le serveur ; jamais stocké dans la note. */
export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
}

/** Ce que l'utilisateur saisit : le reste (id, dates) est généré par le store. */
export type NoteDraft = Pick<Note, 'title' | 'content' | 'categoryIds' | 'encrypted'> & {
  items?: ChecklistItem[];
};

/** Limites de saisie, partagées entre l'interface et le store (le serveur les rejoue). */
export const LIMITS = {
  title: 200,
  content: 10_000,
  /** Taille maximale du bloc chiffré : le texte et les cases, en JSON, puis en base64 (environ 4/3). */
  encryptedContent: 250_000,
  categoryName: 50,
  item: 200,
  items: 100,
  categoriesPerNote: 20,
} as const;

// --- Gardes de type -------------------------------------------------------
// Le localStorage est modifiable par n'importe qui depuis la console du navigateur :
// ce qu'on y relit est une entrée non fiable, on en vérifie donc la forme (OWASP : validation des entrées).

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

// La couleur finit dans un style CSS : on n'accepte que #rrggbb.
const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

export const isCategory = (v: unknown): v is Category =>
  isRecord(v) && typeof v['id'] === 'string' && typeof v['name'] === 'string' && isHex(v['color']);

const isChecklistItem = (v: unknown): v is ChecklistItem =>
  isRecord(v) &&
  typeof v['id'] === 'string' &&
  typeof v['text'] === 'string' &&
  typeof v['done'] === 'boolean';

export const isNote = (v: unknown): v is Note =>
  isRecord(v) &&
  typeof v['id'] === 'string' &&
  typeof v['title'] === 'string' &&
  typeof v['content'] === 'string' &&
  Array.isArray(v['items']) &&
  v['items'].every(isChecklistItem) &&
  Array.isArray(v['categoryIds']) &&
  v['categoryIds'].every((id) => typeof id === 'string') &&
  (v['encrypted'] === undefined || typeof v['encrypted'] === 'boolean') &&
  typeof v['createdAt'] === 'string' &&
  typeof v['updatedAt'] === 'string';

/**
 * Remet au format actuel des données enregistrées par une version précédente de Penséo :
 * une note avec `categoryId` devient `categoryIds`, une catégorie sans couleur prend la couleur par défaut.
 */
export function upgradeLegacy(v: unknown): unknown {
  if (!isRecord(v)) return v;
  const upgraded = { ...v };
  if ('categoryId' in upgraded && !('categoryIds' in upgraded)) {
    upgraded['categoryIds'] =
      typeof upgraded['categoryId'] === 'string' ? [upgraded['categoryId']] : [];
    delete upgraded['categoryId'];
  }
  if (typeof upgraded['name'] === 'string' && !('color' in upgraded))
    upgraded['color'] = DEFAULT_COLOR;
  return upgraded;
}
