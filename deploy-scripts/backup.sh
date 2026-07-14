#!/usr/bin/env bash
# =============================================================================
# SIPI — full-system backup  (Restic: incremental + dedup + compressed +
#                             encrypted snapshots)
# -----------------------------------------------------------------------------
# Independent of deployment. Deploy never backs up; this script is the ONLY
# thing that does, and only when you (or the daily timer) run it.
#
# One run:
#   * initialises the repository on first use (idempotent)
#   * dumps PostgreSQL
#   * snapshots the whole production footprint (project, .env, media, uploads,
#     nginx/gunicorn/systemd configs, SSL certs, deploy scripts …)
#   * applies the retention policy (prunes old snapshots)
#   * verifies repository integrity
#   * logs everything and returns a clear success/failure status
#
# Usage:
#   sudo ./backup.sh                  # run a backup now
#   sudo ./backup.sh --init           # only create/verify the repository
#   sudo ./backup.sh --list           # list existing snapshots
#   sudo ./backup.sh --verify         # integrity check only
#   sudo ./backup.sh --install-timer  # install the daily systemd timer
#   sudo ./backup.sh --unlock         # remove a stale repo lock
#   sudo ./backup.sh --help
#
# Configuration: deploy-scripts/backup.conf  (edit the repository location
# there — that single value moves all future backups).
# =============================================================================
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"
BACKUP_CONF="${SCRIPT_DIR}/backup.conf"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
c_reset='\033[0m'; c_red='\033[0;31m'; c_grn='\033[0;32m'; c_yel='\033[0;33m'; c_blu='\033[0;36m'
log()  { echo -e "${c_blu}[*]${c_reset} $*"; }
ok()   { echo -e "${c_grn}[✓]${c_reset} $*"; }
warn() { echo -e "${c_yel}[!]${c_reset} $*"; }
err()  { echo -e "${c_red}[✗]${c_reset} $*" >&2; }
section() { echo; echo -e "${c_blu}========== $* ==========${c_reset}"; }

require_root() { [[ ${EUID} -eq 0 ]] || { err "Run with sudo:  sudo ./backup.sh"; exit 1; }; }

# ---------------------------------------------------------------------------
# Load configuration (config.env first so backup.conf can reference its values)
# ---------------------------------------------------------------------------
[[ -f "${CONFIG_FILE}" ]] || { err "Missing ${CONFIG_FILE}"; exit 1; }
[[ -f "${BACKUP_CONF}" ]] || { err "Missing ${BACKUP_CONF}"; exit 1; }
# shellcheck disable=SC1090
source "${CONFIG_FILE}"
# shellcheck disable=SC1090
source "${BACKUP_CONF}"

# Pull DB credentials the same way the app does (secrets.env holds the password).
SECRETS_FILE="${SCRIPT_DIR}/secrets.env"
[[ -f "${SECRETS_FILE}" ]] && source "${SECRETS_FILE}"

# ---------------------------------------------------------------------------
# Restic environment  (exported so every restic call uses the same repo + key)
# ---------------------------------------------------------------------------
export RESTIC_REPOSITORY
export RESTIC_PASSWORD_FILE
# Restic v0.14+ uses zstd compression; "auto" is a good default.
export RESTIC_COMPRESSION="${RESTIC_COMPRESSION:-auto}"
# Remote-backend credentials (only used by sftp/rest/s3 repos).
[[ -n "${AWS_ACCESS_KEY_ID:-}" ]]     && export AWS_ACCESS_KEY_ID
[[ -n "${AWS_SECRET_ACCESS_KEY:-}" ]] && export AWS_SECRET_ACCESS_KEY

# ---------------------------------------------------------------------------
# Preconditions
# ---------------------------------------------------------------------------
ensure_restic() {
  if ! command -v restic >/dev/null 2>&1; then
    warn "restic not installed — installing..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y && apt-get install -y restic
  fi
  # Keep restic itself current (self-update is safe and fixes backend bugs).
  restic self-update >/dev/null 2>&1 || true
  ok "restic $(restic version | awk '{print $2}')"
}

ensure_mount() {
  # Refuse to back up to an unmounted drive (would silently fill the OS disk).
  if [[ -n "${REQUIRE_MOUNT}" ]]; then
    if ! mountpoint -q "${REQUIRE_MOUNT}"; then
      err "Backup drive is NOT mounted at ${REQUIRE_MOUNT}."
      err "Mount it (e.g. 'sudo mount ${REQUIRE_MOUNT}') and re-run, or fix REQUIRE_MOUNT in backup.conf."
      exit 1
    fi
    ok "Backup drive mounted at ${REQUIRE_MOUNT}"
  fi
}

