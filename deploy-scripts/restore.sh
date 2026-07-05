#!/usr/bin/env bash
# =============================================================================
# SIPI — full-system restore  (disaster recovery from a Restic snapshot)
# -----------------------------------------------------------------------------
# Restores files, PostgreSQL, and service configuration from a backup snapshot
# and brings the system back up. Designed for a ~10–15 minute recovery.
#
# TYPICAL DISASTER-RECOVERY FLOW (fresh server):
#   1. Install OS, clone the repo to ${PROJECT_PATH}.
#   2. Put the backup password file back at RESTIC_PASSWORD_FILE
#      (you kept a copy safe) and, if the repo is on an external/remote disk,
#      set RESTIC_REPOSITORY in deploy-scripts/backup.conf and mount the disk.
#   3. Run  sudo ./deploy-scripts/deploy.sh   (builds venv, installs packages,
#      builds the front-ends, installs the base services).
#   4. Run  sudo ./deploy-scripts/restore.sh  (this script — restores DATA and
#      the exact saved configs/certs over the top, then restarts everything).
#
# On an existing server you can run this script directly to roll back to any
# snapshot.
#
# Usage:
#   sudo ./restore.sh                 # interactive: pick a snapshot
#   sudo ./restore.sh --latest        # restore the most recent snapshot
#   sudo ./restore.sh --snapshot <ID> # restore a specific snapshot
#   sudo ./restore.sh --files-only    # restore files but NOT the database
#   sudo ./restore.sh --db-only       # restore ONLY the database
#   sudo ./restore.sh --list
#   sudo ./restore.sh --help
# =============================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"
BACKUP_CONF="${SCRIPT_DIR}/backup.conf"

c_reset='\033[0m'; c_red='\033[0;31m'; c_grn='\033[0;32m'; c_yel='\033[0;33m'; c_blu='\033[0;36m'
log()  { echo -e "${c_blu}[*]${c_reset} $*"; }
ok()   { echo -e "${c_grn}[✓]${c_reset} $*"; }
warn() { echo -e "${c_yel}[!]${c_reset} $*"; }
err()  { echo -e "${c_red}[✗]${c_reset} $*" >&2; }
section() { echo; echo -e "${c_blu}========== $* ==========${c_reset}"; }

require_root() { [[ ${EUID} -eq 0 ]] || { err "Run with sudo:  sudo ./restore.sh"; exit 1; }; }

[[ -f "${CONFIG_FILE}" ]] || { err "Missing ${CONFIG_FILE}"; exit 1; }
[[ -f "${BACKUP_CONF}" ]] || { err "Missing ${BACKUP_CONF}"; exit 1; }
# shellcheck disable=SC1090
source "${CONFIG_FILE}"
# shellcheck disable=SC1090
source "${BACKUP_CONF}"

SERVER_DIR="${PROJECT_PATH}/server"

export RESTIC_REPOSITORY
export RESTIC_PASSWORD_FILE
[[ -n "${AWS_ACCESS_KEY_ID:-}" ]]     && export AWS_ACCESS_KEY_ID
[[ -n "${AWS_SECRET_ACCESS_KEY:-}" ]] && export AWS_SECRET_ACCESS_KEY

# ---------------------------------------------------------------------------
# Preconditions
# ---------------------------------------------------------------------------
preflight() {
  command -v restic >/dev/null 2>&1 || { err "restic is not installed. Install it: sudo apt-get install -y restic"; exit 1; }
  if [[ -n "${REQUIRE_MOUNT}" ]] && ! mountpoint -q "${REQUIRE_MOUNT}"; then
    err "Backup drive not mounted at ${REQUIRE_MOUNT}. Mount it and retry."; exit 1
  fi
  if [[ ! -s "${RESTIC_PASSWORD_FILE}" ]]; then
    err "Repository password file missing: ${RESTIC_PASSWORD_FILE}"
    err "Restore is impossible without it. Put your saved copy back and retry."
    exit 1
  fi
  if ! restic cat config >/dev/null 2>&1; then
    err "Cannot open the repository at ${RESTIC_REPOSITORY}."
    err "Check backup.conf (RESTIC_REPOSITORY) and that the disk is mounted."
    exit 1
  fi
  ok "Repository reachable: ${RESTIC_REPOSITORY}"
}

