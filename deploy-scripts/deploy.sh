#!/usr/bin/env bash
# =============================================================================
# SIPI — one-command automated production deployment
# -----------------------------------------------------------------------------
# Provisions and (re)deploys the full stack on Ubuntu 24.04:
#
#     PostgreSQL + Redis + Django (ASGI/Channels via gunicorn+uvicorn)
#     + Nginx (domain vhosts, HTTPS via Let's Encrypt) + two Vite SPAs
#
# Design goals
#   * Single source of truth  — everything is generated from config.env
#                               (+ secrets.env). Change the public IP or a
#                               domain there, re-run, done.
#   * Idempotent              — safe to run any number of times.
#   * Self-healing            — detects and fixes the common failure causes.
#   * Fails loud              — reports the exact failing step and command.
#
# Usage
#   sudo ./deploy.sh                 # full deploy (first run or update)
#   sudo ./deploy.sh --frontend      # rebuild the two SPAs only
#   sudo ./deploy.sh --backend       # backend only (venv/migrate/restart)
#   sudo ./deploy.sh --nginx         # regenerate & reload Nginx config only
#   sudo ./deploy.sh --ssl           # (re)attempt certificate issuance only
#   sudo ./deploy.sh --skip-apt      # skip system package installation
#
# Generated artifacts (never edit these by hand — they are overwritten):
#   server/.env                              Django environment
#   client/student-side/.env                 VITE_API_BASE_URL
#   client/admin-side/.env                   VITE_API_BASE_URL
#   deploy-scripts/generated/gunicorn.conf.py
#   /etc/systemd/system/<SERVICE_NAME>.service
#   /etc/nginx/sites-available/<NGINX_SITE_NAME> (+ snippets, conf.d)
#   /etc/letsencrypt/renewal-hooks/deploy/sipi-reload-nginx.sh
# =============================================================================
set -Eeuo pipefail

# ---------------------------------------------------------------------------
# Paths & bootstrap
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"
SECRETS_FILE="${SCRIPT_DIR}/secrets.env"
SECRETS_EXAMPLE="${SCRIPT_DIR}/secrets.env.example"
GENERATED_DIR="${SCRIPT_DIR}/generated"

# System locations. Overridable via environment so the config-generation
# functions can be exercised in isolation (tests / dry runs).
NGINX_ROOT="${NGINX_ROOT:-/etc/nginx}"
SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
ERROR_PAGE_DIR="${ERROR_PAGE_DIR:-/var/www/sipi-error}"
LETSENCRYPT_LIVE="${LETSENCRYPT_LIVE:-/etc/letsencrypt/live}"

# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------
c_reset='\033[0m'; c_red='\033[0;31m'; c_grn='\033[0;32m'; c_yel='\033[0;33m'; c_blu='\033[0;36m'
log()  { echo -e "${c_blu}[*]${c_reset} $*"; }
ok()   { echo -e "${c_grn}[✓]${c_reset} $*"; }
warn() { echo -e "${c_yel}[!]${c_reset} $*"; }
err()  { echo -e "${c_red}[✗]${c_reset} $*" >&2; }
section() { echo; echo -e "${c_blu}========== $* ==========${c_reset}"; }

trap 'err "Deployment failed at line ${LINENO}: \`${BASH_COMMAND}\`. Fix the cause and re-run — the script is idempotent."' ERR

require_root() { [[ ${EUID} -eq 0 ]] || { err "Run with sudo:  sudo ./deploy.sh"; exit 1; }; }

# Retry flaky network operations (apt / npm / certbot).
retry() {
  local n=0 max=3
  until "$@"; do
    n=$((n+1))
    (( n >= max )) && { err "Command failed after ${max} attempts: $*"; return 1; }
    warn "Retry ${n}/${max}: $*"; sleep 3
  done
}

# ---------------------------------------------------------------------------
# Load configuration (config.env = infrastructure, secrets.env = credentials)
# ---------------------------------------------------------------------------
[[ -f "${CONFIG_FILE}" ]] || { err "Missing ${CONFIG_FILE}"; exit 1; }
# shellcheck disable=SC1090
source "${CONFIG_FILE}"

# --- secrets bootstrap ------------------------------------------------------
# secrets.env is gitignored. On first run it is created from the example and
# any missing values are auto-generated, so a fresh clone still deploys with
# ONE command. Values already present are never overwritten.
random_hex()  { python3 -c 'import secrets;print(secrets.token_hex(16))'; }
random_key()  { python3 -c 'import secrets;print(secrets.token_urlsafe(64))'; }

# Persist KEY="VALUE" into secrets.env (replace existing line or append).
set_secret() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "${SECRETS_FILE}"; then
    # Use a delimiter unlikely to appear in generated values.
    sed -i "s|^${key}=.*|${key}=\"${val}\"|" "${SECRETS_FILE}"
  else
    echo "${key}=\"${val}\"" >> "${SECRETS_FILE}"
  fi
}

ensure_secrets() {
  if [[ ! -f "${SECRETS_FILE}" ]]; then
    warn "No secrets.env found — creating one with generated credentials."
    cp "${SECRETS_EXAMPLE}" "${SECRETS_FILE}"
  fi
  chmod 600 "${SECRETS_FILE}"
  # shellcheck disable=SC1090
  source "${SECRETS_FILE}"

  # DB password: generate once.
  if [[ -z "${DB_PASSWORD:-}" ]]; then
    DB_PASSWORD="$(random_hex)"
    set_secret DB_PASSWORD "${DB_PASSWORD}"
    ok "Generated PostgreSQL password (stored in secrets.env)"
  fi

  # Django secret key: reuse an existing one from server/.env if present
  # (keeps sessions valid), otherwise generate once.
  if [[ -z "${DJANGO_SECRET_KEY:-}" ]]; then
    local existing=""
    if [[ -f "${PROJECT_PATH}/server/.env" ]]; then
      existing="$(grep '^SECRET_KEY=' "${PROJECT_PATH}/server/.env" 2>/dev/null | cut -d= -f2- || true)"
    fi
    DJANGO_SECRET_KEY="${existing:-$(random_key)}"
    set_secret DJANGO_SECRET_KEY "${DJANGO_SECRET_KEY}"
    ok "Django SECRET_KEY persisted to secrets.env"
  fi

  if [[ -z "${EMAIL_HOST_USER:-}" || -z "${EMAIL_HOST_PASSWORD:-}" ]]; then
    warn "EMAIL_HOST_USER / EMAIL_HOST_PASSWORD are empty in secrets.env —"
    warn "outgoing email (OTP, password reset, notifications) is DISABLED"
    warn "until you fill them in and re-run:  sudo ./deploy.sh --backend"
  fi
}

