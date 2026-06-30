# AWS Production Deployment Guide - SLMS Project

> Deploy the project live on an AWS Ubuntu EC2 server.

---

## Server Info

| Item | Value |
|------|-------|
| Server IP | 13.250.99.61 |
| OS | Ubuntu (AWS EC2) |
| Student Portal | http://13.250.99.61 |
| Admin Portal | http://13.250.99.61:8080 |
| Backend API | Internal only (via NGINX proxy) |

---

## Before You Start

Make sure you have:
- SSH key file (`.pem`) for your EC2 instance
- AWS Security Group with ports **22, 80, 8080** open
- Access to your GitHub repo

---

## Step 1: Connect to the Server

From your local machine:

```bash
ssh -i your-key.pem ubuntu@13.250.99.61
```

---

## Step 2: Update the Server & Install Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib nginx redis-server git curl

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify everything installed
python3 --version
node --version
nginx -v
psql --version
```

---

## Step 3: Setup the Database

```bash
# Open PostgreSQL shell
sudo -u postgres psql
```

Run these commands inside the PostgreSQL shell:

```sql
CREATE DATABASE sipi_db;
CREATE USER sipi_web WITH PASSWORD 'sipiadmin';
GRANT ALL PRIVILEGES ON DATABASE sipi_db TO sipi_web;
ALTER USER sipi_web CREATEDB;
\q
```

Configure password authentication:

```bash
# Open the config file
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Find the line that starts with `local   all   all` and change `peer` to `md5`, or add this line below it:

```
local   all   sipi_web   md5
```

Save and restart PostgreSQL:

```bash
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

---

## Step 4: Clone the Project

```bash
cd /home/ubuntu
git clone https://github.com/vault24/Update2.0_database.git
```

---

## Step 5: Setup the Backend

```bash
cd /home/ubuntu/project/server

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn
```

### Create the `.env` file

```bash
nano .env
```

Paste this content (change the `SECRET_KEY` to something random):

```env
DB_NAME=sipi_db
DB_USER=sipi_web
DB_PASSWORD=sipiadmin
DB_HOST=localhost
DB_PORT=5432

SECRET_KEY=replace-this-with-a-long-random-string-50-chars
DEBUG=False
ALLOWED_HOSTS=13.250.99.61,localhost,127.0.0.1

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
DEFAULT_FROM_EMAIL=SIPI <your-email@gmail.com>
```

Save with `Ctrl+O`, then `Enter`, then `Ctrl+X`.

### Run migrations and collect static files

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput

# Create required folders
mkdir -p media storage logs
```

---

## Step 6: Create Gunicorn Service

Gunicorn runs the Django backend as a background service.

```bash
sudo nano /etc/systemd/system/gunicorn.service
```

Paste this content:

```ini
[Unit]
Description=Gunicorn daemon for SLMS
After=network.target postgresql.service

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/slms-project/server
Environment="PATH=/home/ubuntu/slms-project/server/venv/bin"
ExecStart=/home/ubuntu/slms-project/server/venv/bin/gunicorn \
    --workers 3 \
    --bind 127.0.0.1:8000 \
    --timeout 120 \
    --access-logfile /var/log/gunicorn/access.log \
    --error-logfile /var/log/gunicorn/error.log \
    slms_core.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
```

Save and start the service:

```bash
sudo mkdir -p /var/log/gunicorn
sudo chown ubuntu:www-data /var/log/gunicorn

sudo systemctl daemon-reload
sudo systemctl start gunicorn
sudo systemctl enable gunicorn

# Confirm it's running
sudo systemctl status gunicorn
```

You should see `Active: active (running)` in green.

---

## Step 7: Build the Frontend Apps

### Admin Frontend

```bash
cd /home/ubuntu/slms-project/client/admin-side
npm install
echo "VITE_API_BASE_URL=http://13.250.99.61/api" > .env
npm run build
```

### Student Frontend

```bash
cd /home/ubuntu/slms-project/client/student-side
npm install
echo "VITE_API_BASE_URL=http://13.250.99.61/api" > .env
npm run build
```

---

## Step 8: Configure NGINX

NGINX serves the frontend files and routes API requests to the backend.