# ---------------------------------------------------------------------------
# Snapshot selection
# ---------------------------------------------------------------------------
SNAPSHOT="latest"

choose_snapshot() {
  section "Available snapshots"
  restic snapshots --tag sipi
  echo
  read -rp "Enter snapshot ID to restore [default: latest]: " choice
  SNAPSHOT="${choice:-latest}"
  # Validate the choice resolves to a real snapshot.
  if ! restic snapshots "${SNAPSHOT}" >/dev/null 2>&1; then
    err "Snapshot '${SNAPSHOT}' not found."; exit 1
  fi
  ok "Selected snapshot: ${SNAPSHOT}"
}

confirm() {
  section "Confirm restore"
  warn "This will OVERWRITE current files and REPLACE the '${DB_NAME}' database"
  warn "with the contents of snapshot: ${SNAPSHOT}"
  warn "Services will be stopped during the restore."
  echo
  read -rp "Type 'RESTORE' (all caps) to proceed: " answer
  [[ "${answer}" == "RESTORE" ]] || { log "Restore cancelled."; exit 0; }
}

# ---------------------------------------------------------------------------
# Restore steps
# ---------------------------------------------------------------------------
DB_PASSWORD_RESTORED=""

stop_services() {
  section "Stopping services"
  systemctl stop "${SERVICE_NAME}" 2>/dev/null || true
  ok "Backend stopped (files can be replaced safely)."
}

restore_files() {
  section "Restoring files"
  # Restore to '/', recreating every backed-up absolute path in place.
  # EXCLUDE deploy-scripts so we never overwrite THIS running script (the repo
  # clone already provides the scripts). The staging dir (DB dump) IS restored.
  restic restore "${SNAPSHOT}" --target / \
    --exclude "${PROJECT_PATH}/deploy-scripts"
  ok "Filesystem restored (media, uploads, static, .env, nginx, systemd, SSL certs…)."

  # Bring back secrets.env (holds SECRET_KEY / DB password) WITHOUT clobbering
  # the running scripts — write just that one file from the snapshot. The path
  # inside the snapshot is the absolute path that was backed up.
  local snap_secrets="${PROJECT_PATH}/deploy-scripts/secrets.env"
  if restic dump "${SNAPSHOT}" "${snap_secrets}" > "${SCRIPT_DIR}/secrets.env.restored" 2>/dev/null; then
    mv "${SCRIPT_DIR}/secrets.env.restored" "${SCRIPT_DIR}/secrets.env"
    chmod 600 "${SCRIPT_DIR}/secrets.env"
    ok "Restored deploy-scripts/secrets.env"
  else
    rm -f "${SCRIPT_DIR}/secrets.env.restored"
    warn "Could not restore secrets.env from snapshot (continuing)."
  fi
}

read_restored_db_password() {
  # Prefer the freshly restored server/.env; fall back to secrets.env.
  if [[ -f "${SERVER_DIR}/.env" ]]; then
    DB_PASSWORD_RESTORED="$(grep -E '^DB_PASSWORD=' "${SERVER_DIR}/.env" | head -1 | cut -d= -f2-)"
  fi
  if [[ -z "${DB_PASSWORD_RESTORED}" && -f "${SCRIPT_DIR}/secrets.env" ]]; then
    # shellcheck disable=SC1090
    DB_PASSWORD_RESTORED="$(grep -E '^DB_PASSWORD=' "${SCRIPT_DIR}/secrets.env" | head -1 | cut -d= -f2- | tr -d '"')"
  fi
}

