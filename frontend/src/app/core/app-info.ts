/**
 * Informations affichées dans le pied de page.
 * `version` vaut « dev » en développement : le pipeline la remplace, à la construction de l'image,
 * par le numéro de la version publiée (ex. 0.2.0 pour le tag v0.2.0).
 */
export const APP_INFO = {
  version: 'dev',
  author: 'Jean-Philippe Carrazé',
  contactEmail: 'contact@penseo.fr',
} as const;
