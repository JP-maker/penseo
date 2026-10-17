/**
 * Chiffrement d'une note dans le navigateur : AES-256-GCM, clé dérivée de la passphrase par PBKDF2.
 * La passphrase n'est ni stockée ni envoyée : le serveur ne reçoit que le texte chiffré.
 *
 * Format du texte chiffré (une seule chaîne, donc stockable comme n'importe quel texte) :
 *   v1.<itérations>.<sel>.<vecteur d'initialisation>.<données chiffrées>   (parties en base64)
 * Les paramètres sont dans la chaîne : on pourra relever le nombre d'itérations plus tard
 * sans empêcher de relire les anciennes notes.
 */

/** Longueur minimale d'une passphrase : en dessous, elle se devine trop vite. */
export const MIN_PASSPHRASE_LENGTH = 8;

/** Nombre d'itérations PBKDF2-SHA-256 recommandé par l'OWASP (2023). */
export const PBKDF2_ITERATIONS = 600_000;

const VERSION = 'v1';
const SALT_BYTES = 16;
const IV_BYTES = 12; // taille recommandée pour AES-GCM

/** Passphrase incorrecte, ou texte chiffré modifié : GCM ne permet pas de distinguer les deux. */
export class WrongPassphraseError extends Error {
  constructor() {
    super('Clé de chiffrement incorrecte ou note altérée.');
    this.name = 'WrongPassphraseError';
  }
}

/** Texte chiffré qui n'a pas le format attendu. */
export class InvalidCipherTextError extends Error {
  constructor() {
    super('Texte chiffré illisible.');
    this.name = 'InvalidCipherTextError';
  }
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const fromBase64 = (text: string): Uint8Array<ArrayBuffer> => {
  try {
    return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
  } catch {
    throw new InvalidCipherTextError();
  }
};

/** Dérive la clé AES de la passphrase. NFKC : la même phrase tapée sur un autre clavier donne la même clé. */
async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Chiffre `plain` avec la passphrase. Sel et vecteur d'initialisation sont tirés au hasard à chaque appel. */
export async function encryptText(
  plain: string,
  passphrase: string,
  iterations = PBKDF2_ITERATIONS, // paramètre réservé aux tests, qui n'ont pas besoin d'être lents
): Promise<string> {
  if (!passphrase) throw new Error('La clé de chiffrement est obligatoire.');
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt, iterations);
  const data = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain)),
  );
  return [VERSION, iterations, toBase64(salt), toBase64(iv), toBase64(data)].join('.');
}

/** Déchiffre un texte produit par `encryptText`. Lève WrongPassphraseError si la passphrase ne convient pas. */
export async function decryptText(cipherText: string, passphrase: string): Promise<string> {
  const [version, iterationsText, salt, iv, data, ...extra] = cipherText.split('.');
  const iterations = Number(iterationsText);
  if (version !== VERSION || extra.length || !data || !Number.isInteger(iterations) || iterations < 1) {
    throw new InvalidCipherTextError();
  }
  const ivBytes = fromBase64(iv);
  if (ivBytes.length !== IV_BYTES) throw new InvalidCipherTextError();

  const key = await deriveKey(passphrase, fromBase64(salt), iterations);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, fromBase64(data));
    return new TextDecoder().decode(plain);
  } catch {
    throw new WrongPassphraseError();
  }
}
