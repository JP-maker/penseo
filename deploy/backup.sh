#!/bin/bash
# Sauvegarde quotidienne de la base, compressée, gardée 14 jours. À lancer en root (cron).
set -euo pipefail
cd "$(dirname "$0")/.."
DIR="${BACKUP_DIR:-/var/backups/penseo}"
mkdir -p "$DIR" && chmod 700 "$DIR"
FILE="$DIR/penseo-$(date +%F).sql.gz"
docker compose -f docker-compose.prod.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
find "$DIR" -name 'penseo-*.sql.gz' -mtime +14 -delete
