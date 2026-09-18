#!/bin/sh
set -eu

ROOT_DIR=${VIVIANI_ROOT:-/opt/viviani-crm}
BACKUP_DIR=${VIVIANI_BACKUP_DIR:-$ROOT_DIR/backups}
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
ENV_FILE="$ROOT_DIR/deploy/vps/.env"
RETENTION_DAYS=${VIVIANI_BACKUP_RETENTION_DAYS:-14}
EXTERNAL_BACKUP_DIR=${BACKUP_EXTERNAL_DIR:-}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing environment file: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

EXTERNAL_BACKUP_DIR=${BACKUP_EXTERNAL_DIR:-${EXTERNAL_BACKUP_DIR:-}}
umask 077

if [ -n "$EXTERNAL_BACKUP_DIR" ]; then
  if [ ! -d "$EXTERNAL_BACKUP_DIR" ] || [ ! -w "$EXTERNAL_BACKUP_DIR" ]; then
    echo "External backup directory must already exist and be writable: $EXTERNAL_BACKUP_DIR" >&2
    exit 1
  fi
  case "$EXTERNAL_BACKUP_DIR" in
    "$BACKUP_DIR"|"$BACKUP_DIR"/*)
      echo "External backup directory must not be the local backup directory or a child of it" >&2
      exit 1
      ;;
  esac
fi

mkdir -p "$BACKUP_DIR"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
db_tmp="$BACKUP_DIR/.db-$stamp.sql"
uploads_tmp="$BACKUP_DIR/.uploads-$stamp.tar.gz"
db_backup="$BACKUP_DIR/db-$stamp.sql.gz"
uploads_backup="$BACKUP_DIR/uploads-$stamp.tar.gz"

cleanup() {
  rm -f "$db_tmp" "$db_tmp.gz" "$uploads_tmp"
}
trap cleanup EXIT INT TERM

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges > "$db_tmp"
gzip -f "$db_tmp"
mv "$db_tmp.gz" "$db_backup"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T api \
  sh -c 'mkdir -p -- /app/data/uploads /app/data/private-uploads && tar -C /app/data -czf - uploads private-uploads' > "$uploads_tmp"
mv "$uploads_tmp" "$uploads_backup"

(
  cd "$BACKUP_DIR"
  sha256sum "$(basename "$db_backup")" "$(basename "$uploads_backup")" > "sha256-$stamp.txt"
)

if [ -n "$EXTERNAL_BACKUP_DIR" ]; then
  cp -f "$db_backup" "$uploads_backup" "$BACKUP_DIR/sha256-$stamp.txt" "$EXTERNAL_BACKUP_DIR/"
  (
    cd "$EXTERNAL_BACKUP_DIR"
    sha256sum -c "sha256-$stamp.txt" >/dev/null
  )
  echo "External backup copy verified: $stamp"
fi

find "$BACKUP_DIR" -maxdepth 1 -type f -mtime "+$RETENTION_DAYS" -delete

echo "Backup created: $stamp"