```bash
sudo nano /etc/nginx/sites-available/slms
```

Paste this configuration:

```nginx
# Student Frontend - accessible at port 80
server {
    listen 80 default_server;
    server_name 13.250.99.61;

    root /home/ubuntu/slms-project/client/student-side/dist;
    index index.html;
    client_max_body_size 50M;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /home/ubuntu/slms-project/server/staticfiles/;
    }

    location /media/ {
        alias /home/ubuntu/slms-project/server/media/;
    }
}

# Admin Frontend - accessible at port 8080
server {
    listen 8080;
    server_name 13.250.99.61;

    root /home/ubuntu/slms-project/client/admin-side/dist;
    index index.html;
    client_max_body_size 50M;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /home/ubuntu/slms-project/server/staticfiles/;
    }

    location /media/ {
        alias /home/ubuntu/slms-project/server/media/;
    }
}
```

Enable the site and restart NGINX:

```bash
sudo rm /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/slms /etc/nginx/sites-enabled/

# Test the config first
sudo nginx -t

# If it says "test is successful", restart
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Step 9: Set File Permissions

```bash
sudo chown -R ubuntu:www-data /home/ubuntu/slms-project/
sudo chmod -R 755 /home/ubuntu/slms-project/client/admin-side/dist/
sudo chmod -R 755 /home/ubuntu/slms-project/client/student-side/dist/
sudo chmod -R 755 /home/ubuntu/slms-project/server/staticfiles/
sudo chmod -R 755 /home/ubuntu/slms-project/server/media/
```

---

## Step 10: Open the Firewall

```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 8080/tcp
sudo ufw status
```

Also go to your AWS Console → EC2 → Security Groups and make sure these inbound rules exist:

| Type | Port | Source |
|------|------|--------|
| SSH | 22 | Your IP |
| HTTP | 80 | 0.0.0.0/0 |
| Custom TCP | 8080 | 0.0.0.0/0 |

---

## Step 11: Verify Everything Works

```bash
# Check all services are running
sudo systemctl status postgresql
sudo systemctl status gunicorn
sudo systemctl status nginx
```

Then open these in your browser:

| URL | Expected Result |
|-----|----------------|
| http://13.250.99.61 | Student portal loads |
| http://13.250.99.61:8080 | Admin portal loads |
| http://13.250.99.61/api/admin/ | Django admin login |

---

## Updating the App (After Code Changes)

Save this as `/home/ubuntu/deploy.sh` for easy re-deployment:

```bash
#!/bin/bash
cd /home/ubuntu/slms-project
git pull origin main

# Update backend
cd server
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
deactivate
sudo systemctl restart gunicorn

# Rebuild frontends
cd /home/ubuntu/slms-project/client/admin-side
npm install && npm run build

cd /home/ubuntu/slms-project/client/student-side
npm install && npm run build

sudo systemctl restart nginx
echo "Deployment complete!"
```

```bash
chmod +x /home/ubuntu/deploy.sh

# Run it anytime you push new code
/home/ubuntu/deploy.sh
```

---

## Database Backup

```bash
# Run a manual backup
pg_dump -U sipi_web -h localhost sipi_db > ~/backups/backup_$(date +%Y%m%d).sql
mkdir -p ~/backups

# Schedule automatic daily backups at 2am
(crontab -l 2>/dev/null; echo "0 2 * * * pg_dump -U sipi_web -h localhost sipi_db > /home/ubuntu/backups/backup_\$(date +\%Y\%m\%d).sql") | crontab -
```

---

## Troubleshooting

**502 Bad Gateway**
```bash
sudo systemctl restart gunicorn
sudo tail -f /var/log/gunicorn/error.log
```

**Static files / CSS not loading**
```bash
cd /home/ubuntu/slms-project/server
source venv/bin/activate
python manage.py collectstatic --noinput
sudo systemctl restart nginx
```

**Database connection error**
```bash
sudo systemctl status postgresql
psql -U sipi_web -d sipi_db -h localhost
```

**Check all logs at once**
```bash
sudo journalctl -u gunicorn -f          # Backend logs
sudo tail -f /var/log/nginx/error.log   # NGINX logs
```
