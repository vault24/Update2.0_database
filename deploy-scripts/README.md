# SIPI — Production Deployment Guide

Complete guide for deploying the SIPI Student & Learning Management System on a
fresh **Ubuntu 24.04** server: PostgreSQL + Redis + Django (ASGI) + Nginx + two
Vite single-page apps, with automatic HTTPS via Let's Encrypt.

| Portal | Domain | Fallback (direct IP) |
|---|---|---|
| Student | `https://spisg.gov.bd` | `http://<PUBLIC_IP>` (port 80) |
| Admin | `https://su.spisg.gov.bd` | `http://<PUBLIC_IP>:8080` |

---

## Table of contents

1. [Quick start (TL;DR)](#1-quick-start-tldr)
2. [How the system is configured (single source of truth)](#2-how-the-system-is-configured)
3. [Server preparation](#3-server-preparation)
4. [Git deployment](#4-git-deployment)
5. [DNS configuration](#5-dns-configuration)
6. [SSL / HTTPS (Let's Encrypt)](#6-ssl--https-lets-encrypt)
7. [Request flow — how traffic moves through the system](#7-request-flow)
8. [If the server IP changes](#8-if-the-server-ip-changes)
9. [Updating the application](#9-updating-the-application)
10. [Day-2 operations](#10-day-2-operations)
11. [Security model](#11-security-model)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Quick start (TL;DR)

On a fresh Ubuntu 24.04 server with a public IP:

```bash
# 1. Get the code
sudo mkdir -p /var/www && cd /var/www
sudo git clone <YOUR_GIT_REMOTE_URL> Update2.0_database
cd Update2.0_database

# 2. Check the central configuration (IP + domains are already set for SIPI)
nano deploy-scripts/config.env

# 3. Deploy everything with one command
sudo bash deploy-scripts/deploy.sh
```

That's it. The script installs every dependency, creates the database, builds
both front-ends, configures Gunicorn + Nginx + the firewall, starts everything,
and health-checks the result. Run it again any time — it is **idempotent**
(re-running never breaks a working deployment).

- Before your DNS points at the server: browse `http://<PUBLIC_IP>` (student)
  and `http://<PUBLIC_IP>:8080` (admin).
- After DNS is live: set `ENABLE_SSL="true"` in `deploy-scripts/config.env`
  and re-run the deploy — HTTPS switches on automatically.

> **Email:** OTP / password-reset emails are disabled until you put a Gmail
> address + app password into `deploy-scripts/secrets.env` (created on first
> run) and re-run `sudo bash deploy-scripts/deploy.sh --backend`.

---

## 2. How the system is configured

### The two configuration files

Everything is driven by **two files** in `deploy-scripts/`:

| File | Contains | In git? |
|---|---|---|
| `config.env` | Infrastructure: public IP, domains, SSL toggle, ports, paths, DB/Redis names, Gunicorn/Nginx tuning | ✅ committed |
| `secrets.env` | Credentials: DB password, Django secret key, superuser, email password | ❌ **gitignored** — auto-created on first deploy |

You never edit anything else. On every run, `deploy.sh` **regenerates** all of
these from the two files above:

```
config.env + secrets.env
        │
        ├── server/.env                       (Django: DB, hosts, origins, cookies, email)
        ├── client/student-side/.env          (VITE_API_BASE_URL)
        ├── client/admin-side/.env            (VITE_API_BASE_URL)
        ├── deploy-scripts/generated/gunicorn.conf.py
        ├── /etc/systemd/system/sipi.service
        ├── /etc/nginx/sites-available/sipi   (+ snippets + conf.d)
        └── /etc/letsencrypt/renewal-hooks/…  (Nginx reload after cert renewal)
```

**Never hand-edit a generated file** — your change will be overwritten on the
next deploy. Change `config.env` / `secrets.env` and re-run instead.

### secrets.env lifecycle

On the first run, `deploy.sh` copies `secrets.env.example` → `secrets.env` and
fills in a random PostgreSQL password and Django `SECRET_KEY`. It is `chmod
600`, owned by root, and excluded from git. Fill in the optional values
yourself:

```bash
sudo nano deploy-scripts/secrets.env
#   EMAIL_HOST_USER / EMAIL_HOST_PASSWORD   -> Gmail + app password for OTP mail
#   DJANGO_SUPERUSER_*                      -> auto-create an admin account
sudo bash deploy-scripts/deploy.sh --backend
```

### Deployment modes

The same script supports three modes, chosen automatically from `config.env`:

| Mode | When | URLs |
|---|---|---|
| **Direct IP** | `STUDENT_DOMAIN`/`ADMIN_DOMAIN` empty | `http://IP`, `http://IP:8080` |
| **Domains, HTTP** | domains set, `ENABLE_SSL="false"` | `http://spisg.gov.bd`, `http://su.spisg.gov.bd` (+ IP fallbacks) |
| **Domains, HTTPS** | domains set, `ENABLE_SSL="true"` | `https://…` with HTTP→HTTPS redirect, HSTS, auto-renewal |

### Script flags

```bash
sudo bash deploy-scripts/deploy.sh              # full deploy
sudo bash deploy-scripts/deploy.sh --frontend   # rebuild the two SPAs only
sudo bash deploy-scripts/deploy.sh --backend    # venv, migrate, static, restart
sudo bash deploy-scripts/deploy.sh --nginx      # regenerate + reload Nginx only
sudo bash deploy-scripts/deploy.sh --ssl        # (re)attempt certificate issuance
sudo bash deploy-scripts/deploy.sh --skip-apt   # skip system package install
```

### Files in this directory

| File | Purpose |
|---|---|
| `config.env` | **Central configuration — the file you edit.** |
| `secrets.env.example` | Template for `secrets.env` (auto-copied on first run). |
| `deploy.sh` | One-command idempotent production deployment. |
| `slms.sh` | Interactive menu (status, logs, backup, restore, monitor). |
| `maintenance.sh` | Non-interactive maintenance commands. |
| `troubleshoot.sh` | Automated diagnosis & fixes. |
| `generated/` | Machine-generated configs (gitignored, do not edit). |

---

## 3. Server preparation

`deploy.sh` installs everything it needs, so strictly speaking you only need a
fresh Ubuntu 24.04 with root access. The steps below are the recommended
baseline hardening **before** you deploy.

### 3.1 Update Ubuntu

```bash
sudo apt update && sudo apt upgrade -y
sudo reboot   # if the kernel was updated
```

### 3.2 Create a deploy user (recommended)

Don't operate as `root` day-to-day:

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
su - deploy
```

### 3.3 SSH hardening (recommended)

```bash
# On YOUR computer: create a key and copy it to the server
ssh-keygen -t ed25519
ssh-copy-id deploy@<PUBLIC_IP>

# On the SERVER: disable password login once key login works
sudo nano /etc/ssh/sshd_config
#   PasswordAuthentication no
#   PermitRootLogin no
sudo systemctl restart ssh
```

### 3.4 Firewall

`deploy.sh` configures UFW automatically (allows SSH, 80, 443, 8080 and
enables it). If you prefer to do it first by hand:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp      # HTTP (student + ACME challenges)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 8080/tcp    # admin direct-IP fallback
sudo ufw enable
```

> If your server sits behind a cloud provider's security group (AWS/GCP/…),
> open the same four ports there too — UFW cannot open a cloud firewall.

### 3.5 What deploy.sh installs for you

You do **not** install these manually — listed for transparency:

| Component | Purpose |
|---|---|
| `python3`, `python3-venv`, `build-essential`, `libpq-dev` | Django backend + psycopg build |
| **Node.js 20 LTS** (NodeSource; only if system Node < 18) | building the two Vite SPAs |
| **PostgreSQL** | primary database (role + database created idempotently) |
| **Redis** | Django Channels layer — required for WebSocket notifications |
| **Nginx** | reverse proxy + static file server |
| **certbot** | Let's Encrypt certificates (only when `ENABLE_SSL="true"`) |
| `ufw`, `git`, `curl`, `openssl` | firewall & tooling |

---

## 4. Git deployment

### 4.1 Clone

The standard location (matches `PROJECT_PATH` in `config.env`):

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone <YOUR_GIT_REMOTE_URL> Update2.0_database
cd Update2.0_database
```

Using a different path? Change `PROJECT_PATH` in `deploy-scripts/config.env` —
nothing else.

### 4.2 Configure

```bash
nano deploy-scripts/config.env
```

The values that matter on a new server:

```bash
PUBLIC_IP="27.147.202.237"        # this server's public IP
STUDENT_DOMAIN="spisg.gov.bd"     # leave empty for pure IP mode
ADMIN_DOMAIN="su.spisg.gov.bd"    # leave empty for pure IP mode
ENABLE_SSL="false"                # flip to "true" AFTER DNS points here
LETSENCRYPT_EMAIL="you@example.com"
PROJECT_PATH="/var/www/Update2.0_database"
```

### 4.3 Deploy

```bash
sudo bash deploy-scripts/deploy.sh
```

First run takes ~5–15 minutes (apt packages + two `npm install` + builds).
The script prints a ✓/✗ log for every step and ends with a health-check
summary and the URLs to open.

### 4.4 Verify

```bash
sudo systemctl status sipi nginx postgresql redis-server
curl -I http://localhost/                      # student SPA -> 200
curl -I http://localhost:8080/                 # admin SPA   -> 200
curl -s http://127.0.0.1:8000/api/auth/csrf/   # backend     -> JSON
```

---

## 5. DNS configuration

Configure these records at your domain provider (for `gov.bd` domains this is
usually the BTCL/registrar panel).

### 5.1 Required — A records

| Type | Host / Name | Value | TTL |
|---|---|---|---|
| **A** | `@` (i.e. `spisg.gov.bd`) | `27.147.202.237` | 300–3600 |
| **A** | `su` (i.e. `su.spisg.gov.bd`) | `27.147.202.237` | 300–3600 |

Both names point at the **same server**; Nginx separates the two portals by
the `Host` header (see [Request flow](#7-request-flow)).

> Tip: while the IP is still "temporary", use a **low TTL (300s)** so a future
> IP change propagates in minutes. Raise it to 3600+ once stable.

### 5.2 Not required

- **CNAME** — not needed. (Optional: if you ever want `www.spisg.gov.bd`,
  add `CNAME www → spisg.gov.bd` *and* add that name to the config — currently
  the deployment intentionally serves only the two exact names.)
- **TXT** — none required for the web app itself. Let's Encrypt HTTP-01
  validation (which we use) needs no TXT records; TXT-based DNS-01 is only
  needed for wildcard certificates.
- **MX** — none required. This server does not *receive* email. The app
  *sends* email through Gmail's SMTP servers, which needs no DNS on your side.

### 5.3 Recommended (email deliverability) — SPF / DKIM / DMARC

The app sends OTP mail **via Gmail SMTP from a Gmail address**, so Google's
own SPF/DKIM already sign those messages — nothing to configure today. If you
later switch `DEFAULT_FROM_EMAIL` to `something@spisg.gov.bd` with your own
SMTP relay, add to the `spisg.gov.bd` zone:

| Type | Host | Value (example) | Purpose |
|---|---|---|---|
| TXT | `@` | `v=spf1 include:<your-relay> ~all` | which servers may send as your domain |
| TXT | `<selector>._domainkey` | *(provided by your relay)* | DKIM signature key |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:admin@spisg.gov.bd` | policy + reports |

### 5.4 Reverse DNS (PTR)

Not required for the web portals. PTR only matters if this server ever sends
SMTP **directly** (it doesn't — it relays via Gmail). If you ever need it, PTR
records are configured **by whoever owns the IP block** (your ISP / hosting
provider), not in your domain panel — you'd request them to map
`27.147.202.237 → spisg.gov.bd`.

### 5.5 Checking propagation

```bash
dig +short spisg.gov.bd        # must print 27.147.202.237
dig +short su.spisg.gov.bd     # must print 27.147.202.237
```

Or use https://dnschecker.org from a browser. Propagation typically takes
minutes with a low TTL, but can take up to 24–48 h worldwide.

---

## 6. SSL / HTTPS (Let's Encrypt)

### How issuance works

1. You set `ENABLE_SSL="true"` in `config.env` and re-run the deploy.
2. The script first verifies (via DNS lookup) that each domain actually
   resolves to `PUBLIC_IP`. If not, it **warns and stays on HTTP** — nothing
   breaks; re-run once DNS has propagated.
3. For each domain, `certbot` performs an **HTTP-01 challenge**: Let's Encrypt
   fetches `http://<domain>/.well-known/acme-challenge/<token>`, which Nginx
   serves from the webroot `/var/www/letsencrypt`. This is why port 80 must be
   reachable from the internet.
4. Certificates land in `/etc/letsencrypt/live/<domain>/`.
5. The Nginx config is regenerated: each certified domain gets a **443 server
   block** (TLS 1.2/1.3, HSTS) and its port-80 block becomes an
   ACME-passthrough + `301` redirect to HTTPS.
6. Both front-ends are rebuilt against `https://…` API URLs and Django's
   secure-cookie flags flip on. *(A full deploy does all of this in one run;
   if you only ran `--ssl`, follow up with `--frontend` and `--backend`.)*

```bash
# The complete "turn on HTTPS" procedure:
sudo nano deploy-scripts/config.env     # ENABLE_SSL="true"
sudo bash deploy-scripts/deploy.sh      # full run — handles everything
```

### Renewal (automatic)

- The `certbot` package installs a **systemd timer** (`certbot.timer`) that
  runs twice a day and renews any certificate with fewer than 30 days left.
- The deploy installs a renewal **deploy hook**
  (`/etc/letsencrypt/renewal-hooks/deploy/sipi-reload-nginx.sh`) so Nginx
  reloads and serves the renewed certificate immediately.
- Nothing manual, ever. Verify with:

```bash
systemctl list-timers | grep certbot
sudo certbot renew --dry-run
```

### HTTPS enforcement

With SSL active:

- Port 80 answers only ACME challenges and `301`-redirects everything else to HTTPS.
- Direct-IP requests (`http://27.147.202.237[:8080]`) redirect to the canonical domains.
- **HSTS** (`Strict-Transport-Security: max-age=31536000`) tells browsers to
  use HTTPS for a year without even trying HTTP first.
- Django marks session/CSRF cookies `Secure`, so they are never sent over HTTP.

---

## 7. Request flow

### End-to-end path of one request

```
Browser: https://spisg.gov.bd/api/students/
   │
   │ 1. DNS: spisg.gov.bd  →  27.147.202.237   (A record)
   ▼
Public IP 27.147.202.237, port 443
   │
   │ 2. Nginx accepts the TLS connection. SNI / Host header = spisg.gov.bd
   │    → matches the STUDENT server block (name-based virtual host).
   │    TLS terminated here; security headers, gzip, rate limits applied.
   ▼
Nginx routing decision (inside the matched server block):
   │   /api/…  /ws/…  /admin/…      → reverse-proxy to the backend
   │   /static/… /media/… /files/…  → served directly from disk by Nginx
   │   everything else              → SPA files (dist/), fallback to index.html
   ▼
   │ 3. proxy_pass http://127.0.0.1:8000  (loopback only — never public)
   │    Headers added: Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto=https
   ▼
Gunicorn (systemd service "sipi")
   │ 4. Master process hands the request to one of N uvicorn workers
   │    (ASGI — the same workers also carry WebSocket connections for /ws/).
   ▼
Django (slms_core.asgi:application)
   │ 5. Middleware chain: security → session → CORS → CSRF → auth → RBAC…
   │    ALLOWED_HOSTS validates the Host header; the Origin header decides
   │    CORS/CSRF trust; the view talks to PostgreSQL / Redis as needed.
   ▼
   │ 6. Response travels back: Django → Gunicorn → Nginx (adds headers,
   │    compresses) → TLS → browser.
   ▼
Browser renders / SPA updates
```

### How student and admin traffic are separated

Both domains resolve to the **same IP and the same ports (80/443)**. Nginx
picks the server block by the `Host` header (name-based virtual hosting):

| Host header | Nginx serves | Cookie scope |
|---|---|---|
| `spisg.gov.bd` | `client/student-side/dist` + API proxy | `spisg.gov.bd` only |
| `su.spisg.gov.bd` | `client/admin-side/dist` + API proxy | `su.spisg.gov.bd` only |
| `27.147.202.237` | student fallback (redirects to domain once SSL is on) | — |
| anything else | connection closed (`444`) — host-header attack protection | — |

Both portals proxy to the **same Django backend**; separation continues in the
application layer:

- Each SPA is built with its own `VITE_API_BASE_URL`, so a portal only ever
  calls its own origin — no CORS in production, first-party cookies only.
- On login the frontend sends `portal: student|admin`, and the backend
  additionally matches the request `Origin` against `STUDENT_PORTAL_ORIGINS` /
  `ADMIN_PORTAL_ORIGINS` (generated into `server/.env`) — an admin account
  cannot sign in through the student site and vice versa.
- Because the portals are different hostnames, their session cookies are
  completely isolated by the browser.

WebSockets (`/ws/notifications/`) follow the same path with an HTTP Upgrade;
Gunicorn's uvicorn workers speak ASGI, and Django Channels pushes
notifications through Redis.

---

## 8. If the server IP changes

This deployment was designed for exactly this case. **One file, one command.**

### What you edit (1 file)

```bash
sudo nano deploy-scripts/config.env
```
```bash
PUBLIC_IP="NEW.IP.ADDRESS.HERE"     # ← the only line you change
```

### What you run (1 command)

```bash
sudo bash deploy-scripts/deploy.sh
```

### What regenerates automatically

- `server/.env` — `ALLOWED_HOSTS` and portal-origin lists include the new IP.
- Nginx site — the direct-IP fallback server blocks answer on the new IP.
- Front-end `.env`s + rebuilds (URLs are domain-based so they rarely change,
  but everything is regenerated regardless, for consistency).
- systemd / gunicorn / firewall — re-validated idempotently.
- Health checks run against the new configuration.

### What you must do outside the server (DNS)

Update the two **A records** at your DNS provider:

```
spisg.gov.bd     A  →  NEW.IP.ADDRESS.HERE
su.spisg.gov.bd  A  →  NEW.IP.ADDRESS.HERE
```

### What does NOT need any change

- **Let's Encrypt certificates** — bound to the domains, not the IP. Once DNS
  points at the new IP, existing certificates keep working and keep renewing.
- The database, uploaded files, application code, secrets — untouched.
- Any generated config — never edit those by hand anyway.

> Same story for a **domain change**: edit `STUDENT_DOMAIN` / `ADMIN_DOMAIN`
> in `config.env`, update DNS, re-run the deploy (new certificates are issued
> for the new names automatically).

---

## 9. Updating the application

Deploying a new version of the code:

```bash
cd /var/www/Update2.0_database
sudo git pull origin main
sudo bash deploy-scripts/deploy.sh --skip-apt     # apt rarely needed on updates
```

The deploy automatically: dumps a **database backup** to `/var/backups/sipi/`
(last 14 kept), installs new Python/Node dependencies, runs migrations,
collects static files, rebuilds both SPAs, regenerates configs, restarts
services **gracefully**, and health-checks the result.

Partial updates are faster when you know what changed:

```bash
sudo bash deploy-scripts/deploy.sh --backend    # server-only change
sudo bash deploy-scripts/deploy.sh --frontend   # client-only change
```

**Rollback:** the safest rollback is `git checkout <last-good-commit>` +
re-run the deploy. If a migration corrupted data, restore the automatic dump:

```bash
ls /var/backups/sipi/
sudo systemctl stop sipi
zcat /var/backups/sipi/sipi_db_<STAMP>.sql.gz | sudo -u postgres psql sipi_db
sudo systemctl start sipi
```

---

## 10. Day-2 operations

```bash
# Service control
sudo systemctl status sipi                # backend (gunicorn)
sudo systemctl restart sipi
sudo systemctl reload nginx               # zero-downtime config reload

# Logs
sudo journalctl -u sipi -f                # backend service log
sudo tail -f /var/log/gunicorn/error.log  # application errors
sudo tail -f /var/log/nginx/sipi-error.log

# Interactive menu (status / backup / restore / monitor / fixes)
sudo bash deploy-scripts/slms.sh

# Common one-offs
sudo bash deploy-scripts/maintenance.sh backup     # manual DB backup
sudo bash deploy-scripts/maintenance.sh status     # service + port check
sudo bash deploy-scripts/troubleshoot.sh diagnose  # full diagnosis
```

---

## 11. Security model

What the deployment enforces, and where:

| Layer | Control |
|---|---|
| **Transport** | TLS 1.2/1.3 only; HTTP→HTTPS redirect; HSTS (1 year); direct-IP redirected to canonical domains |
| **Nginx** | `server_tokens off`; unknown `Host` → connection closed (444); security headers on responses: `X-Frame-Options SAMEORIGIN`, `X-Content-Type-Options nosniff`, `Referrer-Policy`, `Permissions-Policy`, CSP (self-hosted scripts only); rate limiting on `/api/auth/*` (10 r/s + burst 20 per IP) |
| **Cookies** | `Secure` (with SSL), `HttpOnly` sessions, `SameSite=Lax`, per-domain isolation between the two portals |
| **CSRF / CORS** | explicit origin allow-lists generated from config — `CORS_ALLOW_ALL_ORIGINS` is always `False` |
| **Django** | `DEBUG=False`; `ALLOWED_HOSTS` from config; `X-Forwarded-Proto` trusted **only** because Nginx always overwrites it; portal-based login routing |
| **Gunicorn** | binds to `127.0.0.1` only; trusts proxy headers from localhost only; request-size limits; periodic worker recycling |
| **systemd** | runs as `www-data`; `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=full`, `ProtectHome`; writable paths limited to `storage/`, `media/`, logs |
| **Secrets** | `secrets.env` root-owned `600`, gitignored; `server/.env` owned by `www-data`, `600`; DB password randomly generated |
| **Firewall** | UFW: only 22, 80, 443, 8080 open |

> ⚠️ **One-time action:** the git history of this repository previously
> contained real credentials (a Gmail app password and a superuser password in
> the old `config.env`). Treat those values as compromised — **revoke the old
> Gmail app password and change that superuser's password**, then use fresh
> values in `secrets.env`.

---

## 12. Troubleshooting

Run the automated diagnosis first:
`sudo bash deploy-scripts/troubleshoot.sh diagnose`

### Gunicorn / backend won't start

```bash
sudo journalctl -u sipi -n 50 --no-pager     # read the actual error
```

- `ModuleNotFoundError` → venv broken: `sudo bash deploy-scripts/deploy.sh --backend`
- Database auth error → password drift: the same command re-syncs PostgreSQL
  with `secrets.env`.
- `Address already in use` → something else on 8000: `sudo ss -ltnp | grep 8000`
- Redis connection refused → `sudo systemctl restart redis-server`
  (Channels **requires** Redis; the backend will not run without it).

### Nginx errors

```bash
sudo nginx -t                                 # validation with line numbers
sudo tail -50 /var/log/nginx/sipi-error.log
```

- **502 Bad Gateway** → the backend is down; see the Gunicorn section above.
- Config broken after manual edits → regenerate:
  `sudo bash deploy-scripts/deploy.sh --nginx` (the deploy also auto-restores
  the previous config whenever a newly generated one fails validation).

### Permission errors (uploads fail, 500 on file save)

```bash
sudo chown -R www-data:www-data /var/www/Update2.0_database
sudo bash deploy-scripts/deploy.sh --backend
```

### SSL issues

- *Issuance fails*: does DNS point at this server? `dig +short spisg.gov.bd`
  must print the server IP. Is port 80 reachable from the internet (check the
  cloud firewall too)? Then: `sudo bash deploy-scripts/deploy.sh --ssl`
- *Rate-limited* ("too many certificates"): Let's Encrypt allows 5 duplicate
  certificates per week — wait it out; test renewals with
  `sudo certbot renew --dry-run` instead of re-issuing.
- *Renewal sanity check*: `systemctl list-timers | grep certbot`
- *Browser says "not secure" after enabling SSL*: hard-refresh (the SPA may be
  cached from the HTTP era) and confirm the front-ends were rebuilt
  (`deploy.sh --frontend`) so they call `https://` APIs.

### Static files missing (unstyled Django admin, 404 on /static/)

```bash
cd /var/www/Update2.0_database/server
sudo ./venv/bin/python manage.py collectstatic --noinput
sudo systemctl reload nginx
```

### Database connection issues

```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "\l" | grep sipi_db     # database exists?
# Re-sync role/password/database with secrets.env:
sudo bash deploy-scripts/deploy.sh --backend
```

### Domain not resolving / DNS propagation

```bash
dig +short spisg.gov.bd          # empty or wrong IP = DNS not ready
dig +short su.spisg.gov.bd
```

- Fix the A records at the provider; with TTL 300 changes appear in ~5 min.
- Meanwhile the site still works at `http://<PUBLIC_IP>` / `:8080`.
- Test virtual-host routing without DNS:
  `curl -H "Host: spisg.gov.bd" http://<PUBLIC_IP>/`

### Service failures after reboot

All services are `systemctl enable`d by the deploy, so they auto-start. If
something is down after a reboot:

```bash
sudo systemctl start postgresql redis-server sipi nginx
sudo bash deploy-scripts/maintenance.sh status
```

### "I changed config.env but nothing happened"

Configuration is applied only by running the deploy:

```bash
sudo bash deploy-scripts/deploy.sh
```

### WebSocket notifications not working

- Check Redis: `redis-cli ping` → `PONG`
- Browser devtools → Network → WS: `wss://<domain>/ws/notifications/` should
  show status `101 Switching Protocols`.
- The Nginx `/ws/` block handles the upgrade; if it was edited manually,
  regenerate it: `sudo bash deploy-scripts/deploy.sh --nginx`
