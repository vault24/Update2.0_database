#!/usr/bin/env bash
# =============================================================================
# SIPI — one-shot automated production deployment
# -----------------------------------------------------------------------------
# Prepares a fresh Ubuntu server to run the whole system:
#   PostgreSQL + Redis + Django (ASGI / Channels) + Nginx + two Vite front-ends
#
# Design goals:
#   * Idempotent   — safe to run again and again.
#   * Self-healing — detects the common failure causes and fixes them.
#   * Zero manual steps — edit config.env, then `sudo ./deploy.sh`.
#
# Usage:
#   sudo ./deploy.sh                 # full deploy
#   sudo ./deploy.sh --frontend      # rebuild front-ends only
#   sudo ./deploy.sh --backend       # backend (venv/migrate/restart) only
#   sudo ./deploy.sh --skip-apt      # skip system package installation
# =============================================================================
set -Eeuo pipefail

# ---------------------------------------------------------------------------
# Paths & config
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"

# ---------------------------------------------------------------------------
# Pretty logging
# ---------------------------------------------------------------------------
c_reset='\033[0m'; c_red='\033[0;31m'; c_grn='\033[0;32m'; c_yel='\033[0;33m'; c_blu='\033[0;36m'
log()  { echo -e "${c_blu}[*]${c_reset} $*"; }
ok()   { echo -e "${c_grn}[✓]${c_reset} $*"; }
warn() { echo -e "${c_yel}[!]${c_reset} $*"; }
err()  { echo -e "${c_red}[✗]${c_reset} $*" >&2; }
section() { echo; echo -e "${c_blu}========== $* ==========${c_reset}"; }

# Report exactly where a failure happened (helps debugging on the server).
trap 'err "Deployment failed at line ${LINENO}: \`${BASH_COMMAND}\`. Fix the cause and re-run — the script is idempotent."' ERR

require_root() { [[ ${EUID} -eq 0 ]] || { err "Run with sudo:  sudo ./deploy.sh"; exit 1; }; }

# Retry a command a few times (for flaky apt/npm network operations).
retry() {
  local n=0 max=3
  until "$@"; do
    n=$((n+1))
    (( n >= max )) && { err "Command failed after ${max} attempts: $*"; return 1; }
    warn "Retry ${n}/${max}: $*"; sleep 3
  done
}

# ---------------------------------------------------------------------------
# Load configuration
# ---------------------------------------------------------------------------
[[ -f "${CONFIG_FILE}" ]] || { err "Missing ${CONFIG_FILE}"; exit 1; }
# shellcheck disable=SC1090
source "${CONFIG_FILE}"

SERVER_DIR="${PROJECT_PATH}/server"
ADMIN_DIR="${PROJECT_PATH}/client/admin-side"
STUDENT_DIR="${PROJECT_PATH}/client/student-side"
VENV_DIR="${SERVER_DIR}/venv"
PYBIN="${VENV_DIR}/bin/python"
PIPBIN="${VENV_DIR}/bin/pip"

# Parse flags
DO_APT=1; ONLY=""
for arg in "$@"; do
  case "$arg" in
    --skip-apt) DO_APT=0 ;;
    --frontend) ONLY="frontend" ;;
    --backend)  ONLY="backend" ;;
    *) warn "Unknown option: $arg" ;;
  esac
done

require_root
log "Project path : ${PROJECT_PATH}"
log "Server IP    : ${SERVER_IP}"

# ===========================================================================
# 1. SYSTEM PACKAGES  (self-heals a missing/old Node)
# ===========================================================================
install_system_packages() {
  section "System packages"
  export DEBIAN_FRONTEND=noninteractive
  retry apt-get update -y
  retry apt-get install -y \
    python3 python3-venv python3-dev build-essential libpq-dev \
    postgresql postgresql-contrib redis-server nginx git curl ca-certificates gnupg ufw

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

  # Wait for Postgres to accept connections (self-heal race on first boot).
  local tries=0
  until sudo -u postgres psql -c '\q' >/dev/null 2>&1; do
    tries=$((tries+1)); (( tries > 15 )) && { err "PostgreSQL not responding"; return 1; }
    sleep 2
  done

  # Create role + database if missing (idempotent).
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
  # Django needs these for migrations / tests.
  sudo -u postgres psql -c "ALTER ROLE ${DB_USER} CREATEDB;" >/dev/null
  sudo -u postgres psql -c "ALTER ROLE ${DB_USER} SET client_encoding TO 'utf8';" >/dev/null
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" >/dev/null

  redis-cli ping >/dev/null 2>&1 && ok "Redis responding (PONG)" || { err "Redis not responding"; return 1; }
  ok "Databases ready"
}

