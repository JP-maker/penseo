import { firstUrl } from './first-url';

describe('firstUrl', () => {
  it('trouve l’URL dans une phrase', () => {
    expect(firstUrl('Voir https://angular.dev/guide pour plus')).toBe('https://angular.dev/guide');
  });

  it('retire la ponctuation finale', () => {
    expect(firstUrl('Lis https://a.test/x.')).toBe('https://a.test/x');
    expect(firstUrl('Lis https://a.test/x, puis dors')).toBe('https://a.test/x');
  });

  it('retire une parenthèse fermante qui n’appartient pas à l’URL', () => {
    expect(firstUrl('(voir https://a.test/x)')).toBe('https://a.test/x');
  });

  it('garde les parenthèses qui font partie de l’URL', () => {
    expect(firstUrl('https://fr.wikipedia.org/wiki/Foo_(bar)')).toBe(
      'https://fr.wikipedia.org/wiki/Foo_(bar)',
    );
  });

  it('retourne null sans URL', () => {
    expect(firstUrl('Pas de lien ici')).toBeNull();
  });

  it('ignore les schémas autres que http(s)', () => {
    expect(firstUrl('ftp://a.test/x')).toBeNull();
    expect(firstUrl('javascript:alert(1)')).toBeNull();
  });
});
