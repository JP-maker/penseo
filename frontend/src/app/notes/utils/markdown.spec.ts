import { applyFormat, Inline, parseInline, parseMarkdown } from './markdown';

const seg = (text: string, over: Partial<Inline> = {}): Inline => ({
  text,
  bold: false,
  italic: false,
  strike: false,
  code: false,
  href: null,
  ...over,
});

describe('parseInline', () => {
  it('garde un texte simple tel quel', () => {
    expect(parseInline('texte simple')).toEqual([seg('texte simple')]);
  });

  it('reconnaît gras, italique et barré', () => {
    expect(parseInline('a **b** *c* ~~d~~')).toEqual([
      seg('a '),
      seg('b', { bold: true }),
      seg(' '),
      seg('c', { italic: true }),
      seg(' '),
      seg('d', { strike: true }),
    ]);
  });

  it('gère l’italique dans le gras', () => {
    expect(parseInline('**gras *et italique* ici**')).toEqual([
      seg('gras ', { bold: true }),
      seg('et italique', { bold: true, italic: true }),
      seg(' ici', { bold: true }),
    ]);
  });

  it('gère gras et italique ensemble avec trois étoiles', () => {
    expect(parseInline('***x***')).toEqual([seg('x', { bold: true, italic: true })]);
  });

  it('n’interprète rien dans un code', () => {
    expect(parseInline('`**pas gras**`')).toEqual([seg('**pas gras**', { code: true })]);
  });

  it('laisse un marqueur sans fermeture comme du texte', () => {
    expect(parseInline('**oups')).toEqual([seg('**oups')]);
    expect(parseInline('2 * 3 * 4')).toEqual([seg('2 * 3 * 4')]);
  });

  it('permet d’échapper un marqueur', () => {
    expect(parseInline('\\*pas italique\\*')).toEqual([seg('*pas italique*')]);
  });

  it('crée un lien pour une adresse http(s)', () => {
    expect(parseInline('[Angular](https://angular.dev)')).toEqual([
      seg('Angular', { href: 'https://angular.dev' }),
    ]);
  });

  it('refuse un lien javascript:', () => {
    expect(parseInline('[x](javascript:alert(1))')).toEqual([seg('[x](javascript:alert(1))')]);
  });

  it('laisse le HTML saisi comme du texte', () => {
    expect(parseInline('<b>x</b>')).toEqual([seg('<b>x</b>')]);
  });
});

describe('parseMarkdown', () => {
  it('reconnaît trois niveaux de titre', () => {
    const blocks = parseMarkdown('# A\n## B\n### C\n#### D');
    expect(blocks.map((b) => b.type)).toEqual(['h', 'h', 'h', 'p']);
    expect(blocks.map((b) => (b.type === 'h' ? b.level : 0))).toEqual([1, 2, 3, 0]);
  });

  it('regroupe les lignes de liste consécutives', () => {
    const blocks = parseMarkdown('- a\n- b\n\n1. x\n2. y');
    expect(blocks.map((b) => b.type)).toEqual(['ul', 'ol']);
    expect(blocks.map((b) => (b.type === 'ul' || b.type === 'ol' ? b.items.length : 0))).toEqual([
      2, 2,
    ]);
  });

  it('sépare les paragraphes sur une ligne vide et garde les retours à la ligne', () => {
    const blocks = parseMarkdown('a\nb\n\nc');
    expect(blocks.length).toBe(2);
    expect(blocks[0].type === 'p' && blocks[0].inlines[0].text).toBe('a\nb');
  });
});

describe('applyFormat', () => {
  it('entoure la sélection de gras', () => {
    expect(applyFormat({ text: 'un mot ici', start: 3, end: 6 }, 'bold')).toEqual({
      text: 'un **mot** ici',
      start: 5,
      end: 8,
    });
  });

  it('place le curseur entre les marqueurs quand rien n’est sélectionné', () => {
    expect(applyFormat({ text: 'ab', start: 1, end: 1 }, 'bold')).toEqual({
      text: 'a****b',
      start: 3,
      end: 3,
    });
  });

  it('crée puis retire une liste à puces', () => {
    const added = applyFormat({ text: 'a\nb', start: 0, end: 3 }, 'bullet');
    expect(added).toEqual({ text: '- a\n- b', start: 0, end: 7 });
    expect(applyFormat(added, 'bullet')).toEqual({ text: 'a\nb', start: 0, end: 3 });
  });

  it('numérote les lignes non vides', () => {
    expect(applyFormat({ text: 'a\n\nb', start: 0, end: 4 }, 'numbered').text).toBe('1. a\n\n2. b');
  });

  it('transforme la ligne du curseur en titre', () => {
    expect(applyFormat({ text: 'Titre', start: 2, end: 2 }, 'heading')).toEqual({
      text: '## Titre',
      start: 8,
      end: 8,
    });
  });

  it('crée un lien et sélectionne l’adresse à remplacer', () => {
    expect(applyFormat({ text: 'voir ici', start: 5, end: 8 }, 'link')).toEqual({
      text: 'voir [ici](https://)',
      start: 11,
      end: 19,
    });
  });
});