# ===========================================================================
# 3. BACKEND  (.env, venv, deps, migrate, static, superuser)
# ===========================================================================
write_backend_env() {
  local env_file="${SERVER_DIR}/.env"
  # Generate & persist a secret key once.
  local secret="${DJANGO_SECRET_KEY}"
  if [[ -z "${secret}" ]]; then
    if [[ -f "${env_file}" ]] && grep -q '^SECRET_KEY=' "${env_file}"; then
      secret="$(grep '^SECRET_KEY=' "${env_file}" | cut -d= -f2-)"
    else
      secret="$(python3 -c 'import secrets;print(secrets.token_urlsafe(64))')"
    fi
  fi

  # Precompute portal origins (omit the port when it's the default :80).
  local student_origin="http://${SERVER_IP}"
  if [[ "${STUDENT_PORT}" != "80" ]]; then student_origin="http://${SERVER_IP}:${STUDENT_PORT}"; fi
  local admin_origin="http://${SERVER_IP}:${ADMIN_PORT}"

  cat > "${env_file}" <<EOF
# Generated by deploy.sh — edit config.env and re-run to change.
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}

SECRET_KEY=${secret}
DEBUG=${DJANGO_DEBUG}
ALLOWED_HOSTS=${SERVER_IP},localhost,127.0.0.1

# Origins for this server. Student portal is on :${STUDENT_PORT}, admin on
# :${ADMIN_PORT} — kept disjoint for correct portal routing. CORS + CSRF are
# derived automatically from these in settings.py.
STUDENT_PORTAL_ORIGINS=${student_origin}
ADMIN_PORTAL_ORIGINS=${admin_origin}

# HTTPS cookie flags off for plain-HTTP IP deployment; set True behind HTTPS.
CSRF_COOKIE_SECURE=False
SESSION_COOKIE_SECURE=False

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=${EMAIL_HOST_USER}
EMAIL_HOST_PASSWORD=${EMAIL_HOST_PASSWORD}
DEFAULT_FROM_EMAIL=SIPI Management System <your-email@gmail.com>
EMAIL_TIMEOUT=30

# --- OTP ---
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3
PASSWORD_RESET_RATE_LIMIT_PER_HOUR=3
EOF
  ok "Wrote ${env_file}"
}

