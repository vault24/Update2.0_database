# Complete Deployment Guide - SIPI Database System

This guide covers the complete setup, deployment, and troubleshooting for the SIPI Database System.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Gunicorn Service Configuration](#gunicorn-service-configuration)
5. [Nginx Configuration](#nginx-configuration)
6. [Authentication Setup](#authentication-setup)
7. [Troubleshooting](#troubleshooting)
8. [Production Checklist](#production-checklist)

---

## Prerequisites

- Ubuntu Server (20.04 or later)
- Python 3.8+
- Node.js 16+ and npm
- PostgreSQL 12+
- Nginx (optional, for reverse proxy)

---

## Backend Setup

### 1. Clone Repository

```bash
cd ~
git clone <your-repo-url> Update2.0_database
cd Update2.0_database/server
```

### 2. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create `.env` file in `server/` directory:

```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=18.138.238.106,ec2-18-138-238-106.ap-southeast-1.compute.amazonaws.com

# Database Configuration
DB_NAME=slms_db
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=5432

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://18.138.238.106:8000,http://18.138.238.106,http://your-frontend-domain:port

# CSRF Configuration
CSRF_TRUSTED_ORIGINS=http://18.138.238.106:8000,http://18.138.238.106,http://your-frontend-domain:port
```

### 5. Database Setup

```bash
# Create database
sudo -u postgres psql
CREATE DATABASE slms_db;
CREATE USER your_db_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE slms_db TO your_db_user;
\q

# Run migrations
python manage.py migrate

# Create admin user
python create_admin_user.py
# Or
python manage.py createsuperuser
```

### 6. Collect Static Files

```bash
python manage.py collectstatic --noinput
```

---

## Frontend Setup

### 1. Admin Side

```bash
cd ~/Update2.0_database/client/admin-side

# Install dependencies
npm install

# Create .env file
echo "VITE_API_BASE_URL=http://18.138.238.106:8000/api" > .env

# Build for production
npm run build

# Or run in development mode
npm run dev
```

### 2. Student Side

```bash
cd ~/Update2.0_database/client/student-side

# Install dependencies
npm install

# Create .env file
echo "VITE_API_BASE_URL=http://18.138.238.106:8000/api" > .env

# Build for production
npm run build

# Or run in development mode
npm run dev
```

---

## Gunicorn Service Configuration

### 1. Create Service File

Create `/etc/systemd/system/gunicorn.service`:

```ini
[Unit]
Description=Gunicorn daemon for SLMS Django application
After=network.target postgresql.service
Requires=postgresql.service

[Service]
# Run as the user who owns the project files
User=ubuntu
Group=www-data

# Set working directory (where manage.py lives)
WorkingDirectory=/home/ubuntu/Update2.0_database/server

# Ensure venv bin is first on PATH so systemd finds venv-installed packages
Environment="PATH=/home/ubuntu/Update2.0_database/server/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin"
Environment="DJANGO_SETTINGS_MODULE=slms_core.settings"
Environment="PYTHONUNBUFFERED=1"

# ExecStart must be the full path to the gunicorn binary inside the venv.
# Use gunicorn directly, NOT "python -m gunicorn"
ExecStart=/home/ubuntu/Update2.0_database/server/venv/bin/gunicorn \
    --workers 3 \
    --bind 0.0.0.0:8000 \
    slms_core.wsgi:application

Restart=on-failure
RestartSec=3

# security / limits
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
# Changed from ProtectHome=true to read-only to allow access to venv binary
ProtectHome=read-only
ReadWritePaths=/home/ubuntu/Update2.0_database/server /home/ubuntu/Update2.0_database/server/venv /var/log/gunicorn /var/run/gunicorn
ReadOnlyPaths=/etc
LimitNOFILE=65535
LimitNPROC=4096
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gunicorn-slms

[Install]
WantedBy=multi-user.target
```

### 2. Create Required Directories

```bash
# Create log directory
sudo mkdir -p /var/log/gunicorn
sudo chown www-data:www-data /var/log/gunicorn

# Create PID directory
sudo mkdir -p /var/run/gunicorn
sudo chown www-data:www-data /var/run/gunicorn
```

### 3. Set Permissions

```bash
# Ensure your project directory has correct permissions
sudo chown -R ubuntu:www-data /home/ubuntu/Update2.0_database/server
sudo chmod -R 755 /home/ubuntu/Update2.0_database/server
```

### 4. Enable and Start Service

```bash
# Reload systemd to recognize new service
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable gunicorn.service

# Start the service
sudo systemctl start gunicorn.service

# Check service status
sudo systemctl status gunicorn.service
```

### 5. Common Gunicorn Commands

```bash
# Start service
sudo systemctl start gunicorn

# Stop service
sudo systemctl stop gunicorn

# Restart service
sudo systemctl restart gunicorn

# Reload service (graceful restart)
sudo systemctl reload gunicorn

# Check status
sudo systemctl status gunicorn

# View logs
sudo journalctl -u gunicorn -n 50
sudo journalctl -u gunicorn -f
```

### 6. Calculate Workers

The number of workers should be: `(2 × CPU cores) + 1`

```bash
# Check CPU cores
nproc

# Example: 2 CPU cores = 5 workers
# Update --workers in service file accordingly
```

---

## Nginx Configuration

### 1. Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

### 2. Create Nginx Configuration

Create `/etc/nginx/sites-available/sipi-admin`:

```nginx
server {
    listen 80;
    server_name 18.138.238.106;

    # Frontend static files (Admin Side)
    location / {
        root /home/ubuntu/Update2.0_database/client/admin-side/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # Static files
    location /static/ {
        alias /home/ubuntu/Update2.0_database/server/staticfiles/;
    }

    # Media files
    location /media/ {
        alias /home/ubuntu/Update2.0_database/server/media/;
    }
}
```

### 3. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/sipi-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Authentication Setup

### 1. Create Admin User

```bash
cd ~/Update2.0_database/server
source venv/bin/activate
python create_admin_user.py
```

Or manually:

```bash
python manage.py createsuperuser
```

### 2. Verify User Can Login

```bash
python manage.py shell
```

```python
from apps.authentication.models import User
user = User.objects.get(username='admin')  # or your username
print(f"Can login: {user.can_login()}")
print(f"Account status: {user.account_status}")
print(f"Role: {user.role}")
```

### 3. Test Authentication

```bash
# Get CSRF token
curl -X GET http://18.138.238.106:8000/api/auth/csrf/ -c /tmp/cookies.txt

# Login
curl -X POST http://18.138.238.106:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $(grep csrftoken /tmp/cookies.txt | awk '{print $7}')" \
  -d '{"username":"admin","password":"your_password"}' \
  -c /tmp/cookies.txt \
  -b /tmp/cookies.txt
```

---

## Troubleshooting

### Gunicorn Service Issues

#### Issue: `status=203/EXEC`

**Cause:** Systemd cannot execute the command

**Solutions:**
1. Use `gunicorn` binary directly, not `python -m gunicorn`
2. Change `ProtectHome=true` to `ProtectHome=read-only` in service file
3. Verify gunicorn is installed: `ls -la venv/bin/gunicorn`
4. Verify gunicorn is executable: `venv/bin/gunicorn --version`

#### Issue: Service fails to start

**Check logs:**
```bash
sudo journalctl -u gunicorn -n 100
```

**Common fixes:**
- Verify all paths in service file are correct
- Check file permissions
- Ensure PostgreSQL is running: `sudo systemctl status postgresql`

### Frontend API Connection Issues

#### Issue: `ERR_BLOCKED_BY_CLIENT` or requests to `localhost:8000`

**Cause:** Frontend was built with wrong API URL

**Solution:**
1. Create `.env` file in frontend directory:
   ```bash
   echo "VITE_API_BASE_URL=http://18.138.238.106:8000/api" > .env
   ```
2. Rebuild frontend:
   ```bash
   npm run build
   ```

#### Issue: CORS errors

**Solution:**
1. Add frontend origin to `CORS_ALLOWED_ORIGINS` in `settings.py`
2. Restart gunicorn: `sudo systemctl restart gunicorn`

### Authentication Issues

#### Issue: 403 Forbidden on `/api/auth/me/`

**Cause:** User not authenticated (expected when not logged in)

**Solution:** This is normal behavior. User needs to login first.

#### Issue: 400 Bad Request on `/api/auth/login/`

**Possible causes:**
1. Invalid credentials
2. CSRF token missing
3. Frontend origin not in `CSRF_TRUSTED_ORIGINS`

**Solutions:**

1. **Check CSRF token:**
   ```javascript
   // In browser console
   fetch('http://18.138.238.106:8000/api/auth/csrf/', {
     credentials: 'include'
   })
   .then(r => r.json())
   .then(data => console.log('CSRF:', data));
   ```

2. **Verify user exists:**
   ```bash
   python manage.py shell
   ```
   ```python
   from apps.authentication.models import User
   User.objects.filter(username='your_username').exists()
   ```

3. **Add frontend origin to CSRF_TRUSTED_ORIGINS:**
   ```python
   # In settings.py
   CSRF_TRUSTED_ORIGINS = [
       'http://18.138.238.106:8000',
       'http://18.138.238.106',
       'http://your-frontend-domain:port',  # Add this
   ]
   ```
   Then restart: `sudo systemctl restart gunicorn`

#### Issue: 404 on `/api/auth/signup-request-status/...`

**Cause:** No signup request exists for that username/email

**Solution:** This is expected if no signup request was created. Create one first or use an existing user.

### Database Issues

#### Issue: Connection refused

**Check:**
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
```

#### Issue: Migration errors

**Solution:**
```bash
python manage.py migrate --run-syncdb
python manage.py migrate
```

### Port Already in Use

```bash
# Find process using port 8000
sudo lsof -i :8000
# or
sudo netstat -tlnp | grep 8000

# Kill the process if needed
sudo kill -9 <PID>
```

---

## Production Checklist

### Security

- [ ] Set `DEBUG=False` in `.env`
- [ ] Generate strong `SECRET_KEY`
- [ ] Set `ALLOWED_HOSTS` with your domain
- [ ] Configure `CSRF_TRUSTED_ORIGINS` with all frontend origins
- [ ] Set up HTTPS/SSL certificates
- [ ] Set `SESSION_COOKIE_SECURE=True` (with HTTPS)
- [ ] Set `CSRF_COOKIE_SECURE=True` (with HTTPS)
- [ ] Configure firewall (only allow necessary ports)
- [ ] Set up regular backups

### Performance

- [ ] Configure appropriate number of Gunicorn workers
- [ ] Set up Nginx as reverse proxy
- [ ] Enable Nginx caching for static files
- [ ] Configure database connection pooling
- [ ] Set up monitoring and logging

### Backup

- [ ] Set up automated database backups
- [ ] Backup media files
- [ ] Test restore procedure

### Monitoring

- [ ] Set up log rotation
- [ ] Configure monitoring alerts
- [ ] Set up error tracking

---

## Quick Reference

### Service Management

```bash
# Gunicorn
sudo systemctl status gunicorn
sudo systemctl restart gunicorn
sudo journalctl -u gunicorn -f

# PostgreSQL
sudo systemctl status postgresql
sudo systemctl restart postgresql

# Nginx
sudo systemctl status nginx
sudo systemctl restart nginx
sudo nginx -t
```

### Django Management

```bash
cd ~/Update2.0_database/server
source venv/bin/activate

# Migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic

# Django shell
python manage.py shell
```

### Frontend Management

```bash
# Admin side
cd ~/Update2.0_database/client/admin-side
npm install
npm run build
npm run dev

# Student side
cd ~/Update2.0_database/client/student-side
npm install
npm run build
npm run dev
```

---

## Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Review server logs: `sudo journalctl -u gunicorn -n 100`
3. Check browser console for frontend errors
4. Verify all configuration files match this guide

---

## Version History

- **v1.0** - Initial deployment guide
- Includes Gunicorn service configuration fixes
- Frontend API configuration
- Authentication troubleshooting

