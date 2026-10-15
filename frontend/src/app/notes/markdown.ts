/**
 * Mini-Markdown : transforme le texte d'une note en structure (jamais en HTML) et applique
 * les actions de la barre de mise en forme. Fonctions pures : faciles à tester.
 */

/** Un morceau de texte et sa mise en forme. Les états sont "à plat" (pas d'imbrication) : l'affichage reste simple. */
export interface Inline {
  text: string;
  bold: boolean;
  italic: boolean;
  strike: boolean;
  code: boolean;
  href: string | null; // toujours http(s) : voir LINK
}

export type Block =
  | { type: 'p'; inlines: Inline[] }
  | { type: 'h'; level: 1 | 2 | 3; inlines: Inline[] }
  | { type: 'ul' | 'ol'; items: Inline[][] };

// --- Lecture ---------------------------------------------------------------

type Flags = { bold: boolean; italic: boolean; strike: boolean };
type Marker = '***' | '**' | '~~' | '*';

const MARKERS: Marker[] = ['***', '**', '~~', '*']; // du plus long au plus court
const KEYS: Record<Marker, (keyof Flags)[]> = {
  '***': ['bold', 'italic'],
  '**': ['bold'],
  '~~': ['strike'],
  '*': ['italic'],
};
const ESCAPABLE = '\\`*~[]';
// Seules les adresses http(s) sont acceptées : jamais de javascript: ni de data:.
const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/y;

/** Un marqueur ouvre s'il est suivi d'un caractère visible ET qu'un marqueur de fermeture existe plus loin. */
function canOpen(text: string, i: number, marker: Marker): boolean {
  const start = i + marker.length;
  if (start >= text.length || /\s/.test(text[start])) return false;

  for (let j = text.indexOf(marker, start); j !== -1; j = text.indexOf(marker, j + 1)) {
    if (/\s/.test(text[j - 1])) continue; // une fermeture suit un caractère visible
    // Un "*" seul ne se ferme pas sur la moitié d'un "**".
    if (marker === '*' && (text[j - 1] === '*' || text[j + 1] === '*')) continue;
    return true;
  }
  return false; // jamais de marqueur ouvert sans fermeture : le texte reste littéral
}

function canToggle(text: string, i: number, marker: Marker, flags: Flags): boolean {
  const keys = KEYS[marker];
  const active = keys.filter((k) => flags[k]).length;
  if (active === keys.length) return true; // fermeture
  return active === 0 && canOpen(text, i, marker); // ouverture ; état mixte : un marqueur plus court s'en charge
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const flags: Flags = { bold: false, italic: false, strike: false };
  let buf = '';

  const push = (value: string, extra: Partial<Inline> = {}) =>
    out.push({ text: value, ...flags, code: false, href: null, ...extra });
  const flush = () => {
    if (buf) push(buf);
    buf = '';
  };

  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    // \* \` \\ … : le caractère suivant est du texte.
    if (ch === '\\' && i + 1 < text.length && ESCAPABLE.includes(text[i + 1])) {
      buf += text[i + 1];
      i += 2;
      continue;
    }

    // `code` : rien n'est interprété à l'intérieur.
    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i + 1) {
        flush();
        push(text.slice(i + 1, end), { code: true });
        i = end + 1;
        continue;
      }
    }

    if (ch === '[') {
      LINK.lastIndex = i;
      const link = LINK.exec(text);
      if (link) {
        flush();
        push(link[1], { href: link[2] });
        i += link[0].length;
        continue;
      }
    }

    if (ch === '*' || ch === '~') {
      const marker = MARKERS.find((m) => text.startsWith(m, i) && canToggle(text, i, m, flags));
      if (marker) {
        flush();
        for (const key of KEYS[marker]) flags[key] = !flags[key];
        i += marker.length;
        continue;
      }
    }

    buf += ch;
    i++;
  }
  flush();
  return out;
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const endParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'p', inlines: parseInline(paragraph.join('\n')) });
    paragraph = [];
  };

  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) {
      endParagraph();
      continue;
    }

    const heading = /^(#{1,3}) +(.+)$/.exec(line);
    if (heading) {
      endParagraph();
      blocks.push({
        type: 'h',
        level: heading[1].length as 1 | 2 | 3,
        inlines: parseInline(heading[2]),
      });
      continue;
    }

    const bullet = /^[-*] +(.+)$/.exec(line);
    const numbered = /^\d+[.)] +(.+)$/.exec(line);
    const item = bullet ?? numbered;
    if (item) {
      endParagraph();
      const type = bullet ? 'ul' : 'ol';
      const last = blocks[blocks.length - 1];
      // Les lignes de liste consécutives du même type forment une seule liste.
      if (last && (last.type === 'ul' || last.type === 'ol') && last.type === type) {
        last.items.push(parseInline(item[1]));
      } else {
        blocks.push({ type, items: [parseInline(item[1])] });
      }
      continue;
    }

    paragraph.push(line); // les retours à la ligne d'un paragraphe sont conservés à l'affichage
  }
  endParagraph();
  return blocks;
}

