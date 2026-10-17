/**
 * Informations affichées dans le pied de page.
 * shortcut: la version est écrite à la main (à changer à chaque publication) ;
 * le pipeline de déploiement pourra plus tard la remplacer par le numéro de version ou de commit.
 */
export const APP_INFO = {
  version: '0.1.0',
  author: 'Jean-Philippe Carrazé',
  contactEmail: 'contact@penseo.fr',
} as const;
