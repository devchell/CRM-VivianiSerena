#!/bin/sh
set -eu

ROOT_DIR=${VIVIANI_ROOT:-/opt/viviani-crm}
ENV_FILE=${VIVIANI_ENV_FILE:-$ROOT_DIR/deploy/vps/.env}

if [ ! -f "$ENV_FILE" ]; then
  echo "Preflight failed: missing environment file $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

stage=${DEPLOYMENT_STAGE:-homologacao}
errors=0

fail() {
  echo "Preflight failed: $1" >&2
  errors=$((errors + 1))
}

require_exact() {
  name=$1
  expected=$2
  eval "value=\${$name:-}"
  if [ "$value" != "$expected" ]; then
    fail "$name must be $expected"
  fi
}

require_present() {
  name=$1
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then
    fail "$name is required"
  fi
  case "$value" in
    *replace-with*|*change-me*) fail "$name still contains a placeholder" ;;
  esac
}

require_dns_url() {
  name=$1
  scheme=$2
  eval "value=\${$name:-}"
  case "$value" in
    "$scheme"*) ;;
    *) fail "$name must use $scheme"; return ;;
  esac

  host_value=${value#"$scheme"}
  case "$host_value" in
    */*) fail "$name must use a DNS hostname without port or path"; return ;;
  esac
  host_value=${host_value%%/*}
  case "$host_value" in
    ''|*[!A-Za-z0-9.-]*) fail "$name must use a DNS hostname without port or path" ;;
    *)
      if printf '%s' "$host_value" | grep -Eq '^[0-9]+([.][0-9]+){3}$'; then
        fail "$name must not use a raw IP in production"
      fi
      ;;
  esac
}

require_exact FRESH_DATABASE false
require_exact ALLOW_FRESH_BOOTSTRAP false
require_present PUBLIC_LANDING_URL
require_present PUBLIC_CRM_URL
require_present PUBLIC_API_URL

case "$stage" in
  homologacao)
    require_exact COOKIE_SECURE false
    require_exact ENABLE_HSTS false
    require_exact TRUST_PROXY true
    ;;
  production)
    require_dns_url PUBLIC_LANDING_URL https://
    require_dns_url PUBLIC_CRM_URL https://
    require_dns_url PUBLIC_API_URL https://
    require_exact COOKIE_SECURE true
    require_exact ENABLE_HSTS true
    require_exact TRUST_PROXY true
    require_exact BACKUP_ENABLED true
    require_exact BACKUP_EXTERNAL_CONFIRMED true
    require_exact BACKUP_EXTERNAL_ENCRYPTED_CONFIRMED true
    require_exact BACKUP_SCHEDULE_CONFIRMED true
    require_present BACKUP_EXTERNAL_DIR
    require_exact SEED_ON_START false
    require_exact FIREWALL_PRODUCTION_CONFIRMED true
    require_exact SSH_ROOT_ROTATED true
    require_exact PRODUCTION_SECRETS_ROTATED true

    case ":${COMPOSE_FILE:-}:" in
      *:deploy/docker/docker-compose.production.yml:*|*:/opt/viviani-crm/deploy/docker/docker-compose.production.yml:*) ;;
      *) fail "COMPOSE_FILE must include deploy/docker/docker-compose.production.yml" ;;
    esac

    for secret in POSTGRES_PASSWORD POSTGRES_APP_PASSWORD REDIS_PASSWORD NEXTAUTH_SECRET ENCRYPTION_KEY ANONYMIZATION_SALT REVALIDATE_SECRET JWT_PRIVATE_KEY_B64 JWT_PUBLIC_KEY_B64; do
      require_present "$secret"
    done

    for nginx_host in NGINX_LANDING_HOST NGINX_CRM_HOST NGINX_API_HOST; do
      require_present "$nginx_host"
      eval "nginx_value=\${$nginx_host:-}"
      case "$nginx_value" in
        ''|*[!A-Za-z0-9.-]*) fail "$nginx_host must be a DNS hostname" ;;
        *.*) ;;
        *) fail "$nginx_host must contain a DNS dot" ;;
      esac
    done

    if [ "${NGINX_LANDING_HOST:-}" = "${NGINX_CRM_HOST:-}" ] || [ "${NGINX_LANDING_HOST:-}" = "${NGINX_API_HOST:-}" ] || [ "${NGINX_CRM_HOST:-}" = "${NGINX_API_HOST:-}" ]; then
      fail "NGINX_LANDING_HOST, NGINX_CRM_HOST and NGINX_API_HOST must be distinct"
    fi

    landing_host=${PUBLIC_LANDING_URL#https://}
    landing_host=${landing_host%%/*}
    crm_host=${PUBLIC_CRM_URL#https://}
    crm_host=${crm_host%%/*}
    api_host=${PUBLIC_API_URL#https://}
    api_host=${api_host%%/*}
    if [ "$landing_host" != "${NGINX_LANDING_HOST:-}" ]; then
      fail "PUBLIC_LANDING_URL host must match NGINX_LANDING_HOST"
    fi
    if [ "$crm_host" != "${NGINX_CRM_HOST:-}" ]; then
      fail "PUBLIC_CRM_URL host must match NGINX_CRM_HOST"
    fi
    if [ "$api_host" != "${NGINX_API_HOST:-}" ]; then
      fail "PUBLIC_API_URL host must match NGINX_API_HOST"
    fi

    backup_dir=${VIVIANI_BACKUP_DIR:-$ROOT_DIR/backups}
    external_backup_dir=${BACKUP_EXTERNAL_DIR:-}
    if [ ! -d "$external_backup_dir" ] || [ ! -w "$external_backup_dir" ]; then
      fail "BACKUP_EXTERNAL_DIR must be an existing writable directory"
    fi
    case "$external_backup_dir" in
      "$backup_dir"|"$backup_dir"/*) fail "BACKUP_EXTERNAL_DIR must not be the local backup directory or a child of it" ;;
    esac

    tls_dir=${TLS_CERT_DIR:-$ROOT_DIR/deploy/vps/tls}
    if [ ! -r "$tls_dir/fullchain.pem" ]; then
      fail "TLS certificate not readable at $tls_dir/fullchain.pem"
    fi
    if [ ! -r "$tls_dir/privkey.pem" ]; then
      fail "TLS private key not readable at $tls_dir/privkey.pem"
    fi
    ;;
  development)
    ;;
  *)
    fail "DEPLOYMENT_STAGE must be development, homologacao or production"
    ;;
esac

if [ "$errors" -ne 0 ]; then
  exit 1
fi

echo "Preflight passed for stage=$stage"
