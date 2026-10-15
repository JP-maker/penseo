import { ChecklistItem, LIMITS } from '../data/models';
import { InvalidCipherTextError } from './note-crypto';

/** Ce que contient le bloc chiffré d'une note : son texte et ses cases à cocher. */
export interface NoteSecret {
  content: string;
  items: ChecklistItem[];
}

/** Met le texte et les cases d'une note en une seule chaîne, prête à être chiffrée. */
export function packSecret(secret: NoteSecret): string {
  return JSON.stringify({ content: secret.content, items: secret.items });
}

const isItem = (v: unknown): v is ChecklistItem => {
  const i = v as Partial<ChecklistItem> | null;
  return (
    typeof i === 'object' &&
    i !== null &&
    typeof i.id === 'string' &&
    typeof i.text === 'string' &&
    typeof i.done === 'boolean'
  );
};

/**
 * Relit ce que `packSecret` a produit. Le texte déchiffré a été écrit par l'utilisateur,
 * mais on en vérifie la forme avant de l'afficher (une note importée ou modifiée à la main reste une entrée non fiable).
 */
export function unpackSecret(text: string): NoteSecret {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new InvalidCipherTextError();
  }
  const secret = data as Partial<NoteSecret> | null;
  if (
    typeof secret !== 'object' ||
    secret === null ||
    typeof secret.content !== 'string' ||
    !Array.isArray(secret.items) ||
    secret.items.length > LIMITS.items ||
    !secret.items.every(isItem)
  ) {
    throw new InvalidCipherTextError();
  }
  return { content: secret.content, items: secret.items };
}
