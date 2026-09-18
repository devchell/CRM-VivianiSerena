#!/bin/sh
set -eu

ROOT_DIR=${VIVIANI_ROOT:-/opt/viviani-crm}
ENV_FILE="$ROOT_DIR/deploy/vps/.env"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing environment file: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_APP_USER:?POSTGRES_APP_USER is required}"
: "${POSTGRES_APP_PASSWORD:?POSTGRES_APP_PASSWORD is required}"

case "$POSTGRES_DB:$POSTGRES_USER:$POSTGRES_APP_USER" in
  *[!a-zA-Z0-9_:]*|'') echo "Database and role names may contain only letters, numbers and underscores" >&2; exit 1 ;;
esac
case "$POSTGRES_APP_PASSWORD" in
  *[!a-zA-Z0-9]*|'') echo "Runtime database password must use only alphanumeric characters" >&2; exit 1 ;;
esac

psql() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
}

role_exists=$(psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$POSTGRES_APP_USER'" | tr -d '[:space:]')
if [ "$role_exists" = "1" ]; then
  psql -c "ALTER ROLE \"$POSTGRES_APP_USER\" PASSWORD '$POSTGRES_APP_PASSWORD' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS"
else
  psql -c "CREATE ROLE \"$POSTGRES_APP_USER\" LOGIN PASSWORD '$POSTGRES_APP_PASSWORD' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS"
fi

psql -c "GRANT CONNECT ON DATABASE \"$POSTGRES_DB\" TO \"$POSTGRES_APP_USER\""
psql -c "GRANT USAGE ON SCHEMA public TO \"$POSTGRES_APP_USER\""
psql -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"$POSTGRES_APP_USER\""
psql -c "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO \"$POSTGRES_APP_USER\""
psql -c "ALTER DEFAULT PRIVILEGES FOR ROLE \"$POSTGRES_USER\" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO \"$POSTGRES_APP_USER\""
psql -c "ALTER DEFAULT PRIVILEGES FOR ROLE \"$POSTGRES_USER\" IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO \"$POSTGRES_APP_USER\""

echo "Runtime database role ensured."