ensure_password_file() {
  # The repository encryption password. Generate a strong one on first use.
  if [[ ! -s "${RESTIC_PASSWORD_FILE}" ]]; then
    warn "No repository password file — generating ${RESTIC_PASSWORD_FILE}"
    mkdir -p "$(dirname "${RESTIC_PASSWORD_FILE}")"
    umask 077
    python3 -c 'import secrets;print(secrets.token_urlsafe(48))' > "${RESTIC_PASSWORD_FILE}"
    chmod 600 "${RESTIC_PASSWORD_FILE}"
    ok "Generated encryption password."
    warn "IMPORTANT: copy ${RESTIC_PASSWORD_FILE} somewhere safe (password manager)."
    warn "Without it the backups CANNOT be restored."
  fi
}

ensure_repo() {
  # `restic cat config` succeeds only if the repo already exists & unlocks.
  if restic cat config >/dev/null 2>&1; then
    ok "Repository ready: ${RESTIC_REPOSITORY}"
  else
    warn "Initialising new repository at ${RESTIC_REPOSITORY}"
    # For local/mounted paths, make sure the parent dir exists.
    case "${RESTIC_REPOSITORY}" in
      sftp:*|rest:*|s3:*|b2:*|azure:*|gs:*|swift:*) : ;;   # remote backends
      *) mkdir -p "${RESTIC_REPOSITORY}" ;;
    esac
    restic init
    ok "Repository initialised."
  fi
}

# ---------------------------------------------------------------------------
# Backup steps
# ---------------------------------------------------------------------------
STAGED_DB_FILE=""

dump_database() {
  [[ "${BACKUP_DB}" == "true" ]] || { log "Database backup disabled (BACKUP_DB != true)"; return 0; }
  section "PostgreSQL dump"
  mkdir -p "${DB_DUMP_STAGING}"; chmod 700 "${DB_DUMP_STAGING}"
  STAGED_DB_FILE="${DB_DUMP_STAGING}/${DB_NAME}.dump"
  # Custom format (-Fc): compressed, and restorable with pg_restore into a
  # fresh database, preserving ownership recorded in the dump.
  if sudo -u postgres pg_dump -Fc "${DB_NAME}" > "${STAGED_DB_FILE}"; then
    ok "Database dumped: ${STAGED_DB_FILE} ($(du -h "${STAGED_DB_FILE}" | cut -f1))"
  else
    err "pg_dump failed for database '${DB_NAME}'"
    return 1
  fi
}

dump_redis() {
  [[ "${BACKUP_REDIS}" == "true" ]] || return 0
  section "Redis dump"
  redis-cli save >/dev/null 2>&1 || warn "redis-cli save failed (continuing)"
  local rdb="/var/lib/redis/dump.rdb"
  if [[ -f "${rdb}" ]]; then
    cp "${rdb}" "${DB_DUMP_STAGING}/redis-dump.rdb"
    ok "Redis snapshot staged."
  else
    warn "Redis RDB not found at ${rdb} — skipping."
  fi
}

run_backup() {
  section "Snapshot"
  # Assemble the list of paths that actually exist (skip missing, warn once).
  local paths=()
  for p in "${BACKUP_PATHS[@]}"; do
    if [[ -e "${p}" ]]; then paths+=("${p}"); else warn "skip (missing): ${p}"; fi
  done
  if [[ "${BACKUP_LOGS}" == "true" ]]; then
    for p in "${LOG_PATHS[@]}"; do [[ -e "${p}" ]] && paths+=("${p}"); done
  fi
  [[ -n "${STAGED_DB_FILE}" && -f "${STAGED_DB_FILE}" ]] && paths+=("${DB_DUMP_STAGING}")

  if (( ${#paths[@]} == 0 )); then err "Nothing to back up (no paths exist)."; return 1; fi

  # Build exclude args.
  local excludes=()
  for e in "${BACKUP_EXCLUDES[@]}"; do excludes+=(--exclude "${e}"); done

  local host stamp
  host="$(hostname)"
  stamp="$(date +%Y-%m-%d_%H-%M-%S)"

  log "Backing up ${#paths[@]} path(s) to ${RESTIC_REPOSITORY}"
  # --verbose gives per-file progress; restic prints a live progress line and a
  # summary (files new/changed/unchanged, data added — i.e. the incremental size).
  restic backup \
    --tag sipi --tag "auto-${stamp}" \
    --host "${host}" \
    "${excludes[@]}" \
    "${paths[@]}"
  ok "Snapshot created."
}

apply_retention() {
  section "Retention (prune old snapshots)"
  restic forget \
    --tag sipi \
    --keep-last  "${KEEP_LAST}" \
    --keep-daily "${KEEP_DAILY}" \
    --keep-weekly "${KEEP_WEEKLY}" \
    --keep-monthly "${KEEP_MONTHLY}" \
    --prune
  ok "Retention applied (kept last=${KEEP_LAST}, daily=${KEEP_DAILY}, weekly=${KEEP_WEEKLY}, monthly=${KEEP_MONTHLY})."
}

verify_repo() {
  case "${VERIFY_MODE}" in
    none)  log "Verification skipped (VERIFY_MODE=none)"; return 0 ;;
    full)  section "Verify (full: structure + re-read 5% of data)"
           restic check --read-data-subset=5% ;;
    *)     section "Verify (quick: structure)"
           restic check ;;
  esac
  ok "Repository integrity verified."
}

