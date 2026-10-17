#!/bin/bash
# Lancé par le pipeline (via SSH, commande imposée) : met à jour le code, reconstruit, migre la base.
# Tout est dans une fonction : git peut remplacer ce fichier en cours d'exécution sans casser le script.
set -euo pipefail

main() {
  cd /opt/penseo
  exec 9>/tmp/penseo-deploy.lock
  flock -n 9 || { echo "Un déploiement est déjà en cours"; exit 1; }

  git fetch --quiet origin main
  git reset --hard origin/main

  docker compose -f docker-compose.prod.yml up -d --build
  docker compose -f docker-compose.prod.yml exec -T app php artisan migrate --force
  docker image prune -f > /dev/null
  echo "Déploiement terminé : $(git rev-parse --short HEAD)"
}

main "$@"
exit