# ---------------------------------------------------------------------------
# Derived values — computed ONCE from config.env, used everywhere below.
# This is what makes an IP/domain change a one-file edit.
# ---------------------------------------------------------------------------
derive_settings() {
  SERVER_DIR="${PROJECT_PATH}/server"
  ADMIN_DIR="${PROJECT_PATH}/client/admin-side"
  STUDENT_DIR="${PROJECT_PATH}/client/student-side"
  VENV_DIR="${SERVER_DIR}/venv"
  PYBIN="${VENV_DIR}/bin/python"
  PIPBIN="${VENV_DIR}/bin/pip"
  GUNICORN_CONF="${GENERATED_DIR}/gunicorn.conf.py"

  # Domain mode: both domains set -> name-based vhosts (+ optional HTTPS).
  # Otherwise: legacy direct-IP mode on STUDENT_PORT / ADMIN_PORT.
  DOMAIN_MODE=0
  if [[ -n "${STUDENT_DOMAIN}" && -n "${ADMIN_DOMAIN}" ]]; then DOMAIN_MODE=1; fi

  SSL_ON=0
  if [[ "${ENABLE_SSL}" == "true" ]]; then
    if (( DOMAIN_MODE )); then SSL_ON=1
    else warn "ENABLE_SSL=true requires STUDENT_DOMAIN and ADMIN_DOMAIN — staying on HTTP."
    fi
  fi

  SCHEME="http"
  if (( SSL_ON )); then SCHEME="https"; fi

  # Direct-IP origins (fallback access before DNS propagates).
  IP_STUDENT_ORIGIN="http://${PUBLIC_IP}"
  if [[ "${STUDENT_PORT}" != "80" ]]; then IP_STUDENT_ORIGIN="http://${PUBLIC_IP}:${STUDENT_PORT}"; fi
  IP_ADMIN_ORIGIN="http://${PUBLIC_IP}:${ADMIN_PORT}"

  if (( DOMAIN_MODE )); then
    STUDENT_ORIGIN="${SCHEME}://${STUDENT_DOMAIN}"
    ADMIN_ORIGIN="${SCHEME}://${ADMIN_DOMAIN}"
    ALLOWED_HOSTS="${STUDENT_DOMAIN},${ADMIN_DOMAIN},${PUBLIC_IP},localhost,127.0.0.1"
    if (( SSL_ON )); then
      # With HTTPS, direct-IP requests are redirected to the domains, so the
      # plain-HTTP IP origins are intentionally NOT trusted for CSRF/CORS.
      STUDENT_PORTAL_ORIGINS="${STUDENT_ORIGIN}"
      ADMIN_PORTAL_ORIGINS="${ADMIN_ORIGIN}"
    else
      STUDENT_PORTAL_ORIGINS="${STUDENT_ORIGIN},${IP_STUDENT_ORIGIN}"
      ADMIN_PORTAL_ORIGINS="${ADMIN_ORIGIN},${IP_ADMIN_ORIGIN}"
    fi
  else
    STUDENT_ORIGIN="${IP_STUDENT_ORIGIN}"
    ADMIN_ORIGIN="${IP_ADMIN_ORIGIN}"
    ALLOWED_HOSTS="${PUBLIC_IP},localhost,127.0.0.1"
    STUDENT_PORTAL_ORIGINS="${STUDENT_ORIGIN}"
    ADMIN_PORTAL_ORIGINS="${ADMIN_ORIGIN}"
  fi
}

validate_config() {
  section "Configuration"
  local fail=0
  [[ -n "${PUBLIC_IP}" ]]      || { err "PUBLIC_IP is empty in config.env"; fail=1; }
  [[ -d "${PROJECT_PATH}" ]]   || { err "PROJECT_PATH does not exist: ${PROJECT_PATH}"; fail=1; }
  [[ -d "${SERVER_DIR}" ]]     || { err "Missing ${SERVER_DIR}"; fail=1; }
  [[ -d "${STUDENT_DIR}" ]]    || { err "Missing ${STUDENT_DIR}"; fail=1; }
  [[ -d "${ADMIN_DIR}" ]]      || { err "Missing ${ADMIN_DIR}"; fail=1; }
  if (( SSL_ON )) && [[ -z "${LETSENCRYPT_EMAIL}" ]]; then
    err "ENABLE_SSL=true requires LETSENCRYPT_EMAIL in config.env"; fail=1
  fi
  if (( fail )); then exit 1; fi

  log "Mode          : $( (( DOMAIN_MODE )) && echo "domains (${STUDENT_DOMAIN} / ${ADMIN_DOMAIN})" || echo "direct IP" )"
  log "HTTPS         : $( (( SSL_ON )) && echo enabled || echo disabled )"
  log "Public IP     : ${PUBLIC_IP}"
  log "Student origin: ${STUDENT_ORIGIN}"
  log "Admin origin  : ${ADMIN_ORIGIN}"
  log "Project path  : ${PROJECT_PATH}"
  ok  "Configuration valid"
}

# ===========================================================================
# 1. SYSTEM PACKAGES  (self-heals a missing/old Node; adds certbot for SSL)
# ===========================================================================
install_system_packages() {
  section "System packages"
  export DEBIAN_FRONTEND=noninteractive
  retry apt-get update -y
  retry apt-get install -y \
    python3 python3-venv python3-dev build-essential libpq-dev \
    postgresql postgresql-contrib redis-server nginx git curl \
    ca-certificates gnupg ufw openssl

  if (( SSL_ON )); then retry apt-get install -y certbot; fi

  # Node: ensure a modern LTS. Ubuntu's apt node is often too old for Vite 5.
  local need_node=1
  if command -v node >/dev/null 2>&1; then
    local major; major="$(node -v | sed 's/v\([0-9]*\).*/\1/')"
    (( major >= 18 )) && need_node=0 || warn "Node v${major} is too old (need >= 18)."
  fi
  if (( need_node )); then
    log "Installing Node.js ${NODE_MAJOR}.x from NodeSource..."
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
    retry apt-get install -y nodejs
  fi
  ok "Node $(node -v) / npm $(npm -v)"
  ok "System packages ready"
}