cleanup_staging() {
  # Remove the plaintext DB dump from local disk — it is safely inside the
  # encrypted repository now.
  if [[ -n "${DB_DUMP_STAGING}" && -d "${DB_DUMP_STAGING}" ]]; then
    rm -rf "${DB_DUMP_STAGING:?}/"* 2>/dev/null || true
  fi
}
trap cleanup_staging EXIT

# ---------------------------------------------------------------------------
# systemd timer installer (daily automatic backup)
# ---------------------------------------------------------------------------
install_timer() {
  require_root
  section "Install daily backup timer"
  # Overridable for testing; defaults to the real systemd location.
  local sysd="${SYSTEMD_DIR:-/etc/systemd/system}"
  local svc="${sysd}/sipi-backup.service"
  local tmr="${sysd}/sipi-backup.timer"

  cat > "${svc}" <<EOF
# GENERATED by backup.sh --install-timer
[Unit]
Description=SIPI daily full-system backup (Restic)
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/env bash ${SCRIPT_DIR}/backup.sh
# Don't let a slow backup run forever.
TimeoutStartSec=3h
EOF

  cat > "${tmr}" <<EOF
# GENERATED by backup.sh --install-timer  (schedule: backup.conf)
[Unit]
Description=Run SIPI backup on a daily schedule

[Timer]
OnCalendar=${BACKUP_SCHEDULE}
RandomizedDelaySec=${BACKUP_RANDOM_DELAY}
Persistent=true

[Install]
WantedBy=timers.target
EOF

  systemctl daemon-reload
  systemctl enable --now sipi-backup.timer
  ok "Daily backup timer installed: ${BACKUP_SCHEDULE} (±${BACKUP_RANDOM_DELAY})"
  log "Next run:"; systemctl list-timers sipi-backup.timer --no-pager || true
  log "Logs: ${BACKUP_LOG_DIR}/ and 'journalctl -u sipi-backup.service'"
}

# ---------------------------------------------------------------------------
# Sub-commands
# ---------------------------------------------------------------------------
do_full_backup() {
  local start; start="$(date +%s)"
  section "SIPI backup — $(date)"
  ensure_restic
  ensure_mount
  ensure_password_file
  ensure_repo
  dump_database
  dump_redis
  run_backup
  apply_retention
  verify_repo
  local end; end="$(date +%s)"
  section "Done"
  ok "Backup completed successfully in $(( end - start ))s."
  log "Repository: ${RESTIC_REPOSITORY}"
  log "Restore with:  sudo ./deploy-scripts/restore.sh"
}

setup_logging() {
  mkdir -p "${BACKUP_LOG_DIR}"
  local logfile="${BACKUP_LOG_DIR}/backup_$(date +%Y%m%d_%H%M%S).log"
  # Mirror all output to a timestamped log + a stable 'latest.log'.
  exec > >(tee -a "${logfile}") 2>&1
  ln -sf "${logfile}" "${BACKUP_LOG_DIR}/latest.log"
  # Keep the 30 most recent logs.
  ls -t "${BACKUP_LOG_DIR}"/backup_*.log 2>/dev/null | tail -n +31 | xargs -r rm -f
}

main() {
  case "${1:-}" in
    --help|-h)
      grep -E '^#( |$)' "${BASH_SOURCE[0]}" | head -34; exit 0 ;;
    --install-timer) install_timer; exit 0 ;;
    --init)
      require_root; ensure_restic; ensure_mount; ensure_password_file; ensure_repo; exit 0 ;;
    --list)
      require_root; ensure_restic; ensure_mount; ensure_password_file
      export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE
      restic snapshots --tag sipi; exit 0 ;;
    --verify)
      require_root; ensure_restic; ensure_mount; ensure_password_file; ensure_repo; verify_repo; exit 0 ;;
    --unlock)
      require_root; ensure_restic; ensure_mount; ensure_password_file; restic unlock; ok "Locks removed."; exit 0 ;;
    "")
      require_root; setup_logging; do_full_backup; exit 0 ;;
    *)
      err "Unknown option: $1"; grep -E '^#( |$)' "${BASH_SOURCE[0]}" | head -34; exit 1 ;;
  esac
}

# Report failures with the failing line, and make the exit status meaningful
# for the systemd timer / manual runs.
trap 'err "Backup FAILED at line ${LINENO}: \`${BASH_COMMAND}\`"; exit 1' ERR

# Run only when executed directly (sourcing exposes functions for tests).
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