// --- Barre de mise en forme -----------------------------------------------

export type FormatAction =
  'bold' | 'italic' | 'strike' | 'code' | 'link' | 'heading' | 'bullet' | 'numbered';

export interface TextSelection {
  text: string;
  start: number;
  end: number;
}

const WRAP = { bold: '**', italic: '*', strike: '~~', code: '`' } as const;
const LINE_PATTERN = { heading: /^#{1,3} /, bullet: /^[-*] /, numbered: /^\d+[.)] / };

/** Retourne le nouveau texte et la nouvelle sélection après l'action. */
export function applyFormat(
  { text, start, end }: TextSelection,
  action: FormatAction,
): TextSelection {
  if (action === 'link') {
    const selected = text.slice(start, end);
    const label = selected || 'texte';
    const next = `${text.slice(0, start)}[${label}](https://)${text.slice(end)}`;
    // On sélectionne ce qu'il reste à saisir : l'adresse si un texte était choisi, sinon le texte du lien.
    if (selected)
      return { text: next, start: start + label.length + 3, end: start + label.length + 11 };
    return { text: next, start: start + 1, end: start + 1 + label.length };
  }

  if (action in WRAP) {
    const marker = WRAP[action as keyof typeof WRAP];
    const next = text.slice(0, start) + marker + text.slice(start, end) + marker + text.slice(end);
    return { text: next, start: start + marker.length, end: end + marker.length };
  }

  // Titre et listes : agissent sur les lignes touchées par la sélection.
  const lineStart = start === 0 ? 0 : text.lastIndexOf('\n', start - 1) + 1;
  const last = end > start && text[end - 1] === '\n' ? end - 1 : end; // une sélection qui finit sur un retour à la ligne
  const found = text.indexOf('\n', last);
  const lineEnd = found === -1 ? text.length : found;

  const lines = text.slice(lineStart, lineEnd).split('\n');
  const pattern = LINE_PATTERN[action as keyof typeof LINE_PATTERN];
  // Les lignes vides sont ignorées, sauf si c'est la seule (on veut pouvoir démarrer une liste sur une ligne vide).
  const touched = (line: string) => lines.length === 1 || line.trim() !== '';
  const remove = lines.filter(touched).every((line) => pattern.test(line));

  let n = 0;
  const block = lines
    .map((line) => {
      if (!touched(line)) return line;
      const bare = line.replace(pattern, '');
      if (remove) return bare;
      n++;
      return (action === 'heading' ? '## ' : action === 'bullet' ? '- ' : `${n}. `) + bare;
    })
    .join('\n');

  const result = text.slice(0, lineStart) + block + text.slice(lineEnd);
  // Curseur seul : on le place en fin de ligne, pour continuer à taper après le préfixe.
  return {
    text: result,
    start: start === end ? lineStart + block.length : lineStart,
    end: lineStart + block.length,
  };
}
