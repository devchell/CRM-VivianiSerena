#!/bin/sh
set -eu

ROOT_DIR=${VIVIANI_ROOT:-/opt/viviani-crm}
BACKUP_DIR=${VIVIANI_BACKUP_DIR:-$ROOT_DIR/backups}
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
ENV_FILE="$ROOT_DIR/deploy/vps/.env"
DB_BACKUP=${1:-}
UPLOADS_BACKUP=${2:-}

if [ "${CONFIRM_RESTORE:-}" != "YES" ]; then
  echo "Restore is destructive. Set CONFIRM_RESTORE=YES and pass a database and uploads backup." >&2
  exit 1
fi
if [ -z "$DB_BACKUP" ] || [ -z "$UPLOADS_BACKUP" ]; then
  echo "Usage: CONFIRM_RESTORE=YES sh deploy/vps/restore.sh <db.sql.gz> <uploads.tar.gz>" >&2
  exit 1
fi
case "$DB_BACKUP" in "$BACKUP_DIR/"*) ;; *) echo "Database backup must be inside $BACKUP_DIR" >&2; exit 1 ;; esac
case "$UPLOADS_BACKUP" in "$BACKUP_DIR/"*) ;; *) echo "Uploads backup must be inside $BACKUP_DIR" >&2; exit 1 ;; esac
if [ ! -f "$DB_BACKUP" ] || [ ! -f "$UPLOADS_BACKUP" ]; then
  echo "Backup file not found" >&2
  exit 1
fi

db_filename=${DB_BACKUP##*/}
case "$db_filename" in
  db-*.sql.gz) stamp=${db_filename#db-}; stamp=${stamp%.sql.gz} ;;
  *) echo "Database backup filename must use db-<timestamp>.sql.gz" >&2; exit 1 ;;
esac
checksum_file="$BACKUP_DIR/sha256-$stamp.txt"
if [ ! -f "$checksum_file" ]; then
  echo "Checksum file not found for the selected backup" >&2
  exit 1
fi
(cd "$BACKUP_DIR" && sha256sum -c "$(basename "$checksum_file")" >/dev/null)

set -a
. "$ENV_FILE"
set +a

case "$POSTGRES_DB" in
  *[!a-zA-Z0-9_]*|'') echo "Database name may contain only letters, numbers and underscores" >&2; exit 1 ;;
esac
case "$POSTGRES_USER" in
  *[!a-zA-Z0-9_]*|'') echo "Database role name may contain only letters, numbers and underscores" >&2; exit 1 ;;
esac

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" stop api crm landing nginx

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";" \
  -c "CREATE DATABASE \"$POSTGRES_DB\" OWNER \"$POSTGRES_USER\";"

# The dump can contain grants/default privileges for the runtime role. It must
# exist before restore; running this again after restore reapplies final grants.
sh "$ROOT_DIR/deploy/vps/ensure-runtime-db-role.sh"

gzip -cd "$DB_BACKUP" | docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" --set ON_ERROR_STOP=on

sh "$ROOT_DIR/deploy/vps/ensure-runtime-db-role.sh"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" start api
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T api \
  sh -c 'rm -rf -- /app/data/uploads /app/data/private-uploads && mkdir -p -- /app/data/uploads /app/data/private-uploads'
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T api \
  tar -C /app/data -xzf - < "$UPLOADS_BACKUP"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" start crm landing nginx

echo "Restore completed; verify health and business flows before reopening access."
