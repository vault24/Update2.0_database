# SIPI — Production Deployment Guide

Complete, step-by-step manual for deploying the system on a fresh **Ubuntu 22.04/24.04** server.

If you just want it done automatically, skip to [Automated Deployment](#automated-deployment). This document explains every manual step so you understand (and can debug) what the script does.

---

## 1. Architecture

```
                         ┌──────────────────────── Ubuntu server (192.168.0.100) ─────────────────────────┐
   Browser  ──HTTP:80──▶ │  Nginx ──▶ student-side/dist  (SPA)                                             │
   Browser  ─HTTP:8080─▶ │  Nginx ──▶ admin-side/dist    (SPA)                                             │
                         │    │                                                                            │
                         │    └── /api /admin /ws /static /media /files ──▶ 127.0.0.1:8000                 │
                         │                                          (gunicorn + uvicorn workers, ASGI)     │
                         │                                                   │                             │
                         │                         PostgreSQL ◀──────────────┤                             │
                         │                         Redis (Channels) ◀────────┘                             │
                         └────────────────────────────────────────────────────────────────────────────────┘
```

| Component | Purpose |
|-----------|---------|
| **PostgreSQL** | Primary database |
| **Redis** | Channels layer for WebSocket notifications (**required** — the app uses ASGI/Channels) |
| **Django (ASGI)** | Served by `gunicorn` with `uvicorn` workers so HTTP **and** WebSockets work |
| **Nginx** | Serves the two built front-ends and reverse-proxies backend routes |
| **student-side** | Public/student SPA — served on port **80** |
| **admin-side** | Admin SPA — served on port **8080** |

| Item | Value |
|------|-------|
| Server IP | `192.168.0.100` |
| Project path | `/var/www/Update2.0_database` |
| Student portal | `http://192.168.0.100` |
| Admin portal | `http://192.168.0.100:8080` |
| Django admin | `http://192.168.0.100/admin/` |

> ⚠️ **WebSockets need an ASGI server.** Do **not** run the app with `gunicorn ... slms_core.wsgi` — that breaks real-time notifications. Use `slms_core.asgi:application` with uvicorn workers as shown below.

---

## 2. Automated Deployment

```bash
# 1. Put the code at the project path
sudo mkdir -p /var/www
sudo git clone <YOUR_REPO_URL> /var/www/Update2.0_database
cd /var/www/Update2.0_database/deploy-scripts

# 2. Edit the single config file (IP, DB password, superuser, etc.)
nano config.env

# 3. Run it — installs everything and makes the app production-ready
sudo ./deploy.sh
```

Re-running is safe (idempotent). Useful partial runs:

```bash
sudo ./deploy.sh --frontend   # rebuild the two SPAs only
sudo ./deploy.sh --backend    # venv + migrate + restart backend only
sudo ./deploy.sh --skip-apt   # skip system package install
```

The rest of this guide is the **manual** equivalent.

---

## 3. Manual Deployment

### Step 1 — System packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-venv python3-dev build-essential libpq-dev \
     postgresql postgresql-contrib redis-server nginx git curl ufw

# Node.js 20 LTS (Ubuntu's default is usually too old for Vite 5)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v          # expect v20.x
```

### Step 2 — Get the code

```bash
sudo mkdir -p /var/www
sudo git clone <YOUR_REPO_URL> /var/www/Update2.0_database
cd /var/www/Update2.0_database
```

### Step 3 — PostgreSQL

```bash
sudo systemctl enable --now postgresql
sudo -u postgres psql <<'SQL'
CREATE USER sipi_web WITH PASSWORD 'sipiadmin';
CREATE DATABASE sipi_db OWNER sipi_web;
ALTER ROLE sipi_web CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE sipi_db TO sipi_web;
SQL
```

### Step 4 — Redis (required for WebSockets)

```bash
sudo systemctl enable --now redis-server
redis-cli ping        # must print: PONG
```

### Step 5 — Backend environment file

Create `server/.env`:

```bash
cd /var/www/Update2.0_database/server
python3 -c 'import secrets;print(secrets.token_urlsafe(64))'   # copy the output for SECRET_KEY

cat > .env <<'EOF'
DB_NAME=sipi_db
DB_USER=sipi_web
DB_PASSWORD=sipiadmin
DB_HOST=localhost
DB_PORT=5432

SECRET_KEY=<paste-generated-key>
DEBUG=False
ALLOWED_HOSTS=192.168.0.100,localhost,127.0.0.1

# Origins for this server (fully dynamic — nothing is hardcoded in settings.py).
# CORS + CSRF are derived automatically from these two. Keep them disjoint.
STUDENT_PORTAL_ORIGINS=http://192.168.0.100
ADMIN_PORTAL_ORIGINS=http://192.168.0.100:8080

CSRF_COOKIE_SECURE=False
SESSION_COOKIE_SECURE=False

# Optional (OTP / password-reset emails)
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
EOF
```

### Step 6 — Python virtualenv & Django

```bash
cd /var/www/Update2.0_database/server
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip wheel setuptools
pip install -r requirements.txt          # production deps only

python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser          # create your admin login
deactivate
```

### Step 7 — Build the front-ends

Each SPA is compiled to a static `dist/` folder. Set the API URL to the **same origin** the SPA is served from (avoids CORS/cookie issues).

```bash
export NODE_OPTIONS=--max-old-space-size=2048   # prevents OOM on small servers

# Student (port 80)
cd /var/www/Update2.0_database/client/student-side
echo "VITE_API_BASE_URL=http://192.168.0.100/api" > .env
npm install
npm run build

# Admin (port 8080)
cd /var/www/Update2.0_database/client/admin-side
echo "VITE_API_BASE_URL=http://192.168.0.100:8080/api" > .env
npm install
npm run build
```

> If `npm install` fails on the server, confirm Node is **≥ 18** (`node -v`). Each client has an `.npmrc` with `legacy-peer-deps=true` so peer-dependency conflicts do not block installation. The production build never needs `lovable-tagger`.

### Step 8 — Backend service (systemd, ASGI)

```bash
sudo mkdir -p /var/log/gunicorn && sudo chown www-data:www-data /var/log/gunicorn

sudo tee /etc/systemd/system/sipi.service >/dev/null <<'EOF'
[Unit]
Description=SIPI Django ASGI (gunicorn+uvicorn)
After=network.target postgresql.service redis-server.service
Requires=postgresql.service redis-server.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/Update2.0_database/server
Environment=PYTHONUNBUFFERED=1
ExecStart=/var/www/Update2.0_database/server/venv/bin/gunicorn slms_core.asgi:application \
    -k uvicorn.workers.UvicornWorker --workers 3 --bind 127.0.0.1:8000 --timeout 120 \
    --access-logfile /var/log/gunicorn/access.log --error-logfile /var/log/gunicorn/error.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now sipi
sudo systemctl status sipi        # should be "active (running)"
```

### Step 9 — Nginx

```bash
sudo tee /etc/nginx/sites-available/sipi >/dev/null <<'EOF'
server {                      # Student portal
    listen 80;
    server_name 192.168.0.100;
    root /var/www/Update2.0_database/client/student-side/dist;
    index index.html;
    client_max_body_size 25M;

    location /api/    { proxy_pass http://127.0.0.1:8000; include /etc/nginx/proxy_params; }
    location /admin/  { proxy_pass http://127.0.0.1:8000; include /etc/nginx/proxy_params; }
    location /ws/     { proxy_pass http://127.0.0.1:8000; proxy_http_version 1.1;
                        proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";
                        proxy_set_header Host $host; }
    location /static/ { alias /var/www/Update2.0_database/server/staticfiles/; }
    location /media/  { alias /var/www/Update2.0_database/server/media/; }
    location /files/  { alias /var/www/Update2.0_database/server/storage/Documents/; }
    location /        { try_files $uri $uri/ /index.html; }
}

server {                      # Admin portal
    listen 8080;
    server_name 192.168.0.100;
    root /var/www/Update2.0_database/client/admin-side/dist;
    index index.html;
    client_max_body_size 25M;

    location /api/    { proxy_pass http://127.0.0.1:8000; include /etc/nginx/proxy_params; }
    location /admin/  { proxy_pass http://127.0.0.1:8000; include /etc/nginx/proxy_params; }
    location /ws/     { proxy_pass http://127.0.0.1:8000; proxy_http_version 1.1;
                        proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";
                        proxy_set_header Host $host; }
    location /static/ { alias /var/www/Update2.0_database/server/staticfiles/; }
    location /media/  { alias /var/www/Update2.0_database/server/media/; }
    location /files/  { alias /var/www/Update2.0_database/server/storage/Documents/; }
    location /        { try_files $uri $uri/ /index.html; }
}
EOF

sudo ln -sf /etc/nginx/sites-available/sipi /etc/nginx/sites-enabled/sipi
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

### Step 10 — Permissions & firewall

```bash
sudo chown -R www-data:www-data /var/www/Update2.0_database
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 8080/tcp && sudo ufw --force enable
```

### Step 11 — Verify

```bash
curl -I http://127.0.0.1:8000/admin/login/   # 200/302 from gunicorn
curl -I http://192.168.0.100/                 # 200 from Nginx (student)
curl -I http://192.168.0.100:8080/            # 200 from Nginx (admin)
```

Open `http://192.168.0.100` (student) and `http://192.168.0.100:8080` (admin) in a browser.

---

## 4. Updating a Running Deployment

```bash
cd /var/www/Update2.0_database
git pull
cd deploy-scripts
sudo ./deploy.sh --backend      # deps, migrations, restart
sudo ./deploy.sh --frontend     # rebuild SPAs
```

---

## 5. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `npm install` fails | Node too old — `node -v` must be ≥ 18. Re-install Node 20 (Step 1). `.npmrc` already sets `legacy-peer-deps`. |
| `npm run build` killed / OOM | `export NODE_OPTIONS=--max-old-space-size=2048` (or add swap). |
| 502 Bad Gateway | Backend down: `sudo systemctl status sipi` and `journalctl -u sipi -n 50`. |
| WebSockets / notifications dead | Redis running? `redis-cli ping`. Service must use `asgi` + uvicorn worker, not `wsgi`. |
| CORS / CSRF errors in browser | Ensure `STUDENT_PORTAL_ORIGINS` / `ADMIN_PORTAL_ORIGINS` in `server/.env` list your exact origins (scheme+host+port), then restart `sipi`. |
| Uploaded files 404 (`/files/...`) | Check the Nginx `/files/` alias points to `server/storage/Documents/` and perms are `www-data`. |
| DB connection refused | `sudo systemctl status postgresql`; verify `server/.env` DB credentials. |
| Static assets missing | `cd server && source venv/bin/activate && python manage.py collectstatic --noinput`. |

Logs:

```bash
journalctl -u sipi -f                       # backend
sudo tail -f /var/log/nginx/error.log       # nginx
sudo tail -f /var/log/gunicorn/error.log    # gunicorn
```

---

## 6. Going to a Real Domain + HTTPS (optional)

1. Point DNS A-records (e.g. `app.example.com`, `admin.example.com`) to the server.
2. Replace `server_name 192.168.0.100;` with your domains and set each SPA's `.env` `VITE_API_BASE_URL` to the matching `https://...` origin; rebuild.
3. Set `STUDENT_PORTAL_ORIGINS` / `ADMIN_PORTAL_ORIGINS` (or add them to `EXTRA_TRUSTED_ORIGINS`) to the `https://...` domains, and set `CSRF_COOKIE_SECURE=True`, `SESSION_COOKIE_SECURE=True` in `server/.env`.
4. `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx`.
