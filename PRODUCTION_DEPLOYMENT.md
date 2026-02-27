# Production Deployment Guide - SLMS Project

## Server Information
- **Server IP**: 13.250.99.61
- **OS**: Ubuntu (AWS EC2)
- **Admin Frontend**: http://13.250.99.61:8080
- **Student Frontend**: http://13.250.99.61:80
- **Backend API**: http://127.0.0.1:8000 (internal, proxied via NGINX)

---

## Quick Start Commands

```bash
# 1. Connect to server
ssh ubuntu@13.250.99.61

# 2. Update system
sudo apt update && sudo apt upgrade -y

# 3. Install software
sudo apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib nginx redis-server git curl

# 4. Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## Step 1: Database Setup

```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE sipi_db;
CREATE USER sipi_web WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE sipi_db TO sipi_web;
ALTER USER sipi_web CREATEDB;
\q
EOF

# Configure authentication
sudo nano /etc/postgresql/*/main/pg_hba.conf
# Add: local   all   sipi_web   md5

sudo systemctl restart postgresql
```

---

## Step 2: Project Setup

```bash
# Clone project
cd /home/ubuntu
git clone <your-repo-url> slms-project
cd slms-project

# Backend setup
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Create .env file
cat > .env << 'EOF'
DB_NAME=sipi_db
DB_USER=sipi_web
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432

SECRET_KEY=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
DEBUG=False
ALLOWED_HOSTS=13.250.99.61,localhost,127.0.0.1

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=SIPI <your-email@gmail.com>
EOF

# Run migrations
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
mkdir -p media storage logs
```

---

## Step 3: Update Django Settings

Edit `server/slms_core/settings.py` and add production URLs:

```python
CORS_ALLOWED_ORIGINS = [
    "http://13.250.99.61",
    "http://13.250.99.61:8080",
]

CSRF_TRUSTED_ORIGINS = [
    "http://13.250.99.61",
    "http://13.250.99.61:8080",
]
```

---

## Step 4: Setup Gunicorn Service

```bash
sudo tee /etc/systemd/system/gunicorn.service > /dev/null << 'EOF'
[Unit]
Description=Gunicorn daemon for SLMS
After=network.target postgresql.service redis-server.service

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
EOF

# Create log directory and start service
sudo mkdir -p /var/log/gunicorn
sudo chown ubuntu:www-data /var/log/gunicorn
sudo systemctl daemon-reload
sudo systemctl start gunicorn
sudo systemctl enable gunicorn
```

---

## Step 5: Build Frontend Applications

```bash
# Admin Frontend
cd /home/ubuntu/slms-project/client/admin-side
npm install
echo "VITE_API_BASE_URL=http://13.250.99.61/api" > .env
npm run build

# Student Frontend
cd /home/ubuntu/slms-project/client/student-side
npm install
echo "VITE_API_BASE_URL=http://13.250.99.61/api" > .env
npm run build
```

---

## Step 6: Configure NGINX

```bash
sudo tee /etc/nginx/sites-available/slms > /dev/null << 'EOF'
# Student Frontend - Port 80
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

# Admin Frontend - Port 8080
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
EOF

# Enable site
sudo rm /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/slms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 7: Set Permissions

```bash
sudo chown -R ubuntu:www-data /home/ubuntu/slms-project/
sudo chmod -R 755 /home/ubuntu/slms-project/client/admin-side/dist/
sudo chmod -R 755 /home/ubuntu/slms-project/client/student-side/dist/
sudo chmod -R 755 /home/ubuntu/slms-project/server/staticfiles/
sudo chmod -R 755 /home/ubuntu/slms-project/server/media/
```

---

## Step 8: Configure Firewall

```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 8080/tcp
sudo ufw status
```

**AWS Security Group**: Allow ports 22, 80, 8080

---

## Step 9: Verify Deployment

```bash
# Check services
sudo systemctl status postgresql redis-server gunicorn nginx

# Check ports
sudo netstat -tlnp | grep -E ':(80|8080|8000)'

# Test URLs
curl http://13.250.99.61
curl http://13.250.99.61:8080
```

---

## Deployment Script

Create `/home/ubuntu/deploy.sh`:

```bash
#!/bin/bash
cd /home/ubuntu/slms-project
git pull origin main

cd server
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
deactivate

sudo systemctl restart gunicorn

cd /home/ubuntu/slms-project/client/admin-side
npm install && npm run build

cd /home/ubuntu/slms-project/client/student-side
npm install && npm run build

sudo systemctl restart nginx
echo "✅ Deployment complete!"
```

```bash
chmod +x /home/ubuntu/deploy.sh
```

---

## Backup Script

Create `/home/ubuntu/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U sipi_web -h localhost sipi_db > $BACKUP_DIR/db_$DATE.sql
tar -czf $BACKUP_DIR/media_$DATE.tar.gz /home/ubuntu/slms-project/server/media/

find $BACKUP_DIR -mtime +7 -delete
echo "✅ Backup complete"
```

```bash
chmod +x /home/ubuntu/backup.sh
# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup.sh") | crontab -
```

---

## Troubleshooting

### 502 Bad Gateway
```bash
sudo systemctl restart gunicorn
sudo tail -f /var/log/gunicorn/error.log
```

### Static Files Not Loading
```bash
cd /home/ubuntu/slms-project/server
source venv/bin/activate
python manage.py collectstatic --noinput
sudo systemctl restart nginx
```

### Database Connection Error
```bash
sudo systemctl status postgresql
psql -U sipi_web -d sipi_db -h localhost
```

---

## Useful Commands

```bash
# Restart all services
sudo systemctl restart postgresql redis-server gunicorn nginx

# View logs
sudo journalctl -u gunicorn -f
sudo tail -f /var/log/nginx/error.log

# Check disk space
df -h

# Check memory
free -h
```

---

## Access URLs

- **Student Portal**: http://13.250.99.61
- **Admin Portal**: http://13.250.99.61:8080
- **Django Admin**: http://13.250.99.61/api/admin/

---

**Deployment Complete! 🚀**
