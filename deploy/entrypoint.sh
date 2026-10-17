#!/bin/sh
# Prépare Laravel au démarrage : les variables d'environnement sont lues ici, puis mises en cache.
set -e
cd /app
php artisan package:discover --ansi
php artisan config:cache
exec "$@"
