const URL_PATTERN = /https?:\/\/[^\s<>"']+/i;

/**
 * Première URL http(s) d'un texte, sans la ponctuation que la phrase lui colle ("voir https://a.fr/x.").
 * shortcut: une seule URL par note, la première ; Keep fait pareil.
 */
export function firstUrl(text: string): string | null {
  const match = URL_PATTERN.exec(text);
  if (!match) return null;

  let url = match[0].replace(/[.,;:!?]+$/, '');
  // Parenthèse fermante finale retirée seulement si l'URL n'en ouvre pas une (cas Wikipédia : /Foo_(bar)).
  if (url.endsWith(')') && !url.includes('(')) url = url.slice(0, -1);
  return url;
}