setup_backend() {
  section "Backend (Django ASGI)"
  [[ -d "${SERVER_DIR}" ]] || { err "Missing ${SERVER_DIR}"; return 1; }

  write_backend_env

  # Virtualenv (self-heal a broken venv).
  if [[ ! -x "${PYBIN}" ]]; then
    warn "Creating virtualenv..."
    rm -rf "${VENV_DIR}"
    python3 -m venv "${VENV_DIR}"
  fi
  retry "${PIPBIN}" install --upgrade pip wheel setuptools
  retry "${PIPBIN}" install -r "${SERVER_DIR}/requirements.txt"

  # Log dir for gunicorn.
  mkdir -p /var/log/gunicorn && chown -R www-data:www-data /var/log/gunicorn

  ( cd "${SERVER_DIR}"
    "${PYBIN}" manage.py migrate --noinput
    "${PYBIN}" manage.py collectstatic --noinput
  )

  # Optional superuser (only if password supplied and user absent).
  if [[ -n "${DJANGO_SUPERUSER_PASSWORD}" ]]; then
    ( cd "${SERVER_DIR}"
      DJANGO_SUPERUSER_PASSWORD="${DJANGO_SUPERUSER_PASSWORD}" \
      "${PYBIN}" manage.py shell -c "
from django.contrib.auth import get_user_model
U=get_user_model()
u='${DJANGO_SUPERUSER_USERNAME}'
if not U.objects.filter(username=u).exists():
    U.objects.create_superuser(u,'${DJANGO_SUPERUSER_EMAIL}','${DJANGO_SUPERUSER_PASSWORD}')
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
  [[ -d "${dir}" ]] || { err "Missing ${dir}"; return 1; }
  log "Building ${name} (API: ${api_url})"
  echo "VITE_API_BASE_URL=${api_url}" > "${dir}/.env"

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
  # Same-origin API per portal avoids CORS/cookie problems.
  build_frontend "${STUDENT_DIR}" "http://${SERVER_IP}/api" "student-side"
  build_frontend "${ADMIN_DIR}"   "http://${SERVER_IP}:${ADMIN_PORT}/api" "admin-side"
}

# ===========================================================================
# 5. SYSTEMD  (gunicorn + uvicorn workers = ASGI, serves HTTP + WebSockets)
# ===========================================================================
setup_systemd() {
  section "systemd service"
  cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=SIPI Django ASGI (gunicorn+uvicorn)
After=network.target postgresql.service redis-server.service
Requires=postgresql.service redis-server.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=${SERVER_DIR}
Environment=PYTHONUNBUFFERED=1
ExecStart=${VENV_DIR}/bin/gunicorn slms_core.asgi:application \\
    -k uvicorn.workers.UvicornWorker \\
    --workers 3 \\
    --bind ${BACKEND_BIND} \\
    --timeout 120 \\
    --access-logfile /var/log/gunicorn/access.log \\
    --error-logfile /var/log/gunicorn/error.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable "${SERVICE_NAME}"
  ok "systemd unit installed: ${SERVICE_NAME}.service"
}

# ===========================================================================
# 6. NGINX  (two server blocks: student :80, admin :8080)
# ===========================================================================
nginx_proxy_block() {
  cat <<EOF
    client_max_body_size 25M;

    location /api/    { proxy_pass http://${BACKEND_BIND}; include /etc/nginx/proxy_params; }
    location /ws/     { proxy_pass http://${BACKEND_BIND};
                        proxy_http_version 1.1;
                        proxy_set_header Upgrade \$http_upgrade;
                        proxy_set_header Connection "upgrade";
                        proxy_set_header Host \$host; }
    location /admin/  { proxy_pass http://${BACKEND_BIND}; include /etc/nginx/proxy_params; }
    location /static/ { alias ${SERVER_DIR}/staticfiles/; }
    location /media/  { alias ${SERVER_DIR}/media/; }
    location /files/  { alias ${SERVER_DIR}/storage/Documents/; }
EOF
}

setup_nginx() {
  section "Nginx"
  # proxy_params ships with Ubuntu's nginx; create a fallback if absent.
  if [[ ! -f /etc/nginx/proxy_params ]]; then
    cat > /etc/nginx/proxy_params <<'EOF'
proxy_set_header Host $http_host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
EOF
  fi

  local site=/etc/nginx/sites-available/sipi
  cat > "${site}" <<EOF
# ---- Student portal (main site) ----
server {
    listen ${STUDENT_PORT};
    server_name ${SERVER_IP};
    root ${STUDENT_DIR}/dist;
    index index.html;
$(nginx_proxy_block)
    location / { try_files \$uri \$uri/ /index.html; }
}

# ---- Admin portal ----
server {
    listen ${ADMIN_PORT};
    server_name ${SERVER_IP};
    root ${ADMIN_DIR}/dist;
    index index.html;
$(nginx_proxy_block)
    location / { try_files \$uri \$uri/ /index.html; }
}
EOF
  ln -sf "${site}" /etc/nginx/sites-enabled/sipi
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable nginx
  ok "Nginx configured"
}

# ===========================================================================
# 7. PERMISSIONS
# ===========================================================================
fix_permissions() {
  section "Permissions"
  chown -R www-data:www-data "${PROJECT_PATH}"
  mkdir -p "${SERVER_DIR}/storage" "${SERVER_DIR}/media" "${SERVER_DIR}/staticfiles"
  chmod -R u+rwX,g+rwX "${SERVER_DIR}/storage" "${SERVER_DIR}/media"
  ok "Ownership set to www-data"
}

# ===========================================================================
# 8. FIREWALL  (best-effort; never fails the deploy)
# ===========================================================================
setup_firewall() {
  section "Firewall"
  if command -v ufw >/dev/null 2>&1; then
    ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null 2>&1 || true
    ufw allow "${STUDENT_PORT}/tcp" >/dev/null 2>&1 || true
    ufw allow "${ADMIN_PORT}/tcp" >/dev/null 2>&1 || true
    yes | ufw enable >/dev/null 2>&1 || true
    ok "Firewall allows SSH, ${STUDENT_PORT}, ${ADMIN_PORT}"
  else
    warn "ufw not available — skipping firewall"
  fi
}

# ===========================================================================
# 9. START & HEALTH CHECK  (self-heal: on failure print logs)
# ===========================================================================
start_and_verify() {
  section "Start services"
  systemctl restart "${SERVICE_NAME}"
  systemctl restart nginx
  sleep 4

  if ! systemctl is-active --quiet "${SERVICE_NAME}"; then
    err "Backend service failed to start. Last logs:"
    journalctl -u "${SERVICE_NAME}" -n 30 --no-pager || true
    return 1
  fi
  ok "Backend service running"

  # Health probe through gunicorn directly.
  local code
  code="$(curl -fsS -o /dev/null -w '%{http_code}' "http://${BACKEND_BIND}/admin/login/" 2>/dev/null || true)"
  if [[ "${code}" =~ ^(200|302)$ ]]; then
    ok "Backend responding on ${BACKEND_BIND} (HTTP ${code})"
  else
    warn "Backend health probe returned '${code}'. Inspect: journalctl -u ${SERVICE_NAME} -f"
  fi
  systemctl is-active --quiet nginx && ok "Nginx running" || { err "Nginx not running"; return 1; }
}

# ===========================================================================
# MAIN
# ===========================================================================
main() {
  if [[ "${ONLY}" == "frontend" ]]; then setup_frontends; fix_permissions; systemctl reload nginx; ok "Front-ends rebuilt"; exit 0; fi
  if [[ "${ONLY}" == "backend"  ]]; then setup_backend; setup_systemd; fix_permissions; start_and_verify; exit 0; fi

  (( DO_APT )) && install_system_packages || warn "Skipping apt (per --skip-apt)"
  setup_services
  setup_backend
  setup_frontends
  setup_systemd
  setup_nginx
  fix_permissions
  setup_firewall
  start_and_verify

  section "Done"
  ok "Deployment complete."
  echo -e "   Student portal : ${c_grn}http://${SERVER_IP}${c_reset}"
  echo -e "   Admin portal   : ${c_grn}http://${SERVER_IP}:${ADMIN_PORT}${c_reset}"
  echo -e "   Django admin   : ${c_grn}http://${SERVER_IP}/admin/${c_reset}"
  echo -e "   Logs           : journalctl -u ${SERVICE_NAME} -f"
}

main "$@"
