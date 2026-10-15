import { InvalidCipherTextError } from './note-crypto';
import { packSecret, unpackSecret } from './note-secret';

describe('note-secret', () => {
  it('relit ce qui a été empaqueté', () => {
    const secret = {
      content: 'code : 1234',
      items: [{ id: 'a', text: 'Appeler', done: true }],
    };
    expect(unpackSecret(packSecret(secret))).toEqual(secret);
  });

  it('refuse un texte qui n\'est pas du JSON', () => {
    expect(() => unpackSecret('pas du json')).toThrow(InvalidCipherTextError);
  });

  it('refuse une forme inattendue', () => {
    expect(() => unpackSecret('null')).toThrow(InvalidCipherTextError);
    expect(() => unpackSecret('{"content":1,"items":[]}')).toThrow(InvalidCipherTextError);
    expect(() => unpackSecret('{"content":"a","items":[{"id":"x"}]}')).toThrow(InvalidCipherTextError);
  });
});
