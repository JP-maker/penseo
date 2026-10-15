import {
  decryptText,
  encryptText,
  InvalidCipherTextError,
  WrongPassphraseError,
} from './note-crypto';

// Peu d'itérations : les tests n'ont pas besoin de la lenteur voulue en production.
const FAST = 1000;

describe('note-crypto', () => {
  it('chiffre puis déchiffre, accents et emojis compris', async () => {
    const text = 'Réunion à 14 h — code 1234 🔒';
    const cipher = await encryptText(text, 'ma phrase secrète', FAST);

    expect(cipher).not.toContain('Réunion');
    expect(await decryptText(cipher, 'ma phrase secrète')).toBe(text);
  });

  it('donne un résultat différent à chaque chiffrement du même texte', async () => {
    const a = await encryptText('même texte', 'phrase', FAST);
    const b = await encryptText('même texte', 'phrase', FAST);
    expect(a).not.toBe(b);
  });

  it('refuse une mauvaise passphrase', async () => {
    const cipher = await encryptText('secret', 'bonne phrase', FAST);
    await expect(decryptText(cipher, 'mauvaise phrase')).rejects.toBeInstanceOf(WrongPassphraseError);
  });

  it('détecte un texte chiffré modifié', async () => {
    const cipher = await encryptText('secret', 'phrase', FAST);
    const parts = cipher.split('.');
    // Remplace les données chiffrées par d'autres données de même taille.
    parts[4] = (await encryptText('autre', 'phrase', FAST)).split('.')[4];
    await expect(decryptText(parts.join('.'), 'phrase')).rejects.toBeInstanceOf(WrongPassphraseError);
  });

  it('refuse un texte qui n\'a pas le bon format', async () => {
    await expect(decryptText('pas du tout chiffré', 'phrase')).rejects.toBeInstanceOf(
      InvalidCipherTextError,
    );
    await expect(decryptText('v9.1000.AA==.AA==.AA==', 'phrase')).rejects.toBeInstanceOf(
      InvalidCipherTextError,
    );
  });

  it('refuse une passphrase vide', async () => {
    await expect(encryptText('secret', '', FAST)).rejects.toThrow();
  });

  it('traite pareil une même phrase écrite sous deux formes Unicode', async () => {
    const cipher = await encryptText('secret', 'été', FAST); // « été » avec accents combinés
    expect(await decryptText(cipher, 'été')).toBe('secret'); // « été » avec accents précomposés
  });
});
