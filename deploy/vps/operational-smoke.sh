#!/bin/sh
set -eu

ROOT_DIR=${VIVIANI_ROOT:-/opt/viviani-crm}
ENV_FILE=${VIVIANI_ENV_FILE:-$ROOT_DIR/deploy/vps/.env}
COMPOSE_FILE=${VIVIANI_COMPOSE_FILE:-$ROOT_DIR/docker-compose.yml}

if [ ! -f "$ENV_FILE" ]; then
  echo "Smoke failed: missing environment file $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

errors=0
fail() {
  echo "Smoke failed: $1" >&2
  errors=$((errors + 1))
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

for service in postgres redis api crm landing nginx; do
  container=$(compose ps -q "$service")
  if [ -z "$container" ]; then
    fail "$service has no running container"
    continue
  fi

  health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$container")
  if [ "$health" != "healthy" ]; then
    fail "$service health is $health"
  fi
done

nginx_container=$(compose ps -q nginx)
if [ -n "$nginx_container" ] && ! compose exec -T nginx nginx -t >/dev/null 2>&1; then
  fail "nginx configuration test failed"
fi

for service in api crm; do
  container=$(compose ps -q "$service")
  if [ -n "$container" ]; then
    bindings=$(docker inspect --format '{{json .HostConfig.PortBindings}}' "$container")
    case "$bindings" in
      '{}'|'null') ;;
      *) fail "$service has host port bindings: $bindings" ;;
    esac
  fi
done

landing_url=${PUBLIC_LANDING_URL%/}
crm_url=${PUBLIC_CRM_URL%/}
api_url=${PUBLIC_API_URL%/}
if ! curl -fsS -o /dev/null "$landing_url/health"; then
  fail "landing health endpoint is unavailable"
fi
if ! curl -fsS -o /dev/null "$api_url/health/ready"; then
  fail "API readiness endpoint is unavailable"
fi
if ! curl -fsS -o /dev/null "$crm_url/login"; then
  fail "CRM login endpoint is unavailable"
fi

if [ "$errors" -ne 0 ]; then
  exit 1
fi

echo "Operational smoke passed for stage=${DEPLOYMENT_STAGE:-unknown}"