restore_database() {
  section "Restoring PostgreSQL database"
  local dump="${DB_DUMP_STAGING}/${DB_NAME}.dump"
  if [[ ! -f "${dump}" ]]; then
    err "Database dump not found in the snapshot (${dump})."
    err "If this snapshot was files-only, use --files-only. Aborting DB restore."
    return 1
  fi

  systemctl is-active --quiet postgresql || systemctl start postgresql

  read_restored_db_password
  [[ -n "${DB_PASSWORD_RESTORED}" ]] || warn "No DB password recovered — role password left unchanged."

  # Ensure the application role exists and its password matches the restored
  # server/.env (so the app can authenticate after restore).
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD_RESTORED:-changeme}';"
    ok "Created role ${DB_USER}"
  elif [[ -n "${DB_PASSWORD_RESTORED}" ]]; then
    sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD_RESTORED}';"
  fi
  sudo -u postgres psql -c "ALTER ROLE ${DB_USER} CREATEDB;" >/dev/null 2>&1 || true

  # Drop existing connections, then recreate the database fresh.
  sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid<>pg_backend_pid();" >/dev/null 2>&1 || true
  sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};"
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" >/dev/null

  # Restore the data. pg_restore may print ignorable NOTICE/WARNING lines; we
  # verify success afterwards by counting relations rather than the exit code.
  log "Restoring data (this is the longest step)…"
  set +e
  sudo -u postgres pg_restore --no-acl -d "${DB_NAME}" "${dump}" 2>&1 | tail -20
  set -e

  local tables
  tables="$(sudo -u postgres psql -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" "${DB_NAME}" 2>/dev/null || echo 0)"
  if [[ "${tables}" -gt 0 ]]; then
    ok "Database restored (${tables} tables in public schema)."
  else
    err "Database restore appears empty — check the output above."
    return 1
  fi
}

restart_services() {
  section "Restarting services"
  systemctl daemon-reload

  # Re-enable in case the units are freshly restored on a new server.
  systemctl enable "${SERVICE_NAME}" >/dev/null 2>&1 || true
  systemctl restart postgresql redis-server 2>/dev/null || true
  systemctl restart "${SERVICE_NAME}"

  if nginx -t >/dev/null 2>&1; then
    systemctl reload nginx 2>/dev/null || systemctl restart nginx
  else
    warn "nginx -t failed on restored config — check /etc/nginx. Not reloading."
  fi
  ok "Services restarted."
}

verify() {
  section "Verification"
  local ok_all=1
  for svc in postgresql "${SERVICE_NAME}" nginx; do
    if systemctl is-active --quiet "${svc}"; then ok "${svc} running";
    else err "${svc} NOT running"; ok_all=0; fi
  done
  local code
  code="$(curl -fsS -o /dev/null -w '%{http_code}' "http://${BACKEND_BIND}/admin/login/" 2>/dev/null || true)"
  [[ "${code}" =~ ^(200|302)$ ]] && ok "Backend responding (HTTP ${code})" || warn "Backend probe returned '${code}'"
  (( ok_all )) && ok "Restore verification passed." || warn "Some services need attention (see above)."
}

# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------
MODE="full"   # full | files-only | db-only

do_restore() {
  local start; start="$(date +%s)"
  preflight
  [[ "${SNAPSHOT}" == "__pick__" ]] && choose_snapshot
  confirm
  stop_services

  case "${MODE}" in
    files-only) restore_files ;;
    db-only)    restore_database ;;
    full)       restore_files; restore_database ;;
  esac

  restart_services
  verify

  local end; end="$(date +%s)"
  section "Done"
  ok "Restore completed in $(( end - start ))s from snapshot ${SNAPSHOT}."
  log "If the front-ends were on a brand-new server, finish with:"
  log "    sudo ./deploy-scripts/deploy.sh --frontend"
}

main() {
  require_root
  local pick=1
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help|-h) grep -E '^#( |$)' "${BASH_SOURCE[0]}" | head -40; exit 0 ;;
      --list) preflight; restic snapshots --tag sipi; exit 0 ;;
      --latest) SNAPSHOT="latest"; pick=0 ;;
      --snapshot) SNAPSHOT="${2:?--snapshot needs an ID}"; pick=0; shift ;;
      --files-only) MODE="files-only" ;;
      --db-only) MODE="db-only" ;;
      *) err "Unknown option: $1"; exit 1 ;;
    esac
    shift
  done
  (( pick )) && SNAPSHOT="__pick__"
  do_restore
}

trap 'err "Restore FAILED at line ${LINENO}: \`${BASH_COMMAND}\`"; exit 1' ERR

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
