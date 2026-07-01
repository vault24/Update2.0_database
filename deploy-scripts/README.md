# SIPI Deployment Scripts

Automated, self-healing deployment for the whole system (PostgreSQL + Redis +
Django ASGI + Nginx + two Vite front-ends) on a fresh **Ubuntu** server.

## Files

| File | Purpose |
|------|---------|
| **`config.env`** | The **only** file you edit — server IP, project path, DB, ports, superuser. |
| **`deploy.sh`** | One-shot, idempotent, self-healing production deploy. |
| `slms.sh` | Interactive service manager (start/stop/status/logs). |
| `maintenance.sh` | Backups & routine maintenance helpers. |
| `troubleshoot.sh` | Diagnostics for a broken deployment. |

## Quick start

```bash
cd /var/www/Update2.0_database/deploy-scripts
nano config.env          # set SERVER_IP, PROJECT_PATH, DB_PASSWORD, superuser…
sudo ./deploy.sh         # installs & configures everything
```

That's it — after it finishes:

- Student portal → `http://<SERVER_IP>`
- Admin portal   → `http://<SERVER_IP>:8080`
- Django admin   → `http://<SERVER_IP>/admin/`

## Partial runs

```bash
sudo ./deploy.sh --frontend    # rebuild the two SPAs only
sudo ./deploy.sh --backend     # venv + migrate + restart backend only
sudo ./deploy.sh --skip-apt    # skip system package installation
```

## What it does (and heals)

1. Installs system packages; installs **Node 20** if the system Node is missing/too old.
2. Creates the PostgreSQL role/database (idempotent) and enables **Redis** (required for WebSockets).
3. Writes `server/.env` (generates and persists a `SECRET_KEY` once), builds the
   virtualenv, installs deps, runs migrations + `collectstatic`, optionally creates a superuser.
4. Builds both front-ends with `NODE_OPTIONS=--max-old-space-size=2048` so low-RAM
   servers don't OOM; each portal's API URL is set to its own origin.
5. Installs a **systemd** unit (`sipi.service`) running Django under
   **gunicorn + uvicorn workers (ASGI)** so HTTP *and* WebSockets work.
6. Configures Nginx (student :80, admin :8080), fixes permissions, opens the firewall.
7. Restarts everything and runs a health check — on failure it prints the last
   `journalctl` logs and points you at the fix. Re-running is always safe.

## Service management

```bash
sudo systemctl status sipi        # backend
sudo systemctl restart sipi
journalctl -u sipi -f             # live backend logs
sudo systemctl restart nginx
```

> Full manual instructions: see `../PRODUCTION_GUIDE.md`.
