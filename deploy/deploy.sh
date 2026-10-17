#!/bin/bash
# Lancé par le pipeline (via SSH, commande imposée) avec le tag à déployer : ex. « v0.2.0 ».
# Tout est dans une fonction : git peut remplacer ce fichier en cours d'exécution sans casser le script.
set -euo pipefail

main() {
  local tag="${SSH_ORIGINAL_COMMAND:-}"
  [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Tag invalide : '$tag'"; exit 1; }

  cd /opt/penseo
  exec 9>/tmp/penseo-deploy.lock
  flock -n 9 || { echo "Un déploiement est déjà en cours"; exit 1; }

  # Fichiers de configuration (compose, scripts) dans la version du tag
  git fetch --quiet --tags --force origin
  git checkout --quiet --force "$tag"

  # Le tag est mémorisé dans .env : un redémarrage du serveur garde la même version
  if grep -q '^APP_TAG=' .env; then sed -i "s|^APP_TAG=.*|APP_TAG=$tag|" .env; else echo "APP_TAG=$tag" >> .env; fi

  docker compose -f docker-compose.prod.yml pull app
  docker compose -f docker-compose.prod.yml up -d
  docker compose -f docker-compose.prod.yml exec -T app php artisan migrate --force
  docker image prune -f > /dev/null
  echo "Version déployée : $tag"
}

main "$@"
exit
