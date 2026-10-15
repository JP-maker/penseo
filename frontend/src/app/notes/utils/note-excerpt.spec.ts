import { truncateText } from './note-excerpt';

describe('truncateText', () => {
  it('laisse un texte assez court tel quel', () => {
    expect(truncateText('court', 200)).toBe('court');
    expect(truncateText('x'.repeat(200), 200)).toBe('x'.repeat(200));
  });

  it('coupe un texte long et ajoute des points de suspension', () => {
    expect(truncateText('x'.repeat(250), 200)).toBe('x'.repeat(200) + '…');
  });

  it('retire les espaces laissés en fin de coupe', () => {
    expect(truncateText('abc def ghi', 4)).toBe('abc…');
  });

  it('ne coupe pas un emoji en deux', () => {
    const text = 'a'.repeat(199) + '😀' + 'b'.repeat(10); // l'emoji occupe les positions 199 et 200
    const cut = truncateText(text, 200);
    expect(cut).toBe('a'.repeat(199) + '…');
  });
});
