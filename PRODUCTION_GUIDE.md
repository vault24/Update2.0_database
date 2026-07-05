# SIPI — Production Deployment

> **The complete, always-current deployment guide lives at
> [`deploy-scripts/README.md`](deploy-scripts/README.md).**
> This page is only the 60-second overview.

## Architecture at a glance

```
                    DNS (A records)
      spisg.gov.bd ────────────┐
   su.spisg.gov.bd ────────────┤
                               ▼
              ┌───────── Ubuntu 24.04 server (PUBLIC_IP) ─────────┐
              │  Nginx :80/:443  (name-based vhosts, TLS, HSTS)   │
              │   ├─ Host: spisg.gov.bd    → student SPA (dist/)  │
              │   ├─ Host: su.spisg.gov.bd → admin SPA  (dist/)   │
              │   ├─ /api/ /ws/ /admin/    → 127.0.0.1:8000       │
              │   └─ /static/ /media/ /files/ → served from disk  │
              │  Gunicorn (uvicorn ASGI workers) → Django          │
              │  PostgreSQL ──┘        Redis (Channels/WebSocket)  │
              └────────────────────────────────────────────────────┘
```

## Deploy in three commands

```bash
sudo git clone <YOUR_GIT_REMOTE_URL> /var/www/Update2.0_database
sudo nano /var/www/Update2.0_database/deploy-scripts/config.env   # IP + domains + SSL toggle
sudo bash /var/www/Update2.0_database/deploy-scripts/deploy.sh
```

- **`deploy-scripts/config.env`** is the single source of truth (public IP,
  domains, SSL, ports, paths). Change it, re-run the deploy, and every
  generated config (Django `.env`, frontend `.env`s, Nginx, systemd, gunicorn)
  updates automatically.
- **`deploy-scripts/secrets.env`** (gitignored, auto-created) holds the
  credentials: DB password, Django secret key, email login, superuser.
- The script is **idempotent** — run it as often as you like.

Everything else — server preparation, DNS records, Let's Encrypt/HTTPS,
request flow, changing the public IP, updating, troubleshooting — is covered
in depth in **[deploy-scripts/README.md](deploy-scripts/README.md)**.