# ===========================================================================
# 2. SERVICES  (PostgreSQL + Redis)
# ===========================================================================
setup_services() {
  section "PostgreSQL & Redis"
  systemctl enable --now postgresql
  systemctl enable --now redis-server

  local tries=0
  until sudo -u postgres psql -c '\q' >/dev/null 2>&1; do
    tries=$((tries+1)); (( tries > 15 )) && { err "PostgreSQL not responding"; return 1; }
    sleep 2
  done

  # Role + database (idempotent; password kept in sync with secrets.env).
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
    ok "Created DB user ${DB_USER}"
  else
    sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
  fi
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
    ok "Created database ${DB_NAME}"
  fi
  sudo -u postgres psql -c "ALTER ROLE ${DB_USER} CREATEDB;" >/dev/null
  sudo -u postgres psql -c "ALTER ROLE ${DB_USER} SET client_encoding TO 'utf8';" >/dev/null
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" >/dev/null

  redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ping >/dev/null 2>&1 \
    && ok "Redis responding (PONG)" || { err "Redis not responding"; return 1; }
  ok "Databases ready"
}

# ===========================================================================
# 3. BACKEND  (.env, venv, deps, migrate, static, superuser)
# ===========================================================================
write_backend_env() {
  local env_file="${SERVER_DIR}/.env"

  # SMTP server settings come from config.env (EMAIL_HOST/PORT/TLS/SSL), the
  # login credentials from secrets.env — nothing about the mail provider is
  # hardcoded here. Switching from Gmail to the institute's own server
  # (noreply@spisg.gov.bd) is a config.env + secrets.env edit, then a re-run.
  local email_host="${EMAIL_HOST:-smtp.gmail.com}"
  local email_port="${EMAIL_PORT:-587}"
  local email_use_tls="${EMAIL_USE_TLS:-True}"
  local email_use_ssl="${EMAIL_USE_SSL:-False}"

  # From address: explicit config value wins; otherwise derive from the login
  # user (falling back to a domain-based noreply address when no user is set).
  local from_email="${DEFAULT_FROM_EMAIL:-}"
  if [[ -z "${from_email}" ]]; then
    from_email="SIPI Management System <${EMAIL_HOST_USER:-noreply@${STUDENT_DOMAIN:-localhost}}>"
  fi

  # Email: real SMTP only when credentials exist; console backend otherwise
  # so the app never hangs trying to send with empty credentials.
  local email_backend="django.core.mail.backends.smtp.EmailBackend"
  if [[ -z "${EMAIL_HOST_USER:-}" || -z "${EMAIL_HOST_PASSWORD:-}" ]]; then
    email_backend="django.core.mail.backends.console.EmailBackend"
  fi

  local cookie_secure="False"
  if (( SSL_ON )); then cookie_secure="True"; fi

  cat > "${env_file}" <<EOF
# =============================================================================
# GENERATED by deploy-scripts/deploy.sh — DO NOT EDIT BY HAND.
# Change deploy-scripts/config.env (or secrets.env) and re-run the deploy.
# =============================================================================

# --- Database ---------------------------------------------------------------
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}

# --- Redis (Channels / WebSockets) -------------------------------------------
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}

# --- Core Django --------------------------------------------------------------
SECRET_KEY=${DJANGO_SECRET_KEY}
DEBUG=False
ALLOWED_HOSTS=${ALLOWED_HOSTS}

# --- Reverse proxy / HTTPS ----------------------------------------------------
# Nginx terminates TLS and always overrides X-Forwarded-Proto, so Django may
# trust it to know whether the original request was HTTPS.
USE_X_FORWARDED_PROTO=True
# Secure cookie flags follow ENABLE_SSL in config.env.
CSRF_COOKIE_SECURE=${cookie_secure}
SESSION_COOKIE_SECURE=${cookie_secure}

# --- Portal origins (drive CORS, CSRF and login portal routing) ---------------
STUDENT_PORTAL_ORIGINS=${STUDENT_PORTAL_ORIGINS}
ADMIN_PORTAL_ORIGINS=${ADMIN_PORTAL_ORIGINS}

# --- Public URLs used inside outgoing emails ----------------------------------
STUDENT_PORTAL_URL=${STUDENT_ORIGIN}
ADMIN_PORTAL_URL=${ADMIN_ORIGIN}

# --- Email (SMTP server from config.env; credentials from secrets.env) --------
EMAIL_BACKEND=${email_backend}
EMAIL_HOST=${email_host}
EMAIL_PORT=${email_port}
EMAIL_USE_TLS=${email_use_tls}
EMAIL_USE_SSL=${email_use_ssl}
EMAIL_HOST_USER=${EMAIL_HOST_USER:-}
EMAIL_HOST_PASSWORD=${EMAIL_HOST_PASSWORD:-}
DEFAULT_FROM_EMAIL=${from_email}
EMAIL_TIMEOUT=30

# --- OTP / rate limits ---------------------------------------------------------
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3
PASSWORD_RESET_RATE_LIMIT_PER_HOUR=3

# --- Google Sign-In (student portal) ------------------------------------------
# Public OAuth Web Client ID; empty disables the "Continue with Google" flow.
GOOGLE_OAUTH_CLIENT_ID=${GOOGLE_OAUTH_CLIENT_ID:-}
EOF

  chown "${RUN_AS_USER}:${RUN_AS_USER}" "${env_file}"
  chmod 600 "${env_file}"
  ok "Wrote ${env_file} (owner ${RUN_AS_USER}, mode 600)"
}

setup_backend() {
  section "Backend (Django ASGI)"
  write_backend_env

  if [[ ! -x "${PYBIN}" ]]; then
    warn "Creating virtualenv..."
    rm -rf "${VENV_DIR}"
    python3 -m venv "${VENV_DIR}"
  fi
  retry "${PIPBIN}" install --upgrade pip wheel setuptools
  retry "${PIPBIN}" install -r "${SERVER_DIR}/requirements.txt"

  mkdir -p "${GUNICORN_LOG_DIR}" && chown -R "${RUN_AS_USER}:${RUN_AS_USER}" "${GUNICORN_LOG_DIR}"

  # NOTE: deployment intentionally NEVER backs up. Backups are a separate,
  # explicit concern — run deploy-scripts/backup.sh (or the daily timer it
  # installs). This keeps deploy fast, side-effect-free and idempotent.
  ( cd "${SERVER_DIR}"
    "${PYBIN}" manage.py migrate --noinput
    "${PYBIN}" manage.py collectstatic --noinput
  )

  # Optional superuser (all three secrets set + user absent).
  if [[ -n "${DJANGO_SUPERUSER_USERNAME:-}" && -n "${DJANGO_SUPERUSER_EMAIL:-}" && -n "${DJANGO_SUPERUSER_PASSWORD:-}" ]]; then
    ( cd "${SERVER_DIR}"
      "${PYBIN}" manage.py shell -c "
from django.contrib.auth import get_user_model
U = get_user_model()
u = '${DJANGO_SUPERUSER_USERNAME}'
if not U.objects.filter(username=u).exists():
    U.objects.create_superuser(u, '${DJANGO_SUPERUSER_EMAIL}', '${DJANGO_SUPERUSER_PASSWORD}')
    print('superuser created')
else:
    print('superuser exists')
" )
  fi
  ok "Backend prepared"
}

# ===========================================================================
# 4. FRONT-ENDS  (write .env, npm install, build)
# ===========================================================================
build_frontend() {
  local dir="$1" api_url="$2" name="$3"
  log "Building ${name} (API: ${api_url})"

  # Write the API URL to .env.production.local — Vite's HIGHEST-priority env
  # file for a production build. This guarantees the value derived from
  # config.env wins over any committed .env / .env.production in the repo, so
  # the central config is always authoritative (and it is gitignored, so it
  # never conflicts with git). We also write .env for tooling/visibility.
  # The student SPA reads VITE_GOOGLE_CLIENT_ID for the "Continue with Google"
  # button. It is written to both frontends for simplicity; the admin SPA ignores
  # it. Empty value => the button is hidden.
  local generated="# GENERATED by deploy-scripts/deploy.sh — do not edit; re-run the deploy.
VITE_API_BASE_URL=${api_url}
VITE_GOOGLE_CLIENT_ID=${GOOGLE_OAUTH_CLIENT_ID:-}"
  echo "${generated}" > "${dir}/.env.production.local"
  echo "${generated}" > "${dir}/.env"

  # Give low-RAM servers enough heap so the Vite build never OOM-kills.
  export NODE_OPTIONS="--max-old-space-size=2048"
  ( cd "${dir}"
    retry npm install --no-audit --no-fund
    npm run build
  )
  [[ -d "${dir}/dist" ]] || { err "${name} build produced no dist/"; return 1; }
  ok "${name} built -> ${dir}/dist"
}

setup_frontends() {
  section "Front-ends"
  # Each SPA calls the API on its OWN origin — no CORS, first-party cookies.
  build_frontend "${STUDENT_DIR}" "${STUDENT_ORIGIN}/api" "student-side"
  build_frontend "${ADMIN_DIR}"   "${ADMIN_ORIGIN}/api"   "admin-side"
}

# ===========================================================================
# 5. GUNICORN + SYSTEMD  (ASGI: HTTP + WebSockets through uvicorn workers)
# ===========================================================================
write_gunicorn_conf() {
  mkdir -p "${GENERATED_DIR}"
  cat > "${GUNICORN_CONF}" <<EOF
# =============================================================================
# GENERATED gunicorn configuration — regenerated by deploy.sh on every deploy.
# Tuning knobs live in deploy-scripts/config.env (section 7).
# =============================================================================
import multiprocessing

# --- Binding -----------------------------------------------------------------
# Loopback only: Nginx is the sole public entry point.
bind = "${BACKEND_BIND}"

# --- Workers -----------------------------------------------------------------
# The app uses Django Channels (WebSockets), so workers MUST speak ASGI.
worker_class = "uvicorn.workers.UvicornWorker"

# Auto-size from CPU (2*cores+1), capped to avoid DB-connection exhaustion on
# large machines. Override with GUNICORN_WORKERS in config.env.
workers = ${GUNICORN_WORKERS:-0} or min(multiprocessing.cpu_count() * 2 + 1, 9)

# --- Lifecycle ---------------------------------------------------------------
# Kill a worker stuck longer than this (matches Nginx proxy_read_timeout).
timeout = ${GUNICORN_TIMEOUT}
# On restart/reload, give in-flight requests this long to finish (graceful).
graceful_timeout = ${GUNICORN_GRACEFUL_TIMEOUT}
# Keep idle keep-alive connections from Nginx open briefly.
keepalive = 5

# Recycle each worker after N requests (+ random jitter so workers never
# restart at the same moment) — caps slow memory growth in long-lived workers.
max_requests = ${GUNICORN_MAX_REQUESTS}
max_requests_jitter = $(( GUNICORN_MAX_REQUESTS / 10 ))

# preload_app must stay False: uvicorn workers + Channels manage their own
# event loop per process; preloading breaks clean worker recycling.
preload_app = False

# --- Security ----------------------------------------------------------------
# Only trust X-Forwarded-* headers coming from the local Nginx.
forwarded_allow_ips = "127.0.0.1"
# Sane request-line/field limits (defence against oversized-header abuse).
limit_request_line = 8190
limit_request_fields = 100
limit_request_field_size = 16384

# --- Logging -----------------------------------------------------------------
accesslog = "${GUNICORN_LOG_DIR}/access.log"
errorlog = "${GUNICORN_LOG_DIR}/error.log"
loglevel = "info"
capture_output = True          # app print()/tracebacks end up in the error log
proc_name = "${SERVICE_NAME}"
EOF
  ok "Wrote ${GUNICORN_CONF}"
}

setup_systemd() {
  section "systemd service"
  write_gunicorn_conf

  cat > "${SYSTEMD_DIR}/${SERVICE_NAME}.service" <<EOF
# GENERATED by deploy-scripts/deploy.sh — do not edit; re-run the deploy.
[Unit]
Description=SIPI Django ASGI backend (gunicorn + uvicorn workers)
Documentation=file://${PROJECT_PATH}/deploy-scripts/README.md
After=network.target postgresql.service redis-server.service
Requires=postgresql.service redis-server.service

[Service]
User=${RUN_AS_USER}
Group=${RUN_AS_USER}
WorkingDirectory=${SERVER_DIR}
Environment=PYTHONUNBUFFERED=1
ExecStart=${VENV_DIR}/bin/gunicorn -c ${GUNICORN_CONF} slms_core.asgi:application
# SIGHUP = graceful reload (finish in-flight requests, then swap workers).
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=5
LimitNOFILE=65535

# --- Sandboxing (defence in depth) -----------------------------------------
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
# The service may write ONLY where it genuinely needs to:
ReadWritePaths=${SERVER_DIR}/storage ${SERVER_DIR}/media ${GUNICORN_LOG_DIR}

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable "${SERVICE_NAME}"
  ok "systemd unit installed: ${SERVICE_NAME}.service"
}

# ===========================================================================
# 6. NGINX  (generated from config.env; SSL-aware; safe rollback)
# ===========================================================================

# Does a usable Let's Encrypt certificate exist for this domain?
have_cert() { [[ -s "${LETSENCRYPT_LIVE}/$1/fullchain.pem" ]]; }

write_nginx_snippets() {
  mkdir -p ${NGINX_ROOT}/snippets ${NGINX_ROOT}/conf.d ${NGINX_ROOT}/sites-available ${NGINX_ROOT}/sites-enabled "${ACME_WEBROOT}" ${ERROR_PAGE_DIR}

  # Global hardening + rate-limit zone (http context).
  cat > ${NGINX_ROOT}/conf.d/sipi-global.conf <<EOF
# GENERATED by deploy.sh — global settings for the SIPI sites.
server_tokens off;
# Throttle brute-force attempts against auth endpoints (per client IP).
# Generous limits: normal users never notice; bots do.
limit_req_zone \$binary_remote_addr zone=sipi_auth:10m rate=10r/s;
limit_req_status 429;
EOF

  # Security headers. NOTE: nginx 'add_header' is NOT inherited into any
  # location that declares its own add_header, so this snippet is re-included
  # wherever needed.
  cat > ${NGINX_ROOT}/snippets/sipi-security-headers.conf <<EOF
# GENERATED by deploy.sh — shared security headers.
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
# CSP tuned for the two Vite SPAs: self-hosted bundles, Google Fonts,
# same-origin API + WebSockets, images from self/data/blob/https.
# Cloudflare Web Analytics beacon (auto-injected by the proxy) is allowed:
# script from static.cloudflareinsights.com, RUM POST to cloudflareinsights.com.
add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' ws: wss: https://fonts.googleapis.com https://fonts.gstatic.com https://cloudflareinsights.com; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" always;
EOF

  # Compression (safe types only; never compress already-compressed media).
  cat > ${NGINX_ROOT}/snippets/sipi-gzip.conf <<'EOF'
# GENERATED by deploy.sh — response compression.
gzip on;
gzip_vary on;
gzip_comp_level 5;
gzip_min_length 1024;
gzip_proxied any;
gzip_types
    text/plain text/css text/xml application/json application/javascript
    application/xml application/xml+rss image/svg+xml font/ttf font/otf
    application/vnd.ms-fontobject application/x-font-ttf;
EOF

  # TLS parameters (used by every HTTPS server block).
  cat > ${NGINX_ROOT}/snippets/sipi-tls.conf <<'EOF'
# GENERATED by deploy.sh — modern TLS configuration.
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;      # let modern clients pick (Mozilla guidance)
ssl_session_cache shared:SIPI_SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;
EOF

  # Reverse-proxy parameters shared by API / websocket / Django-admin routes.
  cat > ${NGINX_ROOT}/snippets/sipi-proxy.conf <<EOF
# GENERATED by deploy.sh — shared reverse-proxy parameters.
proxy_set_header Host \$host;
proxy_set_header X-Real-IP \$remote_addr;
proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
# ALWAYS overridden here (never pass through the client's value) — Django is
# configured to trust this header for HTTPS detection.
proxy_set_header X-Forwarded-Proto \$scheme;
proxy_connect_timeout 10s;
proxy_send_timeout ${PROXY_READ_TIMEOUT}s;
proxy_read_timeout ${PROXY_READ_TIMEOUT}s;
proxy_buffering on;
EOF

  # Friendly static error page for backend outages.
  cat > ${ERROR_PAGE_DIR}/sipi-50x.html <<'EOF'
<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>SIPI — Temporarily Unavailable</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#0f172a}
main{text-align:center;padding:2rem}h1{font-size:1.5rem}p{color:#475569}</style></head>
<body><main><h1>We&rsquo;ll be right back</h1>
<p>The SIPI portal is restarting or under maintenance.<br>Please try again in a minute.</p>
</main></body></html>
EOF
}

# The application locations shared by every site (root is set per-server).
nginx_app_locations() {
  cat <<EOF
    include ${NGINX_ROOT}/snippets/sipi-security-headers.conf;
    include ${NGINX_ROOT}/snippets/sipi-gzip.conf;

    client_max_body_size ${CLIENT_MAX_BODY_SIZE};

    # Friendly page when the backend is down/restarting.
    error_page 502 503 504 /sipi-50x.html;
    location = /sipi-50x.html { root ${ERROR_PAGE_DIR}; internal; }

    # --- Auth endpoints: rate-limited against brute force -----------------
    location /api/auth/ {
        limit_req zone=sipi_auth burst=20 nodelay;
        proxy_pass http://${BACKEND_BIND};
        include ${NGINX_ROOT}/snippets/sipi-proxy.conf;
    }

    # --- REST API ----------------------------------------------------------
    location /api/ {
        proxy_pass http://${BACKEND_BIND};
        include ${NGINX_ROOT}/snippets/sipi-proxy.conf;
    }

    # --- WebSockets (Channels notifications) --------------------------------
    location /ws/ {
        proxy_pass http://${BACKEND_BIND};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 3600s;      # long-lived notification sockets
        proxy_send_timeout 3600s;
    }

    # --- Django admin --------------------------------------------------------
    location /admin/ {
        proxy_pass http://${BACKEND_BIND};
        include ${NGINX_ROOT}/snippets/sipi-proxy.conf;
    }

    # --- Backend-served files ------------------------------------------------
    location /static/ {
        alias ${SERVER_DIR}/staticfiles/;
        include ${NGINX_ROOT}/snippets/sipi-security-headers.conf;
        expires 30d;
        add_header Cache-Control "public";
    }
    location /media/ {
        alias ${SERVER_DIR}/media/;
        include ${NGINX_ROOT}/snippets/sipi-security-headers.conf;
        expires 7d;
        add_header Cache-Control "private";
    }
    # SECURITY: the document store (NID / birth certificates / marksheets /
    # photos) is NEVER served directly to the public web. It is reachable ONLY
    # through the authenticated, per-object-authorised Django endpoints
    # (/api/documents/{id}/download|preview/), which stream the file after
    # checking the caller may see it. The 'internal' directive means an outside request to
    # /files/... returns 404; the directive is kept so the app can opt into
    # X-Accel-Redirect later without another Nginx change.
    location /files/ {
        internal;
        alias ${SERVER_DIR}/storage/Documents/;
    }

    # --- SPA assets: content-hashed filenames -> cache forever ---------------
    location /assets/ {
        include ${NGINX_ROOT}/snippets/sipi-security-headers.conf;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # --- SPA entry point: never cache (instant rollout of new builds) --------
    location = /index.html {
        include ${NGINX_ROOT}/snippets/sipi-security-headers.conf;
        add_header Cache-Control "no-cache";
        try_files \$uri =404;
    }

    # --- SPA router fallback --------------------------------------------------
    location / {
        try_files \$uri \$uri/ /index.html;
    }
EOF
}

# ACME challenge location (must be reachable over plain HTTP on port 80).
nginx_acme_location() {
  cat <<EOF
    # Let's Encrypt HTTP-01 challenges.
    location ^~ /.well-known/acme-challenge/ {
        root ${ACME_WEBROOT};
        default_type "text/plain";
    }
EOF
}

# Reverse-proxy vhost for a Mailcow web UI running on this host. Terminates the
# public Let's Encrypt TLS for ${MAIL_DOMAIN} and forwards to Mailcow's loopback
# HTTPS (127.0.0.1:8443). No-op when MAIL_DOMAIN is empty. The app's security-
# headers/gzip snippets are deliberately NOT included — Mailcow serves its own.
nginx_mail_proxy() {
  [[ -n "${MAIL_DOMAIN}" ]] || return 0
  local mail_ssl=0
  if (( SSL_ON )) && have_cert "${MAIL_DOMAIN}"; then mail_ssl=1; fi

  echo "# ---- ${MAIL_DOMAIN}: Mailcow reverse proxy ----"
  if (( mail_ssl )); then
    cat <<EOF
server {
    listen 80;
    server_name ${MAIL_DOMAIN};
$(nginx_acme_location)
    location / { return 301 https://${MAIL_DOMAIN}\$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name ${MAIL_DOMAIN};

    ssl_certificate     ${LETSENCRYPT_LIVE}/${MAIL_DOMAIN}/fullchain.pem;
    ssl_certificate_key ${LETSENCRYPT_LIVE}/${MAIL_DOMAIN}/privkey.pem;
    include ${NGINX_ROOT}/snippets/sipi-tls.conf;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    access_log /var/log/nginx/${NGINX_SITE_NAME}-mail-access.log;
    error_log  /var/log/nginx/${NGINX_SITE_NAME}-mail-error.log;

    # Mail attachments can be large — let Mailcow enforce its own limit.
    client_max_body_size 0;

    location / {
        proxy_pass https://127.0.0.1:8443;
        proxy_ssl_verify off;                 # Mailcow presents its own internal cert
        proxy_http_version 1.1;
        proxy_set_header Host              \$http_host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        # WebSocket / long-poll (SOGo webmail, admin UI, ActiveSync).
        proxy_set_header Upgrade           \$http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF
  else
    cat <<EOF
# TLS not issued yet for ${MAIL_DOMAIN}: serve only the ACME challenge on port 80
# so certbot can obtain the certificate, then re-run:
#     sudo ./deploy-scripts/deploy.sh --ssl
# to add the HTTPS reverse-proxy block above.
server {
    listen 80;
    server_name ${MAIL_DOMAIN};
$(nginx_acme_location)
    location / { return 503; }
}
EOF
  fi
}

# One full application server block. $1=listen  $2=server_name  $3=root
# $4=extra directives (e.g. SSL certs / HSTS), may be empty.
nginx_app_server() {
  local listen="$1" names="$2" root="$3" extra="$4"
  cat <<EOF
server {
    listen ${listen};
    server_name ${names};
    root ${root};
    index index.html;

    access_log /var/log/nginx/${NGINX_SITE_NAME}-access.log;
    error_log  /var/log/nginx/${NGINX_SITE_NAME}-error.log;
${extra}
$(nginx_acme_location)
$(nginx_app_locations)
}
EOF
}

# HTTPS extras for a domain: certificates + TLS params + HSTS.
nginx_ssl_extra() {
  local domain="$1"
  cat <<EOF
    ssl_certificate     ${LETSENCRYPT_LIVE}/${domain}/fullchain.pem;
    ssl_certificate_key ${LETSENCRYPT_LIVE}/${domain}/privkey.pem;
    include ${NGINX_ROOT}/snippets/sipi-tls.conf;
    # HSTS: browsers remember to use HTTPS for 1 year. Only sent over HTTPS.
    # (The shared security headers are included once by the app-locations
    # block, so they are NOT repeated here.)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
EOF
}

write_nginx_site() {
  local site="${NGINX_ROOT}/sites-available/${NGINX_SITE_NAME}"
  local tmp; tmp="$(mktemp)"

  {
    echo "# ============================================================================="
    echo "# GENERATED by deploy-scripts/deploy.sh on $(date -u +'%Y-%m-%d %H:%M UTC')"
    echo "# Source of truth: deploy-scripts/config.env — edit there and re-run deploy."
    echo "# ============================================================================="
    echo

    if (( DOMAIN_MODE )); then
      local student_ssl=0 admin_ssl=0
      if (( SSL_ON )) && have_cert "${STUDENT_DOMAIN}"; then student_ssl=1; fi
      if (( SSL_ON )) && have_cert "${ADMIN_DOMAIN}";   then admin_ssl=1;   fi

      # ----- Student domain -----------------------------------------------
      if (( student_ssl )); then
        cat <<EOF
# ---- ${STUDENT_DOMAIN}: HTTP -> HTTPS (ACME stays on HTTP) ----
server {
    listen 80;
    server_name ${STUDENT_DOMAIN};
$(nginx_acme_location)
    location / { return 301 https://${STUDENT_DOMAIN}\$request_uri; }
}

# ---- ${STUDENT_DOMAIN}: student portal (HTTPS) ----
EOF
        nginx_app_server "443 ssl http2" "${STUDENT_DOMAIN}" "${STUDENT_DIR}/dist" "$(nginx_ssl_extra "${STUDENT_DOMAIN}")"
      else
        echo "# ---- ${STUDENT_DOMAIN}: student portal (HTTP) ----"
        nginx_app_server "80" "${STUDENT_DOMAIN}" "${STUDENT_DIR}/dist" ""
      fi
      echo

      # ----- Admin domain -------------------------------------------------
      if (( admin_ssl )); then
        cat <<EOF
# ---- ${ADMIN_DOMAIN}: HTTP -> HTTPS (ACME stays on HTTP) ----
server {
    listen 80;
    server_name ${ADMIN_DOMAIN};
$(nginx_acme_location)
    location / { return 301 https://${ADMIN_DOMAIN}\$request_uri; }
}

# ---- ${ADMIN_DOMAIN}: admin portal (HTTPS) ----
EOF
        nginx_app_server "443 ssl http2" "${ADMIN_DOMAIN}" "${ADMIN_DIR}/dist" "$(nginx_ssl_extra "${ADMIN_DOMAIN}")"
      else
        echo "# ---- ${ADMIN_DOMAIN}: admin portal (HTTP) ----"
        nginx_app_server "80" "${ADMIN_DOMAIN}" "${ADMIN_DIR}/dist" ""
      fi
      echo

      # ----- Direct-IP fallbacks -------------------------------------------
      if (( student_ssl )); then
        cat <<EOF
# ---- Direct IP -> canonical student domain ----
server {
    listen ${STUDENT_PORT};
    server_name ${PUBLIC_IP};
    return 301 https://${STUDENT_DOMAIN}\$request_uri;
}

# ---- Direct IP:${ADMIN_PORT} -> canonical admin domain ----
server {
    listen ${ADMIN_PORT} default_server;
    server_name _;
    return 301 https://${ADMIN_DOMAIN}\$request_uri;
}
EOF
      else
        echo "# ---- Direct IP fallback: student portal ----"
        nginx_app_server "${STUDENT_PORT}" "${PUBLIC_IP}" "${STUDENT_DIR}/dist" ""
        echo
        echo "# ---- Direct IP fallback: admin portal ----"
        nginx_app_server "${ADMIN_PORT} default_server" "_" "${ADMIN_DIR}/dist" ""
      fi
      echo

      # ----- Mailcow reverse proxy (optional; no-op when MAIL_DOMAIN empty) --
      nginx_mail_proxy
      echo

      # ----- Catch-all: drop requests with unknown Host headers -------------
      cat <<'EOF'
# ---- Unknown Host header (scanners / host-header attacks): close connection ----
server {
    listen 80 default_server;
    server_name _;
    return 444;
}
EOF
    else
      # ----- Pure IP mode ----------------------------------------------------
      echo "# ---- Student portal (direct IP mode) ----"
      nginx_app_server "${STUDENT_PORT} default_server" "${PUBLIC_IP} _" "${STUDENT_DIR}/dist" ""
      echo
      echo "# ---- Admin portal (direct IP mode) ----"
      nginx_app_server "${ADMIN_PORT} default_server" "${PUBLIC_IP} _" "${ADMIN_DIR}/dist" ""
    fi
  } > "${tmp}"

  # --- Apply with rollback: never leave Nginx broken -----------------------
  local backup=""
  if [[ -f "${site}" ]]; then
    backup="$(mktemp)"; cp "${site}" "${backup}"
  fi
  mv "${tmp}" "${site}"
  ln -sf "${site}" "${NGINX_ROOT}/sites-enabled/${NGINX_SITE_NAME}"
  rm -f ${NGINX_ROOT}/sites-enabled/default

  if ! nginx -t 2>&1; then
    err "New Nginx config failed validation."
    if [[ -n "${backup}" ]]; then
      warn "Restoring previous working config."
      cp "${backup}" "${site}"
      nginx -t
    fi
    return 1
  fi
  if [[ -n "${backup}" ]]; then rm -f "${backup}"; fi
  ok "Nginx site written and validated: ${site}"
}

setup_nginx() {
  section "Nginx"
  write_nginx_snippets
  write_nginx_site
  systemctl enable nginx
  systemctl reload nginx 2>/dev/null || systemctl restart nginx
  ok "Nginx configured"
}

# ===========================================================================
# 7. SSL  (Let's Encrypt via webroot; graceful when DNS is not ready)
# ===========================================================================
dns_points_here() {
  local domain="$1" resolved
  resolved="$(getent ahostsv4 "${domain}" 2>/dev/null | awk '{print $1}' | sort -u | head -5 || true)"
  [[ -z "${resolved}" ]] && return 1
  grep -qx "${PUBLIC_IP}" <<< "${resolved}"
}

obtain_cert() {
  local domain="$1"
  if have_cert "${domain}"; then
    ok "Certificate already present for ${domain}"
    return 0
  fi
  if ! dns_points_here "${domain}"; then
    warn "DNS for ${domain} does not resolve to ${PUBLIC_IP} yet — skipping issuance."
    warn "Point the A record at ${PUBLIC_IP}, wait for propagation, then re-run:"
    warn "    sudo ./deploy-scripts/deploy.sh --ssl"
    return 1
  fi
  log "Requesting Let's Encrypt certificate for ${domain}..."
  retry certbot certonly --webroot -w "${ACME_WEBROOT}" \
    -d "${domain}" \
    --email "${LETSENCRYPT_EMAIL}" --agree-tos --no-eff-email \
    --keep-until-expiring --non-interactive
}

setup_ssl() {
  (( SSL_ON )) || return 0
  section "SSL (Let's Encrypt)"
  mkdir -p "${ACME_WEBROOT}"

  # Nginx must already be answering HTTP for the webroot challenge.
  systemctl is-active --quiet nginx || systemctl start nginx

  local got_any=0
  obtain_cert "${STUDENT_DOMAIN}" && got_any=1 || true
  obtain_cert "${ADMIN_DOMAIN}"   && got_any=1 || true
  # Optional Mailcow reverse-proxy vhost gets its own certificate.
  [[ -n "${MAIL_DOMAIN}" ]] && { obtain_cert "${MAIL_DOMAIN}" && got_any=1 || true; }

  # Auto-renewal: certbot's systemd timer ships with the package; add a hook
  # so Nginx picks up renewed certificates automatically.
  mkdir -p /etc/letsencrypt/renewal-hooks/deploy
  cat > /etc/letsencrypt/renewal-hooks/deploy/sipi-reload-nginx.sh <<'EOF'
#!/usr/bin/env bash
# Reload Nginx after certbot renews any certificate (installed by deploy.sh).
systemctl reload nginx
EOF
  chmod +x /etc/letsencrypt/renewal-hooks/deploy/sipi-reload-nginx.sh
  systemctl enable --now certbot.timer 2>/dev/null || true

  if (( got_any )); then
    # Regenerate the site: domains that now have certificates get HTTPS blocks.
    write_nginx_site
    systemctl reload nginx
    ok "HTTPS active for issued domains (auto-renewal enabled)"
  else
    warn "No certificates issued yet — the sites remain on HTTP. Re-run --ssl after DNS propagates."
  fi
}

# ===========================================================================
# 8. PERMISSIONS
# ===========================================================================
fix_permissions() {
  section "Permissions"
  chown -R "${RUN_AS_USER}:${RUN_AS_USER}" "${PROJECT_PATH}"
  mkdir -p "${SERVER_DIR}/storage" "${SERVER_DIR}/media" "${SERVER_DIR}/staticfiles"
  chmod -R u+rwX,g+rX,o-rwx "${SERVER_DIR}/storage" "${SERVER_DIR}/media"
  # Secrets stay root-only; the Django .env is owner-readable only.
  if [[ -f "${SECRETS_FILE}" ]]; then chown root:root "${SECRETS_FILE}"; chmod 600 "${SECRETS_FILE}"; fi
  if [[ -f "${SERVER_DIR}/.env" ]]; then chown "${RUN_AS_USER}:${RUN_AS_USER}" "${SERVER_DIR}/.env"; chmod 600 "${SERVER_DIR}/.env"; fi
  ok "Ownership: ${RUN_AS_USER}; secrets locked down"
}

# ===========================================================================
# 9. FIREWALL  (best-effort; never fails the deploy)
# ===========================================================================
setup_firewall() {
  section "Firewall"
  if command -v ufw >/dev/null 2>&1; then
    ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null 2>&1 || true
    ufw allow 80/tcp  >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
    [[ "${ADMIN_PORT}" != "80" && "${ADMIN_PORT}" != "443" ]] && ufw allow "${ADMIN_PORT}/tcp" >/dev/null 2>&1 || true
    yes | ufw enable >/dev/null 2>&1 || true
    ok "Firewall allows: SSH, 80, 443, ${ADMIN_PORT}"
  else
    warn "ufw not available — skipping firewall"
  fi
}

# ===========================================================================
# 10. START & HEALTH CHECKS
# ===========================================================================
# Probe a URL through the local Nginx regardless of public DNS state, by
# pinning the hostname to 127.0.0.1 (--resolve). Reports the HTTP code.
probe() {
  local url="$1" host="$2" port="$3"
  curl -fsS -o /dev/null -w '%{http_code}' \
    --resolve "${host}:${port}:127.0.0.1" "${url}" 2>/dev/null || true
}

start_and_verify() {
  section "Start services & health checks"
  systemctl restart "${SERVICE_NAME}"
  systemctl reload nginx 2>/dev/null || systemctl restart nginx
  sleep 4

  if ! systemctl is-active --quiet "${SERVICE_NAME}"; then
    err "Backend service failed to start. Last logs:"
    journalctl -u "${SERVICE_NAME}" -n 30 --no-pager || true
    return 1
  fi
  ok "Backend service running"

  # 1) Backend direct (gunicorn).
  local code
  code="$(curl -fsS -o /dev/null -w '%{http_code}' "http://${BACKEND_BIND}/admin/login/" 2>/dev/null || true)"
  [[ "${code}" =~ ^(200|302)$ ]] \
    && ok "Backend responding on ${BACKEND_BIND} (HTTP ${code})" \
    || warn "Backend probe returned '${code}' — inspect: journalctl -u ${SERVICE_NAME} -f"

  # 2) Through Nginx, per portal (works even before public DNS propagates).
  if (( DOMAIN_MODE )); then
    local sport=80 aport=80 sscheme=http ascheme=http
    if (( SSL_ON )) && have_cert "${STUDENT_DOMAIN}"; then sport=443; sscheme=https; fi
    if (( SSL_ON )) && have_cert "${ADMIN_DOMAIN}";   then aport=443; ascheme=https; fi

    code="$(probe "${sscheme}://${STUDENT_DOMAIN}:${sport}/api/auth/csrf/" "${STUDENT_DOMAIN}" "${sport}")"
    [[ "${code}" == "200" ]] && ok "Student portal API healthy (${sscheme}://${STUDENT_DOMAIN})" \
                             || warn "Student portal API probe: '${code}'"
    code="$(probe "${ascheme}://${ADMIN_DOMAIN}:${aport}/api/auth/csrf/" "${ADMIN_DOMAIN}" "${aport}")"
    [[ "${code}" == "200" ]] && ok "Admin portal API healthy (${ascheme}://${ADMIN_DOMAIN})" \
                             || warn "Admin portal API probe: '${code}'"
    code="$(probe "${sscheme}://${STUDENT_DOMAIN}:${sport}/" "${STUDENT_DOMAIN}" "${sport}")"
    [[ "${code}" == "200" ]] && ok "Student SPA served" || warn "Student SPA probe: '${code}'"
    code="$(probe "${ascheme}://${ADMIN_DOMAIN}:${aport}/" "${ADMIN_DOMAIN}" "${aport}")"
    [[ "${code}" == "200" ]] && ok "Admin SPA served" || warn "Admin SPA probe: '${code}'"
  else
    code="$(curl -fsS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${STUDENT_PORT}/" 2>/dev/null || true)"
    [[ "${code}" == "200" ]] && ok "Student SPA served on :${STUDENT_PORT}" || warn "Student SPA probe: '${code}'"
    code="$(curl -fsS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${ADMIN_PORT}/" 2>/dev/null || true)"
    [[ "${code}" == "200" ]] && ok "Admin SPA served on :${ADMIN_PORT}" || warn "Admin SPA probe: '${code}'"
  fi

  systemctl is-active --quiet nginx && ok "Nginx running" || { err "Nginx not running"; return 1; }
}

print_summary() {
  section "Done"
  ok "Deployment complete."
  echo -e "   Student portal : ${c_grn}${STUDENT_ORIGIN}${c_reset}"
  echo -e "   Admin portal   : ${c_grn}${ADMIN_ORIGIN}${c_reset}"
  echo -e "   Django admin   : ${c_grn}${STUDENT_ORIGIN}/admin/${c_reset}"
  if (( DOMAIN_MODE )) && ! (( SSL_ON )); then
    echo -e "   ${c_yel}HTTPS is disabled. Once DNS points at ${PUBLIC_IP}, set ENABLE_SSL=\"true\"${c_reset}"
    echo -e "   ${c_yel}in deploy-scripts/config.env and re-run: sudo ./deploy-scripts/deploy.sh${c_reset}"
  fi
  echo -e "   Backend logs   : journalctl -u ${SERVICE_NAME} -f"
  echo -e "   Nginx logs     : /var/log/nginx/${NGINX_SITE_NAME}-*.log"
}

# ===========================================================================
# MAIN
# ===========================================================================
parse_args() {
  DO_APT=1; ONLY=""
  for arg in "$@"; do
    case "$arg" in
      --skip-apt) DO_APT=0 ;;
      --frontend) ONLY="frontend" ;;
      --backend)  ONLY="backend" ;;
      --nginx)    ONLY="nginx" ;;
      --ssl)      ONLY="ssl" ;;
      -h|--help)  grep -E '^#( |$)' "${BASH_SOURCE[0]}" | head -40; exit 0 ;;
      *) warn "Unknown option: $arg" ;;
    esac
  done
}

main() {
  require_root
  ensure_secrets
  derive_settings
  validate_config

  case "${ONLY}" in
    frontend) setup_frontends; fix_permissions; systemctl reload nginx; ok "Front-ends rebuilt"; return 0 ;;
    backend)  setup_backend; setup_systemd; fix_permissions; start_and_verify; return 0 ;;
    nginx)    setup_nginx; ok "Nginx regenerated"; return 0 ;;
    ssl)      setup_nginx; setup_ssl; return 0 ;;
  esac

  if (( DO_APT )); then install_system_packages; else warn "Skipping apt (per --skip-apt)"; fi
  setup_services
  setup_backend
  setup_frontends
  setup_systemd
  setup_nginx
  setup_ssl
  fix_permissions
  setup_firewall
  start_and_verify
  print_summary
}

# Run only when executed directly (sourcing exposes the functions for tests).
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  parse_args "$@"
  main
fi
